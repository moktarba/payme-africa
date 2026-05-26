const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

const TEST_MERCHANT_ID = 'a0000000-0000-0000-0000-000000000001';
let accessToken;
const testReferences = [
  'a0000000-0000-0000-0000-000000000099',
  'a0000000-0000-0000-0000-000000000098',
  'a0000000-0000-0000-0000-000000000097',
  'a0000000-0000-0000-0000-000000000096',
];

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
  await db.query('DELETE FROM notifications WHERE merchant_id = $1 AND data->>\'transactionId\' IN (SELECT id::text FROM transactions WHERE merchant_id = $1 AND client_reference = ANY($2))', [TEST_MERCHANT_ID, testReferences]);
  await db.query('DELETE FROM audit_logs WHERE merchant_id = $1 AND entity_id IN (SELECT id FROM transactions WHERE merchant_id = $1 AND client_reference = ANY($2))', [TEST_MERCHANT_ID, testReferences]);
  await db.query('DELETE FROM transactions WHERE merchant_id = $1 AND client_reference = ANY($2)', [TEST_MERCHANT_ID, testReferences]);
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
    await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ txConfirmed: true, txPending: true });

    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 500,
        paymentProvider: 'cash',
        clientReference: 'a0000000-0000-0000-0000-000000000097',
      });

    transactionId = res.body.transaction.id;
  });

  it('doit confirmer une transaction cash', async () => {
    const res = await request(app)
      .post(`/transactions/${transactionId}/confirm`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transaction.paymentStatus).toBe('completed');
  });

  it('cree des notifications utiles pour le paiement', async () => {
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    const related = res.body.notifications.filter((notification) =>
      notification.data?.transactionId === transactionId
    );
    expect(related.some((notification) => notification.type === 'transaction_pending')).toBe(true);
    expect(related.some((notification) => notification.type === 'transaction_confirmed')).toBe(true);
  });

  it('cree une trace audit a la confirmation', async () => {
    const res = await db.query(
      `SELECT action, entity_type, entity_id, payload
       FROM audit_logs
       WHERE merchant_id = $1 AND entity_id = $2 AND action = 'transaction_confirmed'`,
      [TEST_MERCHANT_ID, transactionId]
    );

    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect(res.rows[0].entity_type).toBe('transaction');
    expect(res.rows[0].payload.newStatus).toBe('completed');
  });
});

describe('POST /transactions/:id/cancel', () => {
  it('annule avec motif et cree une trace audit', async () => {
    const created = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 750,
        paymentProvider: 'cash',
        clientReference: 'a0000000-0000-0000-0000-000000000096',
      });

    const transactionId = created.body.transaction.id;
    const reason = 'Paiement non recu';

    const cancelled = await request(app)
      .post(`/transactions/${transactionId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.transaction.paymentStatus).toBe('cancelled');
    expect(cancelled.body.transaction.cancelReason).toBe(reason);

    const audit = await db.query(
      `SELECT action, entity_type, entity_id, payload
       FROM audit_logs
       WHERE merchant_id = $1 AND entity_id = $2 AND action = 'transaction_cancelled'`,
      [TEST_MERCHANT_ID, transactionId]
    );

    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0].entity_type).toBe('transaction');
    expect(audit.rows[0].payload.reason).toBe(reason);
    expect(audit.rows[0].payload.newStatus).toBe('cancelled');
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
