import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(config.DB_PATH);

  // Enable WAL mode for performance & foreign keys
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone_number TEXT NOT NULL DEFAULT '',
      course TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ip_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS location_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT NOT NULL,
      opted_in INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT UNIQUE NOT NULL,
      outcome TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY(registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reg_id ON registrations(registration_id);
    CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at);
    CREATE INDEX IF NOT EXISTS idx_loc_reg ON location_consents(registration_id);
    CREATE INDEX IF NOT EXISTS idx_game_reg ON game_sessions(registration_id);
  `);

  try {
    dbInstance.exec('ALTER TABLE registrations ADD COLUMN email TEXT;');
  } catch (_) {}

  try {
    dbInstance.exec('CREATE INDEX IF NOT EXISTS idx_reg_email ON registrations(email);');
  } catch (_) {}

  // Auto-seed persistent records if DB is empty (ensures data persistence on Render ephemeral containers)
  try {
    const regCount = dbInstance.prepare('SELECT COUNT(*) as c FROM registrations').get()?.c || 0;
    if (regCount === 0) {
      const seedFile = path.join(__dirname, 'initial_seed.json');
      if (fs.existsSync(seedFile)) {
        const raw = fs.readFileSync(seedFile, 'utf-8');
        const seed = JSON.parse(raw);
        dbInstance.exec('BEGIN TRANSACTION;');
        const insReg = dbInstance.prepare(`
          INSERT OR IGNORE INTO registrations (registration_id, full_name, email, phone_number, course, created_at, ip_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insLoc = dbInstance.prepare(`
          INSERT OR IGNORE INTO location_consents (registration_id, opted_in, latitude, longitude, accuracy, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insGame = dbInstance.prepare(`
          INSERT OR IGNORE INTO game_sessions (registration_id, outcome, segment_index, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        const insAudit = dbInstance.prepare(`
          INSERT OR IGNORE INTO audit_logs (id, event_type, details, created_at)
          VALUES (?, ?, ?, ?)
        `);
        for (const r of (seed.registrations || [])) {
          insReg.run(r.registration_id, r.full_name, r.email || r.phone_number, r.phone_number, r.course, r.created_at, r.ip_hash || 'seed');
        }
        for (const l of (seed.locations || [])) {
          insLoc.run(l.registration_id, l.opted_in, l.latitude, l.longitude, l.accuracy, l.created_at);
        }
        for (const g of (seed.games || [])) {
          insGame.run(g.registration_id, g.outcome, g.segment_index || 1, g.created_at, g.completed_at || g.created_at);
        }
        for (const a of (seed.audit || [])) {
          insAudit.run(a.id, a.event_type, a.details, a.created_at);
        }
        dbInstance.exec('COMMIT;');
        console.log(`[SEED] Auto-seeded ${seed.registrations?.length || 0} initial participant records.`);
      }
    }
  } catch (seedErr) {
    console.error('[SEED ERROR]', seedErr.message);
  }

  return dbInstance;
}

export function logAudit(eventType, details = '') {
  try {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO audit_logs (event_type, details, created_at) VALUES (?, ?, ?)');
    stmt.run(eventType, typeof details === 'object' ? JSON.stringify(details) : String(details), new Date().toISOString());
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}
