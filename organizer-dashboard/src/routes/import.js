import express from 'express';
import multer from 'multer';
import { requireAdminAuth } from '../middleware/auth.js';
import { getDb, logOrganizerAudit } from '../db/schema.js';
import { decryptDataPayload } from '../services/decryptionService.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max upload

router.post('/import', requireAdminAuth, upload.single('exportFile'), (req, res) => {
  try {
    let payload;
    if (req.file) {
      const fileContent = req.file.buffer.toString('utf8');
      payload = JSON.parse(fileContent);
    } else if (req.body?.bundle) {
      payload = typeof req.body.bundle === 'string' ? JSON.parse(req.body.bundle) : req.body.bundle;
    } else {
      return res.status(400).json({ error: 'No encrypted export payload or file provided' });
    }

    const decryptedData = decryptDataPayload(payload);
    const { registrations, locationConsents, gameSessions } = decryptedData;

    const db = getDb();
    const importedAt = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');

    const insertRegStmt = db.prepare(`
      INSERT OR IGNORE INTO imported_registrations (registration_id, full_name, email, phone_number, course, created_at, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLocStmt = db.prepare(`
      INSERT OR IGNORE INTO imported_locations (registration_id, opted_in, latitude, longitude, accuracy, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertGameStmt = db.prepare(`
      INSERT OR IGNORE INTO imported_games (registration_id, outcome, segment_index, created_at)
      VALUES (?, ?, ?, ?)
    `);

    let importedRegsCount = 0;
    if (Array.isArray(registrations)) {
      for (const r of registrations) {
        insertRegStmt.run(r.registration_id, r.full_name, r.email || r.phone_number || '', r.phone_number || r.email || '', r.course, r.created_at, importedAt);
        importedRegsCount++;
      }
    }

    if (Array.isArray(locationConsents)) {
      for (const l of locationConsents) {
        insertLocStmt.run(l.registration_id, l.opted_in, l.latitude, l.longitude, l.accuracy, l.created_at);
      }
    }

    if (Array.isArray(gameSessions)) {
      for (const g of gameSessions) {
        insertGameStmt.run(g.registration_id, g.outcome, g.segment_index, g.created_at);
      }
    }

    db.exec('COMMIT;');

    logOrganizerAudit('DATA_IMPORT_SUCCESS', { count: importedRegsCount, importedAt });

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${importedRegsCount} participant records into organizer database.`,
      importedCount: importedRegsCount,
      importedAt
    });
  } catch (err) {
    try { getDb().exec('ROLLBACK;'); } catch (_) {}
    console.error('[IMPORT ERROR]', err);
    return res.status(400).json({
      error: err.message || 'Failed to import payload',
      code: 'IMPORT_FAILED'
    });
  }
});

export default router;
