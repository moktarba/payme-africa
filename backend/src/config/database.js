const { Pool }        = require('pg');
const redis           = require('redis');
const winston         = require('winston');

// ── LOGGER ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`)
  ),
  transports: [new winston.transports.Console()],
});

// ── POSTGRESQL ───────────────────────────────────────────────────────
// Railway, Render, Heroku injectent DATABASE_URL automatiquement
const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },  // requis sur Railway/Render
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      user:     process.env.DB_USER     || 'payme',
      password: process.env.DB_PASSWORD || 'payme_dev',
      database: process.env.DB_NAME     || 'payme_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

db.on('error', err => logger.error('PostgreSQL error', { message: err.message }));

// ── REDIS ────────────────────────────────────────────────────────────
// Railway injecte REDIS_URL automatiquement
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || process.env.REDIS_URI ||
       `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
});

redisClient.on('error', err => logger.warn('Redis error (non-fatal)', { message: err.message }));

async function connectRedis() {
  if (process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDIS_HOST) {
    try {
      await redisClient.connect();
      logger.info('✅ Redis connecté');
    } catch (err) {
      logger.warn('⚠️  Redis non disponible — fonctionnement dégradé (pas de cache/sessions Redis)');
    }
  } else {
    logger.info('⚠️  Redis non configuré — skip');
  }
}

module.exports = { db, redisClient, logger, connectRedis };
