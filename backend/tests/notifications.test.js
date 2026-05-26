const request = require('supertest');
const app = require('../src/app');

let token;

beforeAll(async () => {
  const otp = await request(app).post('/auth/send-otp').send({ phone: '+221771234567' });
  const res = await request(app).post('/auth/verify-otp')
    .send({ phone: '+221771234567', code: otp.body.devCode });
  token = res.body.accessToken;
});

describe('GET /notifications', () => {
  it('liste les notifications', async () => {
    const res = await request(app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
    expect(typeof res.body.total).toBe('number');
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
  it('retourne les preferences', async () => {
    const res = await request(app)
      .get('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeDefined();
    expect(typeof res.body.preferences.txConfirmed).toBe('boolean');
  });
});

describe('PUT /notifications/preferences', () => {
  it('met a jour les preferences', async () => {
    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ txConfirmed: false, dailySummary: true, txPending: false, employeeLogin: true });
    expect(res.status).toBe(200);
  });

  it('conserve les autres preferences lors d une mise a jour partielle', async () => {
    await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ txConfirmed: false, dailySummary: true, txPending: false, employeeLogin: true });

    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ dailySummary: false });
    expect(res.status).toBe(200);

    const prefs = await request(app)
      .get('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(prefs.body.preferences.txConfirmed).toBe(false);
    expect(prefs.body.preferences.txPending).toBe(false);
    expect(prefs.body.preferences.dailySummary).toBe(false);
    expect(prefs.body.preferences.employeeLogin).toBe(true);
  });
});
