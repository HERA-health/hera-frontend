import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { getGradientColors } from '../../constants/gradients';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { translateSpecialty } from '../../constants/specialties';
import type {
  PublicSpecialistCard as PublicSpecialistCardData,
  PublicSpecialistDirectoryCard,
} from '../../services/specialistsService';

type PublicSpecialistCardVariant = 'featured' | 'directory';

interface PublicSpecialistCardProps {
  specialist: PublicSpecialistCardData | PublicSpecialistDirectoryCard;
  onPress: () => void;
  variant: PublicSpecialistCardVariant;
  directoryHorizontal?: boolean;
  style?: StyleProp<ViewStyle>;
}

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(price);

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const getModalityLabel = (specialist: PublicSpecialistCardData): string => {
  if (specialist.offersOnline && specialist.offersInPerson) return 'Online y presencial';
  if (specialist.offersInPerson) return 'Presencial';
  return 'Online';
};

export const PublicSpecialistCard: React.FC<PublicSpecialistCardProps> = ({
  specialist,
  onPress,
  variant,
  directoryHorizontal = false,
  style,
}) => {
  const { theme } = useTheme();
  const colors = useMemo(() => getGradientColors(specialist.gradientId), [specialist.gradientId]);
  const isFeatured = variant === 'featured';
  const isDirectoryHorizontal = !isFeatured && directoryHorizontal;
  const modality = getModalityLabel(specialist);
  const directoryDetails = 'specialties' in specialist ? specialist : null;
  const treatmentAreas = (directoryDetails?.specialties.length
    ? directoryDetails.specialties
    : specialist.specialization.toLowerCase() === 'general'
      ? []
      : [specialist.specialization]
  ).map(translateSpecialty);
  const hasVisibleReviews = specialist.rating !== null
    && specialist.reviewCount !== null
    && specialist.reviewCount > 0;
  const reviewSummary = specialist.reviewCount === null
    ? 'Valoraciones no públicas'
    : hasVisibleReviews
      ? `${specialist.rating?.toFixed(1)} · ${specialist.reviewCount} ${specialist.reviewCount === 1 ? 'reseña' : 'reseñas'}`
      : 'Aún sin reseñas';
  const experience = specialist.yearsInPractice && specialist.yearsInPractice > 0
    ? `${specialist.yearsInPractice} ${specialist.yearsInPractice === 1 ? 'año' : 'años'} de experiencia`
    : null;

  const portrait = specialist.avatar ? (
    <Image
      source={{ uri: specialist.avatar }}
      style={styles.portrait}
      resizeMode="cover"
      accessibilityLabel={`Retrato de ${specialist.name}`}
    />
  ) : (
    <LinearGradient colors={colors} style={[styles.portrait, styles.portraitFallback]}>
      <Text style={[styles.initials, { fontFamily: theme.fontDisplay }]}>{getInitials(specialist.name)}</Text>
    </LinearGradient>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir el perfil de ${specialist.name}`}
      hoverLift
      pressScale={0.98}
      style={[
        isFeatured ? styles.featuredCard : styles.directoryCard,
        isDirectoryHorizontal && styles.directoryCardHorizontal,
        !isFeatured && {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          shadowColor: theme.shadowCard,
        },
        style,
      ]}
    >
      <View
        style={[
          isFeatured ? styles.featuredMedia : styles.directoryMedia,
          isDirectoryHorizontal && styles.directoryMediaHorizontal,
        ]}
      >
        {portrait}
        {isFeatured ? (
          <LinearGradient
            colors={['transparent', 'rgba(16, 27, 23, 0.78)']}
            locations={[0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>

      {isFeatured ? (
        <>
          <View style={styles.featuredArrow}>
            <Ionicons name="arrow-forward" size={15} color={theme.primaryDark} />
          </View>
          <View style={styles.featuredContent}>
            <Text style={[styles.featuredName, { color: '#FFFFFF', fontFamily: theme.fontSansBold }]} numberOfLines={1}>
              {specialist.name}
            </Text>
            <View style={styles.featuredReviewRow}>
              <Ionicons
                name={hasVisibleReviews ? 'star' : 'star-outline'}
                size={12}
                color={hasVisibleReviews ? theme.starRating : 'rgba(255, 255, 255, 0.82)'}
              />
              <Text style={[styles.featuredReviewText, { color: 'rgba(255, 255, 255, 0.9)', fontFamily: theme.fontSansMedium }]} numberOfLines={1}>
                {reviewSummary}
              </Text>
            </View>
            <Text style={[styles.featuredPrice, { color: '#FFFFFF', fontFamily: theme.fontSansBold }]}>{formatPrice(specialist.pricePerSession)} €</Text>
          </View>
        </>
      ) : (
        <View style={[styles.directoryContent, isDirectoryHorizontal && styles.directoryContentHorizontal]}>
          <View style={styles.directoryIdentityRow}>
            <View style={styles.directoryIdentity}>
              <View style={styles.directoryNameRow}>
                <Text style={[styles.directoryName, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]} numberOfLines={1}>
                  {specialist.name}
                </Text>
                <View style={[styles.directoryVerification, { backgroundColor: theme.successBg }]}>
                  <Ionicons name="shield-checkmark" size={12} color={theme.success} />
                  <Text style={[styles.directoryVerificationText, { color: theme.success, fontFamily: theme.fontSansSemiBold }]}>Verificado</Text>
                </View>
              </View>
              <View style={styles.directoryCredentialRow}>
                <Text style={[styles.directoryType, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]} numberOfLines={1}>
                  {specialist.professionalTypeLabel}
                </Text>
                {directoryDetails?.collegiateNumber ? (
                  <Text style={[styles.directoryCollegiate, { color: theme.textMuted, fontFamily: theme.fontSans }]} numberOfLines={1}>
                    Col. Nº {directoryDetails.collegiateNumber}
                  </Text>
                ) : null}
              </View>
            </View>
            {isDirectoryHorizontal ? (
              <View style={[styles.directoryAction, { backgroundColor: theme.primaryAlpha12 }]}>
                <Text style={[styles.directoryActionText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>Ver perfil</Text>
                <Ionicons name="arrow-forward" size={15} color={theme.primary} />
              </View>
            ) : null}
          </View>

          <View style={styles.directoryFactsRow}>
            {experience ? (
              <View style={styles.directoryFact}>
                <Ionicons name="briefcase-outline" size={14} color={theme.primary} />
                <Text style={[styles.directoryFactText, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>{experience}</Text>
              </View>
            ) : null}
            <View style={styles.directoryRatingGroup}>
              <View style={styles.directoryStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={hasVisibleReviews && (directoryDetails?.rating ?? 0) >= star - 0.25 ? 'star' : 'star-outline'}
                    size={13}
                    color={hasVisibleReviews ? theme.starRating : theme.border}
                  />
                ))}
              </View>
              <Text style={[styles.directoryRatingText, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>
                {reviewSummary}
              </Text>
            </View>
          </View>

          {treatmentAreas.length > 0 ? (
            <View style={styles.directoryTreatments}>
              <Text style={[styles.directoryTreatmentsLabel, { color: theme.textMuted, fontFamily: theme.fontSansMedium }]}>Áreas de acompañamiento</Text>
              <View style={styles.directoryTreatmentChips}>
                {treatmentAreas.map((area) => (
                  <View key={area} style={[styles.directoryTreatmentChip, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 }]}>
                    <Text style={[styles.directoryTreatmentText, { color: theme.textPrimary, fontFamily: theme.fontSansMedium }]} numberOfLines={1}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.directoryMetaRow}>
            <View style={styles.directoryMetaItem}>
              <Ionicons name="videocam-outline" size={14} color={theme.primary} />
              <Text style={[styles.directoryMetaText, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]} numberOfLines={1}>{modality}</Text>
            </View>
            <Text style={[styles.directoryPrice, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>Desde {formatPrice(specialist.pricePerSession)} € / sesión</Text>
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  featuredCard: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    minWidth: 0,
  },
  featuredMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  portrait: {
    width: '100%',
    height: '100%',
  },
  portraitFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  featuredContent: {
    position: 'absolute',
    left: 14,
    right: 12,
    bottom: 12,
  },
  featuredName: {
    fontSize: 16,
    lineHeight: 20,
  },
  featuredReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  featuredReviewText: {
    flex: 1,
    fontSize: 10,
  },
  featuredArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 253, 248, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPrice: {
    fontSize: 11,
    marginTop: 5,
  },
  directoryCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  directoryCardHorizontal: {
    flexDirection: 'row',
    minHeight: 216,
  },
  directoryMedia: {
    aspectRatio: 1,
  },
  directoryMediaHorizontal: {
    width: 216,
    flexShrink: 0,
  },
  directoryContent: {
    padding: 18,
  },
  directoryContentHorizontal: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 22,
    paddingVertical: 17,
  },
  directoryIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  directoryIdentity: {
    flex: 1,
    minWidth: 0,
  },
  directoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  directoryCredentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 3,
  },
  directoryVerification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  directoryVerificationText: {
    fontSize: 10,
  },
  directoryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  directoryActionText: {
    fontSize: 11,
  },
  directoryName: {
    fontSize: 19,
    lineHeight: 24,
  },
  directoryType: {
    fontSize: 13,
  },
  directoryCollegiate: {
    fontSize: 12,
  },
  directoryFactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 13,
  },
  directoryFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  directoryFactText: {
    fontSize: 12,
  },
  directoryRatingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  directoryStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  directoryRatingText: {
    fontSize: 12,
  },
  directoryTreatments: {
    marginTop: 13,
  },
  directoryTreatmentsLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  directoryTreatmentChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  directoryTreatmentChip: {
    maxWidth: 170,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  directoryTreatmentText: {
    fontSize: 11,
  },
  directoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 12,
  },
  directoryMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  directoryMetaText: {
    flex: 1,
    fontSize: 11,
  },
  directoryPrice: {
    fontSize: 13,
  },
});
