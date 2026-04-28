const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { db } = require('../config/database');

/**
 * GET /merchants/me
 * Profil du marchand connecté
 */
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.*, 
      json_agg(json_build_object(
        'provider', pm.provider,
        'isEnabled', pm.is_enabled,
        'displayName', pm.display_name,
        'config', pm.config
      ) ORDER BY pm.provider) as payment_methods
     FROM merchants m
     LEFT JOIN merchant_payment_methods pm ON pm.merchant_id = m.id
     WHERE m.id = $1
     GROUP BY m.id`,
    [req.merchant.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Profil introuvable.' });
  }

  const merchant = rows[0];
  // Ne pas exposer le PIN hash
  delete merchant.pin_hash;

  res.json({ success: true, merchant });
});

/**
 * PUT /merchants/me
 * Mettre à jour le profil
 */
router.put('/me', authenticate, async (req, res) => {
  const schema = Joi.object({
    businessName: Joi.string().min(2).max(200).optional(),
    ownerName: Joi.string().max(200).optional().allow('', null),
    city: Joi.string().max(100).optional().allow('', null),
    zone: Joi.string().max(200).optional().allow('', null),
    activityType: Joi.string().optional().allow('', null),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { businessName, ownerName, city, zone, activityType } = req.body;

  const { rows } = await db.query(
    `UPDATE merchants SET
      business_name = COALESCE($1, business_name),
      owner_name = COALESCE($2, owner_name),
      city = COALESCE($3, city),
      zone = COALESCE($4, zone),
      activity_type = COALESCE($5, activity_type)
     WHERE id = $6
     RETURNING id, phone, business_name, owner_name, city, zone, activity_type, currency`,
    [businessName, ownerName, city, zone, activityType, req.merchant.id]
  );

  res.json({ success: true, merchant: rows[0] });
});

/**
 * GET /merchants/me/payment-methods
 * Moyens de paiement configurés
 */
router.get('/me/payment-methods', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT provider, is_enabled, display_name, config
     FROM merchant_payment_methods
     WHERE merchant_id = $1
     ORDER BY provider`,
    [req.merchant.id]
  );

  res.json({ success: true, paymentMethods: rows });
});

/**
 * PUT /merchants/me/payment-methods/:provider
 * Activer/désactiver un moyen de paiement
 */
router.put('/me/payment-methods/:provider', authenticate, async (req, res) => {
  const { provider } = req.params;
  const { isEnabled, config, displayName } = req.body;

  const validProviders = ['cash', 'wave', 'orange_money', 'free_money'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ success: false, message: 'Provider invalide.' });
  }

  await db.query(
    `INSERT INTO merchant_payment_methods (merchant_id, provider, is_enabled, config, display_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (merchant_id, provider) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       config = COALESCE(EXCLUDED.config, merchant_payment_methods.config),
       display_name = COALESCE(EXCLUDED.display_name, merchant_payment_methods.display_name)`,
    [req.merchant.id, provider, isEnabled ?? true, JSON.stringify(config || {}), displayName]
  );

  res.json({ success: true, message: 'Moyen de paiement mis à jour.' });
});

module.exports = router;
