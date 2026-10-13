import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { configureSecurityHeaders, generateCsrfToken, verifyCsrf } from './config/owasp.js';
import { getDb, logAudit } from './db/schema.js';
import { startRetentionCron } from './services/retentionService.js';

import registrationRoutes from './routes/registration.js';
import locationRoutes from './routes/location.js';
import gameRoutes from './routes/game.js';
import exportRoutes from './routes/export.js';

import rateLimit from 'express-rate-limit';

const app = express();

// Security Hardening: Disable Express fingerprinting header
app.disable('x-powered-by');

// Global Rate Limiter to prevent DoS attacks across all endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.', code: 'GLOBAL_RATE_LIMIT_EXCEEDED' }
});

app.use(globalLimiter);

// Body parsing with strict size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Apply Security Headers & CORS
configureSecurityHeaders(app);

// Initialize DB on server start
getDb();

// Endpoint to fetch CSRF token for SPA
app.get('/api/csrf-token', (req, res) => {
  let token = req.cookies['XSRF-TOKEN'];
  if (!token) {
    token = generateCsrfToken();
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Accessible by frontend JavaScript to send in header
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  res.json({ csrfToken: token });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    event: 'LUCKY DRAW - NCSAM 2026',
    institution: 'School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar',
    organizer: 'Sai Vishwaa N',
    timestamp: new Date().toISOString()
  });
});

// Public API Routes (CSRF verified)
app.use('/api', verifyCsrf, registrationRoutes);
app.use('/api', verifyCsrf, locationRoutes);
app.use('/api', verifyCsrf, gameRoutes);
app.use('/api', verifyCsrf, exportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  logAudit('SERVER_ERROR_UNHANDLED', { message: err.message });
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// Start 30-day retention cron job
startRetentionCron();

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`=======================================================`);
    console.log(`  LUCKY DRAW - PUBLIC SERVER (NCSAM 2026)`);
    console.log(`  SCSDF, NFSU Gandhinagar | Created by Sai Vishwaa N`);
    console.log(`  Running on: http://localhost:${config.PORT}`);
    console.log(`=======================================================`);
  });
}

export default app;
