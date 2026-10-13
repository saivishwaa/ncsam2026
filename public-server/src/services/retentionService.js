import { getDb, logAudit } from '../db/schema.js';
import { config } from '../config/env.js';

export function purgeExpiredRecords() {
  const db = getDb();
  const retentionDays = config.RETENTION_DAYS || 30;

  // Calculate cutoff timestamp (retentionDays ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  try {
    // Select registration IDs to purge
    const expiredRegsStmt = db.prepare('SELECT registration_id FROM registrations WHERE created_at < ?');
    const expiredRows = expiredRegsStmt.all(cutoffIso);

    if (expiredRows.length === 0) {
      return { purgedCount: 0, cutoffIso };
    }

    const regIds = expiredRows.map(r => r.registration_id);

    // Delete in transaction
    db.exec('BEGIN TRANSACTION;');
    const deleteLocation = db.prepare('DELETE FROM location_consents WHERE registration_id = ?');
    const deleteGame = db.prepare('DELETE FROM game_sessions WHERE registration_id = ?');
    const deleteReg = db.prepare('DELETE FROM registrations WHERE registration_id = ?');

    let purgedCount = 0;
    for (const regId of regIds) {
      deleteLocation.run(regId);
      deleteGame.run(regId);
      deleteReg.run(regId);
      purgedCount++;
    }
    db.exec('COMMIT;');

    logAudit('AUTOMATED_30DAY_RETENTION_PURGE', { purgedCount, cutoffIso });
    console.log(`[RETENTION POLICY] Purged ${purgedCount} records older than ${retentionDays} days (${cutoffIso}).`);
    return { purgedCount, cutoffIso };
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    console.error('[RETENTION PURGE ERROR]', err);
    throw err;
  }
}

export function startRetentionCron() {
  // Run on startup
  purgeExpiredRecords();

  // Run every 24 hours
  setInterval(() => {
    try {
      purgeExpiredRecords();
    } catch (err) {
      console.error('[RETENTION CRON ERROR]', err);
    }
  }, 24 * 60 * 60 * 1000);
}
