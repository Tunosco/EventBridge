import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dataDirectory = path.resolve('data');
fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, 'eventbridge.sqlite'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.resolve('server/schema.sql'), 'utf8'));
const userColumns = db.prepare('PRAGMA table_info(utilisateur)').all().map((column) => column.name);
if (!userColumns.includes('code_postal')) db.exec('ALTER TABLE utilisateur ADD COLUMN code_postal TEXT');
const providerColumns = db.prepare('PRAGMA table_info(prestataire)').all().map((column) => column.name);
for (const column of ['siret', 'site_web', 'adresse_postale', 'banniere_url', 'photo_url']) {
	if (!providerColumns.includes(column)) db.exec(`ALTER TABLE prestataire ADD COLUMN ${column} TEXT`);
}
