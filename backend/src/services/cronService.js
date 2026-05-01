const { db, logger } = require('../config/database');
const { notifyDailySummary } = require('./notificationService');

/**
 * Envoie le résumé journalier à tous les marchands actifs
 * Appelé à 20h00 chaque soir
 */
async function sendDailySummaries() {
  logger.info('[CRON] Démarrage résumés journaliers');
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Récupérer tous les marchands actifs ayant des transactions aujourd'hui
    const { rows: merchants } = await db.query(
      `SELECT DISTINCT m.id, m.business_name
       FROM merchants m
       JOIN transactions t ON t.merchant_id = m.id
       WHERE m.status = 'active'
         AND t.created_at::date = $1::date
         AND t.payment_status = 'completed'`,
      [today]
    );

    let sent = 0;
    for (const merchant of merchants) {
      try {
        // Calcul stats du jour
        const { rows } = await db.query(
          `SELECT
             COUNT(*) FILTER (WHERE payment_status = 'completed')   AS count,
             COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total,
             COALESCE(AVG(amount) FILTER (WHERE payment_status = 'completed'), 0) AS avg
           FROM transactions
           WHERE merchant_id = $1 AND created_at::date = $2::date`,
          [merchant.id, today]
        );

        const stats = {
          date:           today,
          completedCount: parseInt(rows[0].count),
          totalAmount:    parseInt(rows[0].total),
          avgAmount:      Math.round(parseFloat(rows[0].avg)),
        };

        // Vérifier que le marchand veut les résumés
        const { rows: prefs } = await db.query(
          'SELECT daily_summary FROM notification_preferences WHERE merchant_id = $1',
          [merchant.id]
        );

        const wantsSummary = prefs.length === 0 || prefs[0].daily_summary;
        if (wantsSummary && stats.completedCount > 0) {
          await notifyDailySummary(merchant.id, stats);
          sent++;
        }
      } catch (err) {
        logger.error(`Erreur résumé marchand ${merchant.id}`, { error: err.message });
      }
    }

    logger.info(`[CRON] Résumés journaliers envoyés: ${sent}/${merchants.length}`);
  } catch (err) {
    logger.error('[CRON] Erreur résumés journaliers', { error: err.message });
  }
}

/**
 * Nettoyer les anciennes notifications (> 30 jours)
 */
async function cleanupOldNotifications() {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
    );
    logger.info(`[CRON] Notifications nettoyées: ${rowCount}`);
  } catch (err) {
    logger.error('[CRON] Erreur nettoyage notifications', { error: err.message });
  }
}

/**
 * Nettoyer les refresh tokens expirés
 */
async function cleanupExpiredTokens() {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = TRUE`
    );
    logger.info(`[CRON] Tokens expirés nettoyés: ${rowCount}`);
  } catch (err) {
    logger.error('[CRON] Erreur nettoyage tokens', { error: err.message });
  }
}

/**
 * Initialiser tous les cron jobs
 * Utilise setInterval (pas de dépendance node-cron)
 */
function initCrons() {
  // Résumé journalier à 20h00 (check toutes les minutes)
  let lastSummaryDate = '';
  setInterval(async () => {
    const now    = new Date();
    const hour   = now.getHours();
    const minute = now.getMinutes();
    const today  = now.toISOString().slice(0, 10);

    if (hour === 20 && minute === 0 && today !== lastSummaryDate) {
      lastSummaryDate = today;
      await sendDailySummaries();
    }
  }, 60_000); // toutes les minutes

  // Nettoyage quotidien à 3h00
  let lastCleanupDate = '';
  setInterval(async () => {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);

    if (now.getHours() === 3 && now.getMinutes() === 0 && today !== lastCleanupDate) {
      lastCleanupDate = today;
      await cleanupOldNotifications();
      await cleanupExpiredTokens();
    }
  }, 60_000);

  logger.info('[CRON] Jobs initialisés (résumé 20h, nettoyage 3h)');
}

module.exports = { initCrons, sendDailySummaries, cleanupOldNotifications };
