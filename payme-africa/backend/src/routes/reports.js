const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getDayReport, getWeekReport, getMonthReport, exportCSV, getTopItems,
} = require('../services/reportService');

/**
 * GET /reports/day?date=YYYY-MM-DD
 */
router.get('/day', authenticate, async (req, res) => {
  const report = await getDayReport(req.merchant.id, req.query.date || null);
  res.json({ success: true, report });
});

/**
 * GET /reports/week
 */
router.get('/week', authenticate, async (req, res) => {
  const report = await getWeekReport(req.merchant.id);
  res.json({ success: true, report });
});

/**
 * GET /reports/month?year=2025&month=4
 */
router.get('/month', authenticate, async (req, res) => {
  const { year, month } = req.query;
  const report = await getMonthReport(
    req.merchant.id,
    year  ? parseInt(year)  : null,
    month ? parseInt(month) : null,
  );
  res.json({ success: true, report });
});

/**
 * GET /reports/top-items
 */
router.get('/top-items', authenticate, async (req, res) => {
  const items = await getTopItems(req.merchant.id, parseInt(req.query.limit || 5));
  res.json({ success: true, items });
});

/**
 * GET /reports/export?dateFrom=&dateTo=&status=&format=csv
 */
router.get('/export', authenticate, async (req, res) => {
  const { dateFrom, dateTo, status, format = 'csv' } = req.query;
  const csv = await exportCSV(req.merchant.id, { dateFrom, dateTo, status });

  const filename = `transactions_${req.merchant.id.slice(0, 6)}_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
});

module.exports = router;

/**
 * GET /reports/pdf?year=&month=
 * Rapport mensuel en HTML (imprimable / sauvegardable)
 */
router.get('/pdf', authenticate, async (req, res) => {
  const { year, month } = req.query;
  const { getMonthReport } = require('../services/reportService');
  const { generateMonthlyReportHTML } = require('../services/pdfService');
  const { db } = require('../config/database');

  const report = await getMonthReport(
    req.merchant.id,
    year  ? parseInt(year)  : null,
    month ? parseInt(month) : null
  );

  // Récupérer les transactions du mois
  const y = year  ? parseInt(year)  : new Date().getFullYear();
  const m = month ? parseInt(month) : new Date().getMonth() + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const end   = new Date(y, m, 0).toISOString().slice(0, 10);

  const { rows: txs } = await db.query(
    `SELECT * FROM transactions
     WHERE merchant_id = $1
       AND created_at::date >= $2 AND created_at::date <= $3
     ORDER BY created_at DESC`,
    [req.merchant.id, start, end]
  );

  // Récupérer les infos complètes du marchand
  const { rows: merchants } = await db.query(
    'SELECT * FROM merchants WHERE id = $1',
    [req.merchant.id]
  );

  const html = generateMonthlyReportHTML(merchants[0], report, txs);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="rapport_${y}_${String(m).padStart(2,'0')}.html"`);
  res.send(html);
});
