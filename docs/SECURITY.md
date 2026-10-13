# Security Documentation & OWASP Controls — LUCKY DRAW (NCSAM 2026)
**School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar**

---

## 1. OWASP Top 10 Mitigation Matrix

| OWASP Vulnerability Risk | Implemented Control & Defense | Implementation Location |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Private admin dashboard restricted to `localhost:5001` with HttpOnly session cookies; public server endpoints have zero admin capabilities. | `organizer-dashboard/src/middleware/auth.js` |
| **A02: Cryptographic Failures** | AES-256-GCM encryption with HMAC SHA-256 integrity checks for data sync; Bcrypt password hashing (cost factor 10) for admin logins; HTTPS enforcement. | `public-server/src/services/cryptoService.js` |
| **A03: Injection (SQLi & XSS)** | 100% prepared SQL statements via `node:sqlite`; HTML output sanitization; strict input validation via `express-validator`. | `public-server/src/routes/registration.js` |
| **A04: Insecure Design** | Server-side outcome determination for game wheel (client outcome tampering impossible); rate limiting; strict 30-day retention purge. | `public-server/src/routes/game.js` |
| **A05: Security Misconfiguration** | Helmet security headers with restrictive CSP (`default-src 'self'`); CORS whitelist restrictions; strict HTTP methods. | `public-server/src/config/owasp.js` |
| **A06: Vulnerable Components** | Minimal dependency tree using Node 24 native `node:sqlite`; `npm audit` verification. | `package.json` |
| **A07: Identification & Auth** | Double-submit CSRF token pattern; session invalidation on logout; login rate limiting. | `public-server/src/config/owasp.js` |
| **A08: Software & Data Integrity** | Signed payload exports; CSV injection escaping (`=`, `+`, `-`, `@` string prepending). | `organizer-dashboard/src/services/csvExporter.js` |
| **A09: Security Logging & Audit** | Structured audit logging without storing raw PII (hashed IPs, masked identifiers). | `public-server/src/db/schema.js` |
| **A10: Server-Side Request Forgery**| Zero external HTTP fetching or outbound webhooks in public API backend. | Public API routes |

---

## 2. Detailed OWASP Protections

### A. Content Security Policy (CSP)
Implemented via Helmet:
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'", config.FRONTEND_URL],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameAncestors: ["'none'"]
  }
}
```

### B. Double-Submit Cookie Anti-CSRF Token Pattern
1. On SPA load, `GET /api/csrf-token` issues a random 32-byte hex token stored in a `lax` cookie `XSRF-TOKEN`.
2. All non-GET API calls require header `X-CSRF-Token` matching the cookie value.
3. Requests missing or mismatching the token are rejected with HTTP 403.

### C. Rate Limiting Rules
- **Student Registration**: 10 requests per 15 minutes per IP.
- **Spin Wheel Request**: 10 requests per 15 minutes per IP (with single-spin replay protection per Registration ID).
- **Location Permission Request**: 15 requests per 15 minutes per IP.
- **Organizer Export Endpoint**: 5 requests per 15 minutes per IP.

### D. CSV Formula Injection Defense
When exporting participant data to CSV for spreadsheet analysis, any string field beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a leading single quote (`'`), preventing malicious formula execution in Microsoft Excel or Google Sheets.

---

## 3. Threat Model Summary

```
Threat Vector                  Likelihood   Impact    Mitigation Implemented
----------------------------   ----------   ------    --------------------------------------------------
Unintended Public Admin Access   Low          High      Admin API runs strictly on localhost:5001.
Wheel Outcome Manipulation       Medium       Low       Outcome generated on server before spin animation.
Database File Download           Low          High      SQLite file outside public web root.
SQL Injection                    Low          High      Prepared SQL statements exclusively used.
CSV Injection                    Medium       Medium    Sanitization of formula characters in export tool.
Data Retention Overflow          Low          Medium    Automated daily cron purging >30 day old records.
```
