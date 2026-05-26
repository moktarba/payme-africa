const { v4: uuidv4 } = require('uuid');
const { db, logger } = require('../config/database');

async function createNotification(merchantId, { type, title, body, data = {} }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (id, merchant_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, merchant_id, type, title, body, data, is_read, created_at`,
    [uuidv4(), merchantId, type, title, body, JSON.stringify(data)]
  );
  return rows[0];
}

async function listNotifications(merchantId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(parseInt(limit), 1), 50) : 20;
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(parseInt(offset), 0) : 0;
  const conditions = ['merchant_id = $1'];
  const params = [merchantId];

  if (unreadOnly) conditions.push('is_read = FALSE');

  const where = conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM notifications
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, safeLimit, safeOffset]
  );

  const countRes = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_read = FALSE) AS unread,
       COUNT(*) AS total
     FROM notifications
     WHERE merchant_id = $1`,
    [merchantId]
  );

  return {
    notifications: rows,
    unreadCount: parseInt(countRes.rows[0].unread || 0),
    total: parseInt(countRes.rows[0].total || 0),
    limit: safeLimit,
    offset: safeOffset,
  };
}

async function markAsRead(merchantId, ids = null) {
  if (ids && !Array.isArray(ids)) {
    throw { code: 'VALIDATION_ERREUR', message: 'ids doit etre un tableau.' };
  }

  if (ids && ids.length > 0) {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE merchant_id = $1 AND id = ANY($2::uuid[])`,
      [merchantId, ids]
    );
    return;
  }

  await db.query('UPDATE notifications SET is_read = TRUE WHERE merchant_id = $1', [merchantId]);
}

async function cleanup() {
  const { rowCount } = await db.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
  );
  logger.info(`Notifications nettoyees: ${rowCount}`);
}

async function notifyTransactionConfirmed(merchantId, tx, employeeName = null) {
  const prefs = await getPreferences(merchantId);
  if (!prefs.txConfirmed) return null;

  const who = employeeName ? ` par ${employeeName}` : '';
  return createNotification(merchantId, {
    type: 'transaction_confirmed',
    title: 'Paiement confirme',
    body: `${providerLabel(tx.payment_provider)} - ${Number(tx.amount).toLocaleString('fr-FR')} FCFA${who}`,
    data: { transactionId: tx.id, amount: tx.amount, provider: tx.payment_provider },
  });
}

async function notifyTransactionPending(merchantId, tx, employeeName = null) {
  const prefs = await getPreferences(merchantId);
  if (!prefs.txPending) return null;

  const who = employeeName ? ` par ${employeeName}` : '';
  return createNotification(merchantId, {
    type: 'transaction_pending',
    title: 'Paiement a confirmer',
    body: `${providerLabel(tx.payment_provider)} - ${Number(tx.amount).toLocaleString('fr-FR')} FCFA${who}`,
    data: { transactionId: tx.id, amount: tx.amount, provider: tx.payment_provider },
  });
}

async function notifyEmployeeLogin(merchantId, employee) {
  const prefs = await getPreferences(merchantId);
  if (!prefs.employeeLogin) return null;

  return createNotification(merchantId, {
    type: 'employee_login',
    title: 'Connexion equipe',
    body: `${employee.name} s'est connecte`,
    data: { employeeId: employee.id, employeeName: employee.name, role: employee.role },
  });
}

async function notifyDailySummary(merchantId, stats) {
  const prefs = await getPreferences(merchantId);
  if (!prefs.dailySummary) return null;

  return createNotification(merchantId, {
    type: 'daily_summary',
    title: 'Resume du jour',
    body: `${Number(stats.totalAmount).toLocaleString('fr-FR')} FCFA encaisses - ${stats.completedCount} transaction${stats.completedCount > 1 ? 's' : ''}`,
    data: stats,
  });
}

async function getPreferences(merchantId) {
  const { rows } = await db.query(
    'SELECT * FROM notification_preferences WHERE merchant_id = $1',
    [merchantId]
  );

  if (rows.length === 0) {
    await db.query(
      'INSERT INTO notification_preferences (merchant_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [merchantId]
    );
    return { txConfirmed: true, txPending: true, dailySummary: true, employeeLogin: false };
  }

  const prefs = rows[0];
  return {
    txConfirmed: prefs.tx_confirmed,
    txPending: prefs.tx_pending,
    dailySummary: prefs.daily_summary,
    employeeLogin: prefs.employee_login,
  };
}

async function updatePreferences(merchantId, prefs) {
  const current = await getPreferences(merchantId);
  const merged = {
    txConfirmed: prefs.txConfirmed ?? current.txConfirmed,
    txPending: prefs.txPending ?? current.txPending,
    dailySummary: prefs.dailySummary ?? current.dailySummary,
    employeeLogin: prefs.employeeLogin ?? current.employeeLogin,
  };

  await db.query(
    `INSERT INTO notification_preferences (merchant_id, tx_confirmed, tx_pending, daily_summary, employee_login)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (merchant_id) DO UPDATE SET
       tx_confirmed = EXCLUDED.tx_confirmed,
       tx_pending = EXCLUDED.tx_pending,
       daily_summary = EXCLUDED.daily_summary,
       employee_login = EXCLUDED.employee_login,
       updated_at = NOW()`,
    [merchantId, merged.txConfirmed, merged.txPending, merged.dailySummary, merged.employeeLogin]
  );
}

function providerLabel(provider) {
  const labels = {
    cash: 'Especes',
    wave: 'Wave',
    orange_money: 'Orange Money',
    free_money: 'Free Money',
  };
  return labels[provider] || provider || 'Paiement';
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  cleanup,
  notifyTransactionConfirmed,
  notifyTransactionPending,
  notifyEmployeeLogin,
  notifyDailySummary,
  getPreferences,
  updatePreferences,
};
