import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getDb } from '../src/db/schema.js';
import app from '../src/index.js';

describe('Public Server API Tests', () => {
  let csrfToken = '';
  let cookieHeader = '';
  let testRegistrationId = '';
  const testEmail = `student_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}@nfsu.ac.in`;

  beforeAll(async () => {
    // Reset database state for clean test execution
    const db = getDb();
    db.exec('DELETE FROM location_consents;');
    db.exec('DELETE FROM game_sessions;');
    db.exec('DELETE FROM registrations;');

    const res = await request(app).get('/api/csrf-token');
    csrfToken = res.body.csrfToken;
    cookieHeader = res.headers['set-cookie'];
  });

  it('GET /api/health should return 200 OK with event details', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.event).toBe('LUCKY DRAW - NCSAM 2026');
    expect(res.body.organizer).toBe('Sai Vishwaa N');
  });

  it('POST /api/register should reject without CSRF token', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ fullName: 'Test Student', email: testEmail, course: 'M.Tech Cyber Security', privacyConsented: true });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_VALIDATION_FAILED');
  });

  it('POST /api/register should create a registration with valid data', async () => {
    const res = await request(app)
      .post('/api/register')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Sai Vishwaa Student',
        email: testEmail,
        course: 'M.Tech Cyber Security',
        privacyConsented: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.registrationId).toMatch(/^NFSU-2026-[A-F0-9]{8}$/);
    testRegistrationId = res.body.registrationId;
  });

  it('POST /api/register should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/register')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Another Student',
        email: testEmail,
        course: 'M.Sc Digital Forensics & Information Security',
        privacyConsented: true
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
  });

  it('POST /api/location should record location consent', async () => {
    const res = await request(app)
      .post('/api/location')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({
        registrationId: testRegistrationId,
        optedIn: true,
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 12.5
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/game/spin should return server-generated outcome', async () => {
    const res = await request(app)
      .post('/api/game/spin')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({
        registrationId: testRegistrationId
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(res.body.segmentIndex).toBeLessThanOrEqual(3);
  });

  it('POST /api/game/spin replay should return existing outcome', async () => {
    const res = await request(app)
      .post('/api/game/spin')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({
        registrationId: testRegistrationId
      });

    expect(res.status).toBe(200);
    expect(res.body.replayed).toBe(true);
  });
});
