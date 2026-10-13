import express from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { getDb, getPublicDb } from '../db/schema.js';
import { generateParticipantsCsv } from '../services/csvExporter.js';

const router = express.Router();

function getCombinedParticipants() {
  const organizerDb = getDb();
  const publicDb = getPublicDb();
  const map = new Map();

  // 1. Fetch live registrations from public_data.db
  if (publicDb) {
    try {
      const liveRows = publicDb.prepare(`
        SELECT
          r.registration_id, r.full_name,
          COALESCE(r.email, r.phone_number) AS email,
          COALESCE(r.phone_number, r.email) AS phone_number,
          r.course, r.created_at,
          g.outcome,
          CASE WHEN g.registration_id IS NOT NULL THEN 1 ELSE 0 END AS game_completed,
          l.opted_in  AS location_opted_in,
          l.latitude, l.longitude
        FROM registrations r
        LEFT JOIN game_sessions     g ON r.registration_id = g.registration_id
        LEFT JOIN location_consents l ON r.registration_id = l.registration_id
        ORDER BY r.id DESC
      `).all();

      for (const row of liveRows) {
        map.set(row.registration_id, row);
      }
    } catch (err) {
      console.error('[LIVE PARTICIPANTS FETCH ERROR]', err.message);
    }
  }

  // 2. Fetch imported registrations from organizer_data.db
  try {
    const importedRows = organizerDb.prepare(`
      SELECT
        r.registration_id, r.full_name,
        COALESCE(r.email, r.phone_number) AS email,
        COALESCE(r.phone_number, r.email) AS phone_number,
        r.course, r.created_at,
        g.outcome,
        CASE WHEN g.registration_id IS NOT NULL THEN 1 ELSE 0 END AS game_completed,
        l.opted_in  AS location_opted_in,
        l.latitude, l.longitude
      FROM imported_registrations r
      LEFT JOIN imported_games     g ON r.registration_id = g.registration_id
      LEFT JOIN imported_locations l ON r.registration_id = l.registration_id
      ORDER BY r.id DESC
    `).all();

    for (const row of importedRows) {
      if (!map.has(row.registration_id)) {
        map.set(row.registration_id, row);
      }
    }
  } catch (err) {
    console.error('[IMPORTED PARTICIPANTS FETCH ERROR]', err.message);
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

router.get('/participants', requireAdminAuth, (req, res) => {
  const query = req.query.search ? req.query.search.trim().toLowerCase() : '';
  const page   = parseInt(req.query.page  || '1',  10);
  const limit  = parseInt(req.query.limit || '15', 10);

  try {
    let all = getCombinedParticipants();

    if (query) {
      all = all.filter(r =>
        (r.full_name && r.full_name.toLowerCase().includes(query)) ||
        (r.email && r.email.toLowerCase().includes(query)) ||
        (r.phone_number && r.phone_number.toLowerCase().includes(query)) ||
        (r.registration_id && r.registration_id.toLowerCase().includes(query)) ||
        (r.course && r.course.toLowerCase().includes(query))
      );
    }

    const total = all.length;
    const offset = (page - 1) * limit;
    const rows = all.slice(offset, offset + limit);

    return res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit) || 1, participants: rows });
  } catch (err) {
    console.error('[PARTICIPANTS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch participant records' });
  }
});

router.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const all = getCombinedParticipants();
    const totalRegistrations = all.length;
    const completedGames     = all.filter(r => r.game_completed === 1).length;
    const locationOptIns     = all.filter(r => r.location_opted_in === 1).length;

    return res.json({ success: true, stats: { totalRegistrations, completedGames, locationOptIns } });
  } catch (err) {
    console.error('[STATS ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/export/csv', requireAdminAuth, (req, res) => {
  try {
    const rows = getCombinedParticipants();
    const csv = generateParticipantsCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="luckydraw_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[CSV EXPORT ERROR]', err);
    return res.status(500).json({ error: 'CSV export failed' });
  }
});

export default router;
