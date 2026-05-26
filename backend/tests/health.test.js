const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('doit exposer un signal DB non ambigu en local', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe(true);
    expect(['DATABASE_URL', 'DB_HOST', 'local_defaults']).toContain(res.body.dbSource);
    expect(res.body.dbCheck).toBe('not_checked');
  });
});
