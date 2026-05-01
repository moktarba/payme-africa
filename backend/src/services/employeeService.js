const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { db, logger } = require('../config/database');

const ROLES = ['owner', 'manager', 'cashier'];

/** Liste les employés actifs d'un marchand */
async function listEmployees(merchantId) {
  const { rows } = await db.query(
    `SELECT id, name, phone, role, is_active, daily_limit, created_at
     FROM employees WHERE merchant_id = $1 ORDER BY role, name`,
    [merchantId]
  );
  return rows;
}

/** Créer un employé */
async function createEmployee(merchantId, { name, phone, role = 'cashier', pin, dailyLimit }) {
  if (!ROLES.includes(role)) {
    throw { code: 'ROLE_INVALIDE', message: `Rôle invalide. Valeurs acceptées : ${ROLES.join(', ')}` };
  }
  if (!name?.trim()) {
    throw { code: 'NOM_REQUIS', message: 'Le nom de l\'employé est requis.' };
  }

  // Vérifier quota (max 10 employés par marchand sur MVP)
  const count = await db.query(
    'SELECT COUNT(*) FROM employees WHERE merchant_id = $1 AND is_active = TRUE',
    [merchantId]
  );
  if (parseInt(count.rows[0].count) >= 10) {
    throw { code: 'QUOTA_EMPLOYES', message: 'Maximum 10 employés par commerce (plan actuel).' };
  }

  let pinHash = null;
  if (pin) {
    if (!/^\d{4}$/.test(String(pin))) {
      throw { code: 'PIN_INVALIDE', message: 'Le PIN doit être composé de 4 chiffres.' };
    }
    pinHash = await bcrypt.hash(String(pin), 10);
  }

  const { rows } = await db.query(
    `INSERT INTO employees (id, merchant_id, name, phone, role, pin_hash, daily_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, phone, role, is_active, daily_limit, created_at`,
    [uuidv4(), merchantId, name.trim(), phone || null, role, pinHash, dailyLimit || null]
  );

  logger.info('Employé créé', { merchantId, name, role });
  return rows[0];
}

/** Modifier un employé */
async function updateEmployee(merchantId, employeeId, updates) {
  const { name, phone, role, dailyLimit, isActive } = updates;

  if (role && !ROLES.includes(role)) {
    throw { code: 'ROLE_INVALIDE', message: `Rôle invalide.` };
  }

  const { rows } = await db.query(
    `UPDATE employees SET
       name        = COALESCE($1, name),
       phone       = COALESCE($2, phone),
       role        = COALESCE($3, role),
       daily_limit = COALESCE($4, daily_limit),
       is_active   = COALESCE($5, is_active)
     WHERE id = $6 AND merchant_id = $7
     RETURNING id, name, phone, role, is_active, daily_limit`,
    [name || null, phone || null, role || null, dailyLimit ?? null, isActive ?? null, employeeId, merchantId]
  );

  if (rows.length === 0) throw { code: 'EMPLOYE_INTROUVABLE', message: 'Employé introuvable.' };
  return rows[0];
}

/** Définir / changer le PIN d'un employé */
async function setEmployeePin(merchantId, employeeId, pin) {
  if (!/^\d{4}$/.test(String(pin))) {
    throw { code: 'PIN_INVALIDE', message: 'Le PIN doit être composé de 4 chiffres.' };
  }
  const pinHash = await bcrypt.hash(String(pin), 10);
  const { rowCount } = await db.query(
    'UPDATE employees SET pin_hash = $1 WHERE id = $2 AND merchant_id = $3',
    [pinHash, employeeId, merchantId]
  );
  if (rowCount === 0) throw { code: 'EMPLOYE_INTROUVABLE', message: 'Employé introuvable.' };
}

/** Connexion rapide par PIN */
async function loginWithPin(merchantId, employeeId, pin) {
  const { rows } = await db.query(
    'SELECT id, name, role, pin_hash, is_active, daily_limit FROM employees WHERE id = $1 AND merchant_id = $2',
    [employeeId, merchantId]
  );

  if (rows.length === 0) throw { code: 'EMPLOYE_INTROUVABLE', message: 'Employé introuvable.' };
  const emp = rows[0];
  if (!emp.is_active) throw { code: 'EMPLOYE_INACTIF', message: 'Cet employé est désactivé.' };
  if (!emp.pin_hash) throw { code: 'PIN_NON_DEFINI', message: 'Aucun PIN défini pour cet employé.' };

  const ok = await bcrypt.compare(String(pin), emp.pin_hash);
  if (!ok) throw { code: 'PIN_INCORRECT', message: 'PIN incorrect.' };

  // Token de session employé (4h)
  const token = jwt.sign(
    { merchantId, employeeId: emp.id, role: emp.role, type: 'employee' },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );

  logger.info('Connexion employé PIN', { merchantId, employeeId: emp.id, role: emp.role });

  return {
    token,
    employee: { id: emp.id, name: emp.name, role: emp.role, dailyLimit: emp.daily_limit },
  };
}

/** Stats de ventes par employé (aujourd'hui) */
async function getEmployeeStats(merchantId) {
  const { rows } = await db.query(
    `SELECT
       e.id, e.name, e.role,
       COUNT(t.id) FILTER (WHERE t.payment_status = 'completed') AS tx_count,
       COALESCE(SUM(t.amount) FILTER (WHERE t.payment_status = 'completed'), 0) AS total_amount
     FROM employees e
     LEFT JOIN transactions t ON t.employee_id = e.id
       AND t.created_at::date = CURRENT_DATE
     WHERE e.merchant_id = $1 AND e.is_active = TRUE
     GROUP BY e.id, e.name, e.role
     ORDER BY total_amount DESC`,
    [merchantId]
  );
  return rows.map(r => ({
    id: r.id, name: r.name, role: r.role,
    txCount:     parseInt(r.tx_count),
    totalAmount: parseInt(r.total_amount),
  }));
}

module.exports = { listEmployees, createEmployee, updateEmployee, setEmployeePin, loginWithPin, getEmployeeStats };
