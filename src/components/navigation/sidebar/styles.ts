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
  tourTarget: {
    alignSelf: 'stretch',
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
  noticeLabel: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  noticeDot: {
    position: 'absolute',
    right: -7,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: spacing.xs,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 0,
    gap: 8,
  },
  panelCollapsed: {
    width: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  topRowCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  profileButton: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
  },
  profileButtonCollapsed: {
    width: 38,
    height: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 11,
    marginRight: 8,
  },
  avatarCollapsed: {
    marginRight: 0,
    width: 30,
    height: 30,
    borderRadius: 10,
  },
  avatarText: {
    fontSize: 14,
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    lineHeight: 18,
  },
  userSubtitle: {
    fontSize: 11,
    lineHeight: 13,
    marginTop: 1,
  },
  profileArrow: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guideButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  guideButtonCollapsed: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideButtonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  quickIconButton: {
    width: 38,
    minWidth: 38,
    height: 36,
    borderRadius: 11,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  iconButton: {
    width: 38,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconButtonCollapsed: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
});
