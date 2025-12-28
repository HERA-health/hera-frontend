/**
 * SpecialistListItem Component
 * Horizontal list item design for specialist display
 * Used in list view mode - more compact, information-dense
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
import { heraLanding, shadows, spacing } from '../../../constants/colors';
import { Specialist } from '../../../constants/types';

interface SpecialistListItemProps {
  specialist: Specialist;
  onPress: () => void;
  position?: 1 | 2 | 3;
  animationDelay?: number;
}

export const SpecialistListItem: React.FC<SpecialistListItemProps> = ({
  specialist,
  onPress,
  position,
  animationDelay = 0,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateX = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationDelay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.99,
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

  const getMedalEmoji = () => {
    if (position === 1) return '#1';
    if (position === 2) return '#2';
    if (position === 3) return '#3';
    return null;
  };

  const medal = getMedalEmoji();
  const displayTags = specialist.tags.slice(0, 3);
  const remainingTags = specialist.tags.length > 3 ? specialist.tags.length - 3 : 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateX }],
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
        accessibilityLabel={`Ver perfil de ${specialist.name}, ${specialist.specialization}`}
      >
        {/* Left Section: Avatar */}
        <View style={styles.avatarSection}>
          {specialist.avatar ? (
            <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{specialist.initial}</Text>
            </View>
          )}
          {specialist.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
          {medal && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>{medal}</Text>
            </View>
          )}
        </View>

        {/* Center Section: Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {specialist.name}
            </Text>
            {specialist.affinityPercentage > 0 && (
              <View style={styles.affinityBadge}>
                <Ionicons name="heart" size={10} color={heraLanding.secondary} />
                <Text style={styles.affinityText}>
                  {specialist.affinityPercentage}%
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {specialist.specialization}
          </Text>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingValue}>{specialist.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({specialist.reviewCount})</Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>{specialist.pricePerSession}€</Text>
              <Text style={styles.priceLabel}>/sesión</Text>
            </View>
          </View>

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

          {/* Bottom Row: Availability + First Visit */}
          <View style={styles.bottomRow}>
            <View style={styles.availabilityRow}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={heraLanding.success}
              />
              <Text style={styles.availabilityText}>Disponible hoy</Text>
            </View>

            {specialist.firstVisitFree && (
              <View style={styles.firstVisitBadge}>
                <Ionicons name="gift-outline" size={10} color={heraLanding.secondary} />
                <Text style={styles.firstVisitText}>1ra gratis</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Section: CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Ver perfil</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  avatarSection: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: heraLanding.background,
  },
  avatarPlaceholder: {
    backgroundColor: heraLanding.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: heraLanding.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  positionBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: heraLanding.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  positionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    flex: 1,
  },
  affinityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  affinityText: {
    fontSize: 10,
    fontWeight: '600',
    color: heraLanding.secondary,
  },
  title: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  reviewCount: {
    fontSize: 12,
    color: heraLanding.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  priceLabel: {
    fontSize: 11,
    color: heraLanding.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: heraLanding.primaryMuted,
  },
  tagMoreText: {
    fontSize: 11,
    color: heraLanding.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityText: {
    fontSize: 12,
    color: heraLanding.success,
    fontWeight: '500',
  },
  firstVisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  firstVisitText: {
    fontSize: 10,
    fontWeight: '600',
    color: heraLanding.secondary,
  },
  ctaSection: {
    marginLeft: spacing.sm,
  },
  ctaButton: {
    backgroundColor: heraLanding.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SpecialistListItem;
