import express from 'express';
import { body, validationResult } from 'express-validator';
import { getDb, logAudit } from '../db/schema.js';
import { spinLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/env.js';

const router = express.Router();

// Must match SEGMENTS array in frontend/src/components/WheelCanvas.jsx (same indices)
const SEGMENTS = [
  { index: 0, title: 'Mobile Phone',          probability: 0.10 },
  { index: 1, title: 'Treasure Hunt Ticket',  probability: 0.20 },
  { index: 2, title: 'One More Spin',          probability: 0.25 },
  { index: 3, title: 'Better Luck Next Time',  probability: 0.45 },
];

function determineOutcome() {
  const rand = Math.random();
  let cumulative = 0;
  for (const seg of SEGMENTS) {
    cumulative += seg.probability;
    if (rand <= cumulative) return seg;
  }
  return SEGMENTS[3];
}

router.post(
  '/game/spin',
  spinLimiter,
  [
    body('registrationId')
      .trim()
      .notEmpty().withMessage('Registration ID is required')
      .matches(/^NFSU-2026-[A-F0-9]{8}$/).withMessage('Invalid Registration ID format'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
    }

    const { registrationId } = req.body;
    const db = getDb();

    try {
      const reg = db.prepare('SELECT registration_id FROM registrations WHERE registration_id = ?').get(registrationId);
      if (!reg) return res.status(404).json({ error: 'Registration not found.', code: 'REGISTRATION_NOT_FOUND' });

      // replay-resistant: return same outcome on second request
      const existing = db.prepare('SELECT * FROM game_sessions WHERE registration_id = ?').get(registrationId);
      if (existing) {
        return res.status(200).json({
          success: true, replayed: true,
          registrationId,
          outcome: existing.outcome,
          segmentIndex: existing.segment_index,
        });
      }

      const chosen = determineOutcome();
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO game_sessions (registration_id, outcome, segment_index, created_at, completed_at) VALUES (?, ?, ?, ?, ?)`)
        .run(registrationId, chosen.title, chosen.index, now, now);

      logAudit('GAME_SPIN_COMPLETED', { registrationId, outcome: chosen.title });
      console.log('[PERMANENT_GAME_RECORD]', JSON.stringify({ registrationId, outcome: chosen.title, segmentIndex: chosen.index, createdAt: now }));

      // Cloud Mirror (Google Sheets / Formspree / Webhook) - Asynchronous zero-loss mirror
      const mirrorUrl = config.CLOUD_BACKUP_WEBHOOK_URL || process.env.FORMSPREE_URL;
      if (mirrorUrl) {
        fetch(mirrorUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            event: 'GAME_SPIN',
            registrationId,
            outcome: chosen.title,
            segmentIndex: chosen.index,
            completedAt: now
          }),
          signal: AbortSignal.timeout(5000)
        }).catch(err => console.warn('[CLOUD MIRROR WARNING]', err.message));
      }

      return res.status(201).json({
        success: true, replayed: false,
        registrationId,
        outcome: chosen.title,
        segmentIndex: chosen.index,
      });
    } catch (err) {
      console.error('[GAME SPIN ERROR]', err);
      return res.status(500).json({ error: 'Internal server error.', code: 'SERVER_ERROR' });
    }
  }
);

export default router;
