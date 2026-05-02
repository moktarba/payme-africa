'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

module.exports = async function globalSetup() {
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
