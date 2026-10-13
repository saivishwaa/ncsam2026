# LUCKY DRAW - NCSAM 2026
## Full-Stack Cybersecurity Awareness Web Application

**School of Cyber Security and Digital Forensics (SCSDF)**  
**National Forensic Sciences University (NFSU), Gandhinagar, Gujarat, India**  
*Created with love by Sai Vishwaa N - SCSDF, NFSU Gandhinagar.*

---

## 1. About the Project

**Lucky Draw** is an interactive, production-quality cybersecurity awareness web application built for National Cyber Security Awareness Month (NCSAM) 2026. 

The application simulates the user journey of an online promotional lucky draw to educate students about:
- **Phishing & Lookalike Domains**
- **Physical & Digital QR Code Risks (Qishing)**
- **Browser Permission Misuse (Geolocation)**
- **Personal Information & OTP Non-Disclosure**
- **Credential Protection & Multi-Factor Authentication**

---

## 2. Technical Stack

- **Frontend**: React 18, Vite, Bootstrap 5, Lucide Icons, Canvas API (Spin Wheel), Web Audio API (Terminal Sound Synthesizer).
- **Public Backend**: Node.js, Express.js, `node:sqlite` (Node 24 native SQLite engine), Helmet CSP, Express Rate Limiters, Anti-CSRF double-submit cookies.
- **Private Organizer Dashboard**: Express.js, Bcryptjs, Multer (Encrypted import loader), HttpOnly Session Cookies, Escaped CSV Exporter.
- **Security & Crypto**: AES-256-GCM data payload encryption, SHA-256 HMAC signature verification, parameterized SQL statements.

---

## 3. System Architecture & Trust Boundaries

The system enforces strict segregation between public and private infrastructure:

```
[Public Website (Port 5000 / HTTPS)]
   - Handles Registration, Location Consent, Game Outcome RNG, CSP & Rate Limits.
   - Stores transient records with automated 30-day retention purge.
                    │
                    ▼ (AES-256-GCM Encrypted .enc Export)
[Private Organizer Laptop (localhost:5001)]
   - Accessible ONLY on organizer's local machine.
   - Imports, decrypts, deduplicates, and stores participant data in local SQLite DB.
   - Provides search, filtering, CSV exports, and 30-day retention management.
```

---

## 4. Quick Start Commands

### Prerequisites
- Node.js **v24.x** (or Node v20+)
- NPM **v10+**

### 1. Install Dependencies
Run from root directory:
```bash
cmd /c "cd public-server && npm install"
cmd /c "cd organizer-dashboard && npm install"
cmd /c "cd frontend && npm install"
```

### 2. Run All Unit & API Tests
```bash
npm test
```

### 3. Start Application Services

- **Start Public Server (Port 5000)**:
  ```bash
  npm run start:public
  ```

- **Start Private Organizer Laptop Dashboard (Port 5001)**:
  ```bash
  npm run start:organizer
  ```

- **Start Frontend Vite Dev Server (Port 5173)**:
  ```bash
  npm run start:frontend
  ```

Open your browser to `http://localhost:5173` to experience the website!

---

## 5. Application Pages & User Flow

1. **Page 1: Landing Page** - Title, subtitle, SCSDF NFSU branding, privacy notice drawer, "Register for Lucky Draw" CTA.
2. **Page 2: Student Registration** - Full Name, Mail ID (Email Address), Course / Program, Privacy checkbox.
3. **Page 3: Optional Location Permission** - "Allow Location Access" (invokes `navigator.geolocation`) or "Skip and Continue" with clear privacy explanation.
4. **Page 4: Simulated Spin-the-Wheel** - Canvas SVG wheel with deceleration physics, Web Audio ticks, and server-generated outcome.
5. **Page 5: Simulated Hacking Screen** - 5-second matrix terminal ("YOU HAVE BEEN HACKED", scan lines, sound synthesizer, skip button).
6. **Page 6: Cybersecurity Awareness** - Lessons on Phishing, QR codes, Permissions, OTPs, Incident reporting, 5-question Interactive Quiz, and creator credit.
7. **Page 7: Organizer Laptop Dashboard** - Local admin login (`adminadmin` / Dual passwords), participant table, search, CSV export, and record purge trigger.

---

## 6. Project Documentation Index

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical architecture, trust boundaries, and data flow.
- [SECURITY.md](./docs/SECURITY.md) - OWASP Top 10 controls, Helmet CSP, CSRF, and threat modeling.
- [PRIVACY.md](./docs/PRIVACY.md) - Data minimization, location consent model, and 30-day retention policy.
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Public HTTPS deployment guide and QR code poster setup.
- [TESTING.md](./docs/TESTING.md) - Vitest test execution guide and manual testing checklist.
- [EVENT_REPORT_TEMPLATE.md](./docs/EVENT_REPORT_TEMPLATE.md) - University leadership aggregate reporting template.

---

## 7. License & Credits

Created with love by **Sai Vishwaa N**  
School of Cyber Security and Digital Forensics (SCSDF)  
National Forensic Sciences University (NFSU), Gandhinagar, Gujarat, India.
