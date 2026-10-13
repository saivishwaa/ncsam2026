import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const DEFAULT_SECRET = 'ncsam2026_nfsu_scsdf_super_secret_master_key_change_in_prod_32b';

export const config = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'organizer_data.db'),
  SESSION_SECRET: process.env.SESSION_SECRET || 'ncsam_2026_organizer_session_secret_key_88f',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update(DEFAULT_SECRET).digest('hex'),
  ADMIN_USER: process.env.ADMIN_USER || 'adminadmin',
  ADMIN_PASS1: process.env.ADMIN_PASS1 || 'Sai@1234@1234',
  ADMIN_PASS2: process.env.ADMIN_PASS2 || 'Sai@1234',
  ADMIN_PASS: process.env.ADMIN_PASS || 'Sai@1234@1234',
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30', 10)
};
