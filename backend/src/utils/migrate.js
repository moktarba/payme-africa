const fs   = require('fs');
const path = require('path');

// Cherche les migrations dans /app/database/migrations (Dockerfile root)
// ou dans ../../../database/migrations (développement local depuis backend/src/utils/)
function findMigrationsDir() {
  const candidates = [
    path.resolve(__dirname, '../../database/migrations'),       // Docker: /app/database/migrations
    path.resolve(__dirname, '../../../database/migrations'),    // local: depuis backend/src/utils/
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error('Dossier migrations introuvable. Candidats: ' + candidates.join(', '));
}

async function runMigrations(db) {
  const migrationsDir = findMigrationsDir();

  // Table de suivi des migrations appliquées
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await db.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length > 0) {
      console.log(`  ⏭️  ${file} déjà appliquée`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`  ⚙️  Application de ${file}...`);
    await db.query(sql);
    await db.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`  ✅ ${file} appliquée`);
  }
}

// Exécution standalone : node src/utils/migrate.js
if (require.main === module) {
  require('dotenv').config();
  const { db } = require('../config/database');
  runMigrations(db)
    .then(() => { console.log('Migrations terminées.'); process.exit(0); })
    .catch(err => { console.error('Erreur migration:', err.message); process.exit(1); });
}

module.exports = { runMigrations };
