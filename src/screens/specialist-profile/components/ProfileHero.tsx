import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ProfileHeroProps } from '../types';
import { colors, heraLanding, spacing, borderRadius } from '../../../constants/colors';
import { APPROACH_TRANSLATIONS } from './AboutSection';

export const SPECIALTY_TRANSLATIONS: Record<string, string> = {
  'anxiety': 'Ansiedad',
  'depression': 'Depresión',
  'self-esteem': 'Autoestima',
  'stress': 'Estrés laboral',
  'relationships': 'Relaciones',
  'sleep': 'Problemas de sueño',
  'phobias': 'Fobias',
  'trauma': 'Trauma',
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
  const [isDesktop, setIsDesktop] = useState(
    () => Dimensions.get('window').width >= 768
  );
  const [isMobile, setIsMobile] = useState(
    () => Dimensions.get('window').width < 600
  );

  useEffect(() => {
    setIsDesktop(width >= 768);
    setIsMobile(width < 600);
  }, [width]);
  
  const avatarSize = isDesktop ? 120 : 96;
  const offersOnline = specialist.offersOnline ?? true;
  const offersInPerson = specialist.offersInPerson ?? false;

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Gradient Fijo */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <View style={styles.contentContainer}>
        <View style={[styles.mainRow, isMobile && styles.mainRowMobile]}>
          
          {/* 2. Avatar con margen negativo independiente */}
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

          {/* 3. Info Block (Sin margen negativo, alineado natural) */}
          <View style={[styles.infoBlock, isMobile && styles.infoBlockMobile]}>
            <View style={[styles.titleRow, isMobile && styles.titleRowMobile]}>
              <Text style={[styles.nameText, isMobile && styles.nameTextMobile]} numberOfLines={2}>
                {specialist.name}
              </Text>
              
              {specialist.verificationStatus === 'VERIFIED' && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={heraLanding.success} />
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
                  <Ionicons name="star" size={16} color={heraLanding.starRating} />
                  <Text style={styles.statValue}>{specialist.rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>({specialist.reviewCount} reseñas)</Text>
                </Pressable>
              )}
              
              {specialist.yearsInPractice != null && specialist.yearsInPractice > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="briefcase-outline" size={16} color={heraLanding.textSecondary} />
                  <Text style={styles.statLabel}>{specialist.yearsInPractice} años de experiencia</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 4. Tags */}
        {specialist.specializations.length > 0 && (
          <View style={[styles.tagsContainer, isMobile && styles.tagsContainerMobile]}>
            {specialist.specializations.slice(0, 4).map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
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

        {/* 5. Modalities */}
        <View style={[styles.modalityContainer, isMobile && styles.modalityContainerMobile]}>
          {offersOnline && (
            <View style={styles.modalityBadge}>
              <Ionicons name="videocam-outline" size={16} color={heraLanding.textSecondary} />
              <Text style={styles.modalityText}>Videollamada</Text>
            </View>
          )}
          {offersInPerson && (
            <View style={styles.modalityBadge}>
              <Ionicons name="business-outline" size={16} color={heraLanding.textSecondary} />
              <Text style={styles.modalityText}>Presencial</Text>
            </View>
          )}
          {specialist.nextAvailable && (
            <View style={[styles.availableBadge, isMobile && styles.availableBadgeMobile]}>
              <Ionicons name="calendar-outline" size={14} color={heraLanding.textSecondary} />
              <Text style={styles.availableText}>
                {'Próxima cita: ' + new Date(specialist.nextAvailable).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>

        {/* 6. Sobre mí — merged bio section */}
        {(bio || personalMotto) ? (
          <>
            <View style={styles.bioDivider} />
            <View style={styles.bioSection}>
              <Text style={styles.bioTitle}>Sobre mí</Text>
              {personalMotto ? (
                <Text style={styles.mottoText}>"{personalMotto}"</Text>
              ) : null}
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
                    {therapeuticApproach.split(',').map(item => {
                      const key = item.trim().toLowerCase();
                      return APPROACH_TRANSLATIONS[key] || item.trim();
                    }).join(', ')}
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

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
    ...Platform.select({
      web: { boxShadow: `0 4px 20px ${heraLanding.shadowColor}` } as any,
      default: { elevation: 3, shadowColor: colors.neutral.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }
    })
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
    alignItems: 'flex-end', // Alinea el texto a la base del avatar
    gap: spacing.lg,
  },
  mainRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    // marginTop se inyecta dinámicamente arriba
  },
  avatarRing: {
    borderRadius: borderRadius.xl,
    backgroundColor: heraLanding.cardBg,
    padding: 6, // Espacio blanco alrededor del avatar
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
    color: heraLanding.cardBg,
    fontSize: 36,
  },
  infoBlock: {
    flex: 1,
    paddingBottom: spacing.xs,
    paddingTop: spacing.md, // Da aire al texto respecto al gradiente
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
    color: heraLanding.textPrimary,
  },
  nameTextMobile: {
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: heraLanding.successLight,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.success,
  },
  titleText: {
    fontSize: 16,
    color: heraLanding.textSecondary,
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
    opacity: 0.7,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: heraLanding.textSecondary,
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
    backgroundColor: heraLanding.background, // Gris clarito pastel
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  tagBadgeMore: {
    backgroundColor: heraLanding.primaryAlpha12,
    borderWidth: 0,
  },
  tagTextMore: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
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
    backgroundColor: heraLanding.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modalityText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
  },
  availableBadgeMobile: {
    marginLeft: 0,
    width: '100%',
    justifyContent: 'center',
  },
  availableText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  bioDivider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginTop: spacing.lg,
  },
  bioSection: {
    paddingTop: spacing.md,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  mottoText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: heraLanding.textSecondary,
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
    color: heraLanding.textPrimary,
    flexShrink: 1,
  },
  approachContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  approachLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  approachText: {
    fontSize: 15,
    lineHeight: 24,
    color: heraLanding.textPrimary,
    flexShrink: 1,
  },
});

export default ProfileHero;
