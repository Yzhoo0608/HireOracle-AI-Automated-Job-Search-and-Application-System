const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = './data/database.sqlite';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables.map(t => t.name)));
