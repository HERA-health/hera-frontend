import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { borderRadius, shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable, Button } from '../../../components/common';
import type { SessionCardProps } from '../types';
import { formatTime, getDateLabel, getSessionTypeIcon, getSessionTypeLabel, isToday } from '../utils/sessionHelpers';
import {
  getVideoCallButtonLabel,
  getVideoCallButtonState,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../../utils/videoCallUtils';

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onPress,
  onJoinPress,
  onCancelPress,
  onLeaveReviewPress,
  hasReview = false,
  showActions = true,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);

  const isCompleted = session.status === 'COMPLETED';
  const isCancelled = session.status === 'CANCELLED';
  const isVideoCall = session.type === 'VIDEO_CALL';
  const isTodaySession = isToday(session.date);
  const canShowVideoButton = isVideoCall && !isCompleted && !isCancelled;

  const statusConfig = (() => {
    switch (session.status) {
      case 'CONFIRMED':
        return { ...theme.status.confirmed, icon: 'checkmark-circle' as const, label: 'Confirmada' };
      case 'PENDING':
        return { ...theme.status.pending, icon: 'time' as const, label: 'Pendiente' };
      case 'COMPLETED':
        return { ...theme.status.completed, icon: 'checkmark-done-circle' as const, label: 'Completada' };
      case 'CANCELLED':
        return { ...theme.status.cancelled, icon: 'close-circle' as const, label: 'Cancelada' };
      default:
        return { bg: theme.bgMuted, text: theme.textSecondary, border: theme.border, icon: 'ellipse' as const, label: 'Desconocida' };
    }
  })();

  const buttonState = canShowVideoButton ? getVideoCallButtonState(session) : null;
  const buttonMeta = buttonState ? getVideoCallButtonLabel(buttonState, session) : null;
  const buttonStyle = buttonState ? getVideoCallButtonStyle(buttonState) : null;
  const isJoinClickable = buttonState ? isVideoCallButtonClickable(buttonState) : false;

  return (
    <AnimatedPressable
      style={[
        styles.card,
        isTodaySession && !isCompleted && !isCancelled ? styles.cardToday : null,
        (isCompleted || isCancelled) ? styles.cardPast : null,
      ]}
      onPress={onPress ?? (() => undefined)}
      disabled={!onPress}
      hoverLift={!!onPress}
      pressScale={onPress ? 0.99 : 1}
    >
      <View style={styles.topRow}>
        <View style={styles.timeBlock}>
          <View style={[styles.timeIconShell, isTodaySession && styles.timeIconShellToday]}>
            <Ionicons name="time-outline" size={17} color={isTodaySession ? theme.primary : theme.textSecondary} />
          </View>
          <View>
            <Text style={[styles.timeText, isTodaySession && styles.timeTextToday]}>{formatTime(session.date)}</Text>
            <Text style={styles.durationText}>{session.duration} minutos</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.text} />
          <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          {session.specialist.user.avatar || session.specialist.avatar ? (
            <Image
              source={{ uri: session.specialist.user.avatar || session.specialist.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {session.specialist.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isVideoCall && !isCompleted && !isCancelled ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.profileCopy}>
          <Text style={styles.specialistName} numberOfLines={1}>{session.specialist.user.name}</Text>
          <Text style={styles.specialization} numberOfLines={1}>{session.specialist.specialization}</Text>
        </View>

        <View style={styles.typePill}>
          <Ionicons
            name={getSessionTypeIcon(session.type) as keyof typeof Ionicons.glyphMap}
            size={12}
            color={theme.textSecondary}
          />
          <Text style={styles.typePillText}>{getSessionTypeLabel(session.type)}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailChip}>
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.detailChipText}>{getDateLabel(session.date)}</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="wallet-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.detailChipText}>{session.specialist.pricePerSession}€</Text>
        </View>
      </View>

      {session.notes ? (
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text-outline" size={14} color={theme.primary} />
            <Text style={styles.notesLabel}>Notas de la sesión</Text>
          </View>
          <Text style={styles.notesText} numberOfLines={2}>{session.notes}</Text>
        </View>
      ) : null}

      {canShowVideoButton && buttonState && buttonMeta && buttonStyle ? (
        <View style={styles.videoActionBlock}>
          <AnimatedPressable
            style={[
              styles.videoActionButton,
              {
                backgroundColor: isJoinClickable ? theme.primary : buttonStyle.backgroundColor,
                borderColor: buttonStyle.borderColor || 'transparent',
                borderWidth: buttonStyle.borderColor ? 1 : 0,
              },
            ]}
            onPress={isJoinClickable ? (onJoinPress ?? (() => undefined)) : () => undefined}
            disabled={!isJoinClickable}
            hoverLift={isJoinClickable}
          >
            <View style={styles.videoActionContent}>
              <Ionicons
                name={buttonMeta.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={isJoinClickable ? theme.textOnPrimary : buttonStyle.textColor}
              />
              <Text
                style={[
                  styles.videoActionText,
                  { color: isJoinClickable ? theme.textOnPrimary : buttonStyle.textColor },
                ]}
              >
                {buttonMeta.primary}
              </Text>
            </View>
            {isJoinClickable ? (
              <Ionicons name="arrow-forward" size={18} color={theme.textOnPrimary} />
            ) : null}
          </AnimatedPressable>

          {buttonMeta.helper ? (
            <View style={styles.videoHelperRow}>
              <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
              <Text style={styles.videoHelperText}>{buttonMeta.helper}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {showActions && !isCompleted && !isCancelled ? (
        <View style={styles.footerActions}>
          <Button
            variant="ghost"
            size="small"
            onPress={onCancelPress ?? (() => undefined)}
            icon={<Ionicons name="close-outline" size={16} color={theme.warning} />}
            style={styles.cancelGhostButton}
            textStyle={styles.cancelGhostButtonText}
          >
            Cancelar sesión
          </Button>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.completedFooter}>
          {hasReview ? (
            <>
              <Ionicons name="star" size={15} color={theme.starRating} />
              <Text style={[styles.completedText, { color: theme.starRating }]}>Reseña enviada</Text>
            </>
          ) : onLeaveReviewPress ? (
            <Button
              variant="secondary"
              size="small"
              onPress={onLeaveReviewPress}
              icon={<Ionicons name="star-outline" size={16} color={theme.secondaryDark} />}
              style={styles.reviewButton}
              textStyle={styles.reviewButtonText}
            >
              Dejar reseña
            </Button>
          ) : (
            <>
              <Ionicons name="checkmark-done" size={15} color={theme.success} />
              <Text style={styles.completedText}>Sesión completada</Text>
            </>
          )}
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

const createStyles = (theme: Theme, isDark: boolean, width: number) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      ...shadows.md,
    },
    cardToday: {
      borderColor: theme.primaryAlpha20,
      shadowColor: theme.shadowPrimary,
    },
    cardPast: {
      opacity: 0.92,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingBottom: spacing.md,
      marginBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    timeBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    timeIconShell: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    timeIconShellToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    timeText: {
      fontSize: width > 480 ? 22 : 20,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    timeTextToday: {
      color: theme.primary,
    },
    durationText: {
      marginTop: 2,
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: borderRadius.full,
    },
    statusText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatarImage: {
      width: 56,
      height: 56,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: theme.primaryAlpha20,
    },
    avatarFallback: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 2,
      borderColor: theme.primaryAlpha20,
    },
    avatarFallbackText: {
      fontSize: 22,
      fontFamily: theme.fontSansBold,
      color: theme.primary,
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 999,
      backgroundColor: theme.success,
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    profileCopy: {
      flex: 1,
      minWidth: 0,
    },
    specialistName: {
      fontSize: 17,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      marginBottom: 3,
    },
    specialization: {
      fontSize: 14,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    typePillText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    detailRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    detailChipText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    notesCard: {
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      marginBottom: spacing.md,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    notesLabel: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    videoActionBlock: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    videoActionButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderRadius: borderRadius.xl,
    },
    videoActionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    videoActionText: {
      fontSize: 15,
      fontFamily: theme.fontSansBold,
    },
    videoHelperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
    },
    videoHelperText: {
      flex: 1,
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    footerActions: {
      alignItems: 'flex-start',
      marginTop: spacing.xs,
    },
    cancelGhostButton: {
      paddingHorizontal: 0,
    },
    cancelGhostButtonText: {
      color: theme.warning,
      fontFamily: theme.fontSansSemiBold,
    },
    completedFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: spacing.sm,
    },
    completedText: {
      fontSize: 13,
      color: theme.success,
      fontFamily: theme.fontSansSemiBold,
    },
    reviewButton: {
      alignSelf: 'flex-start',
    },
    reviewButtonText: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
    },
  });

export default SessionCard;
