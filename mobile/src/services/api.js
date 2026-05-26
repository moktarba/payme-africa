import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const FALLBACK_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

const API_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL;
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const HTTP_ERROR_MESSAGES = {
  400: 'Verifiez les informations saisies puis reessayez.',
  401: 'Votre session a expire. Reconnectez-vous.',
  403: 'Vous n avez pas l autorisation pour cette action.',
  404: 'Element introuvable. Rafraichissez puis reessayez.',
  409: 'Cette action existe deja ou a deja ete traitee.',
  429: 'Trop de tentatives. Attendez quelques minutes.',
  500: 'Service momentanement indisponible. Reessayez dans un instant.',
  502: 'Service momentanement indisponible. Reessayez dans un instant.',
  503: 'Service momentanement indisponible. Reessayez dans un instant.',
  504: 'Service momentanement indisponible. Reessayez dans un instant.',
};

const API_CODE_MESSAGES = {
  MONTANT_INVALIDE: 'Le montant doit etre superieur a 0 FCFA.',
  MONTANT_TROP_ELEVE: 'Montant trop eleve pour cette transaction.',
  PROVIDER_DESACTIVE: 'Ce moyen de paiement est indisponible pour le moment.',
  METHODE_NON_ACTIVEE: 'Activez ce moyen de paiement dans le profil avant d encaisser.',
  TRANSACTION_INTROUVABLE: 'Transaction introuvable. Rafraichissez l historique.',
  STATUT_INVALIDE: 'Cette transaction ne peut pas etre modifiee dans son etat actuel.',
  DEJA_COMPLETEE: 'Cette transaction est deja confirmee et ne peut plus etre annulee.',
  OTP_INVALIDE: 'Code OTP incorrect. Verifiez le SMS puis reessayez.',
  OTP_EXPIRE: 'Code OTP expire. Demandez un nouveau code.',
  TROP_DE_TENTATIVES: 'Trop de tentatives. Attendez quelques minutes.',
};

function getUserMessage(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Connexion trop lente. Verifiez le reseau puis reessayez.';
    }
    return 'Connexion impossible. Verifiez internet puis reessayez.';
  }

  const code = error.response.data?.code;
  if (code && API_CODE_MESSAGES[code]) return API_CODE_MESSAGES[code];

  const status = error.response.status;
  return error.response.data?.message || HTTP_ERROR_MESSAGES[status] || 'Action impossible pour le moment. Reessayez.';
}

const demoMerchant = {
  id: 'demo-merchant',
  businessName: 'Boutique Aminata',
  phone: '+221771234567',
  city: 'Dakar',
  activityType: 'boutique',
  currency: 'XOF',
};

let demoPaymentMethods = [
  { provider: 'cash', display_name: 'Espèces', is_enabled: true },
  { provider: 'wave', display_name: 'Wave', is_enabled: true },
  { provider: 'orange_money', display_name: 'Orange Money', is_enabled: true },
];

