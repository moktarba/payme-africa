const { db } = require('../config/database');
const dayjs = require('dayjs');

/**
 * Rapport journalier détaillé
 */
async function getDayReport(merchantId, date = null) {
  const target = date ? dayjs(date) : dayjs();
  const dateStr = target.format('YYYY-MM-DD');

  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE payment_status = 'completed')               AS completed_count,
       COUNT(*) FILTER (WHERE payment_status = 'awaiting_confirmation')   AS pending_count,
       COUNT(*) FILTER (WHERE payment_status = 'cancelled')               AS cancelled_count,
       COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total_amount,
       COALESCE(AVG(amount) FILTER (WHERE payment_status = 'completed'), 0) AS avg_amount,
       COALESCE(MAX(amount) FILTER (WHERE payment_status = 'completed'), 0) AS max_amount,
       json_agg(json_build_object(
         'provider', payment_provider,
         'amount', amount,
         'status', payment_status,
         'hour', EXTRACT(HOUR FROM created_at),
         'created_at', created_at
       ) ORDER BY created_at) AS transactions_raw
     FROM transactions
     WHERE merchant_id = $1 AND created_at::date = $2::date`,
    [merchantId, dateStr]
  );

  const row = rows[0];
  const txs = row.transactions_raw || [];

  // Répartition par provider
  const byProvider = {};
  // Répartition par heure
  const byHour = Array(24).fill(0).map((_, h) => ({ hour: h, amount: 0, count: 0 }));

  txs.forEach(tx => {
    if (tx.status === 'completed') {
      if (!byProvider[tx.provider]) byProvider[tx.provider] = { count: 0, amount: 0 };
      byProvider[tx.provider].count++;
      byProvider[tx.provider].amount += parseInt(tx.amount);
      const h = parseInt(tx.hour);
      byHour[h].amount += parseInt(tx.amount);
      byHour[h].count++;
    }
  });

  // Heures actives seulement
  const activeHours = byHour.filter(h => h.count > 0);

  return {
    date: dateStr,
    completedCount: parseInt(row.completed_count),
    pendingCount:   parseInt(row.pending_count),
    cancelledCount: parseInt(row.cancelled_count),
    totalAmount:    parseInt(row.total_amount),
    avgAmount:      Math.round(parseFloat(row.avg_amount)),
    maxAmount:      parseInt(row.max_amount),
    byProvider,
    byHour: activeHours,
  };
}

/**
 * Rapport hebdomadaire (7 derniers jours)
 */
async function getWeekReport(merchantId) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
  }

  const { rows } = await db.query(
    `SELECT
       created_at::date AS day,
       COUNT(*) FILTER (WHERE payment_status = 'completed') AS count,
       COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total
     FROM transactions
     WHERE merchant_id = $1
       AND created_at::date >= $2::date
       AND created_at::date <= $3::date
     GROUP BY created_at::date
     ORDER BY day`,
    [merchantId, days[0], days[6]]
  );

  const rowMap = {};
  rows.forEach(r => { rowMap[r.day.toISOString().slice(0, 10)] = r; });

  const series = days.map(d => ({
    date:   d,
    label:  dayjs(d).format('ddd'),
    count:  parseInt(rowMap[d]?.count || 0),
    amount: parseInt(rowMap[d]?.total || 0),
  }));

  const totals = series.reduce((acc, d) => ({
    count:  acc.count  + d.count,
    amount: acc.amount + d.amount,
  }), { count: 0, amount: 0 });

  const best = series.reduce((b, d) => d.amount > b.amount ? d : b, series[0]);

  return { series, totals, bestDay: best };
}

/**
 * Rapport mensuel
 */
async function getMonthReport(merchantId, year = null, month = null) {
  const now = dayjs();
  const y = year  || now.year();
  const m = month || now.month() + 1;
  const start = dayjs(`${y}-${String(m).padStart(2,'0')}-01`);
  const end   = start.endOf('month');

  const { rows } = await db.query(
    `SELECT
       EXTRACT(WEEK FROM created_at) AS week_num,
       COUNT(*) FILTER (WHERE payment_status = 'completed') AS count,
       COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total
     FROM transactions
     WHERE merchant_id = $1
       AND created_at::date >= $2
       AND created_at::date <= $3
     GROUP BY week_num
     ORDER BY week_num`,
    [merchantId, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
  );

  const totalResult = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE payment_status = 'completed') AS count,
       COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total
     FROM transactions
     WHERE merchant_id = $1
       AND created_at::date >= $2 AND created_at::date <= $3`,
    [merchantId, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
  );

  return {
    year: y, month: m,
    label: start.format('MMMM YYYY'),
    weekSeries: rows.map(r => ({
      week: parseInt(r.week_num),
      count: parseInt(r.count),
      amount: parseInt(r.total),
    })),
    total: {
      count:  parseInt(totalResult.rows[0].count),
      amount: parseInt(totalResult.rows[0].total),
    },
  };
}

/**
 * Export CSV des transactions
 */
async function exportCSV(merchantId, { dateFrom, dateTo, status } = {}) {
  let conditions = ['merchant_id = $1'];
  const params = [merchantId];
  let idx = 2;

  if (dateFrom) { conditions.push(`created_at::date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo)   { conditions.push(`created_at::date <= $${idx++}`); params.push(dateTo); }
  if (status)   { conditions.push(`payment_status = $${idx++}`);    params.push(status); }

  const { rows } = await db.query(
    `SELECT id, amount, currency, payment_provider, payment_status,
            note, customer_name, created_at, completed_at
     FROM transactions
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );

  const header = 'ID,Montant,Devise,Mode de paiement,Statut,Note,Client,Date création,Date confirmation';
  const lines  = rows.map(r => [
    r.id.slice(0, 8).toUpperCase(),
    r.amount,
    r.currency,
    r.payment_provider,
    r.payment_status,
    r.note ? `"${r.note.replace(/"/g, '""')}"` : '',
    r.customer_name ? `"${r.customer_name}"` : '',
    r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY HH:mm') : '',
    r.completed_at ? dayjs(r.completed_at).format('DD/MM/YYYY HH:mm') : '',
  ].join(','));

  return [header, ...lines].join('\n');
}

/**
 * Top articles vendus
 */
async function getTopItems(merchantId, limit = 5) {
  const { rows } = await db.query(
    `SELECT
       item->>'name' AS name,
       SUM((item->>'qty')::int) AS qty,
       SUM((item->>'price')::int * (item->>'qty')::int) AS revenue
     FROM transactions,
       jsonb_array_elements(items_snapshot::jsonb) AS item
     WHERE merchant_id = $1
       AND payment_status = 'completed'
       AND jsonb_array_length(items_snapshot::jsonb) > 0
     GROUP BY item->>'name'
     ORDER BY revenue DESC
     LIMIT $2`,
    [merchantId, limit]
  );
  return rows.map(r => ({
    name:    r.name,
    qty:     parseInt(r.qty),
    revenue: parseInt(r.revenue),
  }));
}

module.exports = { getDayReport, getWeekReport, getMonthReport, exportCSV, getTopItems };
