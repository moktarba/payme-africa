/**
 * Design System - PayMe Africa
 * 
 * UX Principles:
 * - Lisible en plein soleil (fort contraste)
 * - Boutons larges (min 56px hauteur)
 * - Texte minimum 16px
 * - Couleurs sobres et rassurantes
 * - Vert foncé = couleur primaire (argent, nature, confiance)
 */

export const Colors = {
  // Primaire - Vert forêt (confiance, argent, nature)
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  primaryDark: '#0F2D1F',
  primaryBg: '#D8F3DC',

  // Secondaire - Or chaud (succès, valeur)
  secondary: '#F4A261',
  secondaryLight: '#F9C784',
  secondaryDark: '#C77A3A',

  // Sémantiques
  success: '#2D6A4F',
  successBg: '#D8F3DC',
  warning: '#E9C46A',
  warningBg: '#FFF3CD',
  error: '#C0392B',
  errorBg: '#FDECEA',
  info: '#2C7BB6',
  infoBg: '#D6EAF8',

  // Neutres
  white: '#FFFFFF',
  black: '#0D0D0D',
  gray50: '#F8F9FA',
  gray100: '#F1F3F4',
  gray200: '#E8EAED',
  gray300: '#DADCE0',
  gray400: '#BDC1C6',
  gray500: '#9AA0A6',
  gray600: '#80868B',
  gray700: '#5F6368',
  gray800: '#3C4043',
  gray900: '#202124',

  // Providers
  waveColor: '#00BCD4',
  orangeMoneyColor: '#FF6600',
  freeMoneyColor: '#E53935',
  cashColor: '#4CAF50',

  // Background
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E8EAED',
};

export const Typography = {
  fontSizeXS: 12,
  fontSizeSM: 14,
  fontSizeMD: 16,   // Minimum lisible
  fontSizeLG: 18,
  fontSizeXL: 22,
  fontSize2XL: 28,
  fontSize3XL: 36,

  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  fontWeightExtrabold: '800',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const ButtonHeight = {
  sm: 40,
  md: 52,    // Standard
  lg: 64,    // Bouton principal
  xl: 80,    // Bouton encaissement (tap facile)
};

// Formats monétaires
export const formatAmount = (amount, currency = 'XOF') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Noms des providers
export const PROVIDER_LABELS = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  cash: 'Espèces',
};

export const PROVIDER_COLORS = {
  wave: Colors.waveColor,
  orange_money: Colors.orangeMoneyColor,
  free_money: Colors.freeMoneyColor,
  cash: Colors.cashColor,
};

// Types d'activité
export const ACTIVITY_TYPES = [
  { value: 'vendeur_ambulant', label: 'Vendeur ambulant' },
  { value: 'boutique', label: 'Boutique / épicerie' },
  { value: 'restaurant', label: 'Restaurant / gargote' },
  { value: 'coiffeur', label: 'Coiffeur / esthétique' },
  { value: 'reparateur', label: 'Réparateur' },
  { value: 'autre', label: 'Autre activité' },
];
