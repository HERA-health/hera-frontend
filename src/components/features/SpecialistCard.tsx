import React, { useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Specialist } from '../../constants/types';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { getSpecialistDisplayTags } from '../../utils/specialistTagLabels';
import { getProfessionalTypeLabel } from '../../constants/professionalTypes';

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: () => void;
  onToggleFavorite?: () => void;
  style?: ViewStyle;
  position?: 1 | 2 | 3;
}

const DESKTOP_CARD_HEIGHT = 274;
const TABLET_CARD_HEIGHT = 286;
const MOBILE_CARD_HEIGHT = 298;
const DESCRIPTION_SLOT_HEIGHT = 40;
const TAGS_SLOT_HEIGHT = 36;

export function SpecialistCard({ specialist, onPress, onToggleFavorite, style, position }: SpecialistCardProps) {
  const { theme, isDark } = useTheme();
  const dynamicStyles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;
  const cardHeight = width >= 1180
    ? DESKTOP_CARD_HEIGHT
    : width >= 768
      ? TABLET_CARD_HEIGHT
      : MOBILE_CARD_HEIGHT;
  const affinityPct = specialist.affinityPercentage ?? 0;
  const displayTags = getSpecialistDisplayTags(specialist);
  const visibleTags = displayTags.slice(0, 2);
  const remainingTags = Math.max(displayTags.length - visibleTags.length, 0);
  const professionalTypeLabel = getProfessionalTypeLabel(
    specialist.professionalType,
    specialist.professionalTypeLabel,
  );

  const avatarUri = specialist.user?.avatar || specialist.avatar;

  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.985}
      hoverLift
      style={[
        dynamicStyles.card,
        { height: cardHeight },
        style,
      ]}
    >
      {onToggleFavorite ? (
        <AnimatedPressable
          onPress={onToggleFavorite}
          hoverLift={false}
          pressScale={0.92}
          style={[
            styles.favoriteButton,
            {
              backgroundColor: specialist.isFavorite ? theme.secondaryAlpha12 : (isDark ? theme.bgElevated : theme.bgAlt),
              borderColor: specialist.isFavorite ? theme.secondary : theme.borderLight,
            },
          ]}
          accessibilityLabel={specialist.isFavorite ? 'Quitar de favoritos' : 'Guardar como favorito'}
        >
          <Ionicons
            name={specialist.isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={specialist.isFavorite ? theme.secondary : theme.textMuted}
          />
        </AnimatedPressable>
      ) : null}

      <View style={styles.mainContent}>
        <View style={[styles.leftSection, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={[styles.avatarImage, { borderColor: theme.primaryMuted }]}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={[styles.avatarText, { fontFamily: theme.fontSansBold }]}>
                  {specialist.initial}
                </Text>
              </View>
            )}

            {specialist.verified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: theme.primaryAlpha12, borderColor: theme.bgCard },
                ]}
              >
                <Ionicons name="checkmark" size={12} color={theme.primary} />
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.infoSection,
              {
                marginLeft: isWideScreen ? spacing.md : 0,
                marginTop: isWideScreen ? 0 : spacing.md,
                flex: isWideScreen ? 1 : undefined,
              },
            ]}
          >
            <Text
              style={[styles.name, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}
              numberOfLines={1}
            >
              {specialist.name}
            </Text>
            <Text
              style={[
                styles.specialization,
                { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
              ]}
              numberOfLines={1}
            >
              {professionalTypeLabel}
            </Text>
            <View style={styles.ratingRow}>
              {position ? (
                <View style={[styles.rankPill, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryMuted }]}>
                  <Text style={[styles.rankText, { color: theme.primaryDark, fontFamily: theme.fontSansBold }]}>
                    Top {position}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.ratingPill, { backgroundColor: `${theme.starRating}18` }]}>
                <Ionicons name="star" size={14} color={theme.starRating} />
                <Text
                  style={[styles.ratingText, { color: theme.starRating, fontFamily: theme.fontSansBold }]}
                >
                  {specialist.rating}
                </Text>
              </View>
              <Text style={[styles.reviewCount, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                {`(${specialist.reviewCount} rese\u00f1as)`}
              </Text>
              {affinityPct > 0 ? (
                <Text style={[styles.matchText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                  {`${affinityPct}% compatible`}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <Text
        style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
        numberOfLines={2}
      >
        {specialist.description}
      </Text>

      <View style={styles.tags}>
        {visibleTags.map((tag, index) => (
          <View
            key={`${specialist.id}-${tag}-${index}`}
            style={[
              styles.tag,
              {
                backgroundColor: theme.primaryAlpha12,
                borderColor: theme.primaryMuted,
              },
            ]}
          >
            <Text
              style={[styles.tagText, { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold }]}
              numberOfLines={1}
            >
              {tag}
            </Text>
          </View>
        ))}
        {remainingTags > 0 ? (
          <View
            style={[
              styles.tag,
              styles.moreTag,
              {
                backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
                borderColor: theme.borderLight,
              },
            ]}
          >
            <Text
              style={[styles.tagText, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}
              numberOfLines={1}
            >
              +{remainingTags}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            {`${specialist.pricePerSession}\u20ac`}
          </Text>
          <Text style={[styles.priceLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            {'/ sesi\u00f3n'}
          </Text>
          {specialist.firstVisitFree ? (
            <View style={[styles.pricePerkBadge, { backgroundColor: theme.secondaryAlpha12 }]}>
              <Ionicons name="gift-outline" size={12} color={theme.secondary} />
              <Text
                style={[
                  styles.pricePerkText,
                  { color: isDark ? theme.secondaryLight : theme.secondaryDark, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Gratis
              </Text>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.ctaWrapper,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.shadowPrimary,
            },
          ]}
        >
          <View style={styles.ctaSurface}>
            <Text style={[styles.ctaText, { fontFamily: theme.fontSansBold }]}>Ver perfil</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 18,
      padding: spacing.lg,
      marginBottom: spacing.md,
      position: 'relative',
      width: '100%',
      maxWidth: 1200,
      alignSelf: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.9,
      shadowRadius: 22,
      elevation: 4,
    },
  });
}

const styles = StyleSheet.create({
  mainContent: {
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  infoSection: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    marginBottom: 2,
    paddingRight: 36,
  },
  specialization: {
    fontSize: 14,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rankPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  rankText: {
    fontSize: 11,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
  },
  reviewCount: {
    fontSize: 12,
  },
  matchText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: DESCRIPTION_SLOT_HEIGHT,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    minHeight: TAGS_SLOT_HEIGHT,
    marginBottom: spacing.md,
  },
  tag: {
    maxWidth: 150,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTag: {
    minWidth: 42,
  },
  tagText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  price: {
    fontSize: 26,
  },
  priceLabel: {
    fontSize: 12,
  },
  pricePerkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pricePerkText: {
    fontSize: 11,
  },
  ctaWrapper: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 3,
  },
});

export default SpecialistCard;
