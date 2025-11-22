/**
 * HomeScreen - Completely Modernized
 * Modern hero section with trust indicators, testimonials, and premium design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { useNavigation } from '@react-navigation/native';
import { BrandText } from '../../components/common/BrandText';
import { BrandIcon } from '../../components/common/BrandIcon';
import { getMatchedSpecialists, SpecialistData } from '../../services/specialistsService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [topSpecialists, setTopSpecialists] = useState<SpecialistData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch questionnaire status and matched specialists on mount
  useEffect(() => {
    const fetchQuestionnaireStatus = async () => {
      // Only fetch if user is authenticated
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMatchedSpecialists();
        setHasCompletedQuestionnaire(response.hasCompletedQuestionnaire);

        // Get top 3 specialists
        if (response.hasCompletedQuestionnaire && response.specialists.length > 0) {
          setTopSpecialists(response.specialists.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching questionnaire status:', error);
        // If error, assume not completed
        setHasCompletedQuestionnaire(false);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaireStatus();
  }, [user]);

  const stats = [
    { icon: 'people', value: '500+', label: 'Psicólogos' },
    { icon: 'star', value: '4.8', label: 'Valoración' },
    { icon: 'checkmark-circle', value: '10k+', label: 'Sesiones' },
  ];

  const features = [
    {
      icon: 'sync',
      title: 'Matching Inteligente',
      description: 'Algoritmo avanzado que te conecta con el profesional ideal según tu perfil',
      color: colors.primary.main,
      bgColor: colors.primary[100],
    },
    {
      icon: 'shield-checkmark',
      title: 'Sesiones Seguras',
      description: 'Videoconferencia encriptada con protección de datos y cancelación flexible',
      color: colors.secondary.blue,
      bgColor: colors.background.blue,
    },
    {
      icon: 'ribbon',
      title: 'Profesionales Verificados',
      description: 'Todos los especialistas están certificados y cuentan con experiencia comprobada',
      color: colors.secondary.purple,
      bgColor: colors.background.purple,
    },
  ];

  const testimonials = [
    {
      name: 'María S.',
      text: 'Encontré al psicólogo perfecto en mi primera búsqueda. El algoritmo realmente funciona.',
      rating: 5,
    },
    {
      name: 'Carlos R.',
      text: 'La plataforma es intuitiva y los profesionales son excelentes. Muy recomendable.',
      rating: 5,
    },
  ];

  // Helper function to calculate affinity percentage
  const getAffinityPercentage = (affinity?: number): number => {
    if (!affinity) return 0;
    return Math.round((affinity / 130) * 100);
  };

  // Helper function to get specialist initial
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Render individual podium card - compact horizontal version
  const renderPodiumCard = (specialist: SpecialistData, position: number) => {
    const medals = ['🥇', '🥈', '🥉'];
    const affinityPercentage = getAffinityPercentage(specialist.affinity);

    return (
      <TouchableOpacity
        key={specialist.id}
        onPress={() => navigation.navigate('SpecialistDetail', { specialistId: specialist.id })}
        activeOpacity={0.85}
        style={[styles.podiumCard, position === 0 && styles.podiumCardFirst]}
      >
        {/* Medal and Percentage Header */}
        <View style={styles.podiumHeader}>
          <Text style={styles.medalIcon}>{medals[position]}</Text>
          <BrandText style={styles.podiumPercentage}>{affinityPercentage}%</BrandText>
        </View>

        {/* Avatar */}
        <View style={styles.podiumAvatarContainer}>
          {specialist.avatar ? (
            <Image source={{ uri: specialist.avatar }} style={styles.podiumAvatar} />
          ) : (
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              style={styles.podiumAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.podiumAvatarText}>{getInitial(specialist.user.name)}</Text>
            </LinearGradient>
          )}
          {specialist.firstVisitFree && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Gratis</Text>
            </View>
          )}
        </View>

        {/* Specialist Info */}
        <View style={styles.podiumInfo}>
          <Text style={styles.podiumName} numberOfLines={1}>{specialist.user.name}</Text>
          <Text style={styles.podiumSpecialty} numberOfLines={2}>{specialist.specialization}</Text>

          {/* Stats Row */}
          <View style={styles.podiumStats}>
            <View style={styles.podiumStat}>
              <Ionicons name="star" size={14} color={colors.secondary.orange} />
              <Text style={styles.podiumStatText}>{specialist.rating}</Text>
            </View>
            <View style={styles.podiumStat}>
              <Ionicons name="cash-outline" size={14} color={colors.primary.main} />
              <Text style={styles.podiumStatText}>€{specialist.pricePerSession}</Text>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.podiumButton}>
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              style={styles.podiumButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.podiumButtonText}>Ver Perfil</Text>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render podium section for users who completed questionnaire
  const renderPodium = () => {
    // Safety check: ensure data exists
    if (!topSpecialists || topSpecialists.length === 0) {
      return null;
    }

    return (
      <View style={styles.podiumSection}>
        <BrandText style={styles.podiumTitle}>Tus Mejores Matches</BrandText>
        <Text style={styles.podiumSubtitle}>
          Basado en tu cuestionario, estos son tus especialistas más compatibles
        </Text>

        {/* Horizontal Row of Compact Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.podiumCardsContainer}
          style={styles.podiumScrollView}
        >
          {topSpecialists.map((specialist, index) => {
            // Safety check: ensure specialist data exists
            if (!specialist || !specialist.user) {
              return null;
            }
            return renderPodiumCard(specialist, index);
          })}
        </ScrollView>

        {/* View All Button */}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Specialists')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2196F3', '#00897B']}
            style={styles.viewAllGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.viewAllText}>Ver todos mis matches</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section - Conditional rendering based on questionnaire status */}
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.neutral.white} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : hasCompletedQuestionnaire ? (
          /* Show podium for users who completed questionnaire */
          renderPodium()
        ) : (
          /* Show CTA for users who haven't completed questionnaire */
          <>
            {/* Floating badge */}
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary.main} />
              <Text style={styles.badgeText}>Plataforma líder en bienestar mental</Text>
            </View>

            {/* Main heading with emphasis */}
            <Text style={styles.heroTitle}>
              Encuentra el{'\n'}
              <BrandText style={styles.heroTitleAccent}>especialista perfecto</BrandText>
              {'\n'}para ti
            </Text>

            <Text style={styles.heroSubtitle}>
              Nuestro algoritmo de afinidad conecta a usuarios con psicólogos basándose en personalidad, valores y necesidades específicas.
            </Text>

            {/* CTA Button - More prominent */}
            <TouchableOpacity
              style={styles.ctaButtonWrapper}
              onPress={() => navigation.navigate('Questionnaire')}
              activeOpacity={0.9}
            >
              <View style={styles.ctaButton}>
                <BrandIcon name="heart" size={24} />
                <Text style={styles.ctaText}>Comenzar Cuestionario</Text>
                <BrandIcon name="arrow-forward" size={20} />
              </View>
            </TouchableOpacity>

            <View style={styles.heroInfo}>
              <Ionicons name="time-outline" size={16} color={colors.neutral.white} />
              <Text style={styles.heroInfoText}>Solo 5 minutos • Totalmente gratuito</Text>
            </View>
          </>
        )}

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
      </LinearGradient>

      {/* Stats Section - Trust indicators */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <BrandIcon name={stat.icon as any} size={24} />
            </View>
            <BrandText style={styles.statValue}>{stat.value}</BrandText>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Why HERA section */}
      <View style={styles.section}>
        <BrandText style={styles.sectionTitle}>¿Por qué elegir HERA?</BrandText>
        <Text style={styles.sectionSubtitle}>
          Tu bienestar mental es nuestra prioridad
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureCard}
              activeOpacity={0.95}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: feature.bgColor }]}>
                <BrandIcon name={feature.icon as any} size={32} />
              </View>
              <BrandText style={styles.featureTitle}>{feature.title}</BrandText>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Testimonials section */}
      <View style={styles.section}>
        <BrandText style={styles.sectionTitle}>Lo que dicen nuestros usuarios</BrandText>
        <View style={styles.testimonialsContainer}>
          {testimonials.map((testimonial, index) => (
            <View key={index} style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.testimonialAvatar}
                >
                  <Text style={styles.testimonialAvatarText}>
                    {testimonial.name.charAt(0)}
                  </Text>
                </LinearGradient>
                <View style={styles.testimonialInfo}>
                  <Text style={styles.testimonialName}>{testimonial.name}</Text>
                  <View style={styles.testimonialRating}>
                    {Array(testimonial.rating).fill(0).map((_, i) => (
                      <Ionicons key={i} name="star" size={14} color={colors.secondary.orange} />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Final CTA */}
      <View style={styles.finalCta}>
        <BrandText style={styles.finalCtaTitle}>¿Listo para comenzar?</BrandText>
        <Text style={styles.finalCtaSubtitle}>
          Da el primer paso hacia tu bienestar mental
        </Text>
        <Button
          variant="primary"
          size="large"
          onPress={() => navigation.navigate('Questionnaire')}
        >
          Iniciar ahora
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 1.5,
    paddingBottom: spacing.xxxl * 2,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.xl,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.neutral.white,
    lineHeight: 48,
    marginBottom: spacing.md,
  },
  heroTitleAccent: {
    color: '#81D4FA', // Light blue that works well with blue-green gradient
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.neutral.white,
    opacity: 0.95,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  ctaButtonWrapper: {
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.neutral.white,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.main,
  },
  heroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  heroInfoText: {
    fontSize: 14,
    color: colors.neutral.white,
    opacity: 0.9,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xxxl,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.gray900,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.neutral.gray600,
    marginBottom: spacing.xl,
  },
  featuresGrid: {
    gap: spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  featureIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 15,
    color: colors.neutral.gray600,
    lineHeight: 22,
  },
  testimonialsContainer: {
    gap: spacing.md,
  },
  testimonialCard: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 16,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testimonialAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: 2,
  },
  testimonialRating: {
    flexDirection: 'row',
    gap: 2,
  },
  testimonialText: {
    fontSize: 14,
    color: colors.neutral.gray700,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  finalCta: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    backgroundColor: colors.primary[50],
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  finalCtaSubtitle: {
    fontSize: 16,
    color: colors.neutral.gray600,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  // Loading state
  loadingContainer: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  // Podium styles - Compact horizontal layout
  podiumSection: {
    paddingVertical: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  podiumTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  podiumSubtitle: {
    fontSize: 15,
    color: colors.neutral.white,
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  podiumCardsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'center', // Center cards horizontally
    alignItems: 'center',
    flexGrow: 1, // Allow container to grow and enable centering
    minWidth: '100%', // Ensure full width on larger screens
  },
  podiumScrollView: {
    width: '100%',
  },
  // Compact podium card
  podiumCard: {
    width: 260,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  podiumCardFirst: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowOpacity: 0.25,
    elevation: 8,
  },
  // Card header
  podiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  medalIcon: {
    fontSize: 32,
  },
  podiumPercentage: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.gray900,
  },
  // Avatar
  podiumAvatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  podiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  freeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.feedback.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  // Specialist info
  podiumInfo: {
    width: '100%',
    alignItems: 'center',
  },
  podiumName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.gray900,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumSpecialty: {
    fontSize: 13,
    color: colors.neutral.gray600,
    marginBottom: spacing.sm,
    textAlign: 'center',
    minHeight: 32,
  },
  // Stats row
  podiumStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  podiumStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  podiumStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  // CTA Button
  podiumButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  podiumButtonGradient: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  viewAllButton: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
