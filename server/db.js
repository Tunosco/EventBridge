import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dataDirectory = path.resolve('data');
fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, 'eventbridge.sqlite'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.resolve('server/schema.sql'), 'utf8'));
