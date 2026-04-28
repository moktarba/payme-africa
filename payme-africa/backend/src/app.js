require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectRedis, logger } = require('./config/database');
const { initCrons } = require('./services/cronService');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const merchantRoutes = require('./routes/merchants');
const transactionRoutes = require('./routes/transactions');
const catalogRoutes = require('./routes/catalog');
const reportRoutes        = require('./routes/reports');
const employeeRoutes      = require('./routes/employees');
const notificationRoutes  = require('./routes/notifications');

const app = express();

// ============================================================
// SÉCURITÉ & MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:19006').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile app, Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
}));

// Logs HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Trop de requêtes. Attendez quelques minutes.' }
});
app.use(globalLimiter);

// Rate limiting strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives. Attendez 15 minutes.' }
});

// ============================================================
// ROUTES
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    version: '1.0.0',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/merchants', merchantRoutes);
app.use('/transactions', transactionRoutes);
app.use('/catalog', catalogRoutes);
app.use('/reports',       reportRoutes);
app.use('/employees',     employeeRoutes);
app.use('/notifications', notificationRoutes);

// ============================================================
// ERREURS
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = parseInt(process.env.PORT || '4000');

async function start() {
  try {
    await connectRedis();
    logger.info('Redis connecté');

    app.listen(PORT, '0.0.0.0', () => {
      if (process.env.NODE_ENV !== 'test') initCrons();
    logger.info(`🚀 PayMe Africa API démarrée sur le port ${PORT}`);
      logger.info(`   Environnement : ${process.env.NODE_ENV}`);
      logger.info(`   Health check  : http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('Erreur démarrage', { error: err.message });
    process.exit(1);
  }
}

start();

module.exports = app; // Pour les tests
