import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getDb, logAudit } from '../db/schema.js';
import { config } from '../config/env.js';

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || 'adminadmin';
const ADMIN_PASS1 = process.env.ADMIN_PASS1 || 'Sai@1234@1234';
const ADMIN_PASS2 = process.env.ADMIN_PASS2 || 'Sai@1234';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createAdminToken(user) {
  const payload = `${user}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [user, tsStr, sig] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > 8 * 60 * 60 * 1000) return false;
  const payload = `${user}:${tsStr}`;
  const expected = crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(payload).digest('hex');
  const bSig = Buffer.from(sig);
  const bExp = Buffer.from(expected);
  if (bSig.length !== bExp.length) return false;
  return crypto.timingSafeEqual(bSig, bExp);
}

const requireAdminAuth = (req, res, next) => {
  const token = req.cookies['__ncsam_admin_token'];
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized administrator access' });
  }
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.', code: 'TOO_MANY_REQUESTS' },
  standardHeaders: true,
  legacyHeaders: false
});

// Check active admin session
router.get('/session', (req, res) => {
  const token = req.cookies['__ncsam_admin_token'];
  const isAuthed = verifyAdminToken(token);
  res.json({ authenticated: isAuthed });
});

// Admin Authentication with Dual Passwords
router.post('/login', loginLimiter, (req, res) => {
  const { username, password, password2, passkey } = req.body || {};
  const secondary = password2 || passkey;

  if (!username || !password || !secondary) {
    return res.status(400).json({ error: 'Username and both passwords are required' });
  }

  const uMatch = safeCompare(username, ADMIN_USER);
  const p1Match = safeCompare(password, ADMIN_PASS1);
  const p2Match = safeCompare(secondary, ADMIN_PASS2);

  if (!uMatch || !p1Match || !p2Match) {
    logAudit('ADMIN_LOGIN_FAILED', { username, ip: req.ip });
    return res.status(401).json({ error: 'Invalid administrator credentials' });
  }

  const token = createAdminToken(username);
  res.cookie('__ncsam_admin_token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  logAudit('ADMIN_LOGIN_SUCCESS', { username, ip: req.ip });
  return res.json({ success: true, message: 'Admin authenticated successfully' });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('__ncsam_admin_token');
  res.json({ success: true, message: 'Logged out' });
});

// Aggregated Stats
router.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const totalReg = db.prepare('SELECT COUNT(*) as c FROM registrations').get()?.c || 0;
    const completed = db.prepare('SELECT COUNT(*) as c FROM game_sessions').get()?.c || 0;
    const locationGrants = db.prepare('SELECT COUNT(*) as c FROM location_consents WHERE opted_in = 1').get()?.c || 0;

    return res.json({
      success: true,
      stats: {
        totalRegistrations: totalReg,
        completedGames: completed,
        locationOptIns: locationGrants
      }
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Participant List with Search and Pagination
router.get('/participants', requireAdminAuth, (req, res) => {
  const query = req.query.search ? req.query.search.trim().toLowerCase() : '';
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '15', 10)));

  try {
    const db = getDb();
    let rows = db.prepare(`
      SELECT
        r.registration_id,
        r.full_name,
        COALESCE(r.email, r.phone_number) AS email,
        COALESCE(r.phone_number, r.email) AS phone_number,
        r.course,
        r.created_at,
        g.outcome,
        CASE WHEN g.registration_id IS NOT NULL THEN 1 ELSE 0 END AS game_completed,
        l.opted_in AS location_opted_in,
        l.latitude,
        l.longitude
      FROM registrations r
      LEFT JOIN game_sessions g ON r.registration_id = g.registration_id
      LEFT JOIN location_consents l ON r.registration_id = l.registration_id
      ORDER BY r.id DESC
    `).all();

    if (query) {
      rows = rows.filter(r =>
        (r.full_name && r.full_name.toLowerCase().includes(query)) ||
        (r.email && r.email.toLowerCase().includes(query)) ||
        (r.phone_number && r.phone_number.toLowerCase().includes(query)) ||
        (r.registration_id && r.registration_id.toLowerCase().includes(query)) ||
        (r.course && r.course.toLowerCase().includes(query))
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const paged = rows.slice(offset, offset + limit);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      participants: paged
    });
  } catch (err) {
    console.error('[ADMIN PARTICIPANTS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// CSV Export (Safe against CSV Injection)
router.get('/export/csv', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        r.registration_id,
        r.full_name,
        COALESCE(r.email, r.phone_number) AS email,
        r.course,
        r.created_at,
        g.outcome,
        l.opted_in,
        l.latitude,
        l.longitude
      FROM registrations r
      LEFT JOIN game_sessions g ON r.registration_id = g.registration_id
      LEFT JOIN location_consents l ON r.registration_id = l.registration_id
      ORDER BY r.id DESC
    `).all();

    const sanitize = (val) => {
      if (val === null || val === undefined) return '""';
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Registration ID',
      'Full Name',
      'Mail ID / Email',
      'Course / Program',
      'Registered Date (UTC)',
      'Outcome',
      'Location Consent',
      'Latitude',
      'Longitude'
    ];

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      csvLines.push([
        sanitize(r.registration_id),
        sanitize(r.full_name),
        sanitize(r.email),
        sanitize(r.course),
        sanitize(r.created_at),
        sanitize(r.outcome || 'Not Played'),
        sanitize(r.opted_in === 1 ? 'Allowed' : (r.opted_in === 0 ? 'Skipped' : 'Pending')),
        sanitize(r.latitude ?? ''),
        sanitize(r.longitude ?? '')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="luckydraw_${Date.now()}.csv"`);
    return res.status(200).send(csvLines.join('\n'));
  } catch (err) {
    console.error('[ADMIN CSV ERROR]', err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Purge Records
router.post('/purge', requireAdminAuth, (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM registrations').get()?.c || 0;

    db.exec('BEGIN TRANSACTION;');
    db.exec('DELETE FROM location_consents;');
    db.exec('DELETE FROM game_sessions;');
    db.exec('DELETE FROM registrations;');
    db.exec('COMMIT;');

    logAudit('ADMIN_MANUAL_PURGE_ALL', { purgedCount: count });

    return res.json({
      success: true,
      message: `All ${count} participant records have been permanently purged.`,
      purgedCount: count
    });
  } catch (err) {
    try { getDb().exec('ROLLBACK;'); } catch (_) {}
    console.error('[ADMIN PURGE ERROR]', err);
    return res.status(500).json({ error: 'Failed to purge participant records' });
  }
});

// Manually Add / Recover Single Participant
router.post('/add-participant', requireAdminAuth, (req, res) => {
  const { fullName, email, course, outcome, locationOptedIn } = req.body || {};
  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const db = getDb();

  try {
    const existing = db.prepare('SELECT registration_id FROM registrations WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'A record with this email already exists: ' + existing.registration_id });
    }

    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const registrationId = `NFSU-2026-${hex}`;
    const createdAt = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    const insReg = db.prepare(`
      INSERT INTO registrations (registration_id, full_name, email, phone_number, course, created_at, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insReg.run(registrationId, fullName.trim(), cleanEmail, cleanEmail, course || 'Other', createdAt, 'admin_manual');

    if (locationOptedIn !== undefined && locationOptedIn !== null) {
      const insLoc = db.prepare(`
        INSERT INTO location_consents (registration_id, opted_in, latitude, longitude, accuracy, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insLoc.run(registrationId, locationOptedIn ? 1 : 0, locationOptedIn ? 23.216 : null, locationOptedIn ? 72.637 : null, 15, createdAt);
    }

    if (outcome) {
      const insGame = db.prepare(`
        INSERT INTO game_sessions (registration_id, outcome, segment_index, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      insGame.run(registrationId, outcome, 1, createdAt, createdAt);
    }

    db.exec('COMMIT;');
    logAudit('ADMIN_MANUAL_ADD_PARTICIPANT', { registrationId, fullName, cleanEmail });
    console.log('[PERMANENT_REGISTRATION_RECORD]', JSON.stringify({ registrationId, fullName, email: cleanEmail, course: course || 'Other', createdAt, source: 'admin_manual' }));

    return res.status(201).json({
      success: true,
      message: 'Participant record created successfully.',
      registrationId
    });
  } catch (err) {
    try { getDb().exec('ROLLBACK;'); } catch (_) {}
    console.error('[ADMIN ADD PARTICIPANT ERROR]', err);
    return res.status(500).json({ error: 'Failed to add participant: ' + err.message });
  }
});

// Bulk Import / Restore Records
router.post('/import-records', requireAdminAuth, (req, res) => {
  const records = req.body?.records;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Array of records is required.' });
  }

  try {
    const db = getDb();
    db.exec('BEGIN TRANSACTION;');
    const insReg = db.prepare(`
      INSERT OR IGNORE INTO registrations (registration_id, full_name, email, phone_number, course, created_at, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insLoc = db.prepare(`
      INSERT OR IGNORE INTO location_consents (registration_id, opted_in, latitude, longitude, accuracy, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insGame = db.prepare(`
      INSERT OR IGNORE INTO game_sessions (registration_id, outcome, segment_index, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    let imported = 0;
    for (const r of records) {
      if (!r.registration_id || !r.full_name) continue;
      const cleanEmail = (r.email || r.phone_number || '').trim().toLowerCase();
      insReg.run(r.registration_id, r.full_name, cleanEmail, cleanEmail, r.course || 'Other', r.created_at || new Date().toISOString(), 'admin_imported');
      if (r.location_opted_in !== undefined && r.location_opted_in !== null) {
        insLoc.run(r.registration_id, r.location_opted_in ? 1 : 0, r.latitude || null, r.longitude || null, 15, r.created_at || new Date().toISOString());
      }
      if (r.outcome) {
        insGame.run(r.registration_id, r.outcome, r.segment_index || 1, r.created_at || new Date().toISOString(), r.created_at || new Date().toISOString());
      }
      imported++;
    }
    db.exec('COMMIT;');
    logAudit('ADMIN_MANUAL_IMPORT', { importedCount: imported });
    return res.json({ success: true, message: `Successfully imported ${imported} records.`, importedCount: imported });
  } catch (err) {
    try { getDb().exec('ROLLBACK;'); } catch (_) {}
    return res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
