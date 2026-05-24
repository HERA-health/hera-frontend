/**
 * HERA Design System - Unified Theme Tokens
 *
 * Single source of truth for colors, typography, shadows, blur, and spacing.
 * Supports light + dark mode via ThemeContext.
 */

export const lightTheme = {
  bg: '#FAF8F3',
  bgAlt: '#F5F0E8',
  bgCard: '#FFFDF8',
  bgElevated: '#FFFEFA',
  bgMuted: '#EEF3EF',

  surface: '#FFFDF8',
  surfaceMuted: '#F7F1E8',

  border: '#DCD5CA',
  borderLight: '#EAE3D9',
  borderStrong: '#BFCFC7',

  textPrimary: '#3E5C4F',
  textSecondary: '#65746D',
  textMuted: '#8D948E',
  textOnPrimary: '#FFFFFF',
  textOnCard: '#3E5C4F',

  primary: '#006884',
  primaryLight: '#2C8399',
  primaryDark: '#00546A',
  primaryMuted: '#E8F0EF',
  primaryAlpha12: 'rgba(0, 104, 132, 0.07)',
  primaryAlpha20: 'rgba(0, 104, 132, 0.12)',

  secondary: '#97B2A6',
  secondaryLight: '#B8CBC3',
  secondaryDark: '#3E5C4F',
  secondaryMuted: '#E9F0EC',
  secondaryAlpha12: 'rgba(151, 178, 166, 0.16)',

  focus: '#006884',
  selection: '#006884',
  link: '#006884',
  logoTint: '#006884',
  surfaceWarm: '#F5F0E8',
  actionPrimary: '#3E5C4F',
  actionPrimaryText: '#FFFFFF',

  success: '#3E5C4F',
  successBg: '#E4EDE8',
  successLight: '#EFF5F2',
  warning: '#A66F48',
  warningBg: 'rgba(166, 111, 72, 0.12)',
  warningAmber: '#9B7840',
  error: '#A85050',
  errorBg: '#F4E1DC',
  info: '#006884',

  shadowPrimary: 'rgba(0, 104, 132, 0.14)',
  shadowSecondary: 'rgba(62, 92, 79, 0.14)',
  shadowNeutral: 'rgba(62, 92, 79, 0.12)',
  shadowStrong: 'rgba(62, 92, 79, 0.24)',
  shadowCard: 'rgba(62, 92, 79, 0.07)',

  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  fontBrandDisplay: 'HeraDisplay',
  fontHeading: 'HeraSans-Bold',
  fontBody: 'HeraSans',
  fontBodyStrong: 'HeraSans-Bold',
  fontDisplay: 'HeraDisplay',
  fontDisplayBold: 'HeraDisplay',
  fontDisplayItalic: 'HeraDisplay',
  fontSans: 'HeraSans',
  fontSansMedium: 'HeraSans',
  fontSansSemiBold: 'HeraSans-Bold',
  fontSansBold: 'HeraSans-Bold',

  starRating: '#FFB800',
  gold: '#FFD700',

  overlay: 'rgba(0, 0, 0, 0.50)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',

  glassBg: 'rgba(255, 253, 248, 0.82)',
  glassBorder: 'rgba(255, 253, 248, 0.68)',

  status: {
    confirmed: { bg: '#E4EDE8', text: '#3E5C4F', border: '#97B2A6' },
    pending: { bg: '#F1E7D8', text: '#8A6338', border: '#D1B98F' },
    completed: { bg: '#D8E8EA', text: '#006884', border: '#8EB8C2' },
    cancelled: { bg: '#F4E1DC', text: '#8C3F3F', border: '#D8A49B' },
  },

  medals: {
    gold: ['#B99547', '#B99547'] as [string, string],
    silver: ['#A8ADA7', '#A8ADA7'] as [string, string],
    bronze: ['#A87856', '#A87856'] as [string, string],
  },

  scrollbarTrack: '#FAF8F3',
  scrollbarThumb: '#C7CDC5',
  scrollbarThumbHover: '#3E5C4F',
};

