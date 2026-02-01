/**
 * ModalityBadges - Display online/in-person service badges
 * Shows which session types a specialist offers
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius } from '../../constants/colors';

interface ModalityBadgesProps {
  offersOnline: boolean;
  offersInPerson: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export const ModalityBadges: React.FC<ModalityBadgesProps> = ({
  offersOnline,
  offersInPerson,
  compact = false,
  style,
}) => {
  if (!offersOnline && !offersInPerson) return null;

  const iconSize = compact ? 12 : 14;
  const badgeStyle = compact ? styles.badgeCompact : styles.badge;
  const textStyle = compact ? styles.badgeTextCompact : styles.badgeText;

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {offersOnline && (
        <View style={[badgeStyle, styles.badgeOnline]}>
          <Ionicons name="videocam" size={iconSize} color={heraLanding.info} />
          <Text style={[textStyle, styles.textOnline]}>Online</Text>
        </View>
      )}
      {offersInPerson && (
        <View style={[badgeStyle, styles.badgeInPerson]}>
          <Ionicons name="business" size={iconSize} color={heraLanding.primary} />
          <Text style={[textStyle, styles.textInPerson]}>Presencial</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  containerCompact: {
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  badgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  badgeOnline: {
    backgroundColor: 'rgba(139, 168, 196, 0.15)',
  },
  badgeInPerson: {
    backgroundColor: heraLanding.primaryMuted,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeTextCompact: {
    fontSize: 11,
    fontWeight: '500',
  },
  textOnline: {
    color: heraLanding.info,
  },
  textInPerson: {
    color: heraLanding.primary,
  },
});

export default ModalityBadges;
