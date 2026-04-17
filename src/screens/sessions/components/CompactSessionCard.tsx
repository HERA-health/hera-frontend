/**
 * CompactSessionCard Component
 * Single Responsibility: Display compact session info in calendar view
 * Used in DayDetailsSection for selected day
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CompactSessionCardProps } from '../types';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';
import {
  formatTime,
  getSessionTypeIcon,
  getStatusLabel,
} from '../utils/sessionHelpers';
import {
  getVideoCallButtonState,
  getVideoCallButtonLabel,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../../utils/videoCallUtils';

const CompactSessionCard: React.FC<CompactSessionCardProps> = ({
  session,
  onPress,
  onJoinPress,
}) => {
  const isVideoCall = session.type === 'VIDEO_CALL';
  const isCompleted = session.status === 'COMPLETED';
  const isCancelled = session.status === 'CANCELLED';
  const canShowJoin = isVideoCall && !isCompleted && !isCancelled;

  const getStatusStyle = () => {
    switch (session.status) {
      case 'CONFIRMED':
        return { dotColor: '#7BA377' };
      case 'PENDING':
        return { dotColor: '#D9A84F' };
      case 'COMPLETED':
        return { dotColor: '#9BA39B' };
      case 'CANCELLED':
        return { dotColor: '#E89D88' };
      default:
        return { dotColor: '#6B7B6B' };
    }
  };

  const statusStyle = getStatusStyle();

  const handleJoinPress = () => {
    if (!canShowJoin) return;

    const buttonState = getVideoCallButtonState(session);
    const isClickable = isVideoCallButtonClickable(buttonState);

    if (isClickable && onJoinPress) {
      onJoinPress();
    }
  };

  const renderJoinButton = () => {
    if (!canShowJoin) return null;

    const buttonState = getVideoCallButtonState(session);
    const isClickable = isVideoCallButtonClickable(buttonState);

    return (
      <TouchableOpacity
        style={[
          styles.joinButton,
          isClickable ? styles.joinButtonActive : styles.joinButtonDisabled,
        ]}
        onPress={handleJoinPress}
        disabled={!isClickable}
      >
        <Ionicons
          name="videocam"
          size={16}
          color={isClickable ? colors.neutral.white : heraLanding.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.timeSection}>
        <Text style={styles.timeText}>{formatTime(session.date)}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusStyle.dotColor }]} />
      </View>

      <View style={styles.divider} />

      <View style={styles.infoSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {session.specialist.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.specialistName} numberOfLines={1}>
            {session.specialist.user.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name={getSessionTypeIcon(session.type) as keyof typeof Ionicons.glyphMap}
              size={12}
              color={heraLanding.textMuted}
            />
            <Text style={styles.metaText}>{session.duration} min</Text>
          </View>
        </View>

        {renderJoinButton()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeSection: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: heraLanding.borderLight,
    marginHorizontal: spacing.md,
  },
  infoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  details: {
    flex: 1,
  },
  specialistName: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
  },
  joinButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  joinButtonActive: {
    backgroundColor: heraLanding.primary,
    shadowColor: heraLanding.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonDisabled: {
    backgroundColor: heraLanding.borderLight,
  },
});

export default CompactSessionCard;
