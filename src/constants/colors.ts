/**
 * Color palette and theme constants for HERA - Health Era
 * PRIMARY COLOR: GREEN (mental health and wellbeing)
 *
 * DESIGN SYSTEM v4.0:
 * - NEW BRANDING: Soft, cozy, professional theme
 * - Verde Salvia (Sage Green) as primary
 * - Lavender accent for CTAs
 * - Warm beige backgrounds
 * - Maintained existing color system for backward compatibility
 */

// NEW BRANDING COLORS - Phase 1
export const branding = {
  // Primary
  primary: '#B8C5A9',        // Verde Salvia
  primaryLight: '#D4DCC9',
  primaryDark: '#9BAA8A',

  // Secondary
  secondary: '#AAB7C4',      // Azul Grisáceo
  secondaryLight: '#C5CFD8',

  // Accent
  accent: '#C9B6E4',         // Lavanda
  accentLight: '#E0D4F2',

  // Backgrounds
  background: '#F4EDE4',     // Beige Cálido
  cardBackground: '#FFFFFF',
  surface: '#FDFAF7',

  // Text
  text: '#2D3748',
  textSecondary: '#718096',
  textLight: '#A0AEC0',

  // Status
  success: '#B8C5A9',
  error: '#FC8181',

  // Gradient colors
  gradientStart: '#FFE5E5',
  gradientMid1: '#FFF5E6',
  gradientMid2: '#E6F3FF',
  gradientEnd: '#F0E6FF',
};

// HERA Landing Page Colors - Premium Healthcare SaaS
export const heraLanding = {
  // Primary: Sage Green (trust, growth, calm)
  primary: '#8B9D83',
  primaryLight: '#A8B8A0',
  primaryDark: '#6E8066',
  primaryMuted: '#D4DED0',

  // Secondary: Lavender (empathy, mental health)
  secondary: '#B8A8D9',
  secondaryLight: '#D4C9E8',
  secondaryDark: '#9B87C4',
  secondaryMuted: '#F0ECFA',

  // Backgrounds
  background: '#F5F7F5',     // Light Sage
  backgroundAlt: '#FDFCFB',  // Warm White
  cardBg: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#2C3E2C',    // Forest
  textSecondary: '#6B7B6B',  // Neutral
  textMuted: '#9BA89B',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Accents
  success: '#7BA377',        // Mint
  warning: '#E89D88',        // Coral
  info: '#8BA8C4',

  // Gradients
  gradientPrimary: ['#8B9D83', '#A8B8A0'],
  gradientSecondary: ['#B8A8D9', '#D4C9E8'],
  gradientCTA: ['#8B9D83', '#7BA377'],
  gradientHero: ['#F5F7F5', '#FDFCFB', '#F5F7F5'],

  // Shadows
  shadowColor: 'rgba(44, 62, 44, 0.12)',
  shadowColorStrong: 'rgba(44, 62, 44, 0.2)',

  // Borders
  border: '#E2E8E2',
  borderLight: '#F0F4F0',
};

// LEGACY COLORS - Maintained for backward compatibility
export const colors = {
  primary: {
    main: '#10B981',      // Emerald green - PRIMARY brand color
    light: '#6EE7B7',     // Light green
    dark: '#059669',      // Dark green
    darker: '#047857',    // Darker green
    50: '#ECFDF5',        // Very light green background
    100: '#D1FAE5',       // Light green background (badges, active states)
  },
  secondary: {
    blue: '#4169E1',      // Royal blue (former primary, now secondary)
    blueLight: '#6B8DE3',
    purple: '#A855F7',    // Accent purple
    orange: '#F97316',    // Warning/video orange
    pink: '#EC4899',      // Accent pink
    cyan: '#22D3EE',      // Cyan for highlights
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#000000',
  },
  feedback: {
    success: '#10B981',   // Green
    warning: '#F59E0B',   // Orange/Yellow
    error: '#EF4444',     // Red
    info: '#3B82F6',      // Blue
  },
  support: {
    crisis: '#EF4444',    // Red for crisis support
    help: '#06B6D4',      // Cyan for 24/7 help
    helpBg: '#ECFEFF',    // Light cyan background for help card
  },
  background: {
    primary: '#FFFFFF',    // White
    secondary: '#F9FAFB',  // Light gray
    tertiary: '#ECFDF5',   // Very light green for badges
    success: '#D1FAE5',    // Light green for badges
    warning: '#FEF3C7',    // Light yellow
    error: '#FEE2E2',      // Light red
    purple: '#F3E8FF',     // Light purple
    pink: '#FCE7F3',       // Light pink
    blue: '#E0F2FE',       // Light blue
  }
};

// Consistent spacing scale based on 4px grid
export const spacing = {
  xs: 4,      // 4px - minimal spacing
  sm: 8,      // 8px - small spacing
  md: 16,     // 16px - default spacing
  lg: 20,     // 20px - screen padding
  xl: 24,     // 24px - section spacing
  xxl: 32,    // 32px - large section spacing
  xxxl: 48,   // 48px - extra large spacing
};

// Border radius scale
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Typography scale with proper hierarchy
export const typography = {
  fontSizes: {
    xs: 12,     // Small text, labels
    sm: 14,     // Body text, descriptions
    md: 16,     // Default body text
    lg: 18,     // Subheadings
    xl: 20,     // Subheadings large
    xxl: 24,    // Headings
    xxxl: 28,   // Large headings
    xxxxl: 32,  // Hero headings
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,     // Headings
    normal: 1.5,    // Body text
    relaxed: 1.75,  // Comfortable reading
  },
};

// Shadow presets
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

// Touch target minimum size (accessibility)
export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
};

// Layout constants
export const layout = {
  screenPadding: spacing.lg,           // 20px default screen padding
  cardMargin: spacing.md,              // 16px card margins
  sectionSpacing: spacing.xl,          // 24px section spacing
  elementSpacing: spacing.sm,          // 8px element spacing in cards
  contentMaxWidth: 1200,               // Max width for content
  drawerWidth: 280,                    // Drawer width on mobile
  drawerWidthTablet: 320,              // Drawer width on tablet
};
