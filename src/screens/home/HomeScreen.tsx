/**
 * HomeScreen - Completely Modernized
 * Modern hero section with trust indicators, testimonials, and premium design
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { useNavigation } from '@react-navigation/native';
import { BrandText } from '../../components/common/BrandText';
import { BrandIcon } from '../../components/common/BrandIcon';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<any>();

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section - Modern gradient with floating elements */}
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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

      {/* Why MindConnect section */}
      <View style={styles.section}>
        <BrandText style={styles.sectionTitle}>¿Por qué elegir MindConnect?</BrandText>
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
});
