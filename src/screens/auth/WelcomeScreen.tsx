import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing as defaultSpacing, shadows } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BrandText } from '../../components/common/BrandText';
import { BrandIcon } from '../../components/common/BrandIcon';

// Enhanced spacing system for this screen
const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};

type NavigationProp = NativeStackNavigationProp<any>;

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;
  const isTablet = windowWidth > 600 && windowWidth <= 768;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section with Gradient Background */}
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={48} color="#fff" />
          </View>
        </View>

        {/* Brand Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.appName}>HERA</Text>
          <Text style={styles.appTagline}>Health Era</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Tu nueva era de bienestar mental
        </Text>
      </LinearGradient>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <View style={[
          styles.featuresGrid,
          isDesktop ? styles.featuresGridRow : isTablet ? styles.featuresGrid2x2 : styles.featuresGridColumn
        ]}>
          {/* Feature 1: Matching con IA */}
          <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
            <View style={styles.featureIcon}>
              <BrandIcon name="sync" size={32} />
            </View>
            <BrandText style={styles.featureTitle}>Matching con IA</BrandText>
            <Text style={styles.featureSubtitle}>Algoritmo de afinidad único</Text>
          </View>

          {/* Feature 2: Videollamadas seguras */}
          <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
            <View style={styles.featureIcon}>
              <BrandIcon name="videocam" size={32} />
            </View>
            <BrandText style={styles.featureTitle}>Videollamadas seguras</BrandText>
            <Text style={styles.featureSubtitle}>Sesiones online privadas</Text>
          </View>

          {/* Feature 3: LIA - Asistente 24/7 */}
          <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
            <View style={styles.featureIcon}>
              <BrandIcon name="sparkles" size={32} />
            </View>
            <BrandText style={styles.featureTitle}>LIA - Asistente 24/7</BrandText>
            <Text style={styles.featureSubtitle}>Apoyo emocional inmediato</Text>
          </View>

          {/* Feature 4: 100% Confidencial */}
          <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
            <View style={styles.featureIcon}>
              <BrandIcon name="shield-checkmark" size={32} />
            </View>
            <BrandText style={styles.featureTitle}>100% Confidencial</BrandText>
            <Text style={styles.featureSubtitle}>Privacidad garantizada</Text>
          </View>
        </View>
      </View>

      {/* CTA Section Header */}
      <BrandText style={styles.ctaHeader}>¿Cómo quieres comenzar?</BrandText>

      {/* CTA Cards */}
      <View style={[
        styles.ctaContainer,
        isDesktop ? styles.ctaContainerRow : styles.ctaContainerColumn
      ]}>
        {/* Client Card */}
        <View style={[styles.ctaCard, isDesktop && styles.ctaCardDesktop]}>
          <View style={styles.ctaIconContainer}>
            <BrandIcon name="people" size={40} />
          </View>

          <BrandText style={styles.ctaTitle}>Busco ayuda</BrandText>
          <Text style={styles.ctaSubtitle}>Encuentra el especialista perfecto para ti</Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Matching inteligente con especialistas mediante IA
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Sesiones seguras por videollamada con resúmenes automáticos
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Chat de crisis 24/7 con LIA, tu asistente de apoyo emocional
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Facturación automática y seguimiento completo
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButtonWrapper}
            onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>Busco ayuda</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral.white} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>Encontrar mi especialista</Text>
        </View>

        {/* Professional Card */}
        <View style={[styles.ctaCard, isDesktop && styles.ctaCardDesktop]}>
          <View style={styles.ctaIconContainer}>
            <BrandIcon name="briefcase" size={40} />
          </View>

          <BrandText style={styles.ctaTitle}>Soy especialista</BrandText>
          <Text style={styles.ctaSubtitle}>Únete a nuestra red de especialistas</Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Gestiona tu agenda y pacientes fácilmente
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Resúmenes automáticos con IA de cada sesión
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Facturación automática y pagos seguros
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.bulletText}>
                Publica contenido y construye tu marca personal
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButtonWrapper}
            onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>Soy especialista</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral.white} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>Unirme a la red</Text>
        </View>
      </View>

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 0,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
    fontWeight: '500',
  },
  titlePrefix: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.neutral.gray700,
    marginBottom: spacing.xs,
  },
  gradientWrapper: {
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  titleGradient: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    maxWidth: 600,
    paddingHorizontal: spacing.sm,
  },

  // Features Section
  featuresSection: {
    marginBottom: spacing.lg,
  },
  featuresGrid: {
    gap: spacing.sm,
  },
  featuresGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featuresGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featuresGridColumn: {
    flexDirection: 'column',
  },
  featureCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 150,
    ...shadows.md,
  },
  featureCardDesktop: {
    width: '23%',
    minWidth: 150,
    maxWidth: 220,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  featureSubtitle: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },

  // CTA Section
  ctaHeader: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ctaContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaContainerRow: {
    flexDirection: 'row',
  },
  ctaContainerColumn: {
    flexDirection: 'column',
  },
  ctaCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.md,
    ...shadows.lg,
  },
  ctaCardDesktop: {
    flex: 1,
  },
  ctaIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 15,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  bulletList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 20,
  },
  ctaButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  ctaHint: {
    fontSize: 14,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    height: spacing.lg,
  },
});
