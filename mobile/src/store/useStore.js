import { create } from 'zustand';
import { storage } from '../utils/storage';

const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const DEMO_MERCHANT = {
  id: 'demo-merchant',
  businessName: 'Boutique Aminata',
  phone: '+221771234567',
  city: 'Dakar',
  activityType: 'boutique',
};

const useStore = create((set) => ({
  merchant: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async ({ accessToken, refreshToken, merchant }) => {
    await storage.set('accessToken', accessToken);
    await storage.set('refreshToken', refreshToken);
    await storage.set('merchant', JSON.stringify(merchant));
    set({ accessToken, refreshToken, merchant, isAuthenticated: true });
  },

  setMerchant: (merchant) => set({ merchant }),

  logout: async () => {
    await storage.delete('accessToken');
    await storage.delete('refreshToken');
    await storage.delete('merchant');
    set({ merchant: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    if (DEMO_MODE) {
      set({
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
        merchant: DEMO_MERCHANT,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    try {
      const accessToken = await storage.get('accessToken');
      const refreshToken = await storage.get('refreshToken');
      const merchantRaw = await storage.get('merchant');
      const merchant = merchantRaw ? JSON.parse(merchantRaw) : null;
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, merchant, isAuthenticated: true });
      }
    } catch (_) {}
    finally {
      set({ isLoading: false });
    }
  },

  activeTransaction: null,
  setActiveTransaction: (t) => set({ activeTransaction: t }),
  clearActiveTransaction: () => set({ activeTransaction: null }),

  dayStats: null,
  setDayStats: (s) => set({ dayStats: s }),

  catalogItems: [],
  setCatalogItems: (items) => set({ catalogItems: items }),
}));

export default useStore;
