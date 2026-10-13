import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { getDb } from '../src/db/schema.js';

describe('Organizer Dashboard API Tests', () => {
  let adminSessionCookie = '';

  beforeAll(() => {
    getDb();
  });

  it('POST /admin/login with invalid credentials should fail', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ username: 'organizer', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('POST /admin/login with valid credentials should succeed and return session cookie', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ username: 'adminadmin', password: 'Sai@1234@1234', password2: 'Sai@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminSessionCookie = res.headers['set-cookie'];
  });

  it('GET /admin/participants without auth should return 401', async () => {
    const res = await request(app).get('/admin/participants');
    expect(res.status).toBe(401);
  });

  it('GET /admin/participants with session should return participant list', async () => {
    const res = await request(app)
      .get('/admin/participants')
      .set('Cookie', adminSessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.participants)).toBe(true);
  });

  it('GET /admin/stats should return aggregate dashboard metrics', async () => {
    const res = await request(app)
      .get('/admin/stats')
      .set('Cookie', adminSessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toHaveProperty('totalRegistrations');
  });

  it('GET /admin/retention-status should return 30-day policy info', async () => {
    const res = await request(app)
      .get('/admin/retention-status')
      .set('Cookie', adminSessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.retentionPolicyDays).toBe(30);
  });

  it('POST /admin/purge without auth should return 401', async () => {
    const res = await request(app).post('/admin/purge').send({ expiredOnly: false });
    expect(res.status).toBe(401);
  });

  it('POST /admin/purge with session should purge all records and return 200', async () => {
    const res = await request(app)
      .post('/admin/purge')
      .set('Cookie', adminSessionCookie)
      .send({ expiredOnly: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('purgedCount');

    // Verify participants list is now empty
    const listRes = await request(app)
      .get('/admin/participants')
      .set('Cookie', adminSessionCookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.participants).toEqual([]);
    expect(listRes.body.total).toBe(0);

    // Verify stats are reset to 0
    const statsRes = await request(app)
      .get('/admin/stats')
      .set('Cookie', adminSessionCookie);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats.totalRegistrations).toBe(0);
    expect(statsRes.body.stats.completedGames).toBe(0);
  });
});
