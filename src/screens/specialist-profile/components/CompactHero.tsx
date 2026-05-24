import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CompactHeroProps } from '../types';
import { borderRadius, heraLanding, spacing } from '../../../constants/colors';
import { getProfessionalTypeLabel } from '../../../constants/professionalTypes';

const STRINGS = {
  verified: 'Especialista verificada',
  reviews: 'reseñas',
};

const SOFT_HERO_COLORS = new Set(['#97B2A6', '#BDD7FF', '#DFD8CD']);

export const CompactHero: React.FC<CompactHeroProps> = ({
  specialist,
  affinity,
  onRatingPress,
  gradientColors,
}) => {
  const heroColor = gradientColors[0] || heraLanding.primary;
  const softHero = SOFT_HERO_COLORS.has(heroColor.toUpperCase());
  const heroTextColor = softHero ? heraLanding.textPrimary : heraLanding.textOnPrimary;
  const heroTextMuted = softHero ? heraLanding.textSecondary : heraLanding.whiteAlpha85;
  const heroPillBg = softHero ? heraLanding.whiteAlpha80 : heraLanding.whiteAlpha25;
  const heroPillBorder = softHero ? heraLanding.whiteAlpha90 : heraLanding.whiteAlpha40;

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
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View style={[styles.toneOverlay, softHero ? styles.softOverlay : null]} />

        <View style={styles.content}>
          {affinity != null && affinity > 0 ? (
            <View
              style={[
                styles.affinityBadge,
                { backgroundColor: heroPillBg, borderColor: heroPillBorder },
              ]}
            >
              <Ionicons name="heart" size={12} color={heroTextColor} />
              <Text style={[styles.affinityText, { color: heroTextColor }]}>
                {Math.round(affinity * 100)}% compatible
              </Text>
            </View>
          ) : null}

          {specialist.verificationStatus === 'VERIFIED' ? (
            <View
              style={[
                styles.verifiedPill,
                { backgroundColor: heroPillBg, borderColor: heroPillBorder },
              ]}
            >
              <Text style={[styles.verifiedText, { color: heroTextColor }]}>
                {'\u2713'} {STRINGS.verified}
                {specialist.collegiateNumber ? ` · Col. ${specialist.collegiateNumber}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.avatarInfoRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarWrapper, { borderColor: heroPillBorder }]}>
                {specialist.avatar ? (
                  <Image source={{ uri: specialist.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: heroPillBg }]}>
                    <Text style={[styles.avatarInitial, { color: heroTextColor }]}>
                      {specialist.name[0]}
                    </Text>
                  </View>
                )}
              </View>
              {specialist.isOnline ? <View style={styles.onlineIndicator} /> : null}
            </View>

            <View style={styles.infoContainer}>
              <Text style={[styles.name, { color: heroTextColor }]}>{specialist.name}</Text>
              <Text style={[styles.title, { color: heroTextMuted }]}>
                {getProfessionalTypeLabel(specialist.professionalType, specialist.professionalTypeLabel)}
              </Text>

              {specialist.reviewCount > 0 ? (
                <TouchableOpacity
                  style={styles.ratingRow}
                  onPress={onRatingPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.starsRow}>{renderStars(specialist.rating)}</View>
                  <Text style={[styles.ratingText, { color: heroTextMuted }]}>
                    {specialist.rating.toFixed(1)} · {specialist.reviewCount} {STRINGS.reviews}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {specialtyTags.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContainer}
            >
              {specialtyTags.map((tag, index) => (
                <View
                  key={`${tag}-${index}`}
                  style={[styles.tag, { backgroundColor: heroPillBg, borderColor: heroPillBorder }]}
                >
                  <Text style={[styles.tagText, { color: heroTextColor }]}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  hero: {
    minHeight: 220,
    position: 'relative',
  },
  toneOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  softOverlay: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    zIndex: 1,
    justifyContent: 'center',
  },
  affinityBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    zIndex: 2,
  },
  affinityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '500',
  },
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
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
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
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
  },
  tagsScroll: {
    flexGrow: 0,
    marginTop: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
  },
  tagText: {
    fontSize: 11,
  },
});

export default CompactHero;
