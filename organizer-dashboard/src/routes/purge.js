import express from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { getDb, getPublicDb, logOrganizerAudit } from '../db/schema.js';
import { config } from '../config/env.js';

const router = express.Router();

router.get('/retention-status', requireAdminAuth, (req, res) => {
  const db = getDb();
  const publicDb = getPublicDb();
  const retentionDays = config.RETENTION_DAYS || 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  try {
    let total = db.prepare('SELECT COUNT(*) as total FROM imported_registrations').get().total;
    let expired = db.prepare('SELECT COUNT(*) as expired FROM imported_registrations WHERE created_at < ?').get(cutoffIso).expired;

    if (publicDb) {
      total += publicDb.prepare('SELECT COUNT(*) as total FROM registrations').get().total;
      expired += publicDb.prepare('SELECT COUNT(*) as expired FROM registrations WHERE created_at < ?').get(cutoffIso).expired;
    }

    return res.json({
      success: true,
      retentionPolicyDays: retentionDays,
      cutoffDate: cutoffIso,
      totalRecords: total,
      expiredRecordsCount: expired
    });
  } catch (err) {
    console.error('[RETENTION STATUS ERROR]', err);
    return res.status(500).json({ error: 'Failed to calculate retention status' });
  }
});

router.post('/purge', requireAdminAuth, (req, res) => {
  const db = getDb();
  const publicDb = getPublicDb();
  const retentionDays = config.RETENTION_DAYS || 30;
  const expiredOnly = req.body?.expiredOnly === true;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  try {
    let purgedCount = 0;

    if (expiredOnly) {
      // 1. Purge only expired imported records
      const expiredRows = db.prepare('SELECT registration_id FROM imported_registrations WHERE created_at < ?').all(cutoffIso);
      if (expiredRows.length > 0) {
        db.exec('BEGIN TRANSACTION;');
        const delLoc = db.prepare('DELETE FROM imported_locations WHERE registration_id = ?');
        const delGame = db.prepare('DELETE FROM imported_games WHERE registration_id = ?');
        const delReg = db.prepare('DELETE FROM imported_registrations WHERE registration_id = ?');
        for (const row of expiredRows) {
          try { delGame.run(row.registration_id); } catch (_) {}
          try { delLoc.run(row.registration_id); } catch (_) {}
          try { delReg.run(row.registration_id); } catch (_) {}
          purgedCount++;
        }
        db.exec('COMMIT;');
      }

      // 2. Purge only expired public records
      if (publicDb) {
        const publicExpired = publicDb.prepare('SELECT registration_id FROM registrations WHERE created_at < ?').all(cutoffIso);
        if (publicExpired.length > 0) {
          publicDb.exec('BEGIN TRANSACTION;');
          const delPublicLoc = publicDb.prepare('DELETE FROM location_consents WHERE registration_id = ?');
          const delPublicGame = publicDb.prepare('DELETE FROM game_sessions WHERE registration_id = ?');
          const delPublicReg = publicDb.prepare('DELETE FROM registrations WHERE registration_id = ?');
          for (const row of publicExpired) {
            try { delPublicLoc.run(row.registration_id); } catch (_) {}
            try { delPublicGame.run(row.registration_id); } catch (_) {}
            try { delPublicReg.run(row.registration_id); } catch (_) {}
            purgedCount++;
          }
          publicDb.exec('COMMIT;');
        }
      }

      logOrganizerAudit('RETENTION_PURGE_EXPIRED', { purgedCount, cutoffIso });

      return res.json({
        success: true,
        message: `Successfully purged ${purgedCount} expired records older than ${retentionDays} days.`,
        purgedCount
      });
    } else {
      // ── PERMANENTLY PURGE ALL PARTICIPANT RECORDS ─────────────
      // Delete from organizer database
      const importedCount = db.prepare('SELECT COUNT(*) as c FROM imported_registrations').get()?.c || 0;
      db.exec('BEGIN TRANSACTION;');
      db.exec('DELETE FROM imported_locations;');
      db.exec('DELETE FROM imported_games;');
      db.exec('DELETE FROM imported_registrations;');
      db.exec('COMMIT;');
      purgedCount += importedCount;

      // Delete from public live database
      if (publicDb) {
        const publicCount = publicDb.prepare('SELECT COUNT(*) as c FROM registrations').get()?.c || 0;
        publicDb.exec('BEGIN TRANSACTION;');
        publicDb.exec('DELETE FROM location_consents;');
        publicDb.exec('DELETE FROM game_sessions;');
        publicDb.exec('DELETE FROM registrations;');
        publicDb.exec('COMMIT;');
        purgedCount += publicCount;
      }

      logOrganizerAudit('ADMIN_MANUAL_PURGE_ALL', {
        purgedCount,
        adminUser: req.session?.adminUser || 'adminadmin'
      });

      return res.json({
        success: true,
        message: `All ${purgedCount} participant records have been permanently purged.`,
        purgedCount
      });
    }
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    if (publicDb) { try { publicDb.exec('ROLLBACK;'); } catch (_) {} }
    console.error('[MANUAL PURGE ERROR]', err);
    return res.status(500).json({ error: 'Failed to purge participant records: ' + err.message });
  }
});

export default router;
