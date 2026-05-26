const request = require('supertest');
const app = require('../src/app');
const { db, redisClient } = require('../src/config/database');

let token;
const MERCHANT_ID = 'a0000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const otp = await request(app).post('/auth/send-otp').send({ phone: '+221771234567' });
  const res = await request(app).post('/auth/verify-otp')
    .send({ phone: '+221771234567', code: otp.body.devCode });
  token = res.body.accessToken;
});

afterAll(async () => {
  await db.query('DELETE FROM employees WHERE merchant_id = $1 AND name LIKE $2', [MERCHANT_ID, 'Test%']);
});

describe('GET /employees', () => {
  it('liste les employés du marchand', async () => {
    const res = await request(app).get('/employees').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.employees)).toBe(true);
  });
});

describe('POST /employees', () => {
  let createdId;

  it('crée un employé caissier', async () => {
    const res = await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Caissier', phone: '+221770000099', role: 'cashier', pin: '1234' });
    expect(res.status).toBe(201);
    expect(res.body.employee.name).toBe('Test Caissier');
    expect(res.body.employee.role).toBe('cashier');
    expect(res.body.employee.pin_set).toBe(true);
    createdId = res.body.employee.id;
  });

  it('rejette un rôle invalide', async () => {
    const res = await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Invalid', role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('rejette sans nom', async () => {
    const res = await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'cashier' });
    expect(res.status).toBe(400);
  });
});

describe('POST /employees/login-pin', () => {
  let createdId;

  beforeAll(async () => {
    await request(app)
      .put('/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeLogin: true });

    const res = await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Login Pin', phone: '+221770000098', role: 'cashier', pin: '4321' });
    createdId = res.body.employee.id;
  });

  it('connecte un employe par PIN et notifie si active', async () => {
    const login = await request(app)
      .post('/employees/login-pin')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: createdId, pin: '4321' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();

    const notifications = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifications.body.notifications.some((item) =>
      item.type === 'employee_login' && item.data?.employeeId === createdId
    )).toBe(true);
  });

  it('desactive un employe et le retire de la liste active', async () => {
    const deleted = await request(app)
      .delete(`/employees/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const list = await request(app)
      .get('/employees')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.employees.some((employee) => employee.id === createdId)).toBe(false);
  });
});

describe('GET /employees/stats', () => {
  it('retourne les stats du jour par employé', async () => {
    const res = await request(app).get('/employees/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stats)).toBe(true);
  });
});
