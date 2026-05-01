const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  createPaymentLink, listPaymentLinks, getPaymentLinkByToken,
  payViaLink, deactivateLink, getQRSvg,
} = require('../services/paymentLinkService');

// ── ROUTES PROTÉGÉES (marchands) ────────────────────────────────────

/** GET /payment-links — liste des liens du marchand */
router.get('/', authenticate, async (req, res) => {
  const links = await listPaymentLinks(req.merchant.id);
  res.json({ success: true, links });
});

/** POST /payment-links — créer un lien */
router.post('/', authenticate, async (req, res) => {
  const { amount, label, description, expiresInDays } = req.body;
  const link = await createPaymentLink(req.merchant.id, {
    amount: amount ? parseInt(amount) : null,
    label, description,
    expiresInDays: expiresInDays ?? 30,
  });
  res.status(201).json({ success: true, link });
});

/** DELETE /payment-links/:id — désactiver un lien */
router.delete('/:id', authenticate, async (req, res) => {
  await deactivateLink(req.merchant.id, req.params.id);
  res.json({ success: true, message: 'Lien désactivé.' });
});

// ── ROUTES PUBLIQUES (clients) ────────────────────────────────────

/** GET /payment-links/p/:token — infos du lien (public) */
router.get('/p/:token', async (req, res) => {
  const link = await getPaymentLinkByToken(req.params.token);
  if (!link) return res.status(404).json({ success: false, message: 'Lien invalide ou expiré.' });
  // Ne pas exposer les données internes
  res.json({
    success: true,
    link: {
      token:       link.token,
      amount:      link.amount,
      currency:    link.currency,
      label:       link.label,
      description: link.description,
      merchant:    { name: link.business_name, city: link.city },
      expiresAt:   link.expires_at,
    },
  });
});

/** POST /payment-links/p/:token/pay — payer via un lien (public) */
router.post('/p/:token/pay', async (req, res) => {
  const { amount, paymentProvider, clientName, clientPhone } = req.body;
  const result = await payViaLink(req.params.token, {
    amount: amount ? parseInt(amount) : null,
    paymentProvider, clientName, clientPhone,
  });
  res.status(201).json({ success: true, ...result });
});

/** GET /payment-links/qr/:token.svg — QR code SVG (public) */
router.get('/qr/:tokenSvg', async (req, res) => {
  const token = req.params.tokenSvg.replace('.svg', '');
  const svg   = await getQRSvg(token);
  if (!svg) return res.status(404).send('QR code introuvable');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

module.exports = router;
