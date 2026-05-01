const router = require('express').Router();
const Joi    = require('joi');
const { authenticate } = require('../middleware/auth');
const {
  listEmployees, createEmployee, updateEmployee,
  setEmployeePin, loginWithPin, getEmployeeStats,
} = require('../services/employeeService');

const createSchema = Joi.object({
  name:       Joi.string().min(2).max(200).required(),
  phone:      Joi.string().max(20).optional().allow('', null),
  role:       Joi.string().valid('manager', 'cashier').default('cashier'),
  pin:        Joi.string().pattern(/^\d{4}$/).optional().allow('', null),
  dailyLimit: Joi.number().integer().min(0).optional().allow(null),
});

/** GET /employees — liste */
router.get('/', authenticate, async (req, res) => {
  const employees = await listEmployees(req.merchant.id);
  res.json({ success: true, employees });
});

/** GET /employees/stats — ventes par employé aujourd'hui */
router.get('/stats', authenticate, async (req, res) => {
  const stats = await getEmployeeStats(req.merchant.id);
  res.json({ success: true, stats });
});

/** POST /employees — créer */
router.post('/', authenticate, async (req, res) => {
  const { error } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const employee = await createEmployee(req.merchant.id, req.body);
  res.status(201).json({ success: true, employee });
});

/** PUT /employees/:id — modifier */
router.put('/:id', authenticate, async (req, res) => {
  const employee = await updateEmployee(req.merchant.id, req.params.id, req.body);
  res.json({ success: true, employee });
});

/** POST /employees/:id/pin — définir PIN */
router.post('/:id/pin', authenticate, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ success: false, message: 'PIN requis.' });
  await setEmployeePin(req.merchant.id, req.params.id, pin);
  res.json({ success: true, message: 'PIN défini.' });
});

/** DELETE /employees/:id — désactiver (soft) */
router.delete('/:id', authenticate, async (req, res) => {
  const employee = await updateEmployee(req.merchant.id, req.params.id, { isActive: false });
  res.json({ success: true, employee, message: 'Employé désactivé.' });
});

/** POST /employees/login-pin — connexion rapide sans OTP */
router.post('/login-pin', authenticate, async (req, res) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ success: false, message: 'employeeId et pin requis.' });
  }
  const result = await loginWithPin(req.merchant.id, employeeId, pin);
  res.json({ success: true, ...result });
});

module.exports = router;