let demoTransactionCounter = 4;
let demoTransactions = [
  {
    id: 'demo-tx-1',
    amount: 2500,
    paymentProvider: 'cash',
    paymentStatus: 'completed',
    note: 'Vente comptoir',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-tx-2',
    amount: 5000,
    paymentProvider: 'wave',
    paymentStatus: 'awaiting_confirmation',
    note: 'Paiement Wave client',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'demo-tx-3',
    amount: 1500,
    paymentProvider: 'orange_money',
    paymentStatus: 'cancelled',
    note: 'Commande annulée',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
];

let demoCatalogCounter = 4;
let demoCatalogItems = [
  { id: 'demo-item-1', name: 'Café Touba', price: 500, category: 'Boissons' },
  { id: 'demo-item-2', name: 'Sandwich', price: 1500, category: 'Snack' },
  { id: 'demo-item-3', name: 'Bissap', price: 300, category: 'Boissons' },
];

let demoEmployeeCounter = 3;
let demoEmployees = [
  { id: 'demo-employee-1', name: 'Fatou Sow', phone: '+221770000001', role: 'cashier', dailyLimit: 50000, pinSet: true, isActive: true },
  { id: 'demo-employee-2', name: 'Ibrahima Diallo', phone: '+221770000002', role: 'manager', dailyLimit: 150000, pinSet: true, isActive: true },
];

let demoEmployeeStats = [
  { id: 'demo-employee-1', totalAmount: 12500, txCount: 5 },
  { id: 'demo-employee-2', totalAmount: 8000, txCount: 3 },
];

let demoNotifications = [
  {
    id: 'demo-notif-1',
    type: 'transaction_pending',
    title: 'Paiement Wave en attente',
    body: 'Un client doit encore confirmer 5 000 FCFA. Verifiez avant de remettre la marchandise.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
  },
  {
    id: 'demo-notif-2',
    type: 'transaction_confirmed',
    title: 'Paiement confirme',
    body: 'Vente comptoir de 2 500 FCFA confirmee en especes.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
  },
  {
    id: 'demo-notif-3',
    type: 'daily_summary',
    title: 'Resume du jour',
    body: '2 ventes confirmees pour 2 500 FCFA. 1 paiement reste en attente.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'demo-notif-4',
    type: 'employee_login',
    title: 'Connexion equipe',
    body: 'Fatou Sow a ouvert une session caisse ce matin.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
];

let demoNotificationPreferences = {
  txConfirmed: true,
  txPending: true,
  dailySummary: true,
  employeeLogin: false,
};

const demoDayReport = {
  totalAmount: 7500,
  completedCount: 2,
  pendingCount: 1,
  cancelledCount: 1,
  avgAmount: 3750,
  maxAmount: 5000,
  byProvider: {
    cash: { amount: 2500, count: 1 },
    wave: { amount: 5000, count: 1 },
  },
  byHour: [
    { hour: 9, amount: 1500 },
    { hour: 10, amount: 2500 },
    { hour: 11, amount: 0 },
    { hour: 12, amount: 5000 },
  ],
};

const demoWeekReport = {
  totals: { amount: 42000, count: 13 },
  bestDay: { label: 'Mar', amount: 12000 },
  series: [
    { label: 'Lun', amount: 6000, count: 2 },
    { label: 'Mar', amount: 12000, count: 4 },
    { label: 'Mer', amount: 7500, count: 2 },
    { label: 'Jeu', amount: 5500, count: 2 },
    { label: 'Ven', amount: 9000, count: 3 },
    { label: 'Sam', amount: 2000, count: 1 },
    { label: 'Dim', amount: 0, count: 0 },
  ],
};

const demoMonthReport = {
  label: 'Mai 2026',
  total: { amount: 180000, count: 57 },
  weekSeries: [
    { amount: 38000, count: 12 },
    { amount: 42000, count: 13 },
    { amount: 51500, count: 16 },
    { amount: 48500, count: 16 },
  ],
};

const demoResponse = (data) => Promise.resolve({ data });
const demoOk = (data = {}) => demoResponse(data);

const demoHistory = (params = {}) => {
  const status = params.status;
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 20);
  const filtered = status
    ? demoTransactions.filter((tx) => tx.paymentStatus === status)
    : demoTransactions;

  return filtered.slice(offset, offset + limit);
};

const calculateDemoDayStats = () => {
  const completed = demoTransactions.filter((tx) => tx.paymentStatus === 'completed');
  const pending = demoTransactions.filter((tx) => tx.paymentStatus === 'awaiting_confirmation' || tx.paymentStatus === 'pending');
  const cancelled = demoTransactions.filter((tx) => tx.paymentStatus === 'cancelled');
  const totalAmount = completed.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const byProvider = completed.reduce((acc, tx) => {
    const provider = tx.paymentProvider;
    if (!acc[provider]) acc[provider] = { amount: 0, count: 0 };
    acc[provider].amount += Number(tx.amount || 0);
    acc[provider].count += 1;
    return acc;
  }, {});

  return {
    ...demoDayReport,
    totalAmount,
    completedCount: completed.length,
    pendingCount: pending.length,
    cancelledCount: cancelled.length,
    avgAmount: completed.length ? Math.round(totalAmount / completed.length) : 0,
    maxAmount: completed.reduce((max, tx) => Math.max(max, Number(tx.amount || 0)), 0),
    byProvider,
  };
};

const createDemoTransaction = (data) => {
  const transaction = {
    id: `demo-tx-${demoTransactionCounter++}`,
    amount: Number(data.amount || 0),
    paymentProvider: data.paymentProvider,
    paymentStatus: 'awaiting_confirmation',
    note: data.note,
    itemsSnapshot: data.itemsSnapshot || data.items_snapshot || [],
    clientReference: data.clientReference,
    createdAt: new Date().toISOString(),
  };
  demoTransactions = [transaction, ...demoTransactions];
  return transaction;
};

const updateDemoTransactionStatus = (id, paymentStatus, patch = {}) => {
  let updated = null;
  demoTransactions = demoTransactions.map((tx) => {
    if (tx.id !== id) return tx;
    updated = { ...tx, paymentStatus, ...patch };
    return updated;
  });
  return updated || { id, paymentStatus, ...patch };
};

const createDemoCatalogItem = (data) => {
  const item = {
    id: `demo-item-${demoCatalogCounter++}`,
    name: data.name,
    price: Number(data.price || 0),
    category: data.category || '',
  };
  demoCatalogItems = [item, ...demoCatalogItems];
  return item;
};

const updateDemoCatalogItem = (id, data) => {
  let updated = null;
  demoCatalogItems = demoCatalogItems.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      ...data,
      price: data.price !== undefined ? Number(data.price || 0) : item.price,
      category: data.category || '',
    };
    return updated;
  });
  return updated || { id, ...data };
};

