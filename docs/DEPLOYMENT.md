# Deployment Guide & QR Code Setup — LUCKY DRAW (NCSAM 2026)
**School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar**

---

## 1. Production Architecture Overview

The system consists of two distinct operational environments:

1. **Public Website Server**: Hosted on an internet-facing HTTPS server (e.g., Render, Vercel, Railway, or AWS EC2).
2. **Private Organizer Laptop**: Runs locally on `http://localhost:5001`.

---

## 2. Public Website Deployment Steps

### Option A: Render / Railway / Node.js Host
1. Push codebase to a Git repository.
2. Create a new Web Service pointing to `public-server`.
3. Set environment variables:
   ```env
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://luckydraw-ncsa2026.nfsu.ac.in
   ENCRYPTION_KEY=64_byte_hex_secret_key
   ORGANIZER_SECRET_PASS=YourStrongExportPassphrase!
   RETENTION_DAYS=30
   ```
4. Build command: `npm install`
5. Start command: `node src/index.js`

### Option B: Frontend Static Hosting (Vercel / Netlify)
1. In `frontend/`, configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Set Environment variable: `VITE_API_BASE_URL=https://your-public-api.onrender.com`

---

## 3. Private Organizer Laptop Setup

1. Open a terminal in `organizer-dashboard/`.
2. Configure `.env`:
   ```env
   PORT=5001
   NODE_ENV=development
   ENCRYPTION_KEY=64_byte_hex_secret_key
   ADMIN_USER=organizer
   ADMIN_PASS=NCSAM_NFSU_2026_Organizer!
   SESSION_SECRET=local_session_secret_key
   ```
3. Start local admin server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:5001`. Log in with username `organizer` and your configured password.

---

## 4. QR Code Poster Generation

Print QR codes pointing **strictly** to the live public HTTPS deployment URL. **Never print QR codes containing `localhost` or `127.0.0.1`!**

### Generating QR Code via Command Line:
Using Node.js:
```bash
npx qrcode "https://luckydraw-ncsa2026.nfsu.ac.in" -o qrcode.png
```

Checklist before printing QR posters:
- [ ] QR code opens `https://` production URL.
- [ ] HTTPS SSL certificate is valid and trusted.
- [ ] Mobile resolution tested on iOS Safari and Android Chrome.
- [ ] Public server environment variable `ORGANIZER_SECRET_PASS` is set.
- [ ] Organizer laptop can authenticate and import test export file.
