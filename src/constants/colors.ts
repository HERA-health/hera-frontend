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

  // ✅ Status colors (for SessionCard)
  status: {
    confirmed: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#A5D6A7',
    },
    pending: {
      bg: '#FFF8E1',
      text: '#F57C00',
      border: '#FFE082',
    },
    completed: {
      bg: '#F3E5F5',
      text: '#7B1FA2',
      border: '#CE93D8',
    },
    cancelled: {
      bg: '#FFEBEE',
      text: '#C62828',
      border: '#EF9A9A',
    },
  },

  // ✅ Medal gradients (for SpecialistCard rankings)
  medals: {
    gold: ['#FFD700', '#FFA500'] as [string, string],
    silver: ['#E8E8E8', '#C0C0C0'] as [string, string],
    bronze: ['#CD9B6D', '#CD7F32'] as [string, string],
  },

  // ✅ Common UI tokens
  starRating: '#FFB800',
  cardBackground: '#FFFFFF',
  textOnCard: '#FFFFFF',
  inputBackgroundDisabled: '#F5F7F5',
  hoverBackground: '#F0F2F0',
  destructiveHover: '#FEE2E2',

  // ✅ Alpha variants (for semi-transparent overlays)
  primaryAlpha12: 'rgba(139, 157, 131, 0.12)',
  primaryAlpha20: 'rgba(139, 157, 131, 0.20)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',

  // ✅ UI states
  disabled: '#E0E5E0',
  surfaceMuted: '#FAFBFA',
  dangerMuted: '#FEE2E2',
  successBg: '#F0F7F0',
  goldMuted: '#FFF8E7',
  goldDark: '#B8860B',
  warningAmber: '#D9A84F',        // Amber warning (for specialist profile pending states)
  scrollbarThumbAlt: '#C5CFC5',  // Alternative scrollbar thumb (specialist profile)

  // ✅ Scrollbar (web only)
  scrollbarTrack: '#F0F2F0',
  scrollbarThumb: '#D0D5D0',
  scrollbarThumbHover: '#B8BDB8',

  // ✅ Celebration/special
  gold: '#FFD700',
  celebration: '#FFD700',

  // ✅ Overlay colors (for modals, drawers)
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // ✅ Light/muted variants for backgrounds
  successLight: '#E8F5E8',
  successMuted: 'rgba(123, 163, 119, 0.15)',
  warningLight: 'rgba(232, 157, 136, 0.15)',
  mutedLight: 'rgba(155, 163, 155, 0.20)',

  // ✅ Background variants
  backgroundLight: '#FAFBFA',
  backgroundMuted: '#F8F9F8',

  // ✅ White alpha variants
  whiteAlpha25: 'rgba(255, 255, 255, 0.25)',
  whiteAlpha30: 'rgba(255, 255, 255, 0.3)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',

  // ✅ Simple status colors (for direct use as background colors)
  statusInProgress: '#7BA377',
  statusCompleted: '#B8C8B8',

  // ✅ Calendar pill colors (for calendar event indicators)
  calendarConfirmedBg: '#E8EFE6',
  calendarConfirmedText: '#5A7A52',
  calendarPendingBg: '#EDE8F7',
  calendarPendingText: '#7B67B8',
};

// ✅ Brand colors for third-party integrations
export const brandColors = {
  google: '#4285F4',
  apple: '#000000',
  facebook: '#1877F2',
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
  rightPanelWidth: 230,                // Right panel width on desktop (calendar view)
  calendarTimeColumnWidth: 36,         // Time labels column in week view
  mobilePanelHeight: 300,              // Right panel section height on mobile
  collapsedSidebarWidth: 52,           // Sidebar width when collapsed (icons only)
};
