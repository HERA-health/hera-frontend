/**
 * HERA Design System — Unified Theme Tokens v5.0
 *
 * Single source of truth for colors, typography, shadows, blur, and spacing.
 * Supports light + dark mode via ThemeContext.
 *
 * Usage:
 *   import { useTheme } from '../contexts/ThemeContext';
 *   const { theme, isDark } = useTheme();
 *   <View style={{ backgroundColor: theme.bgCard }} />
 *
 * Migration: heraLanding remains in colors.ts for backward compat.
 * Migrate components one by one to useTheme().
 */

export const lightTheme = {
  // ─── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#F5F7F5',           // Page background — Light Sage
  bgAlt: '#FDFCFB',        // Warm white — sidebars, panels
  bgCard: '#FFFFFF',       // Card surfaces
  bgElevated: '#FFFFFF',   // Elevated surfaces (modals, dropdowns)
  bgMuted: '#FAFBFA',      // Subtle sections

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  surface: '#FFFFFF',
  surfaceMuted: '#F8F9F8',

  // ─── Borders ──────────────────────────────────────────────────────────────
  border: '#E2E8E2',
  borderLight: '#F0F4F0',
  borderStrong: '#C8D0C8',

  // ─── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#2C3E2C',    // Forest — primary text
  textSecondary: '#6B7B6B',  // Neutral — secondary text
  textMuted: '#9BA89B',      // Muted — placeholders, captions
  textOnPrimary: '#FFFFFF',  // Text on colored backgrounds
  textOnCard: '#2C3E2C',

  // ─── Brand — Sage Green ───────────────────────────────────────────────────
  primary: '#8B9D83',
  primaryLight: '#A8B8A0',
  primaryDark: '#6E8066',
  primaryMuted: '#D4DED0',
  primaryAlpha12: 'rgba(139, 157, 131, 0.12)',
  primaryAlpha20: 'rgba(139, 157, 131, 0.20)',

  // ─── Accent — Lavender ────────────────────────────────────────────────────
  secondary: '#B8A8D9',
  secondaryLight: '#D4C9E8',
  secondaryDark: '#9B87C4',
  secondaryMuted: '#F0ECFA',
  secondaryAlpha12: 'rgba(184, 168, 217, 0.12)',

  // ─── Semantic ─────────────────────────────────────────────────────────────
  success: '#7BA377',
  successBg: '#F0F7F0',
  successLight: '#E8F5E8',
  warning: '#E89D88',
  warningBg: 'rgba(232, 157, 136, 0.12)',
  warningAmber: '#D9A84F',
  error: '#E07070',
  errorBg: '#FEE2E2',
  info: '#8BA8C4',

  // ─── Shadows — tinted, not black ─────────────────────────────────────────
  shadowPrimary: 'rgba(139, 157, 131, 0.22)',
  shadowSecondary: 'rgba(184, 168, 217, 0.22)',
  shadowNeutral: 'rgba(44, 62, 44, 0.10)',
  shadowStrong: 'rgba(44, 62, 44, 0.20)',
  shadowCard: 'rgba(44, 62, 44, 0.08)',

  // ─── Blur radii (used in GlassCard intensity scale) ───────────────────────
  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  // ─── Typography ───────────────────────────────────────────────────────────
  fontDisplay: 'Fraunces-Black',      // Headlines, hero — loaded via expo-font
  fontDisplayBold: 'Fraunces-Bold',   // Subheadings
  fontDisplayItalic: 'Fraunces-Italic', // Accent words in headlines
  fontSans: 'Inter',                  // UI body text
  fontSansMedium: 'Inter-Medium',
  fontSansSemiBold: 'Inter-SemiBold',
  fontSansBold: 'Inter-Bold',

  // ─── Stars / rating ───────────────────────────────────────────────────────
  starRating: '#FFB800',
  gold: '#FFD700',

  // ─── Overlay ──────────────────────────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.50)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',

  // ─── Glass surface colors (for GlassCard) ─────────────────────────────────
  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',

  // ─── Session status ───────────────────────────────────────────────────────
  status: {
    confirmed: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    pending:   { bg: '#FFF8E1', text: '#F57C00', border: '#FFE082' },
    completed: { bg: '#F3E5F5', text: '#7B1FA2', border: '#CE93D8' },
    cancelled: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  },

  // ─── Medal gradients ──────────────────────────────────────────────────────
  medals: {
    gold:   ['#FFD700', '#FFA500'] as [string, string],
    silver: ['#E8E8E8', '#C0C0C0'] as [string, string],
    bronze: ['#CD9B6D', '#CD7F32'] as [string, string],
  },

  // ─── Scrollbar (web) ──────────────────────────────────────────────────────
  scrollbarTrack: '#F0F2F0',
  scrollbarThumb: '#C5CFC5',
  scrollbarThumbHover: '#8B9D83',
};

