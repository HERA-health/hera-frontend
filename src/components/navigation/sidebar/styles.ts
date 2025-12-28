/**
 * Sidebar Styles
 *
 * Centralized styles for the sidebar navigation system.
 * Uses the HERA landing page design language:
 * - Sage green (#8B9D83) as primary accent
 * - Clean, white backgrounds
 * - Generous spacing and breathing room
 * - Smooth, professional aesthetic
 */

import { StyleSheet } from 'react-native';
import { SIDEBAR_THEME } from './navConfig';
import { spacing, borderRadius, typography } from '../../../constants/colors';

/**
 * Sidebar container styles
 */
export const containerStyles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_THEME.width,
    height: '100%',
    backgroundColor: SIDEBAR_THEME.background.primary,
    borderRightWidth: 1,
    borderRightColor: SIDEBAR_THEME.border,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});

/**
 * Logo section styles
 */
export const logoStyles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: spacing.sm,
  },
  brandName: {
    fontSize: 22,
    fontWeight: typography.fontWeights.bold,
    color: SIDEBAR_THEME.text.primary,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: typography.fontSizes.sm,
    color: SIDEBAR_THEME.text.secondary,
    marginTop: 2,
  },
});

/**
 * Navigation section styles
 */
export const sectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  header: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: SIDEBAR_THEME.text.muted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F0',
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
});

/**
 * Navigation item styles
 */
export const navItemStyles = StyleSheet.create({
  container: {
    height: 48,
    marginHorizontal: spacing.xs,
    marginBottom: 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  // Default state
  default: {
    backgroundColor: 'transparent',
  },
  // Hover state (web)
  hover: {
    backgroundColor: SIDEBAR_THEME.background.hover,
  },
  // Active state (current route)
  active: {
    backgroundColor: SIDEBAR_THEME.background.active,
  },
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  // Active indicator bar
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: SIDEBAR_THEME.activeIndicator,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  // Icon container
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  // Label text
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: typography.fontWeights.medium,
    color: SIDEBAR_THEME.text.primary,
  },
  labelActive: {
    fontWeight: typography.fontWeights.semibold,
  },
  // Badge container
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

/**
 * User section styles
 */
export const userSectionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F0',
    backgroundColor: SIDEBAR_THEME.background.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SIDEBAR_THEME.activeIndicator,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: 14,
    fontWeight: typography.fontWeights.semibold,
    color: SIDEBAR_THEME.text.primary,
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: SIDEBAR_THEME.text.secondary,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoutButtonHover: {
    backgroundColor: '#FEE2E2',
  },
});
