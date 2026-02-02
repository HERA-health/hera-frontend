/**
 * SpecialistCardGrid Component
 * Modern grid card design for specialist display
 * Features: Avatar-centered, trust indicators, smooth hover states
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { heraLanding, shadows, spacing, borderRadius } from '../../../constants/colors';
import { Specialist } from '../../../constants/types';

interface SpecialistCardGridProps {
  specialist: Specialist;
  onPress: () => void;
  position?: 1 | 2 | 3;
  animationDelay?: number;
}

export const SpecialistCardGrid: React.FC<SpecialistCardGridProps> = ({
  specialist,
  onPress,
  position,
  animationDelay = 0,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationDelay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getMedalInfo = () => {
    if (position === 1) return { emoji: '1', colors: heraLanding.medals.gold };
    if (position === 2) return { emoji: '2', colors: heraLanding.medals.silver };
    if (position === 3) return { emoji: '3', colors: heraLanding.medals.bronze };
    return null;
  };

  const medal = getMedalInfo();

  // Display up to 3 specializations/tags
  const displayTags = specialist.tags.slice(0, 3);
  const remainingTags = specialist.tags.length > 3 ? specialist.tags.length - 3 : 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${specialist.name}, ${specialist.specialization}, valorado con ${specialist.rating} estrellas, ${specialist.pricePerSession} euros por sesión`}
      >
        {/* Position Badge - Absolute top-left */}
        {medal && (
          <LinearGradient
            colors={medal.colors as [string, string]}
            style={styles.positionBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.positionText}>#{medal.emoji}</Text>
          </LinearGradient>
        )}

        {/* First Visit Free Badge - Absolute top-right (doesn't affect layout) */}
        {specialist.firstVisitFree && (
          <View style={styles.firstVisitBadge}>
            <Ionicons name="gift" size={11} color={heraLanding.textOnCard} />
            <Text style={styles.firstVisitText}>Gratis</Text>
          </View>
        )}

        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          {specialist.avatar ? (
            <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{specialist.initial}</Text>
            </View>
          )}
          {specialist.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={heraLanding.textOnCard} />
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>
          {specialist.name}
        </Text>

        {/* Title/Specialization */}
        <Text style={styles.title} numberOfLines={1}>
          {specialist.specialization}
        </Text>

        {/* Meta Row: Rating + Price */}
        <View style={styles.metaRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={heraLanding.starRating} />
            <Text style={styles.ratingValue}>{specialist.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({specialist.reviewCount})</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>{specialist.pricePerSession}€</Text>
            <Text style={styles.priceLabel}>/sesión</Text>
          </View>
        </View>

        {/* Distance Badge (when proximity filter is active) */}
        {specialist.distance !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location-outline" size={14} color={heraLanding.primary} />
            <Text style={styles.distanceText}>
              {specialist.distance < 1
                ? `${Math.round(specialist.distance * 1000)} m`
                : specialist.distance > 50
                  ? '50+ km'
                  : `${specialist.distance.toFixed(1)} km`}
            </Text>
          </View>
        )}

        {/* Tags */}
        <View style={styles.tagsContainer}>
          {displayTags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
          {remainingTags > 0 && (
            <View style={[styles.tag, styles.tagMore]}>
              <Text style={styles.tagMoreText}>+{remainingTags}</Text>
            </View>
          )}
        </View>

        {/* Availability Indicator */}
        <View style={styles.availabilityRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={heraLanding.success}
          />
          <Text style={styles.availabilityText}>Disponible hoy</Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${specialist.name}`}
        >
          <Text style={styles.ctaText}>Ver perfil</Text>
        </TouchableOpacity>

        {/* Affinity Badge */}
        {specialist.affinityPercentage > 0 && (
          <View style={styles.affinityBadge}>
            <Ionicons name="heart" size={12} color={heraLanding.secondary} />
            <Text style={styles.affinityText}>
              {specialist.affinityPercentage}% match
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
  },
  card: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
    minHeight: 380,
    maxHeight: 380,
    justifyContent: 'flex-start',
    ...shadows.md,
    ...(Platform.OS === 'web' && {
      // @ts-ignore - Web-specific hover styles
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  positionBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  positionText: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.textOnCard,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: heraLanding.background,
    ...shadows.sm,
  },
  avatarPlaceholder: {
    backgroundColor: heraLanding.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textOnCard,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: heraLanding.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: heraLanding.cardBackground,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  reviewCount: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  priceLabel: {
    fontSize: 12,
    color: heraLanding.textSecondary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  tag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
  },
  tagText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: heraLanding.primaryMuted,
  },
  tagMoreText: {
    fontSize: 12,
    color: heraLanding.primary,
    fontWeight: '600',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  availabilityText: {
    fontSize: 13,
    color: heraLanding.success,
    fontWeight: '500',
  },
  firstVisitBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: heraLanding.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 1,
    ...shadows.sm,
  },
  firstVisitText: {
    fontSize: 11,
    fontWeight: '700',
    color: heraLanding.textOnCard,
  },
  ctaButton: {
    backgroundColor: heraLanding.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnCard,
  },
  affinityBadge: {
    position: 'absolute',
    top: 44,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  affinityText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.secondary,
  },
});

export default SpecialistCardGrid;
