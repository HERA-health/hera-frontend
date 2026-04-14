/**
 * Type definitions for the Sidebar navigation system
 * Following Interface Segregation Principle (ISP):
 * - Components depend only on props they need
 * - No massive prop objects with unused fields
 */

import { RootStackParamList } from '../../../constants/types';

/**
 * User roles within the HERA platform
 */
export type UserRole = 'CLIENT' | 'PROFESSIONAL';

/**
 * Supported icon names from Ionicons
 * This provides type safety for icon selection
 */
export type IconName =
  | 'home'
  | 'home-outline'
  | 'search'
  | 'search-outline'
  | 'calendar'
  | 'calendar-outline'
  | 'person'
  | 'person-outline'
  | 'grid'
  | 'grid-outline'
  | 'people'
  | 'people-outline'
  | 'create'
  | 'create-outline'
  | 'call'
  | 'call-outline'
  | 'time'
  | 'time-outline'
  | 'log-out-outline'
  | 'settings'
  | 'settings-outline'
  | 'help-circle'
  | 'help-circle-outline'
  | 'shield'
  | 'shield-outline'
  | 'receipt'
  | 'receipt-outline'
  | 'heart'
  | 'heart-outline';

/**
 * Navigation item configuration
 * Represents a single navigation destination
 */
export interface NavigationItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label (localized) */
  label: string;
  /** Icon name for inactive state (outline) */
  icon: IconName;
  /** Icon name for active state (filled) - optional, defaults to non-outline version */
  iconActive?: IconName;
  /** Route name to navigate to */
  route: keyof RootStackParamList;
  /** User roles that can see this item */
  roles: UserRole[];
  /** Optional badge text (e.g., "24/7", "New", notification count) */
  badge?: string;
  /** Badge style variant */
  badgeVariant?: 'default' | 'urgent' | 'info';
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Custom badge colors (optional) */
  badgeColors?: [string, string];
}

/**
 * Navigation section configuration
 * Groups navigation items under a labeled section
 */
export interface NavigationSection {
  /** Unique identifier for the section */
  id: string;
  /** Section header label (e.g., "NAVEGACION", "SOPORTE") */
  label?: string;
  /** Navigation items in this section */
  items: NavigationItem[];
  /** User roles that can see this section */
  roles: UserRole[];
}

/**
 * Props for individual navigation item component
 * ISP: Only the props needed to render a single nav item
 */
export interface NavItemProps {
  /** Navigation item configuration */
  item: NavigationItem;
  /** Whether this item represents the current route */
  isActive: boolean;
  /** Callback when item is pressed */
  onPress: (route: keyof RootStackParamList) => void;
  /** Whether the sidebar is in collapsed state */
  isCollapsed?: boolean;
}

/**
 * User information for the sidebar user section
 */
export interface SidebarUser {
  /** User's display name */
  name: string;
  /** User's role */
  role: UserRole;
  /** Optional avatar URL */
  avatarUrl?: string;
}

/**
 * Props for the user section component
 * ISP: Minimal props for rendering user info and logout
 */
export interface UserSectionProps {
  /** User information */
  user: SidebarUser;
  /** Subtitle text to display */
  subtitle: string;
  /** Callback when logout is pressed */
  onLogout: () => void;
  /** Whether the sidebar is in collapsed state */
  isCollapsed?: boolean;
}

/**
 * Props for the main Sidebar component
 * DIP: Depends on abstractions (callbacks) not implementations
 */
export interface SidebarProps {
  /** Current user's role */
  userRole: UserRole;
  /** Current active route name */
  currentRoute: string;
  /** Callback to navigate to a route */
  onNavigate: (route: keyof RootStackParamList) => void;
  /** User information for the user section */
  user: SidebarUser;
  /** Callback when user logs out */
  onLogout: () => void;
  /** Whether the user is an admin */
  isAdmin?: boolean;
  /** Whether the sidebar is in collapsed state */
  isCollapsed?: boolean;
  /** Callback to toggle collapse state */
  onToggleCollapse?: () => void;
}

/**
 * Design tokens specific to the sidebar
 * Centralizes all visual constants
 */
export interface SidebarTheme {
  /** Sidebar width in pixels */
  width: number;
  /** Sidebar width when collapsed (icons only) */
  collapsedWidth: number;
  /** Background colors */
  background: {
    primary: string;
    secondary: string;
    subtle: string;
    hover: string;
    active: string;
    overlay: string;
  };
  /** Text colors */
  text: {
    primary: string;
    secondary: string;
    muted: string;
    active: string;
  };
  /** Icon colors */
  icon: {
    inactive: string;
    active: string;
  };
  /** Active indicator color */
  activeIndicator: string;
  /** Border colors */
  border: string;
  /** Divider/border emphasis for elevated blocks */
  borderStrong: string;
  /** Theme-aware shadow color */
  shadow: string;
  /** Badge colors */
  badge: {
    default: [string, string];
    urgent: [string, string];
    info: [string, string];
  };
}
