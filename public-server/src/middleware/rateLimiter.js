import rateLimit from 'express-rate-limit';

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 registrations per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration requests from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const locationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many location requests from this IP.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const spinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many game requests.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Export rate limit exceeded.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
