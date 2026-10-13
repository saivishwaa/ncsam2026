import express from 'express';
import crypto from 'crypto';
import { getDb, logAudit } from '../db/schema.js';
import { encryptDataPayload } from '../services/cryptoService.js';
import { exportLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/env.js';

const router = express.Router();

router.post('/export', exportLimiter, (req, res) => {
  const authHeader = req.headers['x-organizer-pass'] || req.body?.secretPass;

  let isValidPass = false;
  if (authHeader && typeof authHeader === 'string') {
    const authBuf = Buffer.from(authHeader);
    const expectedBuf = Buffer.from(config.ORGANIZER_SECRET_PASS);
    if (authBuf.length === expectedBuf.length && crypto.timingSafeEqual(authBuf, expectedBuf)) {
      isValidPass = true;
    }
  }

  if (!isValidPass) {
    logAudit('EXPORT_UNAUTHORIZED_ATTEMPT', { ip: req.ip });
    return res.status(401).json({
      error: 'Unauthorized organizer pass key',
      code: 'UNAUTHORIZED_EXPORT'
    });
  }

  const db = getDb();

  try {
    const registrations = db.prepare('SELECT * FROM registrations ORDER BY id ASC').all();
    const locationConsents = db.prepare('SELECT * FROM location_consents ORDER BY id ASC').all();
    const gameSessions = db.prepare('SELECT * FROM game_sessions ORDER BY id ASC').all();

    const dataPackage = {
      event: 'NCSAM 2026 - LUCKY DRAW',
      exportedAt: new Date().toISOString(),
      counts: {
        registrations: registrations.length,
        locationConsents: locationConsents.length,
        gameSessions: gameSessions.length
      },
      registrations,
      locationConsents,
      gameSessions
    };

    const encryptedBundle = encryptDataPayload(dataPackage, config.ENCRYPTION_KEY);

    logAudit('ENCRYPTED_DATA_EXPORT_SUCCESS', { recordCount: registrations.length });

    return res.status(200).json({
      success: true,
      filename: `luckydraw_export_${Date.now()}.enc`,
      bundle: encryptedBundle
    });
  } catch (err) {
    console.error('[EXPORT ROUTE ERROR]', err);
    return res.status(500).json({
      error: 'Failed to generate encrypted data export',
      code: 'EXPORT_FAILED'
    });
  }
});

export default router;
