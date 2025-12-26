/**
 * FinalCTASection Component
 *
 * Convert visitors after they've seen everything.
 * Full-width section with gradient background and prominent CTA.
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

interface FinalCTASectionProps {
  onFindSpecialist: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  onFindSpecialist,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const benefits = [
    { icon: 'checkmark-circle' as const, text: 'Sin compromiso' },
    { icon: 'checkmark-circle' as const, text: 'Primera sesión flexible' },
    { icon: 'checkmark-circle' as const, text: '100% privado' },
  ];

  return (
    <LinearGradient
      colors={[heraLanding.primary, heraLanding.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, isDesktop && styles.containerDesktop]}
    >
      {/* Decorative elements */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
          ¿Listo para dar el primer paso?
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
          Tu bienestar mental es nuestra prioridad.{'\n'}
          Comienza hoy con una sesión de valoración.
        </Text>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.cta, isDesktop && styles.ctaDesktop]}
          onPress={onFindSpecialist}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Encuentra tu especialista</Text>
          <Ionicons name="arrow-forward" size={20} color={heraLanding.primary} />
        </TouchableOpacity>

        {/* Benefits */}
        <View style={[styles.benefits, isDesktop && styles.benefitsDesktop]}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Ionicons name={benefit.icon} size={18} color="#FFFFFF" />
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  containerDesktop: {
    paddingVertical: 120,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  // Decorative circles
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    width: 400,
    height: 400,
    top: -200,
    right: -100,
  },
  decorCircle2: {
    width: 300,
    height: 300,
    bottom: -150,
    left: -100,
  },

  // Title
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  titleDesktop: {
    fontSize: 44,
  },

  // Subtitle
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
  },
  subtitleDesktop: {
    fontSize: 18,
    lineHeight: 28,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    gap: 10,
    ...shadows.lg,
  },
  ctaDesktop: {
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.primary,
    letterSpacing: 0.3,
  },

  // Benefits
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  benefitsDesktop: {
    gap: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
