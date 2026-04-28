const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db, logger } = require('../config/database');
const { normalizePhone } = require('./otpService');

function generateTokens(merchantId) {
  const accessToken = jwt.sign(
    { merchantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
}

async function saveRefreshToken(merchantId, refreshToken, deviceInfo) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.query(
    `INSERT INTO refresh_tokens (id, merchant_id, token_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), merchantId, refreshToken, deviceInfo, expiresAt]
  );
}

/**
 * Inscription d'un nouveau commerçant
 */
async function register({ phone, businessName, ownerName, city, activityType }) {
  const normalizedPhone = normalizePhone(phone);

  // Vérifier si le numéro existe déjà
  const existing = await db.query(
    'SELECT id FROM merchants WHERE phone = $1',
    [normalizedPhone]
  );

  if (existing.rows.length > 0) {
    throw { code: 'PHONE_EXISTE', message: 'Ce numéro est déjà enregistré. Connectez-vous.' };
  }

  const merchantId = uuidv4();

  await db.query(
    `INSERT INTO merchants (id, phone, business_name, owner_name, city, activity_type, is_phone_verified)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
    [merchantId, normalizedPhone, businessName, ownerName || null, city || null, activityType || null]
  );

  // Activer Cash par défaut
  await db.query(
    `INSERT INTO merchant_payment_methods (merchant_id, provider, is_enabled, display_name)
     VALUES ($1, 'cash', TRUE, 'Espèces'), ($1, 'wave', TRUE, 'Wave')`,
    [merchantId]
  );

  logger.info('Nouveau marchand inscrit', { merchantId, phone: normalizedPhone });

  return { merchantId };
}

/**
 * Finaliser login après vérification OTP
 */
async function loginComplete(phone, deviceInfo = null) {
  const normalizedPhone = normalizePhone(phone);

  const { rows } = await db.query(
    `SELECT id, phone, business_name, owner_name, status, currency, activity_type, city, onboarding_level
     FROM merchants WHERE phone = $1`,
    [normalizedPhone]
  );

  if (rows.length === 0) {
    throw { code: 'MERCHANT_INTROUVABLE', message: 'Compte introuvable.' };
  }

  const merchant = rows[0];

  if (merchant.status !== 'active') {
    throw { code: 'COMPTE_SUSPENDU', message: 'Votre compte a été suspendu.' };
  }

  const { accessToken, refreshToken } = generateTokens(merchant.id);
  await saveRefreshToken(merchant.id, refreshToken, deviceInfo);

  return {
    accessToken,
    refreshToken,
    merchant: {
      id: merchant.id,
      phone: merchant.phone,
      businessName: merchant.business_name,
      ownerName: merchant.owner_name,
      city: merchant.city,
      activityType: merchant.activity_type,
      currency: merchant.currency,
      onboardingLevel: merchant.onboarding_level,
    }
  };
}

/**
 * Rafraîchir un access token
 */
async function refreshAccessToken(refreshToken) {
  const { rows } = await db.query(
    `SELECT rt.merchant_id, rt.expires_at, rt.is_revoked, m.status
     FROM refresh_tokens rt
     JOIN merchants m ON m.id = rt.merchant_id
     WHERE rt.token_hash = $1`,
    [refreshToken]
  );

  if (rows.length === 0) {
    throw { code: 'TOKEN_INVALIDE', message: 'Session invalide, reconnectez-vous.' };
  }

  const token = rows[0];
  if (token.is_revoked || new Date() > new Date(token.expires_at)) {
    throw { code: 'TOKEN_EXPIRE', message: 'Session expirée, reconnectez-vous.' };
  }

  if (token.status !== 'active') {
    throw { code: 'COMPTE_SUSPENDU', message: 'Compte suspendu.' };
  }

  const newAccessToken = jwt.sign(
    { merchantId: token.merchant_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return { accessToken: newAccessToken };
}

/**
 * Déconnexion - révoquer le refresh token
 */
async function logout(refreshToken) {
  await db.query(
    'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1',
    [refreshToken]
  );
}

module.exports = { register, loginComplete, refreshAccessToken, logout };
