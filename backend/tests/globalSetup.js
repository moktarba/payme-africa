'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = require('pg');

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'payme-test-secret';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
  process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'postgres';

  const db = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host:     process.env.DB_HOST     || 'localhost',
          port:     parseInt(process.env.DB_PORT || '5432'),
          user:     process.env.DB_USER     || 'payme',
          password: process.env.DB_PASSWORD || 'payme_dev',
          database: process.env.DB_NAME     || 'payme_db',
        }
  );

  try {
    const { runMigrations } = require('../src/utils/migrate');
    await runMigrations(db);
  } finally {
    await db.end();
  }
};
