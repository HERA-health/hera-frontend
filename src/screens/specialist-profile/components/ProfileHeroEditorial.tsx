import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { borderRadius, spacing } from '../../../constants/colors';
import { getProfessionalTypeLabel } from '../../../constants/professionalTypes';
import { translateSpecialty } from '../../../constants/specialties';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  getCloudinaryProfileImageUrl,
  getProfileLanguageItems,
  type ProfileLanguageFlag,
} from '../profilePresentation';
import type { ProfileHeroProps } from '../types';
import { APPROACH_TRANSLATIONS } from './AboutSection';

const IconAction: React.FC<{
  accessibilityLabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}> = ({ accessibilityLabel, icon, active = false, disabled = false, onPress }) => {
  const { theme } = useTheme();

  if (!onPress) return null;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.primaryAlpha12 : theme.bgCard,
          borderWidth: 1,
          borderColor: active ? theme.primary : theme.borderLight,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={active ? theme.primary : theme.textPrimary}
      />
    </Pressable>
  );
};

interface FlagSegment {
  color: string;
  flex?: number;
}

const getFlagSegments = (flag: ProfileLanguageFlag): {
  direction: 'row' | 'column';
  segments: FlagSegment[];
} | null => {
  switch (flag) {
    case 'spain':
      return {
        direction: 'column',
        segments: [
          { color: '#AA151B', flex: 1 },
          { color: '#F1BF00', flex: 2 },
          { color: '#AA151B', flex: 1 },
        ],
      };
    case 'catalonia':
      return {
        direction: 'column',
        segments: Array.from({ length: 9 }, (_, index) => ({
          color: index % 2 === 0 ? '#FCDD09' : '#DA121A',
        })),
      };
    case 'france':
      return {
        direction: 'row',
        segments: [{ color: '#0055A4' }, { color: '#FFFFFF' }, { color: '#EF4135' }],
      };
    case 'germany':
      return {
        direction: 'column',
        segments: [{ color: '#171717' }, { color: '#DD0000' }, { color: '#FFCE00' }],
      };
    case 'portugal':
      return {
        direction: 'row',
        segments: [{ color: '#046A38', flex: 2 }, { color: '#DA291C', flex: 3 }],
      };
    case 'italy':
      return {
        direction: 'row',
        segments: [{ color: '#009246' }, { color: '#FFFFFF' }, { color: '#CE2B37' }],
      };
    default:
      return null;
  }
};

