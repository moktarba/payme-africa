const { logger } = require('../config/database');

/**
 * Middleware de gestion d'erreurs global
 * Intercepte toutes les erreurs et retourne une réponse JSON propre
 */
function errorHandler(err, req, res, next) {
  // Erreurs métier intentionnelles (throw { code, message })
  if (err.code && err.message && !err.stack) {
    return res.status(getStatusFromCode(err.code)).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Erreurs de validation Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERREUR',
      message: err.details[0].message,
    });
  }

  // Erreurs PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        code: 'DOUBLON',
        message: 'Cette donnée existe déjà.',
      });
    }
    return res.status(400).json({
      success: false,
      code: 'ERREUR_BDD',
      message: 'Erreur de données.',
    });
  }

  // Erreur inattendue — logger et masquer les détails
  logger.error('Erreur non gérée', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    merchantId: req.merchant?.id,
  });

  res.status(500).json({
    success: false,
    code: 'ERREUR_SERVEUR',
    message: 'Une erreur est survenue. Réessayez dans quelques instants.',
  });
}

function getStatusFromCode(code) {
  const map = {
    TOKEN_MANQUANT: 401,
    TOKEN_EXPIRE: 401,
    TOKEN_INVALIDE: 401,
    MERCHANT_INTROUVABLE: 401,
    COMPTE_SUSPENDU: 403,
    TROP_DE_TENTATIVES: 429,
    TROP_TENTATIVES_OTP: 429,
    OTP_EXPIRE: 400,
    OTP_INTROUVABLE: 400,
    CODE_INCORRECT: 400,
    PHONE_EXISTE: 409,
    DOUBLON: 409,
    PROVIDER_INCONNU: 400,
    PROVIDER_DESACTIVE: 400,
    METHODE_NON_ACTIVEE: 400,
    MONTANT_INVALIDE: 400,
    MONTANT_TROP_ELEVE: 400,
    TRANSACTION_INTROUVABLE: 404,
    STATUT_INVALIDE: 400,
    DEJA_COMPLETEE: 400,
    NON_SUPPORTE: 501,
  };
  return map[code] || 400;
}

/**
 * Middleware pour les routes inconnues
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'ROUTE_INTROUVABLE',
    message: `Route ${req.method} ${req.path} introuvable.`,
  });
}

module.exports = { errorHandler, notFoundHandler };
