/**
 * ProfileHero - Hero section for specialist profile
 * Displays avatar, name, title, rating, specializations, and CTA
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileHeroProps, getSpecializationIcon } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const InfoRow: React.FC<{
  icon: string;
  text: string;
  highlight?: boolean;
}> = ({ icon, text, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={[styles.infoText, highlight && styles.infoTextHighlight]}>
      {text}
    </Text>
  </View>
);

const SpecializationTag: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{name}</Text>
  </View>
);

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  specialist,
  affinity,
  onBookPress,
  onRatingPress,
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const getModalityText = () => {
    const types = specialist.sessionTypes || [];
    const parts: string[] = [];
    if (types.includes('VIDEO_CALL')) parts.push('Videollamada');
    if (types.includes('IN_PERSON')) parts.push('Presencial');
    if (types.includes('PHONE_CALL')) parts.push('Teléfono');
    return parts.length > 0 ? parts.join(' / ') : 'Online';
  };

  const getAvailabilityText = () => {
    if (specialist.isAvailableToday) return 'Disponible hoy';
    if (specialist.nextAvailable) return specialist.nextAvailable;
    return 'Consultar disponibilidad';
  };

  return (
    <View style={[styles.container, isWideScreen && styles.containerWide]}>
      {/* Affinity Badge - Top Right */}
      {affinity && affinity > 0 && (
        <View style={styles.affinityBadge}>
          <Ionicons name="heart" size={14} color={heraLanding.secondary} />
          <Text style={styles.affinityText}>{Math.round(affinity * 100)}% Match</Text>
        </View>
      )}

      <View style={[styles.content, isWideScreen && styles.contentWide]}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {specialist.avatar ? (
              <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{specialist.name[0]}</Text>
              </View>
            )}
          </View>
          {specialist.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.infoContainer, isWideScreen && styles.infoContainerWide]}>
          {/* Name & Title */}
          <Text style={styles.name}>{specialist.name}</Text>
          <Text style={styles.title}>{specialist.title}</Text>

          {/* Rating - Clickable */}
          <TouchableOpacity
            style={styles.ratingContainer}
            onPress={onRatingPress}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.ratingText}>
              {specialist.rating.toFixed(1)} ({specialist.reviewCount} reseñas)
            </Text>
            {onRatingPress && (
              <Ionicons name="chevron-forward" size={14} color={heraLanding.textMuted} />
            )}
          </TouchableOpacity>

          {/* Specialization Tags */}
          <View style={styles.tagsContainer}>
            {specialist.specializations.slice(0, 3).map((spec, index) => (
              <SpecializationTag key={index} name={spec} />
            ))}
            {specialist.specializations.length > 3 && (
              <View style={styles.tagMore}>
                <Text style={styles.tagMoreText}>+{specialist.specializations.length - 3}</Text>
              </View>
            )}
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <InfoRow icon="💶" text={`${specialist.pricePerSession}€/sesión`} />
            <InfoRow icon="📹" text={getModalityText()} />
            <InfoRow
              icon="📅"
              text={getAvailabilityText()}
              highlight={specialist.isAvailableToday}
            />
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onBookPress}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Reservar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  containerWide: {
    padding: spacing.xxl,
  },
  content: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  contentWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Affinity Badge
  affinityBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  affinityText: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.secondaryDark,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: heraLanding.background,
    backgroundColor: heraLanding.cardBg,
    ...shadows.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: heraLanding.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: heraLanding.success,
    borderWidth: 3,
    borderColor: heraLanding.cardBg,
  },

  // Info
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  infoContainerWide: {
    flex: 1,
    marginLeft: spacing.xl,
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  // Rating
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  ratingText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  tagMoreText: {
    fontSize: 13,
    color: heraLanding.primary,
    fontWeight: '600',
  },

  // Quick Info
  quickInfo: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
  },
  infoTextHighlight: {
    color: heraLanding.success,
    fontWeight: '500',
  },

  // CTA
  ctaButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    ...shadows.md,
  },
  ctaText: {
    color: heraLanding.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileHero;