export const darkTheme: typeof lightTheme = {
  // ─── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#0F1410',           // Deep forest dark
  bgAlt: '#141A15',        // Slightly lighter — sidebars, panels
  bgCard: '#1A221B',       // Card surfaces
  bgElevated: '#1F2820',   // Elevated surfaces
  bgMuted: '#171E18',      // Subtle sections

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  surface: '#1A221B',
  surfaceMuted: '#161D17',

  // ─── Borders ──────────────────────────────────────────────────────────────
  border: '#2A3A2A',
  borderLight: '#1E2C1E',
  borderStrong: '#3A4F3A',

  // ─── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#E8F0E8',
  textSecondary: '#9AB09A',
  textMuted: '#617061',
  textOnPrimary: '#FFFFFF',
  textOnCard: '#E8F0E8',

  // ─── Brand — Sage Green (brighter in dark) ────────────────────────────────
  primary: '#9AAF91',
  primaryLight: '#B2C2A9',
  primaryDark: '#7A8F73',
  primaryMuted: '#2A3A2C',
  primaryAlpha12: 'rgba(154, 175, 145, 0.12)',
  primaryAlpha20: 'rgba(154, 175, 145, 0.20)',

  // ─── Accent — Lavender ────────────────────────────────────────────────────
  secondary: '#C4B4E0',
  secondaryLight: '#D8CCF0',
  secondaryDark: '#A894CC',
  secondaryMuted: '#1E1A2C',
  secondaryAlpha12: 'rgba(196, 180, 224, 0.12)',

  // ─── Semantic ─────────────────────────────────────────────────────────────
  success: '#7FB87B',
  successBg: '#0F1F10',
  successLight: '#0F2010',
  warning: '#D4896E',
  warningBg: 'rgba(212, 137, 110, 0.12)',
  warningAmber: '#C4943A',
  error: '#E07878',
  errorBg: '#1F0F0F',
  info: '#7A9AB8',

  // ─── Shadows ─────────────────────────────────────────────────────────────
  shadowPrimary: 'rgba(0, 0, 0, 0.45)',
  shadowSecondary: 'rgba(0, 0, 0, 0.40)',
  shadowNeutral: 'rgba(0, 0, 0, 0.30)',
  shadowStrong: 'rgba(0, 0, 0, 0.55)',
  shadowCard: 'rgba(0, 0, 0, 0.35)',

  // ─── Blur ─────────────────────────────────────────────────────────────────
  blurSm: 8,
  blurMd: 20,
  blurLg: 40,

  // ─── Typography (same font names) ─────────────────────────────────────────
  fontDisplay: 'Fraunces-Black',
  fontDisplayBold: 'Fraunces-Bold',
  fontDisplayItalic: 'Fraunces-Italic',
  fontSans: 'Inter',
  fontSansMedium: 'Inter-Medium',
  fontSansSemiBold: 'Inter-SemiBold',
  fontSansBold: 'Inter-Bold',

  // ─── Stars / rating ───────────────────────────────────────────────────────
  starRating: '#FFB800',
  gold: '#FFD700',

  // ─── Overlay ──────────────────────────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.40)',

  // ─── Glass surface colors ─────────────────────────────────────────────────
  glassBg: 'rgba(26, 34, 27, 0.75)',
  glassBorder: 'rgba(154, 175, 145, 0.15)',

  // ─── Session status (dark variants) ──────────────────────────────────────
  status: {
    confirmed: { bg: '#0F2010', text: '#7BC47B', border: '#2A5A2A' },
    pending:   { bg: '#201800', text: '#C4A040', border: '#4A3800' },
    completed: { bg: '#1A0F20', text: '#B87FC4', border: '#3A1F4A' },
    cancelled: { bg: '#200F0F', text: '#C47070', border: '#4A1F1F' },
  },

  // ─── Medal gradients (same) ───────────────────────────────────────────────
  medals: {
    gold:   ['#FFD700', '#FFA500'] as [string, string],
    silver: ['#E8E8E8', '#C0C0C0'] as [string, string],
    bronze: ['#CD9B6D', '#CD7F32'] as [string, string],
  },

  // ─── Scrollbar (web, dark) ────────────────────────────────────────────────
  scrollbarTrack: '#1A221B',
  scrollbarThumb: '#3A4F3A',
  scrollbarThumbHover: '#9AAF91',
};

export type Theme = typeof lightTheme;
