const { db, redisClient, logger } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES || '5');
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');
const MAX_ATTEMPTS = 3;

function generateCode() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('00221')) cleaned = '+221' + cleaned.slice(5);
  if (cleaned.startsWith('221') && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
  if (!cleaned.startsWith('+')) cleaned = '+221' + cleaned;
  return cleaned;
}

/** Rate limiting via Redis si disponible, sinon via PostgreSQL */
async function checkRateLimit(normalizedPhone) {
  try {
    if (redisClient.isOpen) {
      const key = `otp_rate:${normalizedPhone}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, 3600);
      if (count > 3) {
        throw { code: 'TROP_DE_TENTATIVES', message: 'Trop de demandes. Attendez une heure.' };
      }
      return;
    }
  } catch (err) {
    if (err.code === 'TROP_DE_TENTATIVES') throw err;
    logger.warn('Redis indisponible, fallback rate-limit DB', { error: err.message });
  }

  // Fallback : compter les OTP créés dans la dernière heure via DB
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM otps
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [normalizedPhone]
  );
  if (parseInt(rows[0].cnt) >= 3) {
    throw { code: 'TROP_DE_TENTATIVES', message: 'Trop de demandes. Attendez une heure.' };
  }
}

async function sendOtp(phone, purpose = 'login') {
  const normalizedPhone = normalizePhone(phone);

  await checkRateLimit(normalizedPhone);

  // Invalider les OTP précédents
  await db.query(
    'UPDATE otps SET is_used = TRUE WHERE phone = $1 AND purpose = $2 AND is_used = FALSE',
    [normalizedPhone, purpose]
  );

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO otps (id, phone, code, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), normalizedPhone, code, purpose, expiresAt]
  );

  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] OTP pour ${normalizedPhone}: ${code} (expire dans ${OTP_EXPIRES_MINUTES} min)`);
    return { sent: true, dev_code: code, phone: normalizedPhone };
  }

  try {
    const AfricasTalking = require('africastalking')({
      apiKey:    process.env.AT_API_KEY,
      username:  process.env.AT_USERNAME,
    });
    const message = `PayMe: votre code est ${code}. Valable ${OTP_EXPIRES_MINUTES} minutes. Ne le partagez pas.`;
    await AfricasTalking.SMS.send({
      to: [normalizedPhone],
      message,
      from: process.env.AT_SENDER_ID,
    });
    logger.info(`OTP envoyé à ${normalizedPhone}`);
    return { sent: true, phone: normalizedPhone };
  } catch (err) {
    logger.error('Erreur envoi SMS', { error: err.message, phone: normalizedPhone });
    throw { code: 'ERREUR_SMS', message: "Impossible d'envoyer le SMS. Réessayez." };
  }
}

async function verifyOtp(phone, code, purpose = 'login') {
  const normalizedPhone = normalizePhone(phone);

  const { rows } = await db.query(
    `SELECT id, code, attempts, max_attempts, expires_at, is_used
     FROM otps
     WHERE phone = $1 AND purpose = $2 AND is_used = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedPhone, purpose]
  );

  if (rows.length === 0) {
    throw { code: 'OTP_INTROUVABLE', message: 'Aucun code envoyé. Demandez un nouveau code.' };
  }

  const otp = rows[0];

  if (new Date() > new Date(otp.expires_at)) {
    throw { code: 'OTP_EXPIRE', message: 'Code expiré. Demandez un nouveau code.' };
  }

  if (otp.attempts >= otp.max_attempts) {
    throw { code: 'TROP_TENTATIVES_OTP', message: 'Trop de tentatives incorrectes.' };
  }

  if (otp.code !== code) {
    await db.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
    const remaining = otp.max_attempts - (otp.attempts + 1);
    throw { code: 'CODE_INCORRECT', message: `Code incorrect. ${remaining} tentative(s) restante(s).` };
  }

  await db.query('UPDATE otps SET is_used = TRUE WHERE id = $1', [otp.id]);
  return { verified: true, phone: normalizedPhone };
}

module.exports = { sendOtp, verifyOtp, normalizePhone };
