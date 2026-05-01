const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { db, logger } = require('../config/database');

const BASE_URL = process.env.PUBLIC_URL || 'https://pay.paymeafrica.sn';
const TOKEN_LEN = 8;

/**
 * Génère un token court unique (8 chars alphanumériques)
 */
function generateToken() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: TOKEN_LEN }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Génère le QR code SVG pour une URL
 */
async function generateQRSvg(url) {
  return QRCode.toString(url, {
    type:          'svg',
    color:         { dark: '#1B4332', light: '#FFFFFF' },
    width:         300,
    margin:        2,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Créer un lien de paiement
 */
async function createPaymentLink(merchantId, {
  amount, label, description, expiresInDays = 30,
}) {
  // Token unique
  let token;
  let attempts = 0;
  do {
    token = generateToken();
    const { rows } = await db.query('SELECT id FROM payment_links WHERE token = $1', [token]);
    if (rows.length === 0) break;
    attempts++;
  } while (attempts < 10);

  const url    = `${BASE_URL}/p/${token}`;
  const qrSvg  = await generateQRSvg(url);
  const expires = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { rows } = await db.query(
    `INSERT INTO payment_links
       (id, merchant_id, token, amount, label, description, qr_svg, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [uuidv4(), merchantId, token, amount || null, label || null,
     description || null, qrSvg, expires]
  );

  logger.info('Lien paiement créé', { token, merchantId, amount });

  return { ...rows[0], url, qrUrl: `${BASE_URL}/qr/${token}.svg` };
}

/**
 * Lister les liens d'un marchand
 */
async function listPaymentLinks(merchantId) {
  const { rows } = await db.query(
    `SELECT pl.*,
       COUNT(t.id) AS transaction_count,
       COALESCE(SUM(t.amount) FILTER (WHERE t.payment_status = 'completed'), 0) AS revenue
     FROM payment_links pl
     LEFT JOIN transactions t ON t.payment_link_id = pl.id
     WHERE pl.merchant_id = $1
     GROUP BY pl.id
     ORDER BY pl.created_at DESC`,
    [merchantId]
  );
  return rows.map(r => ({
    ...r,
    url: `${BASE_URL}/p/${r.token}`,
    qrUrl: `${BASE_URL}/qr/${r.token}.svg`,
    transactionCount: parseInt(r.transaction_count),
    revenue: parseInt(r.revenue),
  }));
}

/**
 * Récupérer un lien par token (public — sans auth)
 */
async function getPaymentLinkByToken(token) {
  const { rows } = await db.query(
    `SELECT pl.*, m.business_name, m.city, m.currency
     FROM payment_links pl
     JOIN merchants m ON m.id = pl.merchant_id
     WHERE pl.token = $1 AND pl.is_active = TRUE`,
    [token]
  );
  if (rows.length === 0) return null;
  const link = rows[0];

  // Vérifier expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  // Incrémenter scan_count
  await db.query(
    'UPDATE payment_links SET scan_count = scan_count + 1 WHERE token = $1',
    [token]
  );

  return {
    ...link,
    url: `${BASE_URL}/p/${token}`,
    isExpired: false,
  };
}

/**
 * Initier un paiement via un lien (public)
 */
async function payViaLink(token, {
  amount: clientAmount, paymentProvider, clientName, clientPhone,
}) {
  const link = await getPaymentLinkByToken(token);
  if (!link) throw { code: 'LIEN_INVALIDE', message: 'Lien de paiement invalide ou expiré.' };

  // Montant = fixé par le marchand ou saisi par le client
  const amount = link.amount || clientAmount;
  if (!amount || amount < 1) throw { code: 'MONTANT_REQUIS', message: 'Montant requis.' };

  if (!paymentProvider) throw { code: 'PROVIDER_REQUIS', message: 'Mode de paiement requis.' };

  // Créer la transaction
  const txId = uuidv4();
  const ref  = `link-${token}-${txId.slice(0, 8)}`;

  const { rows } = await db.query(
    `INSERT INTO transactions
       (id, merchant_id, amount, currency, payment_provider, payment_status,
        client_reference, payment_link_id, client_name, client_phone, note)
     VALUES ($1, $2, $3, $4, $5, 'awaiting_confirmation', $6, $7, $8, $9, $10)
     RETURNING *`,
    [txId, link.merchant_id, amount, link.currency, paymentProvider,
     ref, link.id, clientName || null, clientPhone || null,
     link.label ? `Via lien: ${link.label}` : 'Paiement via QR code']
  );

  // Instruction paiement
  const instrMap = {
    wave:         `Envoyez ${amount.toLocaleString('fr-FR')} FCFA à ${link.business_name} via Wave.`,
    orange_money: `Composez *144# et envoyez ${amount.toLocaleString('fr-FR')} FCFA à ${link.business_name}.`,
    free_money:   `Composez *555# et envoyez ${amount.toLocaleString('fr-FR')} FCFA à ${link.business_name}.`,
    cash:         `Payez ${amount.toLocaleString('fr-FR')} FCFA en espèces au commerçant.`,
  };

  logger.info('Paiement via lien', { token, txId, amount, paymentProvider });

  return {
    transactionId: txId,
    amount,
    currency: link.currency,
    provider: paymentProvider,
    instructions: instrMap[paymentProvider] || `Paiement de ${amount.toLocaleString('fr-FR')} FCFA.`,
    merchant: { name: link.business_name, city: link.city },
  };
}

/**
 * Désactiver un lien
 */
async function deactivateLink(merchantId, linkId) {
  const { rowCount } = await db.query(
    'UPDATE payment_links SET is_active = FALSE WHERE id = $1 AND merchant_id = $2',
    [linkId, merchantId]
  );
  if (rowCount === 0) throw { code: 'LIEN_INTROUVABLE', message: 'Lien introuvable.' };
}

/**
 * Servir le QR SVG en direct
 */
async function getQRSvg(token) {
  const { rows } = await db.query(
    'SELECT qr_svg FROM payment_links WHERE token = $1 AND is_active = TRUE',
    [token]
  );
  return rows[0]?.qr_svg || null;
}

/**
 * Régénérer le QR (si URL changée)
 */
async function regenerateQR(merchantId, linkId) {
  const { rows } = await db.query(
    'SELECT token FROM payment_links WHERE id = $1 AND merchant_id = $2',
    [linkId, merchantId]
  );
  if (!rows[0]) throw { code: 'LIEN_INTROUVABLE', message: 'Lien introuvable.' };
  const url   = `${BASE_URL}/p/${rows[0].token}`;
  const qrSvg = await generateQRSvg(url);
  await db.query('UPDATE payment_links SET qr_svg = $1 WHERE id = $2', [qrSvg, linkId]);
  return qrSvg;
}

module.exports = {
  createPaymentLink, listPaymentLinks, getPaymentLinkByToken,
  payViaLink, deactivateLink, getQRSvg, regenerateQR, generateQRSvg,
};
