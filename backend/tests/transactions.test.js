const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const TEST_MERCHANT_ID = 'a0000000-0000-0000-0000-000000000001';
let accessToken;

// clientReferences uniques par run pour éviter les collisions entre runs
// et rendre l'idempotence testable de manière fiable
const RUN_REF_CASH    = `test-tx-cash-${uuidv4()}`;
const RUN_REF_IDEMP   = `test-tx-idemp-${uuidv4()}`;

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
  // Supprimer toutes les transactions de test :
  // - préfixe 'test-tx-%' (pattern général)
  // - anciennes clientReferences fixes d'idempotence (résidus de runs précédents)
  await db.query(
    `DELETE FROM transactions
     WHERE merchant_id = $1
       AND (
         client_reference LIKE 'test-tx-%'
         OR client_reference IN (
           'a0000000-0000-0000-0000-000000000099',
           'a0000000-0000-0000-0000-000000000098'
         )
       )`,
    [TEST_MERCHANT_ID]
  );
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
        clientReference: RUN_REF_CASH,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction.amount).toBe(2500);
    expect(res.body.transaction.paymentStatus).toBe('awaiting_confirmation');
    // requiresManualConfirmation est présent sur le 1er appel (chemin normal)
    expect(res.body.transaction.requiresManualConfirmation).toBe(true);
  });

  it('doit garantir l\'idempotence', async () => {
    const res1 = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000, paymentProvider: 'cash', clientReference: RUN_REF_IDEMP });

    const res2 = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000, paymentProvider: 'cash', clientReference: RUN_REF_IDEMP });

    // Les deux appels retournent la même transaction (même id)
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
