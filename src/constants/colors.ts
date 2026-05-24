/**
 * HERA color palette and design constants.
 *
 * New brand palette:
 * - Emociones: #F5F0E8
 * - Confianza: #DFD8CD
 * - Mente: #006884
 * - Camino: #97B2A6
 * - Crecimiento: #3E5C4F
 * - Innovacion: #BDD7FF
 *
 * These exports remain for backward compatibility. Prefer ThemeContext for
 * new UI work.
 */

export const branding = {
  primary: '#006884',
  primaryLight: '#2C8399',
  primaryDark: '#00546A',

  secondary: '#97B2A6',
  secondaryLight: '#B8CBC3',

  accent: '#3E5C4F',
  accentLight: '#97B2A6',

  background: '#FAF8F3',
  cardBackground: '#FFFDF8',
  surface: '#FAF8F3',

  text: '#3E5C4F',
  textSecondary: '#65746D',
  textLight: '#8D948E',

  success: '#3E5C4F',
  error: '#A85050',

  gradientStart: '#FAF8F3',
  gradientMid1: '#FAF8F3',
  gradientMid2: '#FAF8F3',
  gradientEnd: '#FAF8F3',
};

export const heraLanding = {
  primary: '#006884',
  primaryLight: '#2C8399',
  primaryDark: '#00546A',
  primaryMuted: '#E8F0EF',

  secondary: '#97B2A6',
  secondaryLight: '#B8CBC3',
  secondaryDark: '#3E5C4F',
  secondaryMuted: '#E9F0EC',

  background: '#FAF8F3',
  backgroundAlt: '#F5F0E8',
  cardBg: '#FFFDF8',
  surfaceElevated: '#FFFEFA',

  textPrimary: '#3E5C4F',
  textSecondary: '#65746D',
  textMuted: '#8D948E',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  success: '#3E5C4F',
  warning: '#A66F48',
  info: '#006884',

  gradientPrimary: ['#006884', '#006884'],
  gradientSecondary: ['#97B2A6', '#97B2A6'],
  gradientCTA: ['#3E5C4F', '#3E5C4F'],
  gradientHero: ['#FAF8F3', '#FAF8F3', '#FAF8F3'],

  shadowColor: 'rgba(62, 92, 79, 0.12)',
  shadowColorStrong: 'rgba(62, 92, 79, 0.18)',

  border: '#DED8CE',
  borderLight: '#E9E2D8',

  status: {
    confirmed: {
      bg: '#E4EDE8',
      text: '#3E5C4F',
      border: '#97B2A6',
    },
    pending: {
      bg: '#F1E7D8',
      text: '#8A6338',
      border: '#D1B98F',
    },
    completed: {
      bg: '#D8E8EA',
      text: '#006884',
      border: '#8EB8C2',
    },
    cancelled: {
      bg: '#F4E1DC',
      text: '#8C3F3F',
      border: '#D8A49B',
    },
  },

  medals: {
    gold: ['#B99547', '#B99547'] as [string, string],
    silver: ['#A8ADA7', '#A8ADA7'] as [string, string],
    bronze: ['#A87856', '#A87856'] as [string, string],
  },

  starRating: '#B99547',
  cardBackground: '#FFFDF8',
  textOnCard: '#FFFFFF',
  inputBackgroundDisabled: '#EEE7DB',
  hoverBackground: '#EEE7DB',
  destructiveHover: '#F4E1DC',

  primaryAlpha12: 'rgba(0, 104, 132, 0.07)',
  primaryAlpha20: 'rgba(0, 104, 132, 0.12)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',

  disabled: '#DFD8CD',
  surfaceMuted: '#F5F0E8',
  dangerMuted: '#F4E1DC',
  successBg: '#E4EDE8',
  goldMuted: '#F4E9CF',
  goldDark: '#8A6338',
  warningAmber: '#9B7840',
  scrollbarThumbAlt: '#C7CDC5',

  scrollbarTrack: '#FAF8F3',
  scrollbarThumb: '#C7CDC5',
  scrollbarThumbHover: '#3E5C4F',

  gold: '#B99547',
  celebration: '#B99547',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  successLight: '#EFF5F2',
  successMuted: 'rgba(151, 178, 166, 0.18)',
  warningLight: 'rgba(166, 111, 72, 0.14)',
  mutedLight: 'rgba(141, 148, 142, 0.20)',

  backgroundLight: '#FAF8F3',
  backgroundMuted: '#EEF3EF',

  whiteAlpha25: 'rgba(255, 255, 255, 0.25)',
  whiteAlpha30: 'rgba(255, 255, 255, 0.3)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',

  statusInProgress: '#006884',
  statusCompleted: '#97B2A6',

  calendarConfirmedBg: '#E4EDE8',
  calendarConfirmedText: '#3E5C4F',
  calendarPendingBg: '#D8E8EA',
  calendarPendingText: '#006884',
};

export const brandColors = {
  google: '#4285F4',
  apple: '#000000',
  facebook: '#1877F2',
};

export const colors = {
  primary: {
    main: '#006884',
    light: '#2C8399',
    dark: '#00546A',
    darker: '#003F50',
    50: '#E8F0EF',
    100: '#B8D4DA',
  },
  secondary: {
    blue: '#BDD7FF',
    blueLight: '#D4E5FF',
    purple: '#97B2A6',
    orange: '#A66F48',
    pink: '#A85050',
    cyan: '#006884',
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#FFFCF7',
    gray100: '#F5F0E8',
    gray200: '#DFD8CD',
    gray300: '#C7BCAF',
    gray400: '#9FA69F',
    gray500: '#8D948E',
    gray600: '#65746D',
    gray700: '#3E5C4F',
    gray800: '#203A31',
    gray900: '#101714',
    black: '#000000',
  },
  feedback: {
    success: '#3E5C4F',
    warning: '#A66F48',
    error: '#A85050',
    info: '#006884',
  },
  support: {
    crisis: '#A85050',
    help: '#006884',
    helpBg: '#D8E8EA',
  },
  background: {
    primary: '#FFFDF8',
    secondary: '#F5F0E8',
    tertiary: '#D8E8EA',
    success: '#E4EDE8',
    warning: '#F1E7D8',
    error: '#F4E1DC',
    purple: '#E4EDE8',
    pink: '#F4E1DC',
    blue: '#D8E8EA',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    xxxxl: 32,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
};

export const layout = {
  screenPadding: spacing.lg,
  cardMargin: spacing.md,
  sectionSpacing: spacing.xl,
  elementSpacing: spacing.sm,
  contentMaxWidth: 1200,
  drawerWidth: 280,
  drawerWidthTablet: 320,
  rightPanelWidth: 230,
  calendarTimeColumnWidth: 36,
  mobilePanelHeight: 300,
  collapsedSidebarWidth: 52,
  mobileDrawerMinWidth: 240,
  mobileNavButtonSize: touchTarget.minWidth,
  mobileShellLeftInset: touchTarget.minWidth + spacing.xxl,
  mobileShellCompactLeftInset: touchTarget.minWidth + spacing.md,
  mobileShellTopInset: touchTarget.minHeight + spacing.xxl,
};
