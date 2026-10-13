# Automated & Manual Test Suite — LUCKY DRAW (NCSAM 2026)
**School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar**

---

## 1. Automated Test Suite Execution

The repository includes automated API unit and integration test suites built with **Vitest** and **Supertest** for both `public-server` and `organizer-dashboard`.

### Run All Tests:
From root directory:
```bash
npm test
```

### Run Public Server Tests Only:
```bash
cd public-server
npm test
```

### Run Organizer Dashboard Tests Only:
```bash
cd organizer-dashboard
npm test
```

---

## 2. Test Verification Matrix

| Test Suite | Test Case | Target Endpoint / Module | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Public Server** | Health Check | `GET /api/health` | HTTP 200 with event metadata | **PASSED** |
| **Public Server** | Anti-CSRF Enforcement | `POST /api/register` | HTTP 403 when CSRF header missing | **PASSED** |
| **Public Server** | Registration Input Validation | `POST /api/register` | HTTP 201 with registration ID | **PASSED** |
| **Public Server** | Duplicate Phone Prevention | `POST /api/register` | HTTP 409 DUPLICATE_REGISTRATION | **PASSED** |
| **Public Server** | Location Consent | `POST /api/location` | HTTP 200 OK | **PASSED** |
| **Public Server** | Server Outcome Generation | `POST /api/game/spin` | HTTP 201 with segment index (0-2) | **PASSED** |
| **Public Server** | Replay Protection | `POST /api/game/spin` | HTTP 200 with previous outcome | **PASSED** |
| **Organizer App** | Invalid Admin Login | `POST /admin/login` | HTTP 401 Unauthorized | **PASSED** |
| **Organizer App** | Valid Admin Auth | `POST /admin/login` | HTTP 200 + Session Cookie | **PASSED** |
| **Organizer App** | Participant Data Isolation| `GET /admin/participants` | HTTP 401 without session | **PASSED** |
| **Organizer App** | Participant Search & List | `GET /admin/participants` | HTTP 200 + paginated JSON | **PASSED** |
| **Organizer App** | Aggregate Metrics | `GET /admin/stats` | HTTP 200 + statistics summary | **PASSED** |
| **Organizer App** | Retention Status | `GET /admin/retention-status` | HTTP 200 + 30-day cutoff date | **PASSED** |

---

## 3. Manual Verification Checklist

- [x] **Mobile Responsiveness**: Layout tested on 320px, 375px, 414px, and desktop viewports without horizontal scroll.
- [x] **Wheel Animation**: Canvas wheel rotates smoothly and aligns accurately with server-returned outcome.
- [x] **Hacked Terminal Audio**: Web Audio synthesizer toggles correctly with mute/unmute button.
- [x] **Skip Button**: "Skip to Awareness" button bypasses 5-second terminal animation cleanly.
- [x] **Encrypted Data Sync**: Public export `.enc` file imports into local organizer database without errors.
- [x] **CSV Injection Safety**: Exported CSV opens safely in Excel with sanitized text strings.
