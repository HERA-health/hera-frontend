/**
 * Navigation Configuration for the HERA Sidebar.
 *
 * Keeps navigation data separate from presentation while exposing a
 * theme-aware visual token factory for the sidebar module.
 */

import { lightTheme, type Theme } from '../../../constants/theme';
import { NavigationSection, SidebarTheme } from './types';

export const CLIENT_SECTIONS: NavigationSection[] = [
  {
    id: 'main-nav',
    label: 'Paciente',
    roles: ['CLIENT'],
    items: [
      {
        id: 'home',
        label: 'Inicio',
        icon: 'home-outline',
        iconActive: 'home',
        route: 'Home',
        roles: ['CLIENT'],
      },
      {
        id: 'specialists',
        label: 'Especialistas',
        icon: 'search-outline',
        iconActive: 'search',
        route: 'Specialists',
        roles: ['CLIENT'],
      },
      {
        id: 'sessions',
        label: 'Mis sesiones',
        icon: 'calendar-outline',
        iconActive: 'calendar',
        route: 'Sessions',
        roles: ['CLIENT'],
      },
      {
        id: 'profile',
        label: 'Perfil',
        icon: 'person-outline',
        iconActive: 'person',
        route: 'Profile',
        roles: ['CLIENT'],
      },
    ],
  },
  {
    id: 'support',
    label: 'Atención',
    roles: ['CLIENT'],
    items: [
      {
        id: 'on-duty',
        label: 'Psicólogo de guardia',
        icon: 'heart-outline',
        iconActive: 'heart',
        route: 'OnDutyPsychologist',
        roles: ['CLIENT'],
        badge: 'Demo',
        badgeVariant: 'info',
      },
    ],
  },
];

export const PROFESSIONAL_SECTIONS: NavigationSection[] = [
  {
    id: 'main-nav',
    label: 'Profesional',
    roles: ['PROFESSIONAL'],
    items: [
      {
        id: 'home',
        label: 'Inicio',
        icon: 'home-outline',
        iconActive: 'home',
        route: 'ProfessionalHome',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.home',
      },
      {
        id: 'clients',
        label: 'Mis pacientes',
        icon: 'people-outline',
        iconActive: 'people',
        route: 'ProfessionalClients',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.clients',
      },
      {
        id: 'sessions',
        label: 'Sesiones',
        icon: 'calendar-outline',
        iconActive: 'calendar',
        route: 'ProfessionalSessions',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.sessions',
      },
      {
        id: 'billing',
        label: 'Facturación',
        icon: 'receipt-outline',
        iconActive: 'receipt',
        route: 'ProfessionalBilling',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.billing',
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'grid-outline',
        iconActive: 'grid',
        route: 'ProfessionalDashboard',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.dashboard',
      },
      {
        id: 'availability',
        label: 'Disponibilidad',
        icon: 'time-outline',
        iconActive: 'time',
        route: 'ProfessionalAvailability',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.availability',
      },
      {
        id: 'profile',
        label: 'Editar perfil',
        icon: 'create-outline',
        iconActive: 'create',
        route: 'ProfessionalProfile',
        roles: ['PROFESSIONAL'],
        tourTargetId: 'professional.nav.profile',
      },
    ],
  },
];

export const ADMIN_SECTION: NavigationSection = {
  id: 'admin',
  label: 'Administración',
  roles: ['CLIENT', 'PROFESSIONAL'],
  items: [
    {
      id: 'admin-panel',
      label: 'Panel de admin',
      icon: 'shield-outline',
      iconActive: 'shield',
      route: 'AdminPanel',
      roles: ['CLIENT', 'PROFESSIONAL'],
    },
  ],
};

export function getNavigationSections(
  role: 'CLIENT' | 'PROFESSIONAL',
  isAdmin?: boolean,
): NavigationSection[] {
  const sections = role === 'PROFESSIONAL' ? PROFESSIONAL_SECTIONS : CLIENT_SECTIONS;
  return isAdmin ? [...sections, ADMIN_SECTION] : sections;
}

export const SIDEBAR_THEME: SidebarTheme = {
  width: 224,
  collapsedWidth: 72,
  background: {
    primary: lightTheme.bgCard,
    secondary: lightTheme.bgCard,
    subtle: lightTheme.bgMuted,
    hover: lightTheme.secondaryAlpha12,
    active: lightTheme.secondaryMuted,
    overlay: lightTheme.overlay,
  },
  text: {
    primary: lightTheme.textPrimary,
    secondary: lightTheme.textSecondary,
    muted: lightTheme.textMuted,
    active: lightTheme.textPrimary,
  },
  icon: {
    inactive: lightTheme.textSecondary,
    active: lightTheme.primary,
  },
  activeIndicator: lightTheme.primary,
  border: lightTheme.border,
  borderStrong: lightTheme.secondaryLight,
  shadow: lightTheme.shadowNeutral,
  badge: {
    default: [lightTheme.primary, lightTheme.primaryLight],
    urgent: [lightTheme.warning, lightTheme.error],
    info: [lightTheme.secondary, lightTheme.secondaryLight],
  },
};

export const SIDEBAR_ANIMATIONS = {
  transitionDuration: 220,
  easing: 'ease-out',
  pressScale: 0.98,
  hoverTranslateX: 2,
};

export function getSidebarTheme(theme: Theme): SidebarTheme {
  return {
    width: 224,
    collapsedWidth: 72,
    background: {
      primary: theme.bgAlt,
      secondary: theme.bgCard,
      subtle: theme.bgMuted,
      hover: theme.secondaryAlpha12,
      active: theme.secondaryMuted,
      overlay: theme.overlayLight,
    },
    text: {
      primary: theme.textPrimary,
      secondary: theme.textSecondary,
      muted: theme.textMuted,
      active: theme.textPrimary,
    },
    icon: {
      inactive: theme.textSecondary,
      active: theme.selection,
    },
    activeIndicator: theme.selection,
    border: theme.border,
    borderStrong: theme.borderStrong,
    shadow: theme.shadowCard,
    badge: {
      default: [theme.actionPrimary, theme.actionPrimary],
      urgent: [theme.warning, theme.error],
      info: [theme.secondary, theme.secondaryLight],
    },
  };
}

export const SIDEBAR_A11Y = {
  minTouchTarget: 44,
  navRole: 'navigation',
  navLabel: 'Main navigation',
};
