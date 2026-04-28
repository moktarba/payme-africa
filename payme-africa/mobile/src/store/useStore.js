import { create } from 'zustand';
import { storage } from '../utils/storage';

const useStore = create((set, get) => ({
  // Auth
  merchant: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async ({ accessToken, refreshToken, merchant }) => {
    await storage.set('accessToken', accessToken);
    await storage.set('refreshToken', refreshToken);
    set({ accessToken, refreshToken, merchant, isAuthenticated: true });
  },

  updateMerchant: (merchant) => set({ merchant }),

  logout: async () => {
    await storage.delete('accessToken');
    await storage.delete('refreshToken');
    set({
      merchant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  restoreSession: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        storage.get('accessToken'),
        storage.get('refreshToken'),
      ]);
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });
      }
    } catch (_) {
      // Pas de session sauvegardée
    } finally {
      set({ isLoading: false });
    }
  },

  // Sync offline
  offlineQueue: [],
  addToQueue: (action) => set((s) => ({
    offlineQueue: [...s.offlineQueue, { ...action, id: Date.now(), retries: 0 }]
  })),
  removeFromQueue: (id) => set((s) => ({
    offlineQueue: s.offlineQueue.filter((a) => a.id !== id)
  })),

  // Stats du jour (cache)
  dayStats: null,
  setDayStats: (stats) => set({ dayStats: stats }),
}));

export default useStore;
