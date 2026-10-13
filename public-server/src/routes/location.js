import express from 'express';
import { body, validationResult } from 'express-validator';
import { getDb, logAudit } from '../db/schema.js';
import { locationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post(
  '/location',
  locationLimiter,
  [
    body('registrationId')
      .trim()
      .notEmpty().withMessage('Registration ID is required')
      .matches(/^NFSU-2026-[A-F0-9]{8}$/).withMessage('Invalid Registration ID format'),

    body('optedIn')
      .isBoolean().withMessage('optedIn must be a boolean'),

    body('latitude')
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

    body('longitude')
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

    body('accuracy')
      .optional({ nullable: true })
      .isFloat({ min: 0 }).withMessage('Invalid accuracy value')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const { registrationId, optedIn, latitude, longitude, accuracy } = req.body;
    const db = getDb();

    try {
      // Verify registration exists
      const regStmt = db.prepare('SELECT registration_id FROM registrations WHERE registration_id = ?');
      const regExists = regStmt.get(registrationId);

      if (!regExists) {
        return res.status(404).json({
          error: 'Registration ID not found',
          code: 'REGISTRATION_NOT_FOUND'
        });
      }

      // Round coordinates to 3 decimal places to minimize exact location exposure while demonstrating coordinate capture (~110 meters precision)
      const roundedLat = latitude !== undefined && latitude !== null ? Math.round(latitude * 1000) / 1000 : null;
      const roundedLng = longitude !== undefined && longitude !== null ? Math.round(longitude * 1000) / 1000 : null;
      const createdAt = new Date().toISOString();

      const insertLocationStmt = db.prepare(`
        INSERT INTO location_consents (registration_id, opted_in, latitude, longitude, accuracy, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLocationStmt.run(registrationId, optedIn ? 1 : 0, roundedLat, roundedLng, accuracy || null, createdAt);

      logAudit('LOCATION_PERMISSION_DECISION', { registrationId, optedIn });

      return res.status(200).json({
        success: true,
        message: optedIn ? 'Location recorded for demonstration' : 'Location collection skipped',
        registrationId,
        optedIn
      });
    } catch (err) {
      console.error('[LOCATION ROUTE ERROR]', err);
      return res.status(500).json({
        error: 'An internal error occurred saving location response',
        code: 'SERVER_ERROR'
      });
    }
  }
);

export default router;
