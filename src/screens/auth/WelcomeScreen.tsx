/**
 * WelcomeScreen — HERA Design System v5.0
 *
 * Migrated to:
 * - useTheme() for dark mode
 * - AmbientBackground calm brand wash
 * - GlassCard feature pills
 * - AnimatedPressable CTAs
 * - Fraunces for hero title + CTA header
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { AmbientBackground } from '../../components/common/AmbientBackground';
import { MotionView } from '../../components/common/MotionView';
import { StyledLogo } from '../../components/common/StyledLogo';
import { Button } from '../../components/common/Button';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { RootStackParamList } from '../../constants/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
type FeatureColorKey = 'primary' | 'secondary' | 'success' | 'info';

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: 'checkmark-done-circle' as const,
    title: 'Perfiles verificados',
    subtitle: 'Información clara para elegir',
    colorKey: 'primary' as FeatureColorKey,
  },
  {
    icon: 'videocam' as const,
    title: 'Videollamadas seguras',
    subtitle: 'Sesiones online privadas',
    colorKey: 'secondary' as FeatureColorKey,
  },
  {
    icon: 'calendar' as const,
    title: 'Gestión conectada',
    subtitle: 'Agenda, pacientes y facturación',
    colorKey: 'success' as FeatureColorKey,
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Privacidad por diseño',
    subtitle: 'Datos y documentos protegidos',
    colorKey: 'info' as FeatureColorKey,
  },
];

const getFeatureColor = (theme: Theme, colorKey: FeatureColorKey): string => {
  const colorMap: Record<FeatureColorKey, string> = {
    primary: theme.primary,
    secondary: theme.secondary,
    success: theme.success,
    info: theme.info,
  };

  return colorMap[colorKey];
};

const CTA_BULLETS = {
  client: [
    'Explora perfiles profesionales verificados',
    'Compara modalidad, precio y disponibilidad',
    'Reserva cuando encuentres un perfil que encaje contigo',
    'Consulta y organiza tus próximas sesiones',
  ],
  professional: [
    'Publica un perfil profesional verificado',
    'Gestiona agenda, pacientes y sesiones',
    'Reúne documentos y consentimientos',
    'Crea y gestiona tu facturación',
  ],
  clinic: [
    'Cuenta propia para gestionar el centro',
    'Equipo, pacientes y agenda conectados',
    'Facturación y reparto económico',
    'Panel separado de la consulta individual',
  ],
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();

  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;

  const handleGoBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <AmbientBackground variant="auth" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <AnimatedPressable
            onPress={handleGoBack}
            hoverLift={false}
            pressScale={0.97}
            accessibilityRole="button"
            accessibilityLabel="Volver a la página de inicio"
            accessibilityHint="Regresa a la landing de HERA"
            style={[
              styles.backButton,
              {
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                shadowColor: theme.shadowCard,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.primary} />
            <Text
              style={[
                styles.backButtonText,
                {
                  color: theme.textPrimary,
                  fontFamily: theme.fontSansSemiBold,
                },
              ]}
            >
              Volver
            </Text>
          </AnimatedPressable>
        </View>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <MotionView entering="fadeInUp" delay={0} style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <StyledLogo size={160} />
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Tu bienestar emocional es nuestra prioridad
          </Text>
        </MotionView>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <MotionView entering="fadeInUp" delay={80}>
          <View style={[
            styles.featuresGrid,
            isDesktop ? styles.featuresGridRow : isTablet ? styles.featuresGridTablet : styles.featuresGridColumn,
          ]}>
            {FEATURES.map((f, i) => {
              const color = getFeatureColor(theme, f.colorKey);
              return (
                <MotionView
                  key={f.title}
                  entering="fadeInUp"
                  delay={100 + i * 60}
                  style={[
                    styles.featureCardWrapper,
                    ...(isDesktop ? [styles.featureCardDesktop] : []),
                  ]}
                >
                  <View
                    style={[
                      styles.featureCard,
                      {
                        backgroundColor: theme.bgCard,
                        borderColor: theme.border,
                        shadowColor: theme.shadowCard,
                      },
                    ]}
                  >
                    <View style={[styles.featureIconBg, { backgroundColor: color + '18' }]}>
                      <Ionicons name={f.icon} size={28} color={color} />
                    </View>
                    <Text style={[styles.featureTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>
                      {f.title}
                    </Text>
                    <Text style={[styles.featureSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      {f.subtitle}
                    </Text>
                  </View>
                </MotionView>
              );
            })}
          </View>
        </MotionView>

        {/* ── CTA Header ────────────────────────────────────────────────────── */}
        <MotionView entering="fadeInUp" delay={280} style={styles.ctaHeaderWrapper}>
          <Text style={[styles.ctaHeader, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            ¿Cómo quieres comenzar?
          </Text>
        </MotionView>

        {/* ── CTA Cards ─────────────────────────────────────────────────────── */}
        <View style={[
          styles.ctaContainer,
          isDesktop ? styles.ctaContainerRow : styles.ctaContainerColumn,
        ]}>
          {/* Client Card */}
          <MotionView entering="fadeInUp" delay={320} style={isDesktop ? { flex: 1 } : undefined}>
            <View
              style={[
                styles.ctaCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.primaryMuted,
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.ctaIconContainer, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="people" size={38} color={theme.primary} />
              </View>

              <Text style={[styles.ctaTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
                Busco terapia
              </Text>
              <Text style={[styles.ctaSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Conoce profesionales y elige con calma
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.client.map((bullet, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    <Text style={[styles.bulletText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
                variant="primary"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
                iconPosition="right"
                style={styles.ctaButtonNative}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Acceder a mi espacio
              </Button>
              <Text style={[styles.ctaHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                Continúa a tu ritmo
              </Text>
            </View>
          </MotionView>

          {/* Professional Card */}
          <MotionView entering="fadeInUp" delay={380} style={isDesktop ? { flex: 1 } : undefined}>
            <View
              style={[
                styles.ctaCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.secondaryLight + '40',
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.ctaIconContainer, { backgroundColor: theme.secondary + '18' }]}>
                <Ionicons name="briefcase" size={38} color={theme.secondary} />
              </View>

              <Text style={[styles.ctaTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
                Soy especialista
              </Text>
              <Text style={[styles.ctaSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Únete a nuestra red de especialistas
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.professional.map((bullet, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.secondary} />
                    <Text style={[styles.bulletText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}
                variant="secondary"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={20} color={theme.secondaryDark} />}
                iconPosition="right"
                style={styles.ctaButtonNative}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Soy especialista
              </Button>
              <Text style={[styles.ctaHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                Acceder al espacio profesional
              </Text>
            </View>
          </MotionView>

          <MotionView entering="fadeInUp" delay={440} style={isDesktop ? { flex: 1 } : undefined}>
            <View
              style={[
                styles.ctaCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderStrong,
                  shadowColor: theme.shadowCard,
                },
              ]}
            >
              <View style={[styles.ctaIconContainer, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="business" size={38} color={theme.primary} />
              </View>

              <Text style={[styles.ctaTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
                Soy clínica
              </Text>
              <Text style={[styles.ctaSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Crea un espacio propio para tu centro
              </Text>

              <View style={styles.bulletList}>
                {CTA_BULLETS.clinic.map((bullet, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    <Text style={[styles.bulletText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                onPress={() => navigation.navigate('Login', { userType: 'CLINIC' })}
                variant="outline"
                size="large"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={20} color={theme.link} />}
                iconPosition="right"
                style={styles.ctaButtonNative}
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Acceso clínicas
              </Button>
              <Text style={[styles.ctaHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                Acceder al espacio de clínica
              </Text>
            </View>
          </MotionView>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },

  // Top navigation
  topBar: {
    width: '100%',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 14,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  logoContainer: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 600,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  // Features grid
  featuresGrid: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  featuresGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featuresGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featuresGridColumn: {
    flexDirection: 'column',
  },
  featureCardWrapper: {
    minWidth: 150,
  },
  featureCardDesktop: {
    width: '23%',
    minWidth: 150,
    maxWidth: 220,
  },
  featureCard: {
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  featureIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },

  // CTA section
  ctaHeaderWrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaHeader: {
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ctaContainer: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaContainerRow: {
    flexDirection: 'row',
  },
  ctaContainerColumn: {
    flexDirection: 'column',
  },
  ctaCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 6,
  },
  ctaIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ctaSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  bulletList: {
    gap: 10,
    marginBottom: spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  ctaButtonNative: {
    marginTop: 4,
  },
  ctaHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  footer: {
    height: spacing.lg,
  },
});
