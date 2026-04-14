/**
 * Navigation Configuration for the HERA Sidebar.
 *
 * Keeps navigation data separate from presentation while exposing a
 * theme-aware visual token factory for the sidebar module.
 */

import { Theme } from '../../../constants/theme';
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
        badge: '24/7',
        badgeVariant: 'urgent',
        badgeColors: ['#E89D88', '#D4826E'],
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
      },
      {
        id: 'clients',
        label: 'Mis pacientes',
        icon: 'people-outline',
        iconActive: 'people',
        route: 'ProfessionalClients',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'sessions',
        label: 'Sesiones',
        icon: 'calendar-outline',
        iconActive: 'calendar',
        route: 'ProfessionalSessions',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'billing',
        label: 'Facturación',
        icon: 'receipt-outline',
        iconActive: 'receipt',
        route: 'ProfessionalBilling',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'grid-outline',
        iconActive: 'grid',
        route: 'ProfessionalDashboard',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'availability',
        label: 'Disponibilidad',
        icon: 'time-outline',
        iconActive: 'time',
        route: 'ProfessionalAvailability',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'profile',
        label: 'Editar perfil',
        icon: 'create-outline',
        iconActive: 'create',
        route: 'ProfessionalProfile',
        roles: ['PROFESSIONAL'],
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
  width: 272,
  collapsedWidth: 78,
  background: {
    primary: '#FDFCFB',
    secondary: '#FFFFFF',
    subtle: '#F7F9F7',
    hover: 'rgba(139, 157, 131, 0.10)',
    active: 'rgba(139, 157, 131, 0.16)',
    overlay: 'rgba(0, 0, 0, 0.48)',
  },
  text: {
    primary: '#2C3E2C',
    secondary: '#6B7B6B',
    muted: '#95A395',
    active: '#2C3E2C',
  },
  icon: {
    inactive: '#6B7B6B',
    active: '#8B9D83',
  },
  activeIndicator: '#8B9D83',
  border: '#E2E8E2',
  borderStrong: '#CDD8CD',
  shadow: 'rgba(44, 62, 44, 0.10)',
  badge: {
    default: ['#8B9D83', '#A8B8A0'],
    urgent: ['#E89D88', '#D4826E'],
    info: ['#B8A8D9', '#D4C9E8'],
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
    width: 272,
    collapsedWidth: 78,
    background: {
      primary: theme.bgAlt,
      secondary: theme.bgCard,
      subtle: theme.bgMuted,
      hover: theme.primaryAlpha12,
      active: theme.primaryAlpha20,
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
      active: theme.primary,
    },
    activeIndicator: theme.primary,
    border: theme.border,
    borderStrong: theme.borderStrong,
    shadow: theme.shadowCard,
    badge: {
      default: [theme.primary, theme.primaryLight],
      urgent: ['#E89D88', '#D4826E'],
      info: [theme.secondary, theme.secondaryLight],
    },
  };
}

export const SIDEBAR_A11Y = {
  minTouchTarget: 44,
  navRole: 'navigation',
  navLabel: 'Main navigation',
};
