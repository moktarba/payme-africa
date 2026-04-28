require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { logger } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const merchantRoutes = require('./routes/merchants');
const transactionRoutes = require('./routes/transactions');
const catalogRoutes = require('./routes/catalog');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:19006').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS non autorise'));
  },
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requetes. Attendez quelques minutes.' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives. Attendez 15 minutes.' },
});

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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