const deleteDemoCatalogItem = (id) => {
  demoCatalogItems = demoCatalogItems.filter((item) => item.id !== id);
  return { id, deleted: true };
};

const activeDemoEmployees = () => demoEmployees.filter((employee) => employee.isActive !== false);

const createDemoEmployee = (data) => {
  const employee = {
    id: `demo-employee-${demoEmployeeCounter++}`,
    name: data.name,
    phone: data.phone || '',
    role: data.role || 'cashier',
    dailyLimit: Number(data.dailyLimit || data.daily_limit || 0),
    pinSet: Boolean(data.pin),
    isActive: true,
  };
  demoEmployees = [employee, ...demoEmployees];
  demoEmployeeStats = [{ id: employee.id, totalAmount: 0, txCount: 0 }, ...demoEmployeeStats];
  return employee;
};

const updateDemoEmployee = (id, data) => {
  let updated = null;
  demoEmployees = demoEmployees.map((employee) => {
    if (employee.id !== id) return employee;
    updated = {
      ...employee,
      name: data.name ?? employee.name,
      phone: data.phone ?? employee.phone,
      role: data.role ?? employee.role,
      dailyLimit: data.dailyLimit !== undefined || data.daily_limit !== undefined
        ? Number(data.dailyLimit ?? data.daily_limit ?? 0)
        : employee.dailyLimit,
      isActive: data.isActive ?? data.is_active ?? employee.isActive,
    };
    return updated;
  });
  return updated || { id, ...data };
};

const setDemoEmployeePin = (id, pin) => {
  let updated = null;
  demoEmployees = demoEmployees.map((employee) => {
    if (employee.id !== id) return employee;
    updated = { ...employee, pinSet: Boolean(pin) };
    return updated;
  });
  return updated || { id, pinSet: Boolean(pin) };
};

