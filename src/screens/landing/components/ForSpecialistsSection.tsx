/**
 * ForSpecialistsSection Component
 *
 * Secondary CTA section targeting psychologists.
 * Full-width banner with lavender accent.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';

interface ForSpecialistsSectionProps {
  onLearnMore: () => void;
}

export const ForSpecialistsSection: React.FC<ForSpecialistsSectionProps> = ({
  onLearnMore,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const benefits = [
    { icon: 'calendar-outline' as const, text: 'Gestiona tu agenda fácilmente' },
    { icon: 'people-outline' as const, text: 'Pacientes verificados' },
    { icon: 'card-outline' as const, text: 'Facturación automática' },
    { icon: 'trending-up-outline' as const, text: 'Haz crecer tu práctica' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.secondaryMuted }, isDesktop && styles.containerDesktop]}>
      <View style={[
        styles.content,
        isDesktop && styles.contentDesktop,
        isTablet && styles.contentTablet,
      ]}>
        {/* Left: Illustration (desktop) */}
        {(isDesktop || isTablet) && (
          <View style={[styles.illustrationContainer, isDesktop && styles.illustrationContainerDesktop]}>
            {/* Abstract professional visual */}
            <View style={styles.illustrationWrapper}>
              {/* Central briefcase icon */}
              <LinearGradient
                colors={[heraLanding.secondary, heraLanding.secondaryLight]}
                style={styles.centralIcon}
              >
                <Ionicons name="briefcase" size={48} color="#FFFFFF" />
              </LinearGradient>

              {/* Decorative elements */}
              <View style={[styles.floatingBadge, styles.badge1]}>
                <Ionicons name="calendar" size={20} color={heraLanding.secondary} />
              </View>
              <View style={[styles.floatingBadge, styles.badge2]}>
                <Ionicons name="trending-up" size={20} color={heraLanding.success} />
              </View>
              <View style={[styles.floatingBadge, styles.badge3]}>
                <Ionicons name="people" size={20} color={heraLanding.primary} />
              </View>

              {/* Background circles */}
              <View style={styles.bgCircle1} />
              <View style={styles.bgCircle2} />
            </View>
          </View>
        )}

        {/* Right: Content */}
        <View style={[styles.textContainer, isDesktop && styles.textContainerDesktop]}>
          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name="briefcase" size={14} color={heraLanding.secondaryDark} />
            <Text style={styles.badgeText}>Para profesionales</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }, isDesktop && styles.titleDesktop]}>
            ¿Eres especialista en salud mental?
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Únete a HERA y haz crecer tu práctica profesional.
            Sin permanencia, sin comisiones ocultas.
          </Text>

          {/* Benefits */}
          <View style={[styles.benefitsGrid, isDesktop && styles.benefitsGridDesktop]}>
            {benefits.map((benefit, index) => (
              <View key={index} style={[styles.benefitItem, { backgroundColor: theme.bgCard }]}>
                <View style={[styles.benefitIcon, { backgroundColor: theme.secondaryAlpha12 }]}>
                  <Ionicons name={benefit.icon} size={18} color={theme.secondary} />
                </View>
                <Text style={[styles.benefitText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{benefit.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: theme.bgCard, borderColor: theme.secondaryLight }]}
            onPress={onLearnMore}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold }]}>Más información</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.secondaryDark} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.secondaryMuted,
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 80,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 60,
  },
  contentTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },

  // Illustration
  illustrationContainer: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainerDesktop: {
    flex: 0.45,
  },
  illustrationWrapper: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centralIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  floatingBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  badge1: {
    top: 30,
    right: 40,
  },
  badge2: {
    bottom: 50,
    left: 30,
  },
  badge3: {
    top: 100,
    left: 20,
  },
  bgCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(184, 168, 217, 0.2)',
    zIndex: -1,
  },
  bgCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    top: -30,
    right: -20,
    zIndex: -1,
  },

  // Text Container
  textContainer: {
    alignItems: 'flex-start',
  },
  textContainerDesktop: {
    flex: 0.55,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
    ...shadows.sm,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.secondaryDark,
  },

  // Title
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    marginBottom: 16,
  },
  titleDesktop: {
    fontSize: 40,
  },

  // Subtitle
  subtitle: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    lineHeight: 26,
    marginBottom: 28,
    maxWidth: 450,
  },

  // Benefits
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  benefitsGridDesktop: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    ...shadows.sm,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: heraLanding.secondaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: heraLanding.secondaryLight,
    ...shadows.sm,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.secondaryDark,
  },
});
