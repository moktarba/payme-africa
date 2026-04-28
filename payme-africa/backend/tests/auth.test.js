const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

// Données de test
const testPhone = '+221700000001';
const testMerchant = {
  phone: testPhone,
  businessName: 'Test Boutique',
  ownerName: 'Test User',
  city: 'Dakar',
  activityType: 'boutique',
};

beforeAll(async () => {
  // Nettoyer les données de test
  await db.query('DELETE FROM merchants WHERE phone = $1', [testPhone]);
  await db.query('DELETE FROM otps WHERE phone = $1', [testPhone]);
});

afterAll(async () => {
  await db.query('DELETE FROM merchants WHERE phone = $1', [testPhone]);
  await db.query('DELETE FROM otps WHERE phone = $1', [testPhone]);
  await db.end();
  await redisClient.quit();
});

describe('POST /auth/register', () => {
  it('doit créer un nouveau compte', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testMerchant);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.devCode).toBeDefined(); // En dev, le code est retourné
  });

  it('doit rejeter une inscription avec le même numéro', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testMerchant);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PHONE_EXISTE');
  });

  it('doit rejeter sans businessName', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ phone: '+221700000002' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/send-otp', () => {
  it('doit envoyer un OTP', async () => {
    const res = await request(app)
      .post('/auth/send-otp')
      .send({ phone: testPhone });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.devCode).toBeDefined();
  });

  it('doit rejeter sans téléphone', async () => {
    const res = await request(app)
      .post('/auth/send-otp')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/verify-otp', () => {
  let devCode;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/send-otp')
      .send({ phone: testPhone });
    devCode = res.body.devCode;
  });

  it('doit rejeter un mauvais code', async () => {
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: testPhone, code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_INCORRECT');
  });

  it('doit accepter le bon code et retourner des tokens', async () => {
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: testPhone, code: devCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.merchant).toBeDefined();
    expect(res.body.merchant.phone).toBe(testPhone);
  });
});
