import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Specialist } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';

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
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const displayTags = specialist.tags.slice(0, 3);
  const remainingTags = specialist.tags.length > 3 ? specialist.tags.length - 3 : 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`Ver perfil de ${specialist.name}`}
    >
      <View style={styles.left}>
        <View style={styles.avatarWrap}>
          {specialist.avatar || specialist.user?.avatar ? (
            <Image source={{ uri: specialist.user?.avatar || specialist.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{specialist.initial}</Text>
            </View>
          )}

          {specialist.verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={theme.textOnPrimary} />
            </View>
          ) : null}

          {position ? (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>#{position}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.name} numberOfLines={1}>{specialist.name}</Text>
              <Text style={styles.specialization} numberOfLines={1}>{specialist.specialization}</Text>
            </View>

            {specialist.affinityPercentage > 0 ? (
              <View style={styles.affinityPill}>
                <Ionicons name="heart" size={12} color={theme.secondary} />
                <Text style={styles.affinityText}>{specialist.affinityPercentage}% match</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="star" size={13} color={theme.starRating} />
              <Text style={styles.metaStrong}>{specialist.rating.toFixed(1)}</Text>
              <Text style={styles.metaSoft}>({specialist.reviewCount})</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="cash-outline" size={13} color={theme.primary} />
              <Text style={styles.metaStrong}>{specialist.pricePerSession}€</Text>
              <Text style={styles.metaSoft}>/ sesión</Text>
            </View>
            {specialist.distance !== undefined ? (
              <View style={styles.metaPill}>
                <Ionicons name="location-outline" size={13} color={theme.primary} />
                <Text style={styles.metaStrong}>
                  {specialist.distance < 1
                    ? `${Math.round(specialist.distance * 1000)} m`
                    : specialist.distance > 50
                      ? '50+ km'
                      : `${specialist.distance.toFixed(1)} km`}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tagsRow}>
            {displayTags.map((tag, index) => (
              <View key={`${specialist.id}-${tag}-${index}`} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
            {remainingTags > 0 ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{remainingTags}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.availability}>
              <Ionicons name="calendar-outline" size={14} color={theme.success} />
              <Text style={styles.availabilityText}>Disponible hoy</Text>
            </View>

            {specialist.firstVisitFree ? (
              <View style={styles.freeVisitPill}>
                <Ionicons name="gift-outline" size={12} color={theme.secondaryDark} />
                <Text style={styles.freeVisitText}>Primera visita gratis</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <Button
          variant="outline"
          size="medium"
          onPress={onPress}
          icon={<Ionicons name="arrow-forward" size={16} color={theme.primary} />}
          iconPosition="right"
        >
          Ver perfil
        </Button>
      </View>
    </AnimatedPressable>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    card: {
      width: '100%',
      padding: spacing.lg,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.8,
      shadowRadius: 24,
      elevation: 3,
      gap: spacing.lg,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 2,
      borderColor: theme.primaryMuted,
    },
    avatarFallback: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    avatarInitial: {
      fontSize: 26,
      fontFamily: theme.fontDisplay,
      color: theme.textOnPrimary,
    },
    verifiedBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.success,
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    positionBadge: {
      position: 'absolute',
      top: -6,
      left: -6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryMuted,
    },
    positionText: {
      fontSize: 11,
      fontFamily: theme.fontSansBold,
      color: theme.primaryDark,
    },
    content: {
      flex: 1,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    titleWrap: {
      flex: 1,
    },
    name: {
      fontSize: 21,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
      marginBottom: 2,
    },
    specialization: {
      fontSize: 14,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    affinityPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.secondaryAlpha12,
    },
    affinityText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.secondaryDark,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    metaStrong: {
      fontSize: 12,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    metaSoft: {
      fontSize: 12,
      fontFamily: theme.fontSans,
      color: theme.textMuted,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.primaryAlpha12,
    },
    tagText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primaryDark,
    },
    footerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
      alignItems: 'center',
    },
    availability: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    availabilityText: {
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    freeVisitPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.secondaryAlpha12,
    },
    freeVisitText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.secondaryDark,
    },
    ctaWrap: {
      alignItems: 'flex-end',
    },
  });
}

export default SpecialistListItem;
