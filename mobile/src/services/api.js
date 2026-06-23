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
    // Messages user-friendly selon le type d'erreur
    const status = error.response?.status;
    const backendMsg = error.response?.data?.message;
    const backendCode = error.response?.data?.code;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userMessage = 'Connexion lente. Vérifiez votre réseau et réessayez.';
    } else if (!error.response) {
      // Pas de réponse = pas de réseau
      error.userMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion mobile ou Wi-Fi.';
    } else if (status >= 500) {
      error.userMessage = 'Erreur du serveur. Réessayez dans quelques instants.';
    } else if (status === 404) {
      error.userMessage = backendMsg || 'Ressource introuvable.';
    } else if (status === 403) {
      error.userMessage = 'Accès non autorisé.';
    } else if (status === 400) {
      // Messages backend Joi/validation → déjà en français
      error.userMessage = backendMsg || 'Données incorrectes. Vérifiez les informations saisies.';
    } else {
      error.userMessage = backendMsg || 'Une erreur est survenue. Réessayez.';
    }

    // Codes d'erreur métier → messages spécifiques
    const CODE_MESSAGES = {
      MONTANT_INVALIDE:   'Montant invalide. Entrez un montant supérieur à 0.',
      MONTANT_TROP_ELEVE: 'Montant trop élevé (max 5 000 000 FCFA).',
      PROVIDER_DESACTIVE: 'Ce mode de paiement n\'est pas disponible.',
      METHODE_NON_ACTIVEE:'Ce mode de paiement n\'est pas activé sur votre compte.',
      OTP_INVALIDE:       'Code OTP incorrect ou expiré. Réessayez.',
      TROP_DE_TENTATIVES: 'Trop de tentatives. Attendez quelques minutes.',
      NUMERO_INCONNU:     'Numéro non enregistré. Créez un compte d\'abord.',
      TOKEN_INVALIDE:     'Session expirée. Reconnectez-vous.',
      TRANSACTION_INTROUVABLE: 'Transaction introuvable.',
      DEJA_COMPLETEE:     'Ce paiement est déjà confirmé.',
    };
    if (backendCode && CODE_MESSAGES[backendCode]) {
      error.userMessage = CODE_MESSAGES[backendCode];
    }

    error.errorCode = backendCode || 'ERREUR_RESEAU';
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

export const walletApi = {
  getBalance: () => api.get('/wallet'),
};

export const reportApi = {
  getDay:      (date) => api.get('/reports/day', date ? { params: { date } } : {}),
  getWeek:     () => api.get('/reports/week'),
  getMonth:    (year, month) => api.get('/reports/month', { params: { year, month } }),
  getTopItems: (limit = 5) => api.get('/reports/top-items', { params: { limit } }),
  exportCSV:   (params) => api.get('/reports/export', { params }),
};

export const notificationApi = {
  list:        (params) => api.get('/notifications', { params }),
  markRead:    (ids) => api.post('/notifications/read', { ids }),
  markAllRead: () => api.post('/notifications/read', { ids: null }),
  getPrefs:    () => api.get('/notifications/preferences'),
};

export default api;
