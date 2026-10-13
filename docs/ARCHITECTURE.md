# Technical Architecture — LUCKY DRAW (NCSAM 2026)
**School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar**
*Created with love by Sai Vishwaa N*

---

## 1. Overview & Core Philosophy

**Lucky Draw** is designed as a dual-tier architecture that enforces strict trust boundaries between **public infrastructure** (the internet-facing student website) and **private infrastructure** (the organizer's local laptop). 

The application architecture guarantees that identifiable participant data is never publicly exposed or directly queryable over the internet, while allowing seamless event operation and offline administration.

---

## 2. System Architecture Diagram

```
                     PUBLIC TRUST BOUNDARY
┌─────────────────────────────────────────────────────────────┐
│  Mobile Browser / Student Device (HTTPS)                    │
│  - React 18 + Vite SPA                                      │
│  - Page 1: Landing Page & Privacy Notice                    │
│  - Page 2: Student Registration (+91 Phone, Name, Course)   │
│  - Page 3: Browser Location Opt-in / Skip                   │
│  - Page 4: Server-Driven SVG Spin Wheel                     │
│  - Page 5: 5-Sec Simulated Cyberattack Terminal             │
│  - Page 6: Cybersecurity Awareness & Interactive Quiz      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (CSRF Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Public Backend Server (Node.js / Express - Port 5000)      │
│  - Helmet Security Headers & Strict CSP                     │
│  - Express Rate Limiters (Registration, Spin, Location)    │
│  - Double-Submit Cookie CSRF Token Verification             │
│  - Public SQLite Database (`public_data.db`)                │
│  - Automated 30-Day Data Retention Purge Cron               │
│  - AES-256-GCM Encrypted Data Export Generator             │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ENCRYPTED AIR-GAPPED TRANSFER (.enc File)
            - AES-256-GCM Payload Encryption
            - SHA-256 HMAC Signature Verification
                               │
                               ▼
                     PRIVATE TRUST BOUNDARY
┌─────────────────────────────────────────────────────────────┐
│  Private Organizer Laptop (localhost:5001 ONLY)             │
│  - Express Administration Server                            │
│  - Session Auth & Bcrypt Password Hashing                   │
│  - Private SQLite Storage (`organizer_data.db`)             │
│  - Payload Decryptor & Deduplication Engine                 │
│  - CSV Export Engine (Escapes Formula Injections)          │
│  - Aggregate Analytics & Manual 30-Day Purge Trigger        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Trust Boundary Breakdown

### A. Public Server Infrastructure
- **Hosting Target**: HTTPS-enabled Cloud Host (e.g., Render, Railway, Vercel, DigitalOcean).
- **Public Endpoints**:
  - `GET /api/health` — System health check
  - `GET /api/csrf-token` — Double-submit CSRF cookie generator
  - `POST /api/register` — Validated student registration
  - `POST /api/location` — Explicit permission location consent
  - `POST /api/game/spin` — Server-determined outcome generator
  - `POST /api/export` — Secret passphrase protected encrypted data exporter
- **Data Lifecycle**: Public database rows exist only to operate the event and are automatically purged after 30 days.

### B. Private Organizer Laptop Infrastructure
- **Host**: Organizer's personal laptop running on `localhost:5001`.
- **Database**: Air-gapped SQLite database (`organizer_data.db`).
- **Access Control**: Protected by Bcrypt password hashing (`NCSAM_NFSU_2026_Organizer!`) and HttpOnly session cookies.
- **Exposure**: Zero inbound ports open to the public internet.

---

## 4. Secure Encrypted Synchronization Workflow

```
[Public Server] ──(Generates AES-256-GCM Payload)──> [luckydraw_export.enc]
                                                              │
                                                   (Organizer Downloads)
                                                              │
                                                              ▼
[Private Organizer Laptop] <──(Decrypts & HMAC Verifies)──────┘
```

1. **Export Generation**: The public server packages database records into a JSON string, encrypts it using `AES-256-GCM` with a 256-bit key, and appends a `SHA-256 HMAC` signature.
2. **Transfer**: The organizer downloads the encrypted `.enc` file via the protected `/api/export` endpoint.
3. **Local Import**: The organizer uploads `.enc` into the local admin dashboard on `localhost:5001`.
4. **Validation & Decryption**: The local service verifies the HMAC signature. If untampered, it decrypts the payload and executes `INSERT OR IGNORE` queries to prevent duplicate registration IDs.

---

## 5. Technology Stack Summary

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Bootstrap 5, Lucide Icons | Responsive, mobile-first SPA styled in dark navy & cyan |
| **Public API** | Node.js, Express.js, Helmet, Express-Validator | OWASP-compliant public REST endpoints |
| **Organizer API** | Express.js, Bcryptjs, Multer, Express-Session | Private local administration server |
| **Storage Engine**| `node:sqlite` (Native Node 24 SQLite Sync API) | Zero binary dependency, prepared statement SQLite storage |
| **Crypto** | Node `crypto` (AES-256-GCM, HMAC SHA-256) | Encrypted data payload sync & token generation |
| **Testing** | Vitest, Supertest | Automated API unit and integration test suite |
