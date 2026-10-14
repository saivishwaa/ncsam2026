export function startKeepAlive() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://luckydraw-2hbe.onrender.com';
  
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const pingUrl = `${renderUrl.replace(/\/$/, '')}/api/health`;
  const INTERVAL_MS = 8 * 60 * 1000; // 8 minutes (Render sleeps after 15 minutes of inactivity)

  console.log(`[KEEP-ALIVE] Initializing 8-minute heartbeat to ${pingUrl} to prevent Render free-tier sleep.`);

  // Initial verification ping 30 seconds after boot
  setTimeout(async () => {
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
      console.log(`[KEEP-ALIVE INITIAL CHECK] Pinged ${pingUrl} - Status: ${res.status}`);
    } catch (err) {
      console.warn(`[KEEP-ALIVE INITIAL WARNING] Initial ping to ${pingUrl} failed: ${err.message}`);
    }
  }, 30000);

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
      console.log(`[KEEP-ALIVE HEARTBEAT] Pinged ${pingUrl} - Status: ${res.status}`);
    } catch (err) {
      console.warn(`[KEEP-ALIVE WARNING] Ping to ${pingUrl} failed: ${err.message}`);
    }
  }, INTERVAL_MS);
}
