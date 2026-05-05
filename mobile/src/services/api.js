import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const FALLBACK_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

const API_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL;
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token
api.interceptors.request.use(async (config) => {
  const token = await storage.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gérer expiration token
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
          .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
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
    error.userMessage = error.response?.data?.message || 'Erreur réseau. Vérifiez votre connexion.';
    error.errorCode = error.response?.data?.code || 'ERREUR_RESEAU';
    return Promise.reject(error);
  }
);

export const authApi = {
  sendOtp: (phone, purpose = 'login') => api.post('/auth/send-otp', { phone, purpose }),
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const merchantApi = {
  getMe: () => api.get('/merchants/me'),
  updateMe: (data) => api.put('/merchants/me', data),
  getPaymentMethods: () => api.get('/merchants/me/payment-methods'),
  updatePaymentMethod: (provider, data) => api.put(`/merchants/me/payment-methods/${provider}`, data),
};

export const transactionApi = {
  initiate: (data) => api.post('/transactions', data),
  confirm: (id) => api.post(`/transactions/${id}/confirm`),
  cancel: (id, reason) => api.post(`/transactions/${id}/cancel`, { reason }),
  getHistory: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  getDayStats: () => api.get('/transactions/stats/day'),
};

export const catalogApi = {
  getItems: () => api.get('/catalog'),
  createItem: (data) => api.post('/catalog', data),
  updateItem: (id, data) => api.put(`/catalog/${id}`, data),
  deleteItem: (id) => api.delete(`/catalog/${id}`),
};

export const employeeApi = {
  list: () => api.get('/employees'),
  getStats: () => api.get('/employees/stats'),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  setPin: (id, pin) => api.post(`/employees/${id}/pin`, { pin }),
  deactivate: (id) => api.delete(`/employees/${id}`),
  loginPin: (merchantId, employeeId, pin) => api.post('/employees/login-pin', { merchantId, employeeId, pin }),
};

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (ids) => api.post('/notifications/read', { ids }),
  markAllRead: () => api.post('/notifications/read', { all: true }),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (prefs) => api.put('/notifications/preferences', prefs),
};

export const reportApi = {
  getDay: (date) => api.get('/reports/day', { params: date ? { date } : {} }),
  getWeek: () => api.get('/reports/week'),
  getMonth: (year, month) => api.get('/reports/month', { params: { year, month } }),
  getTopItems: (limit = 5) => api.get('/reports/top-items', { params: { limit } }),
  exportCSV: (params) => api.get('/reports/export', { params, responseType: 'text' }),
};

export default api;
