'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH (en premier, sans DB) ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status:  'ok',
    mode:    process.env.NODE_ENV || 'development',
    version: '4.0.0',
    ts:      new Date().toISOString(),
  });
});

// ── ROUTES ───────────────────────────────────────────────────────────
let routesLoaded = false;
async function loadRoutes() {
  if (routesLoaded) return;
  try {
    const authRoutes         = require('./routes/auth');
    const merchantRoutes     = require('./routes/merchants');
    const transactionRoutes  = require('./routes/transactions');
    const catalogRoutes      = require('./routes/catalog');
    const reportRoutes       = require('./routes/reports');
    const employeeRoutes     = require('./routes/employees');
    const notifRoutes        = require('./routes/notifications');
    const webhookRoutes      = require('./routes/webhooks');
    const paymentLinkRoutes  = require('./routes/paymentLinks');

    app.use('/auth',           authRoutes);
    app.use('/merchants',      merchantRoutes);
    app.use('/transactions',   transactionRoutes);
    app.use('/catalog',        catalogRoutes);
    app.use('/reports',        reportRoutes);
    app.use('/employees',      employeeRoutes);
    app.use('/notifications',  notifRoutes);
    app.use('/webhooks',       webhookRoutes);
    app.use('/payment-links',  paymentLinkRoutes);

    // Page client QR code
    app.get('/p/:token', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'payment.html'));
    });

    routesLoaded = true;
    console.log('✅ Routes chargées');
  } catch (err) {
    console.error('❌ Erreur chargement routes:', err.message);
    console.error(err.stack);
  }
}

// ── GESTION D'ERREURS ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status  = err.status || 500;
  const code    = err.code   || 'ERREUR_SERVEUR';
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
  console.log(`   NODE_ENV:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT:          ${PORT}`);
  console.log(`   DATABASE_URL:  ${process.env.DATABASE_URL ? '✅ définie' : '❌ MANQUANTE'}`);
  console.log(`   JWT_SECRET:    ${process.env.JWT_SECRET  ? '✅ défini'  : '❌ MANQUANT'}`);

  // 1. Démarrer le serveur HTTP IMMÉDIATEMENT (Railway healthcheck)
  await new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Serveur HTTP démarré sur port ${PORT}`);
      resolve();
    });
  });

  // 2. Connexion DB (après le démarrage HTTP)
  try {
    const { db, connectRedis, logger } = require('./config/database');
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

    // 4. Charger les routes (après DB OK)
    await loadRoutes();

    console.log(`🎉 PayMe Africa opérationnel — http://0.0.0.0:${PORT}`);

  } catch (err) {
    console.error('❌ Erreur démarrage:', err.message);
    console.error(err.stack);
    // Ne pas quitter — le serveur HTTP tourne, /health répond
    // Les routes DB seront indisponibles mais Railway ne killera pas l'app
    await loadRoutes(); // charger quand même (certaines routes n'ont pas besoin de DB)
  }
}

start().catch(err => {
  console.error('💀 Crash fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});

module.exports = app;
