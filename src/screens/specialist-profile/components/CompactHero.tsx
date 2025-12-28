/**
 * CompactHero - Compact hero section for two-column layout
 * Used in left column on desktop, shows basic info without CTA
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompactHeroProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const SpecializationTag: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{name}</Text>
  </View>
);

export const CompactHero: React.FC<CompactHeroProps> = ({
  specialist,
  affinity,
  onRatingPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Affinity Badge - Top Right */}
      {affinity && affinity > 0 && (
        <View style={styles.affinityBadge}>
          <Ionicons name="heart" size={12} color={heraLanding.secondary} />
          <Text style={styles.affinityText}>{Math.round(affinity * 100)}% Match</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {specialist.avatar ? (
            <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{specialist.name[0]}</Text>
            </View>
          )}
          {specialist.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          {/* Name & Title */}
          <Text style={styles.name}>{specialist.name}</Text>
          <Text style={styles.title}>{specialist.title}</Text>

          {/* Rating - Clickable */}
          <TouchableOpacity
            style={styles.ratingContainer}
            onPress={onRatingPress}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.ratingText}>
              {specialist.rating.toFixed(1)} ({specialist.reviewCount} reseñas)
            </Text>
            {onRatingPress && (
              <Ionicons name="chevron-forward" size={12} color={heraLanding.textMuted} />
            )}
          </TouchableOpacity>

          {/* Specialization Tags */}
          <View style={styles.tagsContainer}>
            {specialist.specializations.slice(0, 4).map((spec, index) => (
              <SpecializationTag key={index} name={spec} />
            ))}
            {specialist.specializations.length > 4 && (
              <View style={styles.tagMore}>
                <Text style={styles.tagMoreText}>+{specialist.specializations.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
    position: 'relative',
  },

  // Affinity Badge
  affinityBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  affinityText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.secondaryDark,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: heraLanding.background,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: heraLanding.background,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: heraLanding.success,
    borderWidth: 2,
    borderColor: heraLanding.cardBg,
  },

  // Info
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },

  // Rating
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  ratingText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagMoreText: {
    fontSize: 12,
    color: heraLanding.primary,
    fontWeight: '600',
  },
});

export default CompactHero;
