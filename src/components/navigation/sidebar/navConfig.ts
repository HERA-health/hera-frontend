/**
 * Navigation Configuration for HERA Sidebar
 *
 * Following Open/Closed Principle (OCP):
 * - Easy to add new menu items without modifying existing code
 * - Navigation items defined in CONFIG arrays
 * - Component renders from config (data-driven)
 * - No hardcoded menu items scattered in JSX
 *
 * To add a new navigation item:
 * 1. Add to the appropriate section in CLIENT_SECTIONS or PROFESSIONAL_SECTIONS
 * 2. Ensure the route exists in your navigation stack
 * 3. The sidebar will automatically render the new item
 */

import { NavigationSection, SidebarTheme } from './types';
import { heraLanding } from '../../../constants/colors';

/**
 * Client navigation sections
 * Contains all navigation items visible to clients
 */
export const CLIENT_SECTIONS: NavigationSection[] = [
  {
    id: 'main-nav',
    label: 'NAVEGACION',
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
        label: 'Mis Sesiones',
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
    label: 'SOPORTE',
    roles: ['CLIENT'],
    items: [
      {
        id: 'on-duty',
        label: 'Psicólogo de Guardia',
        icon: 'heart-outline',
        iconActive: 'heart',
        route: 'OnDutyPsychologist',
        roles: ['CLIENT'],
        badge: '24/7',
        badgeVariant: 'urgent',
        // Coral/amber colors - warm urgency without panic
        badgeColors: ['#E89D88', '#D4826E'],
      },
    ],
  },
];

/**
 * Professional navigation sections
 * Contains all navigation items visible to professionals/specialists
 */
export const PROFESSIONAL_SECTIONS: NavigationSection[] = [
  {
    id: 'main-nav',
    label: 'NAVEGACION',
    roles: ['PROFESSIONAL'],
    items: [
      {
        id: 'dashboard',
        label: 'Panel Principal',
        icon: 'grid-outline',
        iconActive: 'grid',
        route: 'ProfessionalHome',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'clients',
        label: 'Mis Clientes',
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
        id: 'availability',
        label: 'Disponibilidad',
        icon: 'time-outline',
        iconActive: 'time',
        route: 'ProfessionalAvailability',
        roles: ['PROFESSIONAL'],
      },
      {
        id: 'profile',
        label: 'Editar Perfil',
        icon: 'create-outline',
        iconActive: 'create',
        route: 'ProfessionalProfile',
        roles: ['PROFESSIONAL'],
      },
    ],
  },
];

/**
 * Get navigation sections based on user role
 * @param role - The user's role
 * @returns Array of navigation sections for that role
 */
export function getNavigationSections(role: 'CLIENT' | 'PROFESSIONAL'): NavigationSection[] {
  return role === 'PROFESSIONAL' ? PROFESSIONAL_SECTIONS : CLIENT_SECTIONS;
}

/**
 * Sidebar theme configuration
 * Uses HERA landing page colors for consistency
 */
export const SIDEBAR_THEME: SidebarTheme = {
  width: 280,
  background: {
    primary: '#FFFFFF',
    hover: '#F5F7F5',
    active: '#E8F5E8',
  },
  text: {
    primary: heraLanding.textPrimary,     // #2C3E2C - Forest
    secondary: heraLanding.textSecondary, // #6B7B6B - Neutral
    muted: heraLanding.textMuted,         // #9BA89B
    active: heraLanding.textPrimary,      // #2C3E2C
  },
  icon: {
    inactive: heraLanding.textSecondary,  // #6B7B6B
    active: heraLanding.primary,          // #8B9D83 - Sage Green
  },
  activeIndicator: heraLanding.primary,   // #8B9D83 - Sage Green
  border: '#E8EBE8',
  badge: {
    default: [heraLanding.primary, heraLanding.primaryLight],
    // Coral/amber - warm urgency without panic
    urgent: ['#E89D88', '#D4826E'],
    info: [heraLanding.secondary, heraLanding.secondaryLight],
  },
};

/**
 * Animation configuration for sidebar interactions
 */
export const SIDEBAR_ANIMATIONS = {
  /** Duration for hover/press transitions in ms */
  transitionDuration: 200,
  /** Easing function for animations */
  easing: 'ease-out',
  /** Scale factor for press feedback */
  pressScale: 0.98,
  /** Horizontal translation on hover (desktop) */
  hoverTranslateX: 2,
};

/**
 * Accessibility configuration
 */
export const SIDEBAR_A11Y = {
  /** Minimum touch target size in pixels */
  minTouchTarget: 44,
  /** Role for navigation container */
  navRole: 'navigation',
  /** Label for the navigation */
  navLabel: 'Main navigation',
};
