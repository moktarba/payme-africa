const dayjs = require('dayjs');
require('dayjs/locale/fr');
dayjs.locale('fr');

/**
 * Génère un rapport mensuel en HTML (converti en PDF par le navigateur ou puppeteer)
 * Format simple, lisible, compatible impression
 */
function generateMonthlyReportHTML(merchant, report, transactions) {
  const { year, month, label, total, weekSeries } = report;
  const totalFormatted = Number(total.amount).toLocaleString('fr-FR');

  const txRows = transactions.slice(0, 100).map(tx => `
    <tr>
      <td>${dayjs(tx.created_at).format('DD/MM HH:mm')}</td>
      <td>${{ wave: 'Wave', orange_money: 'Orange Money', cash: 'Espèces', free_money: 'Free Money' }[tx.payment_provider] || tx.payment_provider}</td>
      <td style="text-align:right;font-weight:600">${Number(tx.amount).toLocaleString('fr-FR')} FCFA</td>
      <td style="color:${tx.payment_status === 'completed' ? '#059669' : '#6b7280'}">${tx.payment_status === 'completed' ? 'Confirmé' : 'Annulé'}</td>
      <td style="font-size:11px;color:#6b7280">${tx.note || '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport ${label} — ${merchant.business_name}</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 13px; color: #1f2937; margin: 0; padding: 20px; background: #fff }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1B4332; padding-bottom: 14px; margin-bottom: 20px }
  .logo { font-size: 20px; font-weight: 800; color: #1B4332 }
  .logo-sub { font-size: 12px; color: #6b7280; margin-top: 2px }
  h1 { font-size: 16px; font-weight: 700; margin: 0 0 4px }
  .merchant-info { font-size: 12px; color: #6b7280; line-height: 1.6 }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px }
  .kpi { background: #f9fafb; border-radius: 8px; padding: 12px; border: 0.5px solid #e5e7eb }
  .kpi-val { font-size: 22px; font-weight: 800; color: #1B4332 }
  .kpi-lbl { font-size: 11px; color: #6b7280; margin-top: 2px }
  .section { margin-bottom: 20px }
  .section-title { font-size: 13px; font-weight: 700; color: #1f2937; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 0.5px solid #e5e7eb }
  table { width: 100%; border-collapse: collapse; font-size: 12px }
  th { text-align: left; font-weight: 600; color: #6b7280; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px }
  td { padding: 5px 8px; border-bottom: 0.5px solid #f3f4f6 }
  tr:last-child td { border-bottom: none }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 0.5px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center }
  @media print { body { padding: 10px } .kpis { grid-template-columns: repeat(3,1fr) } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">💚 PayMe Africa</div>
    <div class="logo-sub">Rapport mensuel généré le ${dayjs().format('D MMMM YYYY')}</div>
  </div>
  <div style="text-align:right">
    <h1>${label}</h1>
    <div class="merchant-info">
      ${merchant.business_name}<br>
      ${merchant.owner_name || ''}<br>
      ${merchant.city || ''}<br>
      ${merchant.phone}
    </div>
  </div>
</div>

<div class="kpis">
  <div class="kpi">
    <div class="kpi-val">${totalFormatted} FCFA</div>
    <div class="kpi-lbl">💵 Chiffre d'affaires</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${total.count}</div>
    <div class="kpi-lbl">✅ Transactions confirmées</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${total.count > 0 ? Math.round(total.amount / total.count).toLocaleString('fr-FR') : 0} FCFA</div>
    <div class="kpi-lbl">📊 Panier moyen</div>
  </div>
</div>

${weekSeries && weekSeries.length > 0 ? `
<div class="section">
  <div class="section-title">Évolution hebdomadaire</div>
  <table>
    <tr><th>Semaine</th><th style="text-align:right">Transactions</th><th style="text-align:right">Montant</th></tr>
    ${weekSeries.map((w, i) => `<tr>
      <td>Semaine ${i + 1}</td>
      <td style="text-align:right">${w.count}</td>
      <td style="text-align:right;font-weight:600">${Number(w.amount).toLocaleString('fr-FR')} FCFA</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<div class="section">
  <div class="section-title">Détail des transactions${transactions.length > 100 ? ` (100 premières sur ${transactions.length})` : ''}</div>
  <table>
    <tr><th>Date</th><th>Mode</th><th style="text-align:right">Montant</th><th>Statut</th><th>Note</th></tr>
    ${txRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">Aucune transaction ce mois</td></tr>'}
  </table>
</div>

<div class="footer">
  PayMe Africa — Rapport généré automatiquement · ${merchant.business_name} · ${label}
</div>
</body>
</html>`;
}

module.exports = { generateMonthlyReportHTML };
