/**
 * SessionCard Component
 * Premium card design inspired by Apple Calendar, Notion, Stripe
 * Beautiful, informative, delightful to use
 *
 * Design principles:
 * - Clear visual hierarchy
 * - Status at a glance
 * - Generous whitespace
 * - Subtle shadows and depth
 * - HERA color harmony
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionCardProps } from '../types';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';
import {
  formatDate,
  formatTime,
  getSessionTypeLabel,
  getSessionTypeIcon,
  getStatusLabel,
  getDateLabel,
  isToday,
} from '../utils/sessionHelpers';
import {
  getVideoCallButtonState,
  getVideoCallButtonLabel,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../../utils/videoCallUtils';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  variant = 'detailed',
  onPress,
  onJoinPress,
  onCancelPress,
  showActions = true,
}) => {
  const isCompleted = session.status === 'COMPLETED';
  const isCancelled = session.status === 'CANCELLED';
  const isPending = session.status === 'PENDING';
  const isConfirmed = session.status === 'CONFIRMED';
  const isVideoCall = session.type === 'VIDEO_CALL';
  const canShowVideoButton = isVideoCall && !isCompleted && !isCancelled;

  // Beautiful status colors with backgrounds - using theme tokens
  const getStatusConfig = () => {
    switch (session.status) {
      case 'CONFIRMED':
        return {
          bg: heraLanding.status.confirmed.bg,
          color: heraLanding.status.confirmed.text,
          borderColor: heraLanding.status.confirmed.border,
          icon: 'checkmark-circle',
          label: 'Confirmada',
        };
      case 'PENDING':
        return {
          bg: heraLanding.status.pending.bg,
          color: heraLanding.status.pending.text,
          borderColor: heraLanding.status.pending.border,
          icon: 'time',
          label: 'Pendiente',
        };
      case 'COMPLETED':
        return {
          bg: heraLanding.status.completed.bg,
          color: heraLanding.status.completed.text,
          borderColor: heraLanding.status.completed.border,
          icon: 'checkmark-done-circle',
          label: 'Completada',
        };
      case 'CANCELLED':
        return {
          bg: heraLanding.status.cancelled.bg,
          color: heraLanding.status.cancelled.text,
          borderColor: heraLanding.status.cancelled.border,
          icon: 'close-circle',
          label: 'Cancelada',
        };
      default:
        return {
          bg: heraLanding.background,
          color: heraLanding.textSecondary,
          borderColor: heraLanding.border,
          icon: 'ellipse',
          label: 'Desconocido',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const isTodaySession = isToday(session.date);

  const renderVideoCallButton = () => {
    if (!canShowVideoButton) return null;

    const buttonState = getVideoCallButtonState(session);
    const { primary, helper, icon } = getVideoCallButtonLabel(buttonState, session);
    const buttonStyle = getVideoCallButtonStyle(buttonState);
    const isClickable = isVideoCallButtonClickable(buttonState);

    return (
      <View style={styles.videoCallSection}>
        <TouchableOpacity
          style={[
            styles.videoCallButton,
            {
              backgroundColor: isClickable ? heraLanding.primary : buttonStyle.backgroundColor,
              borderColor: buttonStyle.borderColor || 'transparent',
              borderWidth: buttonStyle.borderColor ? 1 : 0,
            },
            isClickable && styles.videoCallButtonActive,
          ]}
          onPress={() => isClickable && onJoinPress?.()}
          disabled={!isClickable}
          activeOpacity={isClickable ? 0.85 : 1}
        >
          <View style={styles.videoCallButtonContent}>
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={isClickable ? colors.neutral.white : buttonStyle.textColor}
            />
            <Text style={[
              styles.videoCallButtonText,
              { color: isClickable ? colors.neutral.white : buttonStyle.textColor }
            ]}>
              {primary}
            </Text>
          </View>
          {isClickable && (
            <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
          )}
        </TouchableOpacity>
        {helper && (
          <View style={styles.helperContainer}>
            <Ionicons name="information-circle-outline" size={14} color={heraLanding.textMuted} />
            <Text style={styles.videoCallHelperText}>{helper}</Text>
          </View>
        )}
      </View>
    );
  };

  // Card accent for upcoming sessions
  const cardAccentStyle = isTodaySession && !isCompleted && !isCancelled
    ? { borderLeftWidth: 4, borderLeftColor: heraLanding.primary }
    : {};

  return (
    <TouchableOpacity
      style={[
        styles.card,
        cardAccentStyle,
        (isCompleted || isCancelled) && styles.cardPast,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.95 : 1}
      disabled={!onPress}
    >
      {/* Top section: Time + Status */}
      <View style={styles.topSection}>
        {/* Time display - prominent */}
        <View style={styles.timeContainer}>
          <View style={[styles.timeIconBg, isTodaySession && styles.timeIconBgToday]}>
            <Ionicons
              name="time"
              size={18}
              color={isTodaySession ? heraLanding.primary : heraLanding.textSecondary}
            />
          </View>
          <View style={styles.timeInfo}>
            <Text style={[styles.timeText, isTodaySession && styles.timeTextToday]}>
              {formatTime(session.date)}
            </Text>
            <Text style={styles.durationText}>{session.duration} minutos</Text>
          </View>
        </View>

        {/* Status badge - beautiful pill */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.borderColor }]}>
          <Ionicons
            name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={statusConfig.color}
          />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Specialist section - the star of the show */}
      <View style={styles.specialistSection}>
        {/* Beautiful avatar */}
        <View style={styles.avatarContainer}>
          {session.specialist.user.avatar || session.specialist.avatar ? (
            <Image
              source={{ uri: session.specialist.user.avatar || session.specialist.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {session.specialist.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Online indicator for upcoming video calls */}
          {isVideoCall && !isCompleted && !isCancelled && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        <View style={styles.specialistInfo}>
          <Text style={styles.specialistName} numberOfLines={1}>
            {session.specialist.user.name}
          </Text>
          <Text style={styles.specialization} numberOfLines={1}>
            {session.specialist.specialization}
          </Text>
        </View>

        {/* Quick info pills */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoPill}>
            <Ionicons
              name={getSessionTypeIcon(session.type) as keyof typeof Ionicons.glyphMap}
              size={12}
              color={heraLanding.textSecondary}
            />
            <Text style={styles.quickInfoText}>
              {getSessionTypeLabel(session.type)}
            </Text>
          </View>
        </View>
      </View>

      {/* Session details row - clean, minimal */}
      <View style={styles.detailsRow}>
        <View style={styles.detailChip}>
          <Ionicons name="calendar-outline" size={14} color={heraLanding.textSecondary} />
          <Text style={styles.detailText}>{getDateLabel(session.date)}</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="wallet-outline" size={14} color={heraLanding.textSecondary} />
          <Text style={styles.detailText}>${session.specialist.pricePerSession}</Text>
        </View>
      </View>

      {/* Notes section - subtle, expandable feel */}
      {session.notes && (
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text-outline" size={14} color={heraLanding.primary} />
            <Text style={styles.notesLabel}>Notas de la sesión</Text>
          </View>
          <Text style={styles.notesText} numberOfLines={2}>
            {session.notes}
          </Text>
        </View>
      )}

      {/* Video call button - prominent for upcoming sessions */}
      {renderVideoCallButton()}

      {/* Actions footer - subtle, secondary */}
      {showActions && !isCompleted && !isCancelled && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={onCancelPress}
            activeOpacity={0.7}
          >
            <Ionicons name="close-outline" size={16} color={heraLanding.warning} />
            <Text style={styles.secondaryActionText}>Cancelar sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Completion indicator for past sessions */}
      {isCompleted && (
        <View style={styles.completedFooter}>
          <Ionicons name="checkmark-done" size={16} color={heraLanding.success} />
          <Text style={styles.completedText}>Sesión completada exitosamente</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Card container - Premium, elevated design
  // ═══════════════════════════════════════════════════════════════
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg + 4,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardPast: {
    opacity: 0.85,
    backgroundColor: heraLanding.surfaceMuted,
  },

  // ═══════════════════════════════════════════════════════════════
  // Top section - Time and Status
  // ═══════════════════════════════════════════════════════════════
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeIconBgToday: {
    backgroundColor: heraLanding.primaryAlpha12,
  },
  timeInfo: {
    // Time info wrapper
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: -0.5,
  },
  timeTextToday: {
    color: heraLanding.primary,
  },
  durationText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ═══════════════════════════════════════════════════════════════
  // Specialist section - The focal point
  // ═══════════════════════════════════════════════════════════════
  specialistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: heraLanding.primaryAlpha12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: heraLanding.primaryAlpha20,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: heraLanding.primaryAlpha20,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: heraLanding.success,
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  specialistInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  specialistName: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  specialization: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  quickInfoContainer: {
    // Quick info wrapper
  },
  quickInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  quickInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },

  // ═══════════════════════════════════════════════════════════════
  // Details row - Clean chips
  // ═══════════════════════════════════════════════════════════════
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${heraLanding.primary}06`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },

  // ═══════════════════════════════════════════════════════════════
  // Notes section - Elegant, subtle
  // ═══════════════════════════════════════════════════════════════
  notesSection: {
    backgroundColor: `${heraLanding.primary}08`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  notesText: {
    fontSize: 14,
    color: heraLanding.textPrimary,
    lineHeight: 20,
  },

  // ═══════════════════════════════════════════════════════════════
  // Video call button - The hero CTA
  // ═══════════════════════════════════════════════════════════════
  videoCallSection: {
    marginTop: spacing.md,
  },
  videoCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  videoCallButtonActive: {
    shadowColor: heraLanding.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  videoCallButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  videoCallButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  videoCallHelperText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    textAlign: 'center',
  },

  // ═══════════════════════════════════════════════════════════════
  // Actions row - Secondary, subtle
  // ═══════════════════════════════════════════════════════════════
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${heraLanding.warning}08`,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.warning,
  },

  // ═══════════════════════════════════════════════════════════════
  // Completed footer
  // ═══════════════════════════════════════════════════════════════
  completedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.success,
  },
});

export default SessionCard;
