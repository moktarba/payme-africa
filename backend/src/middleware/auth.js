const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MANQUANT',
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRE',
          message: 'Session expirée, veuillez vous reconnecter'
        });
      }
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALIDE',
        message: 'Token invalide'
      });
    }

    const { rows } = await db.query(
      'SELECT id, phone, business_name, status, currency FROM merchants WHERE id = $1',
      [decoded.merchantId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'MERCHANT_INTROUVABLE',
        message: 'Compte introuvable'
      });
    }

    if (rows[0].status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'COMPTE_SUSPENDU',
        message: 'Votre compte a été suspendu'
      });
    }

    req.merchant = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
