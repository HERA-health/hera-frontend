import { StyleSheet } from 'react-native';
import { spacing } from '../../../constants/colors';
import { Theme } from '../../../constants/theme';

export const createWorkspaceStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    workspace: {
      gap: spacing.lg,
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.warningBg,
      padding: spacing.md,
    },
    noticeText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    contentGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
    },
    listPanel: {
      width: '100%',
      flex: isCompact ? undefined : 1,
    },
    detailPanel: {
      width: '100%',
      maxWidth: isCompact ? undefined : 460,
    },
    emptyPanel: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
      textAlign: 'center',
    },
    emptyText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 560,
    },
    statePanel: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.lg,
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 420,
    },
  });

export const createListPanelStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    text: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
    list: {
      gap: spacing.sm,
    },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: spacing.sm,
      position: 'relative',
      zIndex: 20,
    },
    filterField: {
      gap: spacing.xs,
      position: 'relative',
      zIndex: 20,
    },
    filterFieldCompact: {
      minWidth: 150,
      flexGrow: 1,
      flexBasis: 150,
    },
    filterFieldWide: {
      minWidth: 220,
      flexGrow: 2,
      flexBasis: 220,
    },
    filterLabel: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    statePanel: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.lg,
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 420,
    },
    loadMore: {
      alignItems: 'center',
      paddingTop: spacing.xs,
    },
  });

export const createListItemStyles = (theme: Theme) =>
  StyleSheet.create({
    item: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgElevated,
      padding: spacing.md,
    },
    itemSelected: {
      borderColor: theme.focus,
      backgroundColor: theme.primaryAlpha12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.secondaryMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatarText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 22,
    },
    itemContent: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    itemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    itemTitle: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    itemMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    itemSubMeta: {
      flex: 1,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    itemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });

export const createBadgeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      minHeight: 26,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: theme.successBg,
      borderColor: theme.status.confirmed.border,
    },
    badgeArchived: {
      backgroundColor: theme.bgMuted,
      borderColor: theme.border,
    },
    badgeAssigned: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.focus,
    },
    badgeNeutral: {
      backgroundColor: theme.bgMuted,
      borderColor: theme.border,
    },
    badgeText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    badgeTextActive: {
      color: theme.success,
    },
    badgeTextArchived: {
      color: theme.textMuted,
    },
    badgeTextAssigned: {
      color: theme.primary,
    },
    badgeTextNeutral: {
      color: theme.textMuted,
    },
  });

export const createDetailStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    rows: {
      gap: spacing.xs,
    },
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.sm,
    },
    rowLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    rowValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    hint: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    assignmentBox: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.md,
      gap: spacing.md,
      position: 'relative',
      zIndex: 10,
    },
    assignmentSummary: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    assignmentIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    assignmentCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    assignmentName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 14,
      lineHeight: 20,
    },
    assignmentMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    assignmentReason: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginTop: spacing.xs,
    },
    assignmentEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
    assignmentForm: {
      gap: spacing.md,
      position: 'relative',
      zIndex: 20,
    },
    assignmentActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    message: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
  });

export const createFormStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    fields: {
      gap: spacing.xs,
    },
    groupTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.xs,
    },
    message: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
  });
