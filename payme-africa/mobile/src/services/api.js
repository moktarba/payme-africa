import axios from 'axios';
import { storage } from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];
const flush = (err, token) =>
  queue.splice(0).forEach(({ ok, ko }) => err ? ko(err) : ok(token));

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (refreshing) {
        return new Promise((ok, ko) => queue.push({ ok, ko }))
          .then(t => { orig.headers.Authorization = `Bearer ${t}`; return api(orig); });
      }
      orig._retry = true;
      refreshing = true;
      try {
        const rt = await storage.get('refreshToken');
        if (!rt) throw new Error('no_token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt });
        await storage.set('accessToken', data.accessToken);
        flush(null, data.accessToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch (e) {
        flush(e);
        await storage.delete('accessToken');
        await storage.delete('refreshToken');
        return Promise.reject(e);
      } finally { refreshing = false; }
    }
    error.userMessage = error.response?.data?.message || 'Erreur réseau.';
    error.errorCode   = error.response?.data?.code    || 'ERREUR_RESEAU';
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  sendOtp:   (phone, purpose = 'login') => api.post('/auth/send-otp', { phone, purpose }),
  register:  (data)  => api.post('/auth/register', data),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  refresh:   (rt)    => api.post('/auth/refresh', { refreshToken: rt }),
  logout:    (rt)    => api.post('/auth/logout',  { refreshToken: rt }),
};

// Merchants
export const merchantApi = {
  getMe:               ()     => api.get('/merchants/me'),
  updateMe:            (d)    => api.put('/merchants/me', d),
  getPaymentMethods:   ()     => api.get('/merchants/me/payment-methods'),
  updatePaymentMethod: (p, d) => api.put(`/merchants/me/payment-methods/${p}`, d),
};

// Transactions
export const transactionApi = {
  initiate:    (d)      => api.post('/transactions', d),
  confirm:     (id)     => api.post(`/transactions/${id}/confirm`),
  cancel:      (id, r)  => api.post(`/transactions/${id}/cancel`, { reason: r }),
  getHistory:  (p)      => api.get('/transactions', { params: p }),
  getById:     (id)     => api.get(`/transactions/${id}`),
  getDayStats: ()       => api.get('/transactions/stats/day'),
};

// Catalogue
export const catalogApi = {
  getItems:   ()       => api.get('/catalog'),
  createItem: (d)      => api.post('/catalog', d),
  updateItem: (id, d)  => api.put(`/catalog/${id}`, d),
  deleteItem: (id)     => api.delete(`/catalog/${id}`),
};

// Rapports
export const reportApi = {
  getDay:      (date)           => api.get('/reports/day', { params: { date } }),
  getWeek:     ()               => api.get('/reports/week'),
  getMonth:    (year, month)    => api.get('/reports/month', { params: { year, month } }),
  getTopItems: (limit = 5)      => api.get('/reports/top-items', { params: { limit } }),
  exportCSV:   (params)         => api.get('/reports/export', {
    params,
    responseType: 'blob',
    headers: { Accept: 'text/csv' },
  }),
};

export default api;

// Employés
export const employeeApi = {
  list:       ()          => api.get('/employees'),
  getStats:   ()          => api.get('/employees/stats'),
  create:     (d)         => api.post('/employees', d),
  update:     (id, d)     => api.put(`/employees/${id}`, d),
  setPin:     (id, pin)   => api.post(`/employees/${id}/pin`, { pin }),
  deactivate: (id)        => api.delete(`/employees/${id}`),
  loginPin:   (employeeId, pin) => api.post('/employees/login-pin', { employeeId, pin }),
};

// Notifications
export const notificationApi = {
  list:             (params)  => api.get('/notifications', { params }),
  markRead:         (ids)     => api.post('/notifications/read', { ids }),
  markAllRead:      ()        => api.post('/notifications/read', {}),
  getPreferences:   ()        => api.get('/notifications/preferences'),
  updatePreferences:(prefs)   => api.put('/notifications/preferences', prefs),
};
