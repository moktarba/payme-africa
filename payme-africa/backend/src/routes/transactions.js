const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const {
  initiateTransaction,
  confirmTransaction,
  cancelTransaction,
  getTransactionHistory,
  getDayStats,
} = require('../services/transactionService');

const initiateSchema = Joi.object({
  amount: Joi.number().integer().min(1).max(5000000).required().messages({
    'number.base': 'Le montant doit être un nombre',
    'number.min': 'Le montant doit être supérieur à 0',
    'any.required': 'Le montant est requis',
  }),
  paymentProvider: Joi.string().valid('cash', 'wave', 'orange_money', 'free_money').required(),
  note: Joi.string().max(500).optional().allow('', null),
  customerName: Joi.string().max(200).optional().allow('', null),
  customerPhone: Joi.string().max(20).optional().allow('', null),
  itemsSnapshot: Joi.array().optional(),
  clientReference: Joi.string().uuid().optional(), // UUID généré côté mobile
});

/**
 * GET /transactions/stats/day
 * Stats du jour pour le dashboard
 */
router.get('/stats/day', authenticate, async (req, res) => {
  const stats = await getDayStats(req.merchant.id);
  res.json({ success: true, stats });
});

/**
 * GET /transactions
 * Historique des transactions
 */
router.get('/', authenticate, async (req, res) => {
  const { limit = 20, offset = 0, dateFrom, dateTo, status } = req.query;

  const result = await getTransactionHistory(req.merchant.id, {
    limit: Math.min(parseInt(limit), 100),
    offset: parseInt(offset),
    dateFrom,
    dateTo,
    status,
  });

  res.json({ success: true, ...result });
});

/**
 * POST /transactions
 * Initier un encaissement
 */
router.post('/', authenticate, async (req, res) => {
  const { error } = initiateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const transaction = await initiateTransaction({
    merchantId: req.merchant.id,
    merchantPhone: req.merchant.phone,
    ...req.body,
  });

  res.status(201).json({ success: true, transaction });
});

/**
 * GET /transactions/:id
 * Détail d'une transaction
 */
router.get('/:id', authenticate, async (req, res) => {
  const { db } = require('../config/database');
  const { rows } = await db.query(
    'SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2',
    [req.params.id, req.merchant.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Transaction introuvable.' });
  }

  res.json({ success: true, transaction: rows[0] });
});

/**
 * POST /transactions/:id/confirm
 * Confirmer manuellement (cash, Wave semi-manuel)
 */
router.post('/:id/confirm', authenticate, async (req, res) => {
  const transaction = await confirmTransaction(req.params.id, req.merchant.id);
  res.json({ success: true, transaction, message: 'Paiement confirmé !' });
});

/**
 * POST /transactions/:id/cancel
 * Annuler une transaction
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
  const { reason } = req.body;
  const transaction = await cancelTransaction(req.params.id, req.merchant.id, reason);
  res.json({ success: true, transaction, message: 'Transaction annulée.' });
});

module.exports = router;
