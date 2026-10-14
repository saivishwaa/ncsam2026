export function startKeepAlive() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://luckydraw-2hbe.onrender.com';
  
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_KEEP_ALIVE) {
    return;
  }

  const pingUrl = `${renderUrl.replace(/\/$/, '')}/api/health`;
  const INTERVAL_MS = 9 * 60 * 1000; // 9 minutes (Render free tier sleeps after 15 minutes of inactivity)

  console.log(`[KEEP-ALIVE] Initializing 9-minute heartbeat to ${pingUrl} to prevent Render free-tier sleep.`);

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
      console.log(`[KEEP-ALIVE HEARTBEAT] Pinged ${pingUrl} - Status: ${res.status}`);
    } catch (err) {
      console.warn(`[KEEP-ALIVE WARNING] Ping to ${pingUrl} failed: ${err.message}`);
    }
  }, INTERVAL_MS);
}
