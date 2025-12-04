/**
 * SpecialistCard Component - Modernized Premium Design
 * Displays a specialist with modern card design, shadows, and visual hierarchy
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, branding } from '../../constants/colors';
import { Specialist } from '../../constants/types';

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: () => void;
  style?: any;
  position?: 1 | 2 | 3; // Top 3 position badge
}

export function SpecialistCard({ specialist, onPress, style, position }: SpecialistCardProps) {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  // Get medal emoji based on position
  const getMedal = () => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const medal = getMedal();

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Medal badge for top 3 - small and subtle with gradient */}
      {medal && position && (
        <LinearGradient
          colors={position === 1 ? ['#FFD700', '#FFA500'] : // Gold gradient
                 position === 2 ? ['#C0C0C0', '#A8A8A8'] : // Silver gradient
                 ['#CD7F32', '#8B4513']} // Bronze gradient
          style={styles.medalBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.medalEmoji}>{medal}</Text>
        </LinearGradient>
      )}

      {/* Main content - responsive layout */}
      <View style={[styles.mainContent, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
        {/* Left section: Avatar + Info */}
        <View style={[styles.leftSection, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{specialist.initial}</Text>
            </View>
            {specialist.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color={branding.primary} />
              </View>
            )}
          </View>

          {/* Info section */}
          <View style={[
            styles.infoSection,
            {
              marginLeft: isWideScreen ? spacing.md : 0,
              marginTop: isWideScreen ? 0 : spacing.md,
              flex: isWideScreen ? 1 : undefined
            }
          ]}>
            <Text style={styles.name} numberOfLines={1}>{specialist.name}</Text>
            <Text style={styles.specialization} numberOfLines={1}>
              {specialist.specialization}
            </Text>

            {/* Rating with modern design */}
            <View style={styles.ratingContainer}>
              <View style={styles.rating}>
                <Ionicons name="star" size={16} color={colors.secondary.orange} />
                <Text style={styles.ratingText}>{specialist.rating}</Text>
              </View>
              <Text style={styles.reviewCount}>({specialist.reviewCount} reseñas)</Text>
            </View>
          </View>
        </View>

        {/* Right section: Affinity badge */}
        <View style={[
          styles.affinitySection,
          {
            marginTop: isWideScreen ? 0 : spacing.md,
            marginLeft: isWideScreen ? spacing.md : 0,
            alignSelf: isWideScreen ? 'flex-start' : 'flex-start'
          }
        ]}>
          <LinearGradient
            colors={[branding.accent, branding.accentLight]}
            style={styles.affinityBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="heart" size={14} color={colors.neutral.white} />
            <Text style={styles.affinityText}>{specialist.affinityPercentage}% match</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {specialist.description}
      </Text>

      {/* Tags */}
      <View style={styles.tags}>
        {specialist.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {specialist.tags.length > 3 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>+{specialist.tags.length - 3}</Text>
          </View>
        )}
      </View>

      {/* First visit free badge */}
      {specialist.firstVisitFree && (
        <View style={styles.firstVisitBadge}>
          <Ionicons name="gift-outline" size={14} color={branding.accent} />
          <Text style={styles.firstVisitText}>Primera visita gratuita</Text>
        </View>
      )}

      {/* Footer with price and CTA */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>€{specialist.pricePerSession}</Text>
          <Text style={styles.priceLabel}>por sesión</Text>
        </View>

        <TouchableOpacity style={styles.ctaButtonWrapper} onPress={onPress} activeOpacity={0.8}>
          <LinearGradient
            colors={[branding.accent, branding.accentLight]}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaText}>Ver Perfil</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    // Removed harsh border, using shadow for depth instead
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    width: '100%',
    maxWidth: 1200, // Wider for tablets
    alignSelf: 'center',
  },
  medalBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2,
  },
  medalEmoji: {
    fontSize: 20,
  },
  mainContent: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  affinitySection: {
    // No position absolute anymore
  },
  affinityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    gap: 4,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  affinityText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: branding.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: branding.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${branding.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  infoSection: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: 2,
  },
  specialization: {
    fontSize: 14,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.orange + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary.orange,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.neutral.gray500,
  },
  description: {
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: `${branding.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: branding.primary,
  },
  firstVisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${branding.accent}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    gap: 4,
  },
  firstVisitText: {
    fontSize: 12,
    fontWeight: '600',
    color: branding.accent,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.gray900,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  ctaButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
