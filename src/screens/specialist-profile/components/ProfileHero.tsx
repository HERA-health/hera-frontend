import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ProfileHeroProps } from '../types';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { APPROACH_TRANSLATIONS } from './AboutSection';

export const SPECIALTY_TRANSLATIONS: Record<string, string> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  'self-esteem': 'Autoestima',
  stress: 'Estrés laboral',
  relationships: 'Relaciones',
  sleep: 'Problemas de sueño',
  phobias: 'Fobias',
  trauma: 'Trauma',
  couples: 'Terapia de pareja',
  grief: 'Duelo',
  addiction: 'Adicciones',
  eating: 'Trastornos alimentarios',
};

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  specialist,
  onRatingPress,
  gradientColors,
  bio,
  personalMotto,
  therapeuticApproach,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const isDesktop = width >= 768;
  const isMobile = width < 600;
  const avatarSize = isDesktop ? 120 : 96;
  const offersOnline = specialist.offersOnline ?? true;
  const offersInPerson = specialist.offersInPerson ?? false;

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <View style={styles.contentContainer}>
        <View style={[styles.mainRow, isMobile && styles.mainRowMobile]}>
          <View style={[styles.avatarWrapper, { marginTop: isDesktop ? -60 : -48 }]}>
            <View style={[styles.avatarRing, { width: avatarSize, height: avatarSize }]}>
              {specialist.avatar ? (
                <Image source={{ uri: specialist.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: gradientColors[0] }]}>
                  <Text style={styles.avatarInitial}>{specialist.name[0]}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.infoBlock, isMobile && styles.infoBlockMobile]}>
            <View style={[styles.titleRow, isMobile && styles.titleRowMobile]}>
              <Text style={[styles.nameText, isMobile && styles.nameTextMobile]} numberOfLines={2}>
                {specialist.name}
              </Text>

              {specialist.verificationStatus === 'VERIFIED' && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                  <Text style={styles.verifiedText}>
                    Verificada {specialist.collegiateNumber ? `· Col. ${specialist.collegiateNumber}` : ''}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.titleText, isMobile && styles.titleTextMobile]}>{specialist.title}</Text>

            <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
              {specialist.reviewCount > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.statItem, pressed && styles.statItemPressed]}
                  onPress={onRatingPress}
                >
                  <Ionicons name="star" size={16} color={theme.warning} />
                  <Text style={styles.statValue}>{specialist.rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>({specialist.reviewCount} reseñas)</Text>
                </Pressable>
              )}

              {specialist.yearsInPractice != null && specialist.yearsInPractice > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="briefcase-outline" size={16} color={theme.textSecondary} />
                  <Text style={styles.statLabel}>{specialist.yearsInPractice} años de experiencia</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {specialist.specializations.length > 0 && (
          <View style={[styles.tagsContainer, isMobile && styles.tagsContainerMobile]}>
            {specialist.specializations.slice(0, 4).map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.tagBadge}>
                <Text style={styles.tagText}>
                  {SPECIALTY_TRANSLATIONS[tag.toLowerCase()] || tag}
                </Text>
              </View>
            ))}
            {specialist.specializations.length > 4 && (
              <View style={[styles.tagBadge, styles.tagBadgeMore]}>
                <Text style={styles.tagTextMore}>+{specialist.specializations.length - 4} más</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <View style={[styles.modalityContainer, isMobile && styles.modalityContainerMobile]}>
          {offersOnline && (
            <View style={styles.modalityBadge}>
              <Ionicons name="videocam-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.modalityText}>Videollamada</Text>
            </View>
          )}
          {offersInPerson && (
            <View style={styles.modalityBadge}>
              <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.modalityText}>Presencial</Text>
            </View>
          )}
          {specialist.nextAvailable && (
            <View style={[styles.availableBadge, isMobile && styles.availableBadgeMobile]}>
              <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.availableText}>
                {'Próxima cita: ' + new Date(specialist.nextAvailable).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>

        {(bio || personalMotto) ? (
          <>
            <View style={styles.bioDivider} />
            <View style={styles.bioSection}>
              <Text style={styles.bioTitle}>Sobre mí</Text>
              {personalMotto ? <Text style={styles.mottoText}>"{personalMotto}"</Text> : null}
              {bio ? (
                <View style={styles.bioContent}>
                  {bio.split('\n\n').map((paragraph, index) => (
                    <Text key={index} style={styles.bioText}>{paragraph}</Text>
                  ))}
                </View>
              ) : null}
              {therapeuticApproach ? (
                <View style={styles.approachContainer}>
                  <Text style={styles.approachLabel}>Enfoque terapéutico</Text>
                  <Text style={styles.approachText}>
                    {therapeuticApproach
                      .split(',')
                      .map((item) => {
                        const key = item.trim().toLowerCase();
                        return APPROACH_TRANSLATIONS[key] || item.trim();
                      })
                      .join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    shadowColor: theme.shadowCard,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 3,
  },
  headerGradient: {
    height: 110,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  mainRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    borderRadius: borderRadius.xl,
    backgroundColor: theme.bgCard,
    padding: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: 'bold',
    color: theme.textOnPrimary,
    fontSize: 36,
  },
  infoBlock: {
    flex: 1,
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  infoBlockMobile: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 4,
  },
  titleRowMobile: {
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  nameTextMobile: {
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.successBg : theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.successLight,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.success,
  },
  titleText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  titleTextMobile: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statsRowMobile: {
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemPressed: {
    opacity: 0.72,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tagsContainerMobile: {
    justifyContent: 'center',
  },
  tagBadge: {
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  tagBadgeMore: {
    backgroundColor: theme.primaryLight,
    borderWidth: 0,
  },
  tagTextMore: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: theme.borderLight,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  modalityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  modalityContainerMobile: {
    justifyContent: 'center',
  },
  modalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modalityText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  availableBadgeMobile: {
    marginLeft: 0,
    width: '100%',
    justifyContent: 'center',
  },
  availableText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  bioDivider: {
    height: 1,
    backgroundColor: theme.borderLight,
    marginTop: spacing.lg,
  },
  bioSection: {
    paddingTop: spacing.md,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: spacing.sm,
  },
  mottoText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: theme.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
    flexShrink: 1,
  },
  bioContent: {
    gap: spacing.sm,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.textPrimary,
    flexShrink: 1,
  },
  approachContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  approachLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  approachText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.textPrimary,
    flexShrink: 1,
  },
});

export default ProfileHero;
