const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  listNotifications, markAsRead,
  getPreferences, updatePreferences,
} = require('../services/notificationService');

/** GET /notifications */
router.get('/', authenticate, async (req, res) => {
  const { limit = 20, offset = 0, unreadOnly } = req.query;
  const result = await listNotifications(req.merchant.id, {
    limit: Math.min(parseInt(limit), 50),
    offset: parseInt(offset),
    unreadOnly: unreadOnly === 'true',
  });
  res.json({ success: true, ...result });
});

/** POST /notifications/read — marquer lues */
router.post('/read', authenticate, async (req, res) => {
  const { ids } = req.body; // tableau d'UUIDs ou vide = toutes
  await markAsRead(req.merchant.id, ids || null);
  res.json({ success: true, message: 'Notifications marquées comme lues.' });
});

/** GET /notifications/preferences */
router.get('/preferences', authenticate, async (req, res) => {
  const prefs = await getPreferences(req.merchant.id);
  res.json({ success: true, preferences: prefs });
});

/** PUT /notifications/preferences */
router.put('/preferences', authenticate, async (req, res) => {
  await updatePreferences(req.merchant.id, req.body);
  res.json({ success: true, message: 'Préférences mises à jour.' });
});

module.exports = router;
