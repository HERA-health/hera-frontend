/**
 * CompactHero - Compact gradient hero for two-column layout
 * Used in left column on desktop, shows basic info without CTA
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CompactHeroProps } from '../types';
import { heraLanding, spacing, borderRadius } from '../../../constants/colors';

const STRINGS = {
  verified: 'Especialista verificada',
  reviews: 'reseñas',
};

export const CompactHero: React.FC<CompactHeroProps> = ({
  specialist,
  affinity,
  onRatingPress,
  gradientColors,
}) => {
  const getModalityTags = (): string[] => {
    const types = specialist.sessionTypes || [];
    const tags: string[] = [];
    if (types.includes('VIDEO_CALL')) tags.push('Online');
    if (types.includes('IN_PERSON')) tags.push('Presencial');
    return tags;
  };

  const specialtyTags = [
    ...specialist.specializations.slice(0, 4),
    ...getModalityTags(),
  ];

  const renderStars = (rating: number) => {
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color={heraLanding.starRating}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.darkOverlay} />

        <View style={styles.content}>
          {/* Affinity Badge */}
          {affinity != null && affinity > 0 && (
            <View style={styles.affinityBadge}>
              <Ionicons name="heart" size={12} color="#FFFFFF" />
              <Text style={styles.affinityText}>{Math.round(affinity * 100)}% Match</Text>
            </View>
          )}

          {/* Verified badge */}
          {specialist.verificationStatus === 'VERIFIED' && (
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedText}>
                ✓ {STRINGS.verified}
                {specialist.collegiateNumber ? ` · Col. ${specialist.collegiateNumber}` : ''}
              </Text>
            </View>
          )}

          {/* Avatar + Info row */}
          <View style={styles.avatarInfoRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {specialist.avatar ? (
                  <Image source={{ uri: specialist.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{specialist.name[0]}</Text>
                  </View>
                )}
              </View>
              {specialist.isOnline && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.name}>{specialist.name}</Text>
              <Text style={styles.title}>{specialist.title}</Text>

              {specialist.reviewCount > 0 && (
                <TouchableOpacity
                  style={styles.ratingRow}
                  onPress={onRatingPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.starsRow}>{renderStars(specialist.rating)}</View>
                  <Text style={styles.ratingText}>
                    {specialist.rating.toFixed(1)} · {specialist.reviewCount} {STRINGS.reviews}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Personal motto */}
          {specialist.personalMotto ? (
            <Text style={styles.motto}>{specialist.personalMotto}</Text>
          ) : null}

          {/* Tags */}
          {specialtyTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContainer}
            >
              {specialtyTags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    minHeight: 220,
    position: 'relative',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    zIndex: 1,
    justifyContent: 'center',
  },

  // Affinity
  affinityBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.whiteAlpha25,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    zIndex: 2,
  },
  affinityText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Verified
  verifiedPill: {
    backgroundColor: heraLanding.whiteAlpha25,
    borderWidth: 1,
    borderColor: heraLanding.whiteAlpha40,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  verifiedText: {
    fontSize: 11,
    color: heraLanding.textOnPrimary,
    fontWeight: '500',
  },

  // Avatar + Info
  avatarInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: heraLanding.whiteAlpha80,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: heraLanding.whiteAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: heraLanding.success,
    borderWidth: 2,
    borderColor: heraLanding.textOnPrimary,
  },

  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '500',
    color: heraLanding.textOnPrimary,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    color: heraLanding.whiteAlpha85,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    color: heraLanding.whiteAlpha80,
  },

  // Motto
  motto: {
    fontSize: 13,
    color: heraLanding.whiteAlpha80,
    fontStyle: 'italic',
    lineHeight: 20,
    maxWidth: 500,
    marginBottom: spacing.sm,
  },

  // Tags
  tagsScroll: {
    flexGrow: 0,
    marginTop: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: heraLanding.whiteAlpha20,
    borderWidth: 1,
    borderColor: heraLanding.whiteAlpha30,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
  },
  tagText: {
    fontSize: 11,
    color: heraLanding.textOnPrimary,
  },
});

export default CompactHero;
