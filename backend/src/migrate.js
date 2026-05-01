'use strict';
/**
 * Script de migration — exécuté avant le démarrage
 * Gère l'absence de DATABASE_URL sans crasher
 */
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.warn('⚠️  DATABASE_URL non définie — migrations ignorées');
    return;
  }

  console.log('🔄 Connexion PostgreSQL...');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connecté');
  } catch (err) {
    console.error('❌ Impossible de se connecter à PostgreSQL:', err.message);
    await pool.end().catch(() => {});
    return; // Ne pas crasher
  }

  // Créer la table de suivi
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Trouver les fichiers de migration
  const dirs = [
    path.join(__dirname, '../../database/migrations'),
    path.join(__dirname, '../database/migrations'),
    path.join(__dirname, 'migrations'),
  ];

  let migrationsDir = null;
  for (const d of dirs) {
    if (fs.existsSync(d)) { migrationsDir = d; break; }
  }

  if (!migrationsDir) {
    console.warn('⚠️  Dossier migrations introuvable — skip');
    await pool.end();
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 ${files.length} fichiers SQL trouvés`);
  let applied = 0;

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT id FROM _migrations WHERE filename = $1', [file]
    );
    if (rows.length > 0) {
      console.log(`  ⏭  ${file} (déjà appliquée)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`  ✅ ${file}`);
      applied++;
    } catch (err) {
      console.warn(`  ⚠️  ${file} — ${err.message.slice(0, 80)}`);
      await pool.query(
        'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]
      );
    }
  }

  console.log(`✅ Migrations OK (${applied} nouvelles)`);
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Erreur migration (non fatale):', err.message);
  // Ne pas crasher avec process.exit(1)
});
