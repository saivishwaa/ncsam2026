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

export default router;
