'use strict';

require('dotenv').config();
require('express-async-errors');

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Requis pour express-rate-limit derrière le proxy Railway/Heroku/Nginx
app.set('trust proxy', 1);

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

// ── HEALTH (sans DB — critique pour Railway healthcheck) ─────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status:  'ok',
    version: '1.0.0',
    env:     process.env.NODE_ENV || 'development',
    ts:      new Date().toISOString(),
  });
});

// ── ROUTES ───────────────────────────────────────────────────────────
app.use('/auth',          authLimiter, require('./routes/auth'));
app.use('/merchants',     require('./routes/merchants'));
app.use('/transactions',  require('./routes/transactions'));
app.use('/catalog',       require('./routes/catalog'));
app.use('/reports',       require('./routes/reports'));
app.use('/employees',     require('./routes/employees'));
app.use('/notifications', require('./routes/notifications'));

// ── GESTION D'ERREURS (toujours après les routes) ────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable', code: 'NOT_FOUND' });
});

app.use((err, _req, res, _next) => {
  const status  = err.status  || 500;
  const code    = err.code    || 'ERREUR_SERVEUR';
  const message = err.message || 'Erreur interne';
  console.error(`[ERROR] ${status} ${code}: ${message}`);
  res.status(status).json({ success: false, message, code });
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

  // 2. Connexion DB/Redis (après HTTP — Railway ne tue pas l'app si ça échoue)
  try {
    const { db, connectRedis } = require('./config/database');
    await db.query('SELECT 1');
    console.log('✅ PostgreSQL connecté');

    // Migrations automatiques
    const { runMigrations } = require('./utils/migrate');
    await runMigrations(db);

    await connectRedis();

    if (process.env.NODE_ENV !== 'test') {
      try {
        const { initCrons } = require('./services/cronService');
        initCrons();
      } catch (e) {
        console.warn('⚠️  Crons non démarrés:', e.message);
      }
    }

    console.log(`🎉 PayMe Africa opérationnel — http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error('❌ Erreur DB/Redis:', err.message);
    console.warn('⚠️  API démarrée sans DB — seul /health répond correctement');
  }
}

start().catch(err => {
  console.error('💀 Crash fatal:', err.message);
  process.exit(1);
});

module.exports = app;
