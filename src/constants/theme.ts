/**
 * HERA Design System - Unified Theme Tokens
 *
 * Single source of truth for colors, typography, shadows, blur, and spacing.
 * Supports light + dark mode via ThemeContext.
 */

export const lightTheme = {
  bg: '#F5F7F5',
  bgAlt: '#FDFCFB',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgMuted: '#FAFBFA',

  surface: '#FFFFFF',
  surfaceMuted: '#F8F9F8',

  border: '#E2E8E2',
  borderLight: '#F0F4F0',
  borderStrong: '#C8D0C8',

  textPrimary: '#2C3E2C',
  textSecondary: '#6B7B6B',
  textMuted: '#9BA89B',
  textOnPrimary: '#FFFFFF',
  textOnCard: '#2C3E2C',

  primary: '#8B9D83',
  primaryLight: '#A8B8A0',
  primaryDark: '#6E8066',
  primaryMuted: '#D4DED0',
  primaryAlpha12: 'rgba(139, 157, 131, 0.12)',
  primaryAlpha20: 'rgba(139, 157, 131, 0.20)',

  secondary: '#B8A8D9',
  secondaryLight: '#D4C9E8',
  secondaryDark: '#9B87C4',
  secondaryMuted: '#F0ECFA',
  secondaryAlpha12: 'rgba(184, 168, 217, 0.12)',

  success: '#7BA377',
  successBg: '#F0F7F0',
  successLight: '#E8F5E8',
  warning: '#E89D88',
  warningBg: 'rgba(232, 157, 136, 0.12)',
  warningAmber: '#D9A84F',
  error: '#E07070',
  errorBg: '#FEE2E2',
  info: '#8BA8C4',

  shadowPrimary: 'rgba(139, 157, 131, 0.22)',
  shadowSecondary: 'rgba(184, 168, 217, 0.22)',
  shadowNeutral: 'rgba(44, 62, 44, 0.10)',
  shadowStrong: 'rgba(44, 62, 44, 0.20)',
  shadowCard: 'rgba(44, 62, 44, 0.08)',

  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  fontDisplay: 'Fraunces-Black',
  fontDisplayBold: 'Fraunces-Bold',
  fontDisplayItalic: 'Fraunces-Italic',
  fontSans: 'Inter',
  fontSansMedium: 'Inter-Medium',
  fontSansSemiBold: 'Inter-SemiBold',
  fontSansBold: 'Inter-Bold',

  starRating: '#FFB800',
  gold: '#FFD700',

  overlay: 'rgba(0, 0, 0, 0.50)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',

  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',

  status: {
    confirmed: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    pending: { bg: '#FFF8E1', text: '#F57C00', border: '#FFE082' },
    completed: { bg: '#F3E5F5', text: '#7B1FA2', border: '#CE93D8' },
    cancelled: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  },

  medals: {
    gold: ['#FFD700', '#FFA500'] as [string, string],
    silver: ['#E8E8E8', '#C0C0C0'] as [string, string],
    bronze: ['#CD9B6D', '#CD7F32'] as [string, string],
  },

  scrollbarTrack: '#F0F2F0',
  scrollbarThumb: '#C5CFC5',
  scrollbarThumbHover: '#8B9D83',
};

export const darkTheme: typeof lightTheme = {
  bg: '#0A0D0B',
  bgAlt: '#0F1311',
  bgCard: '#131519',
  bgElevated: '#181B21',
  bgMuted: '#101512',

  surface: '#131519',
  surfaceMuted: '#101316',

  border: '#2A2C34',
  borderLight: '#1B1E24',
  borderStrong: '#3C404D',

  textPrimary: '#ECF1EC',
  textSecondary: '#A4AEA5',
  textMuted: '#6A756D',
  textOnPrimary: '#FFFFFF',
  textOnCard: '#ECF1EC',

  primary: '#B7A6D8',
  primaryLight: '#CEC0E7',
  primaryDark: '#9784BC',
  primaryMuted: '#1D1926',
  primaryAlpha12: 'rgba(183, 166, 216, 0.12)',
  primaryAlpha20: 'rgba(183, 166, 216, 0.20)',

  secondary: '#8A987F',
  secondaryLight: '#A2AF98',
  secondaryDark: '#707D65',
  secondaryMuted: '#171C17',
  secondaryAlpha12: 'rgba(138, 152, 127, 0.12)',

  success: '#7CA273',
  successBg: '#121913',
  successLight: '#18201A',
  warning: '#CC876A',
  warningBg: 'rgba(212, 137, 110, 0.12)',
  warningAmber: '#BD8D3F',
  error: '#D97A7A',
  errorBg: '#1C1010',
  info: '#7E98B2',

  shadowPrimary: 'rgba(0, 0, 0, 0.45)',
  shadowSecondary: 'rgba(0, 0, 0, 0.40)',
  shadowNeutral: 'rgba(0, 0, 0, 0.30)',
  shadowStrong: 'rgba(0, 0, 0, 0.55)',
  shadowCard: 'rgba(0, 0, 0, 0.35)',

  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  fontDisplay: 'Fraunces-Black',
  fontDisplayBold: 'Fraunces-Bold',
  fontDisplayItalic: 'Fraunces-Italic',
  fontSans: 'Inter',
  fontSansMedium: 'Inter-Medium',
  fontSansSemiBold: 'Inter-SemiBold',
  fontSansBold: 'Inter-Bold',

  starRating: '#FFB800',
  gold: '#FFD700',

  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.40)',

  glassBg: 'rgba(19, 21, 25, 0.84)',
  glassBorder: 'rgba(183, 166, 216, 0.12)',

  status: {
    confirmed: { bg: '#141A15', text: '#8CB784', border: '#304033' },
    pending: { bg: '#1E1710', text: '#C19C4A', border: '#43311D' },
    completed: { bg: '#18131D', text: '#B9A4D6', border: '#3B3048' },
    cancelled: { bg: '#1B1212', text: '#C87B7B', border: '#3F2626' },
  },

  medals: {
    gold: ['#FFD700', '#FFA500'] as [string, string],
    silver: ['#E8E8E8', '#C0C0C0'] as [string, string],
    bronze: ['#CD9B6D', '#CD7F32'] as [string, string],
  },

  scrollbarTrack: '#131519',
  scrollbarThumb: '#343848',
  scrollbarThumbHover: '#B7A6D8',
};

export type Theme = typeof lightTheme;
