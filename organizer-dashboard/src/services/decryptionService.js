import crypto from 'crypto';
import { config } from '../config/env.js';

export function decryptDataPayload(encryptedPackage, secretKeyHex = config.ENCRYPTION_KEY) {
  const { iv, authTag, encrypted, hmac } = encryptedPackage;

  if (!iv || !authTag || !encrypted || !hmac) {
    throw new Error('Invalid export file format: missing required cryptographic components.');
  }

  const key = Buffer.from(secretKeyHex.padEnd(64, '0').slice(0, 64), 'hex');

  // Verify HMAC integrity
  const payloadToVerify = {
    iv,
    authTag,
    encrypted,
    timestamp: encryptedPackage.timestamp
  };

  const calculatedHmac = crypto.createHmac('sha256', key)
    .update(JSON.stringify(payloadToVerify))
    .digest('hex');

  if (calculatedHmac !== hmac) {
    throw new Error('Export file integrity check failed! The file may have been tampered with or corrupted.');
  }

  // Decrypt AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
