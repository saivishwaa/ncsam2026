import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(config.DB_PATH);

  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_hash2 TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS imported_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone_number TEXT NOT NULL DEFAULT '',
      course TEXT NOT NULL,
      created_at TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS imported_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT NOT NULL,
      opted_in INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(registration_id) REFERENCES imported_registrations(registration_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS imported_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT UNIQUE NOT NULL,
      outcome TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(registration_id) REFERENCES imported_registrations(registration_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organizer_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  try {
    dbInstance.exec('ALTER TABLE admin_users ADD COLUMN password_hash2 TEXT;');
  } catch (_) {}

  try {
    dbInstance.exec('ALTER TABLE imported_registrations ADD COLUMN email TEXT;');
  } catch (_) {}

  // Ensure administrator account exists with dual password hashes
  const hash1 = bcrypt.hashSync(config.ADMIN_PASS1, 10);
  const hash2 = bcrypt.hashSync(config.ADMIN_PASS2, 10);

  const checkAdmin = dbInstance.prepare('SELECT id FROM admin_users WHERE username = ?');
  const adminExists = checkAdmin.get(config.ADMIN_USER);

  if (!adminExists) {
    const insertAdmin = dbInstance.prepare('INSERT INTO admin_users (username, password_hash, password_hash2, created_at) VALUES (?, ?, ?, ?)');
    insertAdmin.run(config.ADMIN_USER, hash1, hash2, new Date().toISOString());
    console.log(`[ORGANIZER DB] Created default admin user: ${config.ADMIN_USER}`);
  } else {
    const updateAdmin = dbInstance.prepare('UPDATE admin_users SET password_hash = ?, password_hash2 = ? WHERE username = ?');
    updateAdmin.run(hash1, hash2, config.ADMIN_USER);
  }

  return dbInstance;
}

export function logOrganizerAudit(action, details = '') {
  try {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO organizer_audit_logs (action, details, created_at) VALUES (?, ?, ?)');
    stmt.run(action, typeof details === 'object' ? JSON.stringify(details) : String(details), new Date().toISOString());
  } catch (err) {
    console.error('[ORGANIZER AUDIT LOG ERROR]', err.message);
  }
}

let publicDbInstance = null;

export function getPublicDb() {
  if (publicDbInstance) {
    try {
      publicDbInstance.prepare('SELECT 1').get();
      return publicDbInstance;
    } catch (_) {
      publicDbInstance = null;
    }
  }

  const possiblePaths = [
    path.join(process.cwd(), '../public-server/public_data.db'),
    path.join(process.cwd(), 'public_data.db'),
    path.join(process.cwd(), 'public-server/public_data.db'),
    'd:/ncsam 2026/lucky-draw-v2/lucky-draw/public-server/public_data.db'
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      try {
        const instance = new DatabaseSync(dbPath);
        instance.exec('PRAGMA journal_mode = WAL;');
        instance.exec('PRAGMA foreign_keys = ON;');
        publicDbInstance = instance;
        return publicDbInstance;
      } catch (err) {
        console.error('[PUBLIC DB OPEN ERROR]', err.message);
      }
    }
  }
  return null;
}
