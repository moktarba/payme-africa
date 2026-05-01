const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

let token;

beforeAll(async () => {
  const otp = await request(app).post('/auth/send-otp').send({ phone: '+221771234567' });
  const res = await request(app).post('/auth/verify-otp')
    .send({ phone: '+221771234567', code: otp.body.devCode });
  token = res.body.accessToken;
});

afterAll(async () => { await db.end(); await redisClient.quit(); });

describe('GET /notifications', () => {
  it('liste les notifications', async () => {
    const res = await request(app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
  });

  it('filtre les non-lues', async () => {
    const res = await request(app)
      .get('/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications.every(n => !n.is_read)).toBe(true);
  });
});

describe('POST /notifications/read', () => {
  it('marque toutes comme lues', async () => {
    const res = await request(app)
      .post('/notifications/read')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(200);
  });
});

describe('GET /notifications/preferences', () => {
  it('retourne les préférences', async () => {
    const res = await request(app)
      .get('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeDefined();
    expect(typeof res.body.preferences.txConfirmed).toBe('boolean');
  });
});

describe('PUT /notifications/preferences', () => {
  it('met à jour les préférences', async () => {
    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ txConfirmed: false, dailySummary: true, txPending: false, employeeLogin: true });
    expect(res.status).toBe(200);
  });
});
