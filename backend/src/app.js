'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// HEALTH — répond SANS base de données
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status:  'ok',
    mode:    process.env.NODE_ENV || 'development',
    version: '4.0.0',
    ts:      new Date().toISOString(),
  });
});

let routesLoaded = false;
async function loadRoutes() {
  if (routesLoaded) return;
  try {
    app.use('/auth',          require('./routes/auth'));
    app.use('/merchants',     require('./routes/merchants'));
    app.use('/transactions',  require('./routes/transactions'));
    app.use('/catalog',       require('./routes/catalog'));
    app.use('/reports',       require('./routes/reports'));
    app.use('/employees',     require('./routes/employees'));
    app.use('/notifications', require('./routes/notifications'));
    app.use('/webhooks',      require('./routes/webhooks'));
    app.use('/payment-links', require('./routes/paymentLinks'));
    app.get('/p/:token', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'payment.html'));
    });
    routesLoaded = true;
    console.log('✅ Routes chargées');
  } catch (err) {
    console.error('❌ Routes:', err.message);
  }
}

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'ERROR' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable', code: 'NOT_FOUND' });
});

const PORT = parseInt(process.env.PORT || '4000');

async function start() {
  console.log('🚀 Démarrage PayMe Africa...');
  console.log('   PORT:', PORT);
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ définie' : '❌ MANQUANTE');
  console.log('   JWT_SECRET:',   process.env.JWT_SECRET   ? '✅ défini'  : '❌ MANQUANT');

  // 1. HTTP FIRST — Railway healthcheck
  await new Promise(resolve => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('✅ Serveur HTTP démarré sur port', PORT);
      resolve();
    });
  });

  // 2. DB ensuite
  try {
    const { db, connectRedis } = require('./config/database');
    await db.query('SELECT 1');
    console.log('✅ PostgreSQL connecté');
    await connectRedis();
    if (process.env.NODE_ENV !== 'test') {
      try { require('./services/cronService').initCrons(); } catch(e) { console.warn('Crons:', e.message); }
    }
    await loadRoutes();
    console.log('🎉 PayMe Africa opérationnel sur port', PORT);
  } catch (err) {
    console.error('❌ Erreur DB:', err.message);
    await loadRoutes();
  }
}

start().catch(err => { console.error('💀 Fatal:', err.message); process.exit(1); });

module.exports = app;
