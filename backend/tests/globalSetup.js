'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

// Numéros de test utilisés dans toutes les suites
const TEST_PHONES = ['+221771234567', '+221700000001'];

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

    // Réinitialiser le rate-limit OTP pour tous les numéros de test.
    // Sans ce nettoyage, le compteur (max 3/heure) s'accumule entre les runs
    // et bloque tous les beforeAll qui appellent send-otp.
    await db.query(
      'DELETE FROM otps WHERE phone = ANY($1)',
      [TEST_PHONES]
    );

    // Supprimer les clés Redis de rate-limit (redis v4 — même package que l'app)
    // Si Redis est indisponible, on logue un warning et on continue : le nettoyage
    // DB des OTPs suffit pour le fallback (otpService retombe sur la table otps).
    try {
      const { createClient } = require('redis');
      const redisClient = createClient({
        socket: {
          host:           process.env.REDIS_HOST || 'localhost',
          port:           parseInt(process.env.REDIS_PORT || '6379'),
          connectTimeout: 2000,
          reconnectStrategy: false, // pas de reconnexion automatique en setup
        },
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
      });

      // Intercepter les erreurs émises par l'EventEmitter pour éviter un crash
      redisClient.on('error', () => {});

      await redisClient.connect();
      const keys = TEST_PHONES.map(p => `otp_rate:${p}`);
      await redisClient.del(keys);
      await redisClient.quit();
      console.log('[globalSetup] Clés Redis rate-limit supprimées :', keys);
    } catch (err) {
      console.warn('[globalSetup] Redis indisponible — nettoyage DB OTP suffisant :', err.message);
    }
  } finally {
    await db.end();
  }
};
