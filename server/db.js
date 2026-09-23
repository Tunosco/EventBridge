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
if (!providerColumns.includes('siret')) db.exec('ALTER TABLE prestataire ADD COLUMN siret TEXT');
if (!providerColumns.includes('site_web')) db.exec('ALTER TABLE prestataire ADD COLUMN site_web TEXT');
