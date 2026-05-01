'use strict';

require('dotenv').config();
require('express-async-errors');

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── SÉCURITÉ & MIDDLEWARE ────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:19006').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes. Attendez quelques minutes.' },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives. Attendez 15 minutes.' },
});

// ── HEALTH (immédiat, sans DB — critique pour Railway) ───────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status:  'ok',
    version: '1.0.0',
    env:     process.env.NODE_ENV || 'development',
    ts:      new Date().toISOString(),
  });
});

// ── ROUTES (lazy load avec try/catch pour la résilience Railway) ─────
let routesLoaded = false;

async function loadRoutes() {
  if (routesLoaded) return;
  try {
    const authRoutes        = require('./routes/auth');
    const merchantRoutes    = require('./routes/merchants');
    const transactionRoutes = require('./routes/transactions');
    const catalogRoutes     = require('./routes/catalog');
    const reportRoutes      = require('./routes/reports');
    const employeeRoutes    = require('./routes/employees');
    const notifRoutes       = require('./routes/notifications');

    app.use('/auth',          authLimiter, authRoutes);
    app.use('/merchants',     merchantRoutes);
    app.use('/transactions',  transactionRoutes);
    app.use('/catalog',       catalogRoutes);
    app.use('/reports',       reportRoutes);
    app.use('/employees',     employeeRoutes);
    app.use('/notifications', notifRoutes);

    routesLoaded = true;
    console.log('✅ Routes chargées');
  } catch (err) {
    console.error('❌ Erreur chargement routes:', err.message);
    console.error(err.stack);
  }
}

// ── GESTION D'ERREURS ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status  = err.status  || 500;
  const code    = err.code    || 'ERREUR_SERVEUR';
  const message = err.message || 'Erreur interne';
  console.error(`[ERROR] ${status} ${code}: ${message}`);
  res.status(status).json({ success: false, message, code });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable', code: 'NOT_FOUND' });
});

// ── DÉMARRAGE ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');

async function start() {
  console.log('🚀 Démarrage PayMe Africa...');
  console.log(`   NODE_ENV:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT:         ${PORT}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ définie' : '❌ MANQUANTE'}`);
  console.log(`   JWT_SECRET:   ${process.env.JWT_SECRET  ? '✅ défini'  : '❌ MANQUANT'}`);

  // 1. HTTP d'abord — Railway healthcheck doit répondre immédiatement
  await new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Serveur HTTP démarré sur le port ${PORT}`);
      resolve();
    });
  });

  // 2. Connexion DB/Redis (après HTTP)
  try {
    const { db, connectRedis } = require('./config/database');
    await db.query('SELECT 1');
    console.log('✅ PostgreSQL connecté');

    await connectRedis();

    // 3. Crons
    if (process.env.NODE_ENV !== 'test') {
      try {
        const { initCrons } = require('./services/cronService');
        initCrons();
      } catch (e) {
        console.warn('⚠️  Crons non démarrés:', e.message);
      }
    }

    // 4. Routes (après DB)
    await loadRoutes();
    console.log(`🎉 PayMe Africa opérationnel — http://0.0.0.0:${PORT}`);

  } catch (err) {
    console.error('❌ Erreur connexion DB/Redis:', err.message);
    // /health répond toujours — on charge les routes sans DB
    await loadRoutes();
  }
}

start().catch(err => {
  console.error('💀 Crash fatal:', err.message);
  process.exit(1);
});

module.exports = app;
