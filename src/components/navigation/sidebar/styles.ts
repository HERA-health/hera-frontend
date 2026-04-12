import { Platform, StyleSheet } from 'react-native';
import { borderRadius, spacing } from '../../../constants/colors';

export const containerStyles = StyleSheet.create({
  sidebar: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  scrollContentCollapsed: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: spacing.md,
  },
});

export const logoStyles = StyleSheet.create({
  headerBlock: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  brandName: {
    fontSize: 20,
    lineHeight: 24,
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  mobileHint: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});

export const sectionStyles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  containerCollapsed: {
    alignItems: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
});

export const navItemStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 2,
  },
  pressable: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  inner: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'relative',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  innerCollapsed: {
    width: 58,
    minHeight: 58,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  activeGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: Platform.OS === 'web' ? 1 : 0.92,
  },
  indicator: {
    position: 'absolute',
    left: 10,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 8,
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconShellCollapsed: {
    marginRight: 0,
    width: 36,
    height: 36,
    borderRadius: 14,
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  badgeWrap: {
    marginLeft: spacing.sm,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});

export const userSectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  panel: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  panelCollapsed: {
    width: 58,
    paddingHorizontal: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRowCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  avatarCollapsed: {
    marginRight: 0,
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  avatarText: {
    fontSize: 15,
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    lineHeight: 18,
  },
  userSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconButtonCollapsed: {
    width: 36,
    height: 36,
    borderRadius: 12,
    marginTop: 8,
  },
});
