import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Encrypts data object using AES-256-GCM and appends SHA-256 HMAC for tamper detection
 */
export function encryptDataPayload(dataObject, secretKeyHex = config.ENCRYPTION_KEY) {
  const key = Buffer.from(secretKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const jsonString = JSON.stringify(dataObject);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const payload = {
    iv: iv.toString('hex'),
    authTag,
    encrypted,
    timestamp: new Date().toISOString()
  };

  const hmac = crypto.createHmac('sha256', key)
    .update(JSON.stringify(payload))
    .digest('hex');

  return {
    ...payload,
    hmac
  };
}

/**
 * Hash IP address for anonymous rate checking / audit matching without storing raw IP
 */
export function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip + config.ENCRYPTION_KEY).digest('hex').substring(0, 16);
}

/**
 * Generate cryptographically strong Random Registration ID (e.g., NFSU-2026-X8F9A2)
 */
export function generateRegistrationId() {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NFSU-2026-${bytes}`;
}
