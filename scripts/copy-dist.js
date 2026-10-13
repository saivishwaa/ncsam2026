import fs from 'fs';
import path from 'path';

const src = path.resolve('frontend/dist');
const dest = path.resolve('public-server/dist');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log('[BUILD] Successfully copied frontend/dist to public-server/dist');
} else {
  console.warn('[BUILD WARNING] Source frontend/dist does not exist');
}
