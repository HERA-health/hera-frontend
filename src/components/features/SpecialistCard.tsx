/**
 * SpecialistCard Component - Modernized Premium Design
 * Displays a specialist with modern card design, shadows, and visual hierarchy
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
import { Specialist } from '../../constants/types';

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: () => void;
  style?: any;
}

export function SpecialistCard({ specialist, onPress, style }: SpecialistCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Affinity badge - floating */}
      <View style={styles.affinityBadge}>
        <Ionicons name="heart" size={14} color={colors.primary.main} />
        <Text style={styles.affinityText}>{specialist.affinityPercentage}% match</Text>
      </View>

      {/* Header with avatar and info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{specialist.initial}</Text>
          </View>
          {specialist.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary.main} />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
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
          <Ionicons name="gift-outline" size={14} color={colors.primary.main} />
          <Text style={styles.firstVisitText}>Primera visita gratuita</Text>
        </View>
      )}

      {/* Footer with price and CTA */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>€{specialist.pricePerSession}</Text>
          <Text style={styles.priceLabel}>por sesión</Text>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={onPress}>
          <Text style={styles.ctaText}>Ver Perfil</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  affinityBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  affinityText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.main,
  },
  header: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.neutral.white,
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
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  headerInfo: {
    flex: 1,
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
    backgroundColor: colors.secondary.blue + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary.blue,
  },
  firstVisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
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
    color: colors.primary.main,
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
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
