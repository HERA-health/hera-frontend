/**
 * Sidebar Navigation Module
 *
 * This module provides a SOLID-compliant sidebar navigation system
 * for the HERA mental health platform.
 *
 * Architecture:
 * - types.ts: TypeScript interfaces (ISP)
 * - navConfig.ts: Navigation configuration (OCP)
 * - styles.ts: Centralized styles
 * - NavItem.tsx: Individual navigation item (SRP)
 * - UserSection.tsx: User info and logout (SRP)
 * - Sidebar.tsx: Main orchestrating component (SRP/DIP)
 *
 * Usage:
 * ```tsx
 * import { Sidebar } from './components/navigation/sidebar';
 *
 * <Sidebar
 *   userRole="CLIENT"
 *   currentRoute="Home"
 *   onNavigate={(route) => navigation.navigate(route)}
 *   user={{ name: 'John', role: 'CLIENT' }}
 *   onLogout={() => logout()}
 * />
 * ```
 *
 * Adding new navigation items:
 * Edit navConfig.ts and add to CLIENT_SECTIONS or PROFESSIONAL_SECTIONS
 */

// Main component
export { Sidebar } from './Sidebar';
export { default as SidebarDefault } from './Sidebar';

// Sub-components (for advanced usage)
export { NavItem } from './NavItem';
export { UserSection } from './UserSection';

// Configuration (for customization)
export {
  CLIENT_SECTIONS,
  PROFESSIONAL_SECTIONS,
  getNavigationSections,
  SIDEBAR_THEME,
  SIDEBAR_ANIMATIONS,
  SIDEBAR_A11Y,
} from './navConfig';

// Types (for TypeScript consumers)
export type {
  UserRole,
  IconName,
  NavigationItem,
  NavigationSection,
  NavItemProps,
  SidebarUser,
  UserSectionProps,
  SidebarProps,
  SidebarTheme,
} from './types';

// Styles (for extending)
export {
  containerStyles,
  logoStyles,
  sectionStyles,
  navItemStyles,
  userSectionStyles,
} from './styles';
