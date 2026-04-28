const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { db } = require('../config/database');

const itemSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  price: Joi.number().integer().min(0).required(),
  category: Joi.string().max(100).optional().allow('', null),
  description: Joi.string().max(500).optional().allow('', null),
  sortOrder: Joi.number().integer().optional(),
});

/**
 * GET /catalog
 * Liste les articles du marchand
 */
router.get('/', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, price, category, description, is_active, sort_order, created_at
     FROM catalog_items
     WHERE merchant_id = $1 AND is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [req.merchant.id]
  );
  res.json({ success: true, items: rows });
});

/**
 * POST /catalog
 * Créer un article
 */
router.post('/', authenticate, async (req, res) => {
  const { error } = itemSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { name, price, category, description, sortOrder } = req.body;

  // Max 200 articles par marchand (MVP)
  const count = await db.query('SELECT COUNT(*) FROM catalog_items WHERE merchant_id = $1 AND is_active = TRUE', [req.merchant.id]);
  if (parseInt(count.rows[0].count) >= 200) {
    return res.status(400).json({ success: false, message: 'Maximum 200 articles atteint.' });
  }

  const { rows } = await db.query(
    `INSERT INTO catalog_items (merchant_id, name, price, category, description, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.merchant.id, name, price, category || null, description || null, sortOrder || 0]
  );

  res.status(201).json({ success: true, item: rows[0] });
});

/**
 * PUT /catalog/:id
 * Modifier un article
 */
router.put('/:id', authenticate, async (req, res) => {
  const { error } = itemSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { name, price, category, description, sortOrder } = req.body;

  const { rows } = await db.query(
    `UPDATE catalog_items SET name=$1, price=$2, category=$3, description=$4, sort_order=$5
     WHERE id=$6 AND merchant_id=$7 RETURNING *`,
    [name, price, category || null, description || null, sortOrder || 0, req.params.id, req.merchant.id]
  );

  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Article introuvable.' });
  res.json({ success: true, item: rows[0] });
});

/**
 * DELETE /catalog/:id
 * Désactiver un article (soft delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE catalog_items SET is_active = FALSE WHERE id = $1 AND merchant_id = $2`,
    [req.params.id, req.merchant.id]
  );
  if (rowCount === 0) return res.status(404).json({ success: false, message: 'Article introuvable.' });
  res.json({ success: true, message: 'Article supprimé.' });
});

module.exports = router;
