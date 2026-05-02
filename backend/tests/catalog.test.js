const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

let token, createdId;
const MERCHANT_ID = 'a0000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const otp = await request(app).post('/auth/send-otp').send({ phone: '+221771234567' });
  const res = await request(app).post('/auth/verify-otp')
    .send({ phone: '+221771234567', code: otp.body.devCode });
  token = res.body.accessToken;
});

afterAll(async () => {
  if (createdId) await db.query('DELETE FROM catalog_items WHERE id = $1', [createdId]);
});

describe('GET /catalog', () => {
  it('liste les articles actifs', async () => {
    const res = await request(app).get('/catalog').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('POST /catalog', () => {
  it('crée un article', async () => {
    const res = await request(app)
      .post('/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Article test S4', price: 999, category: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('Article test S4');
    expect(res.body.item.price).toBe(999);
    createdId = res.body.item.id;
  });

  it('rejette sans nom', async () => {
    const res = await request(app)
      .post('/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 500 });
    expect(res.status).toBe(400);
  });

  it('rejette un prix négatif', async () => {
    const res = await request(app)
      .post('/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', price: -1 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /catalog/:id', () => {
  it('modifie un article', async () => {
    if (!createdId) return;
    const res = await request(app)
      .put(`/catalog/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Article test modifié', price: 1499, category: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body.item.price).toBe(1499);
  });
});

describe('DELETE /catalog/:id', () => {
  it('supprime (soft) un article', async () => {
    if (!createdId) return;
    const res = await request(app)
      .delete(`/catalog/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
