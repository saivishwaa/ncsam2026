import express from 'express';
import { body, validationResult } from 'express-validator';
import { getDb, logAudit } from '../db/schema.js';
import { generateRegistrationId, hashIp } from '../services/cryptoService.js';
import { registerLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const VALID_COURSES = [
  'M.Tech Cyber Security',
  'M.Sc Digital Forensics & Information Security',
  'B.Tech - M.Tech Computer Science & Engineering (Cyber Security)',
  'M.Sc Cyber Security',
  'Ph.D. Cyber Security & Digital Forensics',
  'Post Graduate Diploma in Cyber Security',
  'Other'
];

router.post(
  '/register',
  registerLimiter,
  [
    body('fullName')
      .trim()
      .notEmpty().withMessage('Full Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s\.\'-]+$/).withMessage('Name contains invalid characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Mail ID is required')
      .isLength({ min: 5, max: 100 }).withMessage('Email address must be between 5 and 100 characters')
      .isEmail().withMessage('Please enter a valid email address')
      .matches(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/)
      .withMessage('Email address format is invalid')
      .customSanitizer(val => val.trim().toLowerCase()),

    body('course')
      .trim()
      .notEmpty().withMessage('Course selection is required')
      .isLength({ min: 2, max: 50 }).withMessage('Course name must be between 2 and 50 characters'),

    body('privacyConsented')
      .custom(val => val === true || val === 'true')
      .withMessage('You must explicitly acknowledge the privacy notice to participate')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const { fullName, email, course } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const ipHash = hashIp(req.ip);
    const db = getDb();

    // Check duplicate submission by email
    try {
      const existingEmailStmt = db.prepare('SELECT registration_id FROM registrations WHERE email = ? OR phone_number = ?');
      const existingEmail = existingEmailStmt.get(cleanEmail, cleanEmail);

      if (existingEmail) {
        return res.status(409).json({
          error: 'This email address has already been registered for the Lucky Draw event.',
          code: 'DUPLICATE_REGISTRATION',
          registrationId: existingEmail.registration_id
        });
      }

      const registrationId = generateRegistrationId();
      const createdAt = new Date().toISOString();

      db.exec('BEGIN TRANSACTION;');

      const insertRegStmt = db.prepare(`
        INSERT INTO registrations (registration_id, full_name, email, phone_number, course, created_at, ip_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertRegStmt.run(registrationId, fullName, cleanEmail, cleanEmail, course, createdAt, ipHash);

      db.exec('COMMIT;');

      logAudit('STUDENT_REGISTRATION_CREATED', { registrationId, course });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        registrationId,
        createdAt
      });
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      console.error('[REGISTRATION ROUTE ERROR]', err);
      return res.status(500).json({
        error: 'An internal error occurred during registration. Please try again.',
        code: 'SERVER_ERROR'
      });
    }
  }
);

export default router;