export const darkTheme: typeof lightTheme = {
  bg: '#24251F',
  bgAlt: '#292A23',
  bgCard: '#181914',
  bgElevated: '#1F201A',
  bgMuted: '#2D2E27',

  surface: '#181914',
  surfaceMuted: '#2A2B24',

  border: '#45473C',
  borderLight: '#303229',
  borderStrong: '#686A5D',

  textPrimary: '#F3EBDD',
  textSecondary: '#D7CFC2',
  textMuted: '#AAA397',
  textOnPrimary: '#1D1D19',
  textOnCard: '#F3EBDD',

  primary: '#BDB199',
  primaryLight: '#D7CBB6',
  primaryDark: '#9F9688',
  primaryMuted: '#332F27',
  primaryAlpha12: 'rgba(189, 177, 153, 0.12)',
  primaryAlpha20: 'rgba(189, 177, 153, 0.18)',

  secondary: '#98A193',
  secondaryLight: '#B4BCAD',
  secondaryDark: '#8B9387',
  secondaryMuted: '#30352D',
  secondaryAlpha12: 'rgba(152, 161, 147, 0.10)',

  focus: '#C8BCA6',
  selection: '#BDB199',
  link: '#D1C4AD',
  logoTint: '#B6AD9D',
  surfaceWarm: '#363228',
  actionPrimary: '#BDB199',
  actionPrimaryText: '#1D1D19',

  success: '#A2AA9F',
  successBg: '#2E332C',
  successLight: '#363B33',
  warning: '#B99A65',
  warningBg: 'rgba(185, 154, 101, 0.12)',
  warningAmber: '#B99A65',
  error: '#BC7E78',
  errorBg: '#3A2926',
  info: '#BDB199',

  shadowPrimary: 'rgba(0, 0, 0, 0.45)',
  shadowSecondary: 'rgba(0, 0, 0, 0.40)',
  shadowNeutral: 'rgba(0, 0, 0, 0.32)',
  shadowStrong: 'rgba(0, 0, 0, 0.58)',
  shadowCard: 'rgba(0, 0, 0, 0.36)',

  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  fontBrandDisplay: 'HeraDisplay',
  fontHeading: 'HeraSans-Bold',
  fontBody: 'HeraSans',
  fontBodyStrong: 'HeraSans-Bold',
  fontDisplay: 'HeraDisplay',
  fontDisplayBold: 'HeraDisplay',
  fontDisplayItalic: 'HeraDisplay',
  fontSans: 'HeraSans',
  fontSansMedium: 'HeraSans',
  fontSansSemiBold: 'HeraSans-Bold',
  fontSansBold: 'HeraSans-Bold',

  starRating: '#FFB800',
  gold: '#FFD700',

  overlay: 'rgba(18, 18, 16, 0.62)',
  overlayLight: 'rgba(18, 18, 16, 0.36)',

  glassBg: 'rgba(24, 25, 20, 0.84)',
  glassBorder: 'rgba(189, 177, 153, 0.16)',

  status: {
    confirmed: { bg: '#30362F', text: '#C1CABF', border: '#566255' },
    pending: { bg: '#3A3123', text: '#D0AE77', border: '#685735' },
    completed: { bg: '#3A372F', text: '#D7CBB6', border: '#655F51' },
    cancelled: { bg: '#3A2926', text: '#D09A94', border: '#654843' },
  },

  medals: {
    gold: ['#D3B17D', '#D3B17D'] as [string, string],
    silver: ['#B8C0B9', '#B8C0B9'] as [string, string],
    bronze: ['#C59675', '#C59675'] as [string, string],
  },

  scrollbarTrack: '#24251F',
  scrollbarThumb: '#494B40',
  scrollbarThumbHover: '#9F9688',
};

export type Theme = typeof lightTheme;
