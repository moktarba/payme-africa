const { Pool } = require('pg');
const { createClient } = require('redis');
const winston = require('winston');

// ============================================================
// LOGGER
// ============================================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============================================================
// POSTGRES
// ============================================================
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'payme',
  password: process.env.DB_PASSWORD || 'payme_secret',
  database: process.env.DB_NAME || 'payme_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  logger.error('Erreur pool PostgreSQL', { error: err.message });
});

// ============================================================
// REDIS
// ============================================================
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

redisClient.on('error', (err) => {
  logger.error('Erreur Redis', { error: err.message });
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Redis connecté');
  }
};

module.exports = { db, redisClient, connectRedis, logger };
