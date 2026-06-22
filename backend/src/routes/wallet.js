'use strict';

const router = require('express').Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /wallet
 * Retourne le solde du marchand : aujourd'hui, 7 jours, mois en cours + nb TX du jour
 */
router.get('/', async (req, res) => {
  const merchantId = req.merchant.id;

  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0)::numeric          AS balance_today,
       COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'), 0)::numeric AS balance_week,
       COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())), 0)::numeric AS balance_month,
       COUNT(*)   FILTER (WHERE created_at::date = CURRENT_DATE)                                  AS tx_count_today
     FROM transactions
     WHERE merchant_id = $1
       AND payment_status = 'completed'`,
    [merchantId]
  );

  const wallet = rows[0];

  res.json({
    success: true,
    wallet: {
      balance_today:  parseFloat(wallet.balance_today),
      balance_week:   parseFloat(wallet.balance_week),
      balance_month:  parseFloat(wallet.balance_month),
      tx_count_today: parseInt(wallet.tx_count_today, 10),
      currency:       'XOF',
    },
  });
});

module.exports = router;
