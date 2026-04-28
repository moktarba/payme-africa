/**
 * Middleware de vérification de rôle
 * Usage : router.post('/...', authenticate, requireRole('manager'), handler)
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  // Le propriétaire (owner) a toujours accès
  const role = req.merchant?.role || 'owner';
  if (role === 'owner' || allowedRoles.includes(role)) return next();
  return res.status(403).json({
    success: false,
    code: 'PERMISSION_REFUSEE',
    message: 'Vous n\'avez pas les droits pour effectuer cette action.',
  });
};

/**
 * Middleware : seul le propriétaire (compte principal) peut accéder
 */
const ownerOnly = (req, res, next) => {
  if (req.merchant?.type === 'employee') {
    return res.status(403).json({
      success: false,
      code: 'OWNER_SEULEMENT',
      message: 'Accès réservé au propriétaire du compte.',
    });
  }
  next();
};

module.exports = { requireRole, ownerOnly };
