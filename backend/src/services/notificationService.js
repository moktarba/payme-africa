const { v4: uuidv4 } = require('uuid');
const { db, logger } = require('../config/database');

/**
 * Créer une notification pour un marchand
 */
async function createNotification(merchantId, { type, title, body, data = {} }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (id, merchant_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [uuidv4(), merchantId, type, title, body, JSON.stringify(data)]
  );
  return rows[0];
}

/**
 * Lister les notifications (avec pagination)
 */
async function listNotifications(merchantId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  let where = 'merchant_id = $1';
  const params = [merchantId];
  let idx = 2;

  if (unreadOnly) { where += ` AND is_read = FALSE`; }

  const { rows } = await db.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM notifications WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  const countRes = await db.query(
    `SELECT COUNT(*) FILTER (WHERE is_read = FALSE) AS unread
     FROM notifications WHERE merchant_id = $1`,
    [merchantId]
  );

  return {
    notifications: rows,
    unreadCount: parseInt(countRes.rows[0].unread),
    total: rows.length,
  };
}

/**
 * Marquer comme lues
 */
async function markAsRead(merchantId, ids = null) {
  if (ids && ids.length > 0) {
    await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE merchant_id = $1 AND id = ANY($2::uuid[])`,
      [merchantId, ids]
    );
  } else {
    // Marquer toutes comme lues
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE merchant_id = $1`,
      [merchantId]
    );
  }
}

/**
 * Supprimer les notifications anciennes (> 30j)
 */
async function cleanup() {
  const { rowCount } = await db.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
  );
  logger.info(`Notifications nettoyées: ${rowCount}`);
}

/**
 * Émettre une notification après une transaction confirmée
 */
async function notifyTransactionConfirmed(merchantId, tx, employeeName = null) {
  const who = employeeName ? ` par ${employeeName}` : '';
  await createNotification(merchantId, {
    type: 'transaction_confirmed',
    title: 'Paiement confirmé',
    body: `${tx.payment_provider === 'wave' ? 'Wave' : tx.payment_provider === 'orange_money' ? 'Orange Money' : 'Espèces'} · ${Number(tx.amount).toLocaleString('fr-FR')} FCFA${who}`,
    data: { transactionId: tx.id, amount: tx.amount, provider: tx.payment_provider },
  });
}

/**
 * Émettre le résumé journalier
 */
async function notifyDailySummary(merchantId, stats) {
  await createNotification(merchantId, {
    type: 'daily_summary',
    title: 'Résumé du jour',
    body: `${Number(stats.totalAmount).toLocaleString('fr-FR')} FCFA encaissés · ${stats.completedCount} transaction${stats.completedCount > 1 ? 's' : ''}`,
    data: stats,
  });
}

/**
 * Récupérer les préférences de notifications
 */
async function getPreferences(merchantId) {
  const { rows } = await db.query(
    'SELECT * FROM notification_preferences WHERE merchant_id = $1',
    [merchantId]
  );
  if (rows.length === 0) {
    // Créer les prefs par défaut
    await db.query(
      'INSERT INTO notification_preferences (merchant_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [merchantId]
    );
    return { txConfirmed: true, txPending: true, dailySummary: true, employeeLogin: false };
  }
  const p = rows[0];
  return {
    txConfirmed:   p.tx_confirmed,
    txPending:     p.tx_pending,
    dailySummary:  p.daily_summary,
    employeeLogin: p.employee_login,
  };
}

/**
 * Mettre à jour les préférences
 */
async function updatePreferences(merchantId, prefs) {
  await db.query(
    `INSERT INTO notification_preferences (merchant_id, tx_confirmed, tx_pending, daily_summary, employee_login)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (merchant_id) DO UPDATE SET
       tx_confirmed   = EXCLUDED.tx_confirmed,
       tx_pending     = EXCLUDED.tx_pending,
       daily_summary  = EXCLUDED.daily_summary,
       employee_login = EXCLUDED.employee_login,
       updated_at     = NOW()`,
    [merchantId, prefs.txConfirmed ?? true, prefs.txPending ?? true,
     prefs.dailySummary ?? true, prefs.employeeLogin ?? false]
  );
}

module.exports = {
  createNotification, listNotifications, markAsRead, cleanup,
  notifyTransactionConfirmed, notifyDailySummary,
  getPreferences, updatePreferences,
};
