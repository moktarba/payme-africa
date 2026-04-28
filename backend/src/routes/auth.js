const router = require('express').Router();
const Joi = require('joi');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { register, loginComplete, refreshAccessToken, logout } = require('../services/authService');

// Validation
const phoneSchema = Joi.object({
  phone: Joi.string().min(8).max(20).required().messages({
    'string.empty': 'Le numéro de téléphone est requis',
    'any.required': 'Le numéro de téléphone est requis',
  })
});

const registerSchema = Joi.object({
  phone: Joi.string().min(8).max(20).required(),
  businessName: Joi.string().min(2).max(200).required().messages({
    'string.empty': 'Le nom du commerce est requis',
  }),
  ownerName: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  activityType: Joi.string().valid(
    'vendeur_ambulant', 'boutique', 'restaurant', 'coiffeur',
    'reparateur', 'gargote', 'autre'
  ).optional(),
});

/**
 * POST /auth/send-otp
 * Envoyer un OTP (pour login ou register)
 */
router.post('/send-otp', async (req, res) => {
  const { error } = phoneSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { phone, purpose = 'login' } = req.body;
  const result = await sendOtp(phone, purpose);

  const response = { success: true, message: 'Code envoyé par SMS', phone: result.phone };
  // En dev, on expose le code
  if (result.dev_code) response.devCode = result.dev_code;

  res.json(response);
});

/**
 * POST /auth/register
 * Inscription + envoi OTP
 */
router.post('/register', async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { phone, businessName, ownerName, city, activityType } = req.body;

  await register({ phone, businessName, ownerName, city, activityType });

  // Envoyer OTP pour vérification
  const otpResult = await sendOtp(phone, 'login');

  const response = {
    success: true,
    message: 'Compte créé ! Code de vérification envoyé.',
    phone: otpResult.phone,
  };
  if (otpResult.dev_code) response.devCode = otpResult.dev_code;

  res.status(201).json(response);
});

/**
 * POST /auth/verify-otp
 * Vérifier OTP + retourner tokens
 */
router.post('/verify-otp', async (req, res) => {
  const { phone, code, purpose = 'login' } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Téléphone et code requis.' });
  }

  await verifyOtp(phone, code.toString(), purpose);

  const deviceInfo = req.headers['user-agent'];
  const result = await loginComplete(phone, deviceInfo);

  res.json({ success: true, ...result });
});

/**
 * POST /auth/refresh
 * Rafraîchir le token
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token requis.' });
  }

  const result = await refreshAccessToken(refreshToken);
  res.json({ success: true, ...result });
});

/**
 * POST /auth/logout
 */
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await logout(refreshToken);
  res.json({ success: true, message: 'Déconnecté.' });
});

module.exports = router;