const LanguageFlagVisual: React.FC<{
  flag: ProfileLanguageFlag;
  language: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({ flag, language, styles, theme }) => {
  if (flag === 'international') {
    return (
      <View
        accessible
        accessibilityLabel={`Idioma ${language}`}
        style={[styles.flagFrame, styles.flagFallback]}
      >
        <Ionicons name="globe-outline" size={13} color={theme.primary} />
      </View>
    );
  }

  if (flag === 'united-kingdom') {
    return (
      <View
        accessible
        accessibilityLabel={`Bandera asociada a ${language}`}
        style={[styles.flagFrame, styles.flagUnitedKingdom]}
      >
        <View style={styles.flagUkWhiteHorizontal} />
        <View style={styles.flagUkWhiteVertical} />
        <View style={styles.flagUkRedHorizontal} />
        <View style={styles.flagUkRedVertical} />
      </View>
    );
  }

  const config = getFlagSegments(flag);
  if (!config) return null;

  return (
    <View
      accessible
      accessibilityLabel={`Bandera asociada a ${language}`}
      style={[
        styles.flagFrame,
        config.direction === 'row' ? styles.flagRow : styles.flagColumn,
      ]}
    >
      {config.segments.map((segment, index) => (
        <View
          key={`${flag}-${index}`}
          style={{ backgroundColor: segment.color, flex: segment.flex ?? 1 }}
        />
      ))}
    </View>
  );
};

export const ProfileHeroEditorial: React.FC<ProfileHeroProps> = ({
  specialist,
  onRatingPress,
  onSharePress,
  bio,
  therapeuticApproach,
  isFavorite = false,
  favoriteLoading = false,
  onFavoritePress,
  showFavoriteAction = false,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const horizontal = width >= 768;
  const languageItems = getProfileLanguageItems(specialist);
  const translatedSpecializations = specialist.specializations.map(translateSpecialty);
  const displayTitle = getProfessionalTypeLabel(
    specialist.professionalType,
    specialist.professionalTypeLabel,
  );
  const imageUrl = specialist.avatar
    ? getCloudinaryProfileImageUrl(
        specialist.avatar,
        horizontal ? 600 : 900,
        horizontal ? 750 : 675,
      )
    : null;
  const approach = therapeuticApproach
    ?.split(',')
    .map((item) => APPROACH_TRANSLATIONS[item.trim().toLowerCase()] || item.trim())
    .join(', ');
  const showReadMore = (bio?.trim().length ?? 0) > 220;
  const years = specialist.yearsInPractice ?? specialist.experienceYears;
  const verified = specialist.verificationStatus === 'VERIFIED';
  const offersOnline = specialist.offersOnline ?? true;
  const offersInPerson = specialist.offersInPerson ?? false;
  const verificationLabel = specialist.collegiateNumber
    ? `Col. ${specialist.collegiateNumber}`
    : 'Profesional verificada';
  const actionsReserve = showFavoriteAction ? 104 : 54;
  const popoverWidth = horizontal ? 340 : Math.max(260, Math.min(340, width - 64));

  return (
    <View style={styles.card}>
      <View style={[styles.heroTop, horizontal ? styles.heroTopHorizontal : styles.heroTopStacked]}>
        <View style={[styles.photoPane, horizontal ? styles.photoPaneHorizontal : styles.photoPaneStacked]}>
          {imageUrl ? (
            <Image
              accessibilityLabel={`Fotografía de ${specialist.name}`}
              source={{ uri: imageUrl }}
              resizeMode="cover"
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{specialist.name.trim().charAt(0).toUpperCase() || 'H'}</Text>
              <Text style={styles.photoFallback}>Especialista HERA</Text>
            </View>
          )}
        </View>

        <View style={[styles.content, horizontal ? styles.contentHorizontal : styles.contentStacked]}>
          <View style={styles.actionsRow}>
            <IconAction
              accessibilityLabel="Compartir perfil"
              icon="share-social-outline"
              onPress={onSharePress}
            />
            {showFavoriteAction ? (
              <IconAction
                accessibilityLabel={isFavorite ? 'Quitar de guardados' : 'Guardar perfil'}
                icon={isFavorite ? 'heart' : 'heart-outline'}
                active={isFavorite}
                disabled={favoriteLoading}
                onPress={onFavoritePress}
              />
            ) : null}
          </View>

          <View style={[styles.identity, { paddingRight: actionsReserve }]}>
            <Text style={styles.name} numberOfLines={3}>{specialist.name}</Text>
            <Text style={styles.profession}>{displayTitle}</Text>
            {years != null && years > 0 ? (
              <View style={styles.experienceRow}>
                <Ionicons name="briefcase-outline" size={15} color={theme.primary} />
                <Text style={styles.experienceText}>{years} años de experiencia</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.trustRow}>
            {verified ? (
              <View style={[styles.verificationAnchor, verificationExpanded && styles.verificationAnchorOpen]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: verificationExpanded }}
                  accessibilityLabel={`${verificationLabel}. Ver información de verificación`}
                  onPress={() => setVerificationExpanded((current) => !current)}
                  style={({ pressed }) => [styles.verifiedBadge, pressed && styles.pressed]}
                >
                  <Ionicons name="shield-checkmark-outline" size={15} color={theme.success} />
                  <Text style={styles.verifiedText}>{verificationLabel}</Text>
                  <Ionicons
                    name={verificationExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={theme.success}
                  />
                </Pressable>

                {verificationExpanded ? (
                  <View
                    testID="verification-popover"
                    style={[styles.verificationPopover, { width: popoverWidth }]}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
                    <View style={styles.verificationCopy}>
                      <Text style={styles.verificationTitle}>Colegiación revisada por HERA</Text>
                      <Text style={styles.verificationText}>
                        Hemos comprobado el número y el carnet profesional aportado.
                      </Text>
                      {specialist.collegiateNumber ? (
                        <Text style={styles.collegiateNumber}>N.º de colegiado: {specialist.collegiateNumber}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {specialist.reviewCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRatingPress}
                style={({ pressed }) => [styles.rating, pressed && styles.pressed]}
              >
                <Ionicons name="star" size={15} color={theme.warning} />
                <Text style={styles.ratingValue}>{specialist.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>
                  {specialist.reviewCount} {specialist.reviewCount === 1 ? 'opinión' : 'opiniones'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {(bio || approach) ? (
            <View style={styles.aboutBlock}>
              {bio ? (
                <>
                  <Text style={styles.sectionLabel}>Sobre mí</Text>
                  <Text
                    style={styles.bio}
                    numberOfLines={bioExpanded ? undefined : 3}
                  >
                    {bio.trim()}
                  </Text>
                  {showReadMore ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setBioExpanded((current) => !current)}
                      style={({ pressed }) => [styles.readMore, pressed && styles.pressed]}
                    >
                      <Text style={styles.readMoreText}>{bioExpanded ? 'Leer menos' : 'Leer más'}</Text>
                      <Ionicons
                        name={bioExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={theme.primary}
                      />
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              {approach ? (
                <View style={[styles.approach, !bio && styles.approachWithoutBio]}>
                  <Text style={styles.approachLabel}>Enfoque terapéutico</Text>
                  <Text style={styles.approachValue}>{approach}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.factsStrip, horizontal ? styles.factsStripHorizontal : styles.factsStripStacked]}>
        {languageItems.length > 0 ? (
          <View
            testID="profile-facts-languages"
            style={[
              styles.factGroup,
              styles.languagesGroup,
              !horizontal && styles.factGroupStacked,
            ]}
          >
            <Text style={styles.factLabel}>Idiomas</Text>
            <View style={styles.factItems}>
              {languageItems.map((language) => (
                <View key={language.label} style={styles.factItem}>
                  <LanguageFlagVisual
                    flag={language.flag}
                    language={language.label}
                    styles={styles}
                    theme={theme}
                  />
                  <Text style={styles.factValue}>{language.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {(offersOnline || offersInPerson) ? (
          <View
            testID="profile-facts-modality"
            style={[
              styles.factGroup,
              styles.modalityGroup,
              !horizontal && styles.factGroupStacked,
            ]}
          >
            <Text style={styles.factLabel}>Modalidad</Text>
            <View style={styles.factItems}>
              {offersOnline ? (
                <View style={styles.factItem}>
                  <Ionicons name="videocam-outline" size={17} color={theme.primary} />
                  <Text style={styles.factValue}>Videollamada</Text>
                </View>
              ) : null}
              {offersInPerson ? (
                <View style={styles.factItem}>
                  <Ionicons name="business-outline" size={17} color={theme.primary} />
                  <Text style={styles.factValue}>Presencial</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {translatedSpecializations.length > 0 ? (
          <View
            testID="profile-facts-specializations"
            style={[
              styles.factGroup,
              styles.specializationsGroup,
              !horizontal && styles.factGroupStacked,
            ]}
          >
            <Text style={styles.factLabel}>Áreas principales</Text>
            <View style={styles.tags}>
              {translatedSpecializations.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.bgCard,
  },
  heroTop: {
    width: '100%',
    zIndex: 2,
  },
  heroTopHorizontal: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroTopStacked: {
    flexDirection: 'column',
  },
  photoPane: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: isDark ? theme.bgElevated : theme.primaryMuted,
  },
  photoPaneHorizontal: {
    width: '36%',
    maxWidth: 300,
    minHeight: 360,
    alignSelf: 'stretch',
  },
  photoPaneStacked: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 340,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryAlpha12,
    gap: spacing.xs,
  },
  photoInitial: {
    fontSize: 68,
    lineHeight: 80,
    fontFamily: theme.fontHeading,
    color: theme.primary,
  },
  photoFallback: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textSecondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    zIndex: 3,
  },
  contentHorizontal: {
    padding: spacing.xl,
  },
  contentStacked: {
    padding: spacing.lg,
  },
  actionsRow: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 5,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  identity: {
    minWidth: 0,
  },
  name: {
    fontSize: 34,
    lineHeight: 43,
    fontFamily: theme.fontHeading,
    color: theme.textPrimary,
  },
  profession: {
    marginTop: 1,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.fontSansMedium,
    color: theme.textSecondary,
  },
  experienceRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  experienceText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSansMedium,
    color: theme.textSecondary,
  },
  trustRow: {
    marginTop: spacing.md,
    minHeight: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 20,
  },
  verificationAnchor: {
    position: 'relative',
    zIndex: 1,
  },
  verificationAnchorOpen: {
    zIndex: 30,
  },
  verifiedBadge: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.successLight,
    backgroundColor: theme.successBg,
  },
  verifiedText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSansSemiBold,
    color: theme.success,
  },
  verificationPopover: {
    position: 'absolute',
    top: 46,
    left: 0,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowCard,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.34 : 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
  verificationCopy: {
    flex: 1,
    gap: 3,
  },
  verificationTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
  },
  verificationText: {
    fontSize: 12,
    lineHeight: 19,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
  },
  collegiateNumber: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: theme.fontSansMedium,
    color: theme.textPrimary,
  },
  rating: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  ratingValue: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
  },
  ratingCount: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
  },
  pressed: {
    opacity: 0.72,
  },
  aboutBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    zIndex: 1,
  },
  sectionLabel: {
    marginBottom: 3,
    paddingBottom: 2,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: theme.fontHeading,
    color: theme.textPrimary,
  },
  bio: {
    fontSize: 14,
    lineHeight: 23,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
  },
  readMore: {
    minHeight: 34,
    marginTop: 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fontSansSemiBold,
    color: theme.primary,
  },
  approach: {
    marginTop: spacing.sm,
  },
  approachWithoutBio: {
    marginTop: 0,
  },
  approachLabel: {
    paddingBottom: 1,
    fontSize: 10,
    lineHeight: 17,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  approachValue: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.fontSansMedium,
    color: theme.textPrimary,
  },
  factsStrip: {
    zIndex: 1,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.primaryMuted,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  factsStripHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  factsStripStacked: {
    flexDirection: 'column',
  },
  factGroup: {
    minWidth: 0,
  },
  factGroupStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
  },
  languagesGroup: {
    flexGrow: 1,
    flexBasis: 150,
  },
  modalityGroup: {
    flexGrow: 1,
    flexBasis: 165,
  },
  specializationsGroup: {
    flexGrow: 2,
    flexBasis: 260,
  },
  factLabel: {
    marginBottom: spacing.xs,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: theme.fontSansSemiBold,
    color: isDark ? theme.textMuted : theme.textPrimary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  factItems: {
    gap: 6,
  },
  factItem: {
    minHeight: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  factValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.fontSansMedium,
    color: theme.textPrimary,
  },
  flagFrame: {
    width: 24,
    height: 16,
    overflow: 'hidden',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(24,48,42,0.18)',
    backgroundColor: theme.bgCard,
    position: 'relative',
  },
  flagRow: {
    flexDirection: 'row',
  },
  flagColumn: {
    flexDirection: 'column',
  },
  flagFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagUnitedKingdom: {
    backgroundColor: '#21468B',
  },
  flagUkWhiteHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    height: 6,
    backgroundColor: '#FFFFFF',
  },
  flagUkWhiteVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 8,
    width: 7,
    backgroundColor: '#FFFFFF',
  },
  flagUkRedHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 7,
    height: 2,
    backgroundColor: '#CF142B',
  },
  flagUkRedVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    width: 3,
    backgroundColor: '#CF142B',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.bgCard,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: theme.fontSansMedium,
    color: theme.textPrimary,
  },

});

export default ProfileHeroEditorial;
