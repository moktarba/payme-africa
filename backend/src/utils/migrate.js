require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

async function run() {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`Applying ${file}...\n`);
    await db.query(sql);
  }

  process.stdout.write('Migrations applied.\n');
}

run()
  .catch((err) => {
    process.stderr.write(`Migration failed: ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
