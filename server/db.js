import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import Database from 'better-sqlite3';

export const isPostgres = Boolean(process.env.DATABASE_URL);

function postgresQuery(client, sql, parameters = []) {
	let index = 0;
	let query = sql
		.replace(/\?/g, () => `$${++index}`)
		.replace(/\s+COLLATE NOCASE/gi, '')
		.replace(/GROUP_CONCAT\(DISTINCT\s+([^)]*)\)/gi, "STRING_AGG(DISTINCT $1, ',')");
	const ignoreConflict = /^\s*INSERT\s+OR\s+IGNORE\s+INTO/i.test(query);
	query = query.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
	if (ignoreConflict) query += ' ON CONFLICT DO NOTHING';
	return client.query(query, parameters);
}

function createPostgresDatabase(pool) {
	const transactionContext = new AsyncLocalStorage();
	const prepare = (sql) => ({
		get: async (...parameters) => (await postgresQuery(transactionContext.getStore() || pool, sql, parameters)).rows[0],
		all: async (...parameters) => (await postgresQuery(transactionContext.getStore() || pool, sql, parameters)).rows,
		run: async (...parameters) => {
			const result = await postgresQuery(transactionContext.getStore() || pool, sql, parameters);
			return { changes: result.rowCount };
		},
	});
	return {
		prepare,
		transaction: (callback) => async (...args) => {
			const client = await pool.connect();
			try {
				await client.query('BEGIN');
				const result = await transactionContext.run(client, () => callback(...args));
				await client.query('COMMIT');
				return result;
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		},
	};
}

let pool;
if (isPostgres) {
	const { Pool } = await import('pg');
	const connectionUrl = new URL(process.env.DATABASE_URL);
	for (const option of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
		connectionUrl.searchParams.delete(option);
	}
	const ssl = { rejectUnauthorized: true };
	if (process.env.SUPABASE_DB_SSL_CA_PATH) {
		const caPath = path.resolve(process.env.SUPABASE_DB_SSL_CA_PATH);
		try {
			ssl.ca = fs.readFileSync(caPath, 'utf8');
		} catch (error) {
			throw new Error(`Supabase CA certificate not found at ${caPath}. Download it from Database > Settings > SSL Configuration.`, { cause: error });
		}
	}
	pool = new Pool({ connectionString: connectionUrl.toString(), ssl, max: 5 });
}

const dataDirectory = path.resolve('data');
const databasePath = process.env.DB_PATH || path.join(dataDirectory, 'eventbridge.sqlite');
let sqlite;
if (!isPostgres) {
	fs.mkdirSync(path.dirname(databasePath), { recursive: true });
	sqlite = new Database(databasePath);
	sqlite.pragma('foreign_keys = ON');
}

export const db = isPostgres ? createPostgresDatabase(pool) : {
	prepare: (sql) => sqlite.prepare(sql),
	transaction: (callback) => async (...args) => {
		sqlite.exec('BEGIN');
		try {
			const result = await callback(...args);
			sqlite.exec('COMMIT');
			return result;
		} catch (error) {
			sqlite.exec('ROLLBACK');
			throw error;
		}
	},
};

export async function initializeDatabase() {
	if (isPostgres) {
		await pool.query(fs.readFileSync(path.resolve('server/schema.postgres.sql'), 'utf8'));
		return;
	}
	sqlite.exec(fs.readFileSync(path.resolve('server/schema.sql'), 'utf8'));
	const eventColumns = sqlite.prepare('PRAGMA table_info(evenement)').all().map((column) => column.name);
	if (!eventColumns.includes('date_fin')) sqlite.exec('ALTER TABLE evenement ADD COLUMN date_fin TEXT');
	const userColumns = sqlite.prepare('PRAGMA table_info(utilisateur)').all().map((column) => column.name);
	if (!userColumns.includes('prenom')) sqlite.exec('ALTER TABLE utilisateur ADD COLUMN prenom TEXT');
	if (!userColumns.includes('code_postal')) sqlite.exec('ALTER TABLE utilisateur ADD COLUMN code_postal TEXT');
	if (!userColumns.includes('supabase_auth_id')) sqlite.exec('ALTER TABLE utilisateur ADD COLUMN supabase_auth_id TEXT');
	sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS utilisateur_supabase_auth_id_unique ON utilisateur (supabase_auth_id) WHERE supabase_auth_id IS NOT NULL');
	const providerColumns = sqlite.prepare('PRAGMA table_info(prestataire)').all().map((column) => column.name);
	for (const column of ['siret', 'site_web', 'adresse_postale', 'banniere_url', 'photo_url']) {
		if (!providerColumns.includes(column)) sqlite.exec(`ALTER TABLE prestataire ADD COLUMN ${column} TEXT`);
	}
}
