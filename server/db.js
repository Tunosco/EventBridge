import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import Database from 'better-sqlite3';

const connectionString = process.env.DATABASE_URL;
export const isPostgres = Boolean(connectionString);
let mode = 'sqlite';

/** Base réellement utilisée par l'API : 'postgres' (Supabase) ou 'sqlite' (repli local). */
export function getDatabaseMode() {
	return mode;
}

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

let pool = null;
let poolError = null;
if (isPostgres) {
	try {
		const { Pool } = await import('pg');
		const connectionUrl = new URL(connectionString);
		for (const option of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
			connectionUrl.searchParams.delete(option);
		}
		const ssl = { rejectUnauthorized: true };
		if (process.env.SUPABASE_DB_SSL_CA_PATH) {
			ssl.ca = fs.readFileSync(path.resolve(process.env.SUPABASE_DB_SSL_CA_PATH), 'utf8');
		}
		pool = new Pool({ connectionString: connectionUrl.toString(), ssl, max: 5, connectionTimeoutMillis: 8000 });
		pool.on('error', (error) => console.error(`[db] Erreur de la connexion PostgreSQL : ${error.message}`));
	} catch (error) {
		poolError = error;
	}
}

const dataDirectory = path.resolve('data');
const databasePath = process.env.DB_PATH || path.join(dataDirectory, 'eventbridge.sqlite');
let sqlite = null;

function openSqlite() {
	if (!sqlite) {
		fs.mkdirSync(path.dirname(databasePath), { recursive: true });
		sqlite = new Database(databasePath);
		sqlite.pragma('foreign_keys = ON');
	}
	return sqlite;
}

const sqliteDatabase = {
	prepare: (sql) => openSqlite().prepare(sql),
	transaction: (callback) => async (...args) => {
		const connection = openSqlite();
		connection.exec('BEGIN');
		try {
			const result = await callback(...args);
			connection.exec('COMMIT');
			return result;
		} catch (error) {
			connection.exec('ROLLBACK');
			throw error;
		}
	},
};

const postgresDatabase = pool ? createPostgresDatabase(pool) : null;
const usePostgres = () => mode === 'postgres' && postgresDatabase !== null;

export const db = {
	prepare: (sql) => (usePostgres() ? postgresDatabase : sqliteDatabase).prepare(sql),
	transaction: (callback) => (usePostgres() ? postgresDatabase : sqliteDatabase).transaction(callback),
};

function initializeSqlite() {
	const connection = openSqlite();
	connection.exec(fs.readFileSync(path.resolve('server/schema.sql'), 'utf8'));
	const eventColumns = connection.prepare('PRAGMA table_info(evenement)').all().map((column) => column.name);
	if (!eventColumns.includes('date_fin')) connection.exec('ALTER TABLE evenement ADD COLUMN date_fin TEXT');
	const userColumns = connection.prepare('PRAGMA table_info(utilisateur)').all().map((column) => column.name);
	if (!userColumns.includes('prenom')) connection.exec('ALTER TABLE utilisateur ADD COLUMN prenom TEXT');
	if (!userColumns.includes('code_postal')) connection.exec('ALTER TABLE utilisateur ADD COLUMN code_postal TEXT');
	if (!userColumns.includes('supabase_auth_id')) connection.exec('ALTER TABLE utilisateur ADD COLUMN supabase_auth_id TEXT');
	connection.exec('CREATE UNIQUE INDEX IF NOT EXISTS utilisateur_supabase_auth_id_unique ON utilisateur (supabase_auth_id) WHERE supabase_auth_id IS NOT NULL');
	const providerColumns = connection.prepare('PRAGMA table_info(prestataire)').all().map((column) => column.name);
	for (const column of ['siret', 'site_web', 'adresse_postale', 'banniere_url', 'photo_url']) {
		if (!providerColumns.includes(column)) connection.exec(`ALTER TABLE prestataire ADD COLUMN ${column} TEXT`);
	}
}

export async function initializeDatabase() {
	if (pool) {
		try {
			await pool.query('SELECT 1');
			mode = 'postgres';
			console.log('[db] Connecté à la base PostgreSQL de Supabase.');
			return;
		} catch (error) {
			console.warn(`[db] Supabase injoignable (${error.code || error.message}).`);
			console.warn('[db] ATTENTION : les données sont écrites dans la base SQLite locale (data/eventbridge.sqlite).');
			console.warn('[db] Corrige la cause avec `npm run db:check`, puis RELANCE `npm run server` pour revenir sur Supabase.');
		}
	} else if (isPostgres) {
		console.warn(`[db] DATABASE_URL inutilisable (${poolError?.message}).`);
		console.warn('[db] ATTENTION : les données sont écrites dans la base SQLite locale (data/eventbridge.sqlite).');
		console.warn('[db] Corrige la cause avec `npm run db:check`, puis RELANCE `npm run server` pour revenir sur Supabase.');
	}
	initializeSqlite();
	mode = 'sqlite';
	console.log('[db] Base SQLite locale prête (data/eventbridge.sqlite).');
}
