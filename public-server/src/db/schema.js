import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

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
