import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import { config } from './env.js';

export const configureSecurityHeaders = (app) => {
  // Helmet Content Security Policy & Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", config.FRONTEND_URL, "*"].filter(Boolean),
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })
  );

  // Dynamic CORS configuration: allows configured origins, localhost, and any onrender.com subdomains
  const allowedOrigins = [
    config.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000'
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Direct browser navigation, same-origin calls, mobile apps, or curl
        if (!origin) {
          return callback(null, true);
        }

        // Configured origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Automatically permit Render deployment hosts and local domains
        try {
          const parsed = new URL(origin);
          if (
            parsed.hostname.endsWith('.onrender.com') ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1'
          ) {
            return callback(null, true);
          }
        } catch (_) {}

        // Reject untrusted cross-origin requests safely without throwing 500 error
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
    })
  );
};

// Double-submit CSRF protection middleware generator
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const verifyCsrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;
  const cookieToken = req.cookies?.['XSRF-TOKEN'];

  if (!clientToken || !cookieToken || typeof clientToken !== 'string' || typeof cookieToken !== 'string') {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }

  const clientBuf = Buffer.from(clientToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (clientBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(clientBuf, cookieBuf)) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }
  next();
};
