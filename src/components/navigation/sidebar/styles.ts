import { StyleSheet } from 'react-native';
import { spacing } from '../../../constants/colors';

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
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: spacing.lg,
  },
  scrollContentCollapsed: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 12,
  },
});

export const logoStyles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {
    flex: 1,
    marginLeft: 10,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  brandName: {
    fontSize: 19,
    lineHeight: 22,
  },
});

export const sectionStyles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  containerCollapsed: {
    alignItems: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  header: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginHorizontal: 8,
    marginBottom: 10,
  },
});

export const navItemStyles = StyleSheet.create({
  container: {
    marginBottom: 4,
    width: '100%',
  },
  containerCollapsed: {
    alignItems: 'center',
  },
  pressable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inner: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 12,
  },
  innerCollapsed: {
    width: 48,
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  indicator: {
    position: 'absolute',
    left: 5,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 8,
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconShellCollapsed: {
    marginRight: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.5,
  },
  badgeWrap: {
    marginLeft: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0,
  },
});

export const userSectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: spacing.sm,
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  panelCollapsed: {
    width: 48,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 10,
  },
  avatarCollapsed: {
    marginRight: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  avatarText: {
    fontSize: 14,
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
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
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
