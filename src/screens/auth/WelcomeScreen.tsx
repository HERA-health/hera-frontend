/**
 * WelcomeScreen — HERA Design System v5.0
 *
 * Migrated to:
 * - useTheme() for dark mode
 * - AmbientBackground gradient blobs
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { AmbientBackground } from '../../components/common/AmbientBackground';
import { MotionView } from '../../components/common/MotionView';
import { StyledLogo } from '../../components/common/StyledLogo';
import { Button } from '../../components/common/Button';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { RootStackParamList } from '../../constants/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
type FeatureColorKey = 'primary' | 'secondary' | 'success' | 'info';

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: 'sync' as const,
    title: 'Matching con IA',
    subtitle: 'Algoritmo de afinidad único',
    colorKey: 'primary' as FeatureColorKey,
  },
  {
    icon: 'videocam' as const,
    title: 'Videollamadas seguras',
    subtitle: 'Sesiones online privadas',
    colorKey: 'secondary' as FeatureColorKey,
  },
  {
    icon: 'sparkles' as const,
    title: 'LIA - Asistente 24/7',
    subtitle: 'Apoyo emocional inmediato',
    colorKey: 'success' as FeatureColorKey,
  },
  {
    icon: 'shield-checkmark' as const,
    title: '100% Confidencial',
    subtitle: 'Privacidad garantizada',
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
    'Matching inteligente con especialistas mediante IA',
    'Sesiones seguras por videollamada con resúmenes automáticos',
    'Chat de crisis 24/7 con LIA, tu asistente de apoyo emocional',
    'Facturación automática y seguimiento completo',
  ],
  professional: [
    'Gestiona tu agenda y pacientes fácilmente',
    'Resúmenes automáticos con IA de cada sesión',
    'Facturación automática y pagos seguros',
    'Publica contenido y construye tu marca personal',
  ],
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();

  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <AmbientBackground variant="auth" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <MotionView entering="fadeInUp" delay={0} style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <StyledLogo size={160} />
          </View>

          <Text style={[styles.appName, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            HERA
          </Text>

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
                Busco ayuda
              </Text>
              <Text style={[styles.ctaSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Encuentra el especialista perfecto para ti
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
                Busco ayuda
              </Button>
              <Text style={[styles.ctaHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                Encontrar mi especialista
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
                Unirme a la red
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
  appName: {
    fontSize: 52,
    letterSpacing: 1,
    marginTop: spacing.xs,
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
