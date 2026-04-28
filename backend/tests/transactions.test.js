const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

const TEST_MERCHANT_ID = 'a0000000-0000-0000-0000-000000000001';
let accessToken;

beforeAll(async () => {
  // Login avec le marchand de test seed
  const phone = '+221771234567';

  // Envoyer OTP
  const otpRes = await request(app).post('/auth/send-otp').send({ phone });
  const code = otpRes.body.devCode;

  // Vérifier OTP
  const loginRes = await request(app)
    .post('/auth/verify-otp')
    .send({ phone, code });

  accessToken = loginRes.body.accessToken;
});

afterAll(async () => {
  await db.query('DELETE FROM transactions WHERE merchant_id = $1 AND client_reference LIKE $2', [TEST_MERCHANT_ID, 'test-tx-%']);
  await db.end();
  await redisClient.quit();
});

describe('POST /transactions', () => {
  it('doit créer une transaction cash', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 2500,
        paymentProvider: 'cash',
        note: 'Test transaction',
        clientReference: 'a0000000-0000-0000-0000-000000000099',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction.amount).toBe(2500);
    expect(res.body.transaction.paymentStatus).toBe('awaiting_confirmation');
    expect(res.body.transaction.requiresManualConfirmation).toBe(true);
  });

  it('doit garantir l\'idempotence', async () => {
    const ref = 'a0000000-0000-0000-0000-000000000098';

    const res1 = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000, paymentProvider: 'cash', clientReference: ref });

    const res2 = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000, paymentProvider: 'cash', clientReference: ref });

    expect(res1.body.transaction.id).toBe(res2.body.transaction.id);
  });

  it('doit rejeter un montant invalide', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: -100, paymentProvider: 'cash' });

    expect(res.status).toBe(400);
  });

  it('doit rejeter sans token', async () => {
    const res = await request(app)
      .post('/transactions')
      .send({ amount: 1000, paymentProvider: 'cash' });

    expect(res.status).toBe(401);
  });
});

describe('POST /transactions/:id/confirm', () => {
  let transactionId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 500, paymentProvider: 'cash' });

    transactionId = res.body.transaction.id;
  });

  it('doit confirmer une transaction cash', async () => {
    const res = await request(app)
      .post(`/transactions/${transactionId}/confirm`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transaction.paymentStatus).toBe('completed');
  });
});

describe('GET /transactions/stats/day', () => {
  it('doit retourner les stats du jour', async () => {
    const res = await request(app)
      .get('/transactions/stats/day')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.completedCount).toBeGreaterThanOrEqual(0);
    expect(res.body.stats.totalAmount).toBeGreaterThanOrEqual(0);
  });
});