api.interceptors.request.use(async (config) => {
  const token = await storage.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const flush = (err, token = null) => {
  queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await storage.get('refreshToken');
        if (!refreshToken) throw new Error('no refresh token');
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data;
        await storage.set('accessToken', accessToken);
        flush(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        flush(err);
        await storage.delete('accessToken');
        await storage.delete('refreshToken');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    error.userMessage = getUserMessage(error);
    error.errorCode = error.response?.data?.code || 'ERREUR_RESEAU';
    return Promise.reject(error);
  }
);

export const authApi = {
  sendOtp: (phone, purpose = 'login') => DEMO_MODE ? demoOk({ devCode: '123456', phone, purpose }) : api.post('/auth/send-otp', { phone, purpose }),
  register: (data) => DEMO_MODE ? demoOk({ merchant: { ...demoMerchant, ...data } }) : api.post('/auth/register', data),
  verifyOtp: (phone, code) => DEMO_MODE ? demoOk({ accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token', merchant: demoMerchant, phone, code }) : api.post('/auth/verify-otp', { phone, code }),
  refresh: (refreshToken) => DEMO_MODE ? demoOk({ accessToken: 'demo-access-token', refreshToken }) : api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => DEMO_MODE ? demoOk({ refreshToken }) : api.post('/auth/logout', { refreshToken }),
};

export const merchantApi = {
  getMe: () => DEMO_MODE ? demoOk({ merchant: demoMerchant }) : api.get('/merchants/me'),
  updateMe: (data) => DEMO_MODE ? demoOk({ merchant: { ...demoMerchant, ...data } }) : api.put('/merchants/me', data),
  getPaymentMethods: () => DEMO_MODE ? demoOk({ paymentMethods: demoPaymentMethods }) : api.get('/merchants/me/payment-methods'),
  updatePaymentMethod: (provider, data) => {
    if (DEMO_MODE) {
      const isEnabled = Boolean(data.isEnabled ?? data.is_enabled);
      demoPaymentMethods = demoPaymentMethods.map((method) =>
        method.provider === provider ? { ...method, is_enabled: isEnabled } : method
      );
      return demoOk({ provider, isEnabled, is_enabled: isEnabled });
    }
    return api.put(`/merchants/me/payment-methods/${provider}`, data);
  },
};

export const transactionApi = {
  initiate: (data) => DEMO_MODE ? demoOk({ transaction: createDemoTransaction(data), instructions: 'Démo: confirmez le paiement pour afficher le reçu.', requiresManualConfirmation: true }) : api.post('/transactions', data),
  confirm: (id) => DEMO_MODE ? demoOk({ transaction: updateDemoTransactionStatus(id, 'completed', { completedAt: new Date().toISOString() }) }) : api.post(`/transactions/${id}/confirm`),
  cancel: (id, reason) => DEMO_MODE ? demoOk({ transaction: updateDemoTransactionStatus(id, 'cancelled', { cancelReason: reason, cancelledAt: new Date().toISOString() }), reason }) : api.post(`/transactions/${id}/cancel`, { reason }),
  getHistory: (params) => DEMO_MODE ? demoOk({ transactions: demoHistory(params), pagination: { page: 1, limit: params?.limit || 20, total: demoTransactions.length } }) : api.get('/transactions', { params }),
  getById: (id) => DEMO_MODE ? demoOk({ transaction: demoTransactions.find((tx) => tx.id === id) || demoTransactions[0] }) : api.get(`/transactions/${id}`),
  getDayStats: () => DEMO_MODE ? demoOk({ stats: calculateDemoDayStats() }) : api.get('/transactions/stats/day'),
};

export const catalogApi = {
  getItems: () => DEMO_MODE ? demoOk({ items: demoCatalogItems }) : api.get('/catalog'),
  createItem: (data) => DEMO_MODE ? demoOk({ item: createDemoCatalogItem(data) }) : api.post('/catalog', data),
  updateItem: (id, data) => DEMO_MODE ? demoOk({ item: updateDemoCatalogItem(id, data) }) : api.put(`/catalog/${id}`, data),
  deleteItem: (id) => DEMO_MODE ? demoOk(deleteDemoCatalogItem(id)) : api.delete(`/catalog/${id}`),
};

export const employeeApi = {
  list: () => DEMO_MODE ? demoOk({ employees: activeDemoEmployees() }) : api.get('/employees'),
  getStats: () => DEMO_MODE ? demoOk({ stats: demoEmployeeStats.filter((stat) => activeDemoEmployees().some((employee) => employee.id === stat.id)) }) : api.get('/employees/stats'),
  create: (data) => DEMO_MODE ? demoOk({ employee: createDemoEmployee(data) }) : api.post('/employees', data),
  update: (id, data) => DEMO_MODE ? demoOk({ employee: updateDemoEmployee(id, data) }) : api.put(`/employees/${id}`, data),
  setPin: (id, pin) => DEMO_MODE ? demoOk({ employee: setDemoEmployeePin(id, pin), id, pinSet: !!pin }) : api.post(`/employees/${id}/pin`, { pin }),
  deactivate: (id) => DEMO_MODE ? demoOk({ employee: updateDemoEmployee(id, { isActive: false }), id, active: false }) : api.delete(`/employees/${id}`),
  loginPin: (merchantId, employeeId, pin) => DEMO_MODE ? demoOk({ merchantId, employeeId, pin, accessToken: 'demo-access-token' }) : api.post('/employees/login-pin', { merchantId, employeeId, pin }),
};

export const notificationApi = {
  list: (params) => DEMO_MODE ? demoOk({
    notifications: demoNotifications.slice(0, Number(params?.limit || 30)),
    unreadCount: demoNotifications.filter((item) => !item.is_read).length,
    params,
  }) : api.get('/notifications', { params }),
  markRead: (ids) => {
    if (DEMO_MODE) {
      demoNotifications = demoNotifications.map((item) =>
        ids.includes(item.id) ? { ...item, is_read: true } : item
      );
      return demoOk({ ids });
    }
    return api.post('/notifications/read', { ids });
  },
  markAllRead: () => {
    if (DEMO_MODE) {
      demoNotifications = demoNotifications.map((item) => ({ ...item, is_read: true }));
      return demoOk({ all: true });
    }
    return api.post('/notifications/read', { all: true });
  },
  getPreferences: () => DEMO_MODE ? demoOk({ preferences: demoNotificationPreferences }) : api.get('/notifications/preferences'),
  updatePreferences: (prefs) => {
    if (DEMO_MODE) {
      demoNotificationPreferences = { ...demoNotificationPreferences, ...prefs };
      return demoOk({ preferences: demoNotificationPreferences });
    }
    return api.put('/notifications/preferences', prefs);
  },
};

export const reportApi = {
  getDay: (date) => DEMO_MODE ? demoOk({ report: { ...calculateDemoDayStats(), date } }) : api.get('/reports/day', { params: date ? { date } : {} }),
  getWeek: () => DEMO_MODE ? demoOk({ report: demoWeekReport }) : api.get('/reports/week'),
  getMonth: (year, month) => DEMO_MODE ? demoOk({ report: { ...demoMonthReport, year, month } }) : api.get('/reports/month', { params: { year, month } }),
  getTopItems: (limit = 5) => DEMO_MODE ? demoOk({ items: [{ name: 'Café Touba', qty: 18, revenue: 9000 }, { name: 'Sandwich', qty: 7, revenue: 10500 }].slice(0, limit) }) : api.get('/reports/top-items', { params: { limit } }),
  exportCSV: (params) => DEMO_MODE ? demoOk('date,amount\n2026-05-19,7500') : api.get('/reports/export', { params, responseType: 'text' }),
};

export default api;
