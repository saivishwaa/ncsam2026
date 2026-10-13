import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { getDb } from './db/schema.js';

import authRoutes from './routes/auth.js';
import importRoutes from './routes/import.js';
import participantRoutes from './routes/participants.js';
import purgeRoutes from './routes/purge.js';

const app = express();

// Security Hardening: Disable Express fingerprinting header
app.disable('x-powered-by');

// ── LOCALHOST ONLY ENFORCEMENT ──────────────────────────────
// Reject any request that did not arrive on 127.0.0.1 / ::1
app.use((req, res, next) => {
  const ip = req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) {
    return res.status(403).json({ error: 'Organiser dashboard is only accessible from localhost.' });
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5001'],
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

app.use(session({
  name: '__ncsam_org_sid',
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Initialize DB
getDb();

// Routes — all under /admin
app.use('/admin', authRoutes);
app.use('/admin', importRoutes);
app.use('/admin', participantRoutes);
app.use('/admin', purgeRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ORGANIZER SERVER ERROR]', err);
  res.status(err.status || 500).json({ error: 'Internal organiser server error' });
});

const PORT = config.PORT || 5001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log('=======================================================');
    console.log('  LUCKY DRAW - ORGANISER DASHBOARD (NCSAM 2026)');
    console.log('  Accessible only from: http://localhost:5001');
    console.log('  Login: adminadmin / adminadmin');
    console.log('=======================================================');
  });
}

export default app;
