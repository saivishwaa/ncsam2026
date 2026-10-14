import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const DEFAULT_SECRET = 'ncsam2026_nfsu_scsdf_super_secret_master_key_change_in_prod_32b';

export const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH || (process.env.NODE_ENV === 'test' ? path.join(process.cwd(), 'test_public_data.db') : path.join(process.cwd(), 'public_data.db')),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update(DEFAULT_SECRET).digest('hex'),
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30', 10),
  EVENT_DATE: process.env.EVENT_DATE || '2026-10-31',
  ORGANIZER_SECRET_PASS: process.env.ORGANIZER_SECRET_PASS || 'NCSAM_NFSU_2026_Export_Key'
};
