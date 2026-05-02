const request = require('supertest');
const app     = require('../src/app');
const { db, redisClient } = require('../src/config/database');

let accessToken;

beforeAll(async () => {
  const otp = await request(app).post('/auth/send-otp').send({ phone: '+221771234567' });
  const res  = await request(app).post('/auth/verify-otp')
    .send({ phone: '+221771234567', code: otp.body.devCode });
  accessToken = res.body.accessToken;
});

afterAll(async () => { /* --forceExit handles pool teardown */ });

describe('GET /reports/day', () => {
  it('retourne le rapport du jour', async () => {
    const res = await request(app)
      .get('/reports/day')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.totalAmount).toBeGreaterThanOrEqual(0);
    expect(res.body.report.byProvider).toBeDefined();
  });
});

describe('GET /reports/week', () => {
  it('retourne les 7 derniers jours', async () => {
    const res = await request(app)
      .get('/reports/week')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.series).toHaveLength(7);
    expect(res.body.report.totals).toBeDefined();
  });
});

describe('GET /reports/export', () => {
  it('exporte un CSV valide', async () => {
    const res = await request(app)
      .get('/reports/export')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Montant');
  });
});
