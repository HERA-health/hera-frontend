/**
 * HowItWorksSection Component
 *
 * Shows simplicity of the process in 3 clear steps.
 * Features numbered cards with icons and descriptions.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';

interface Step {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  iconColor: string;
}

const steps: Step[] = [
  {
    number: '1',
    icon: 'clipboard-outline',
    title: 'Completa el cuestionario',
    description: 'En 2 minutos, cuéntanos qué necesitas. Te recomendaremos los especialistas que mejor encajen contigo.',
    iconColor: heraLanding.primary,
  },
  {
    number: '2',
    icon: 'calendar-outline',
    title: 'Reserva tu sesión',
    description: 'Elige fecha y hora que te convengan. Confirma en segundos. Flexible y sin compromiso.',
    iconColor: heraLanding.secondary,
  },
  {
    number: '3',
    icon: 'chatbubbles-outline',
    title: 'Comienza tu proceso',
    description: 'Sesión segura por videollamada o presencial. Tu privacidad es nuestra prioridad.',
    iconColor: heraLanding.success,
  },
];

export const HowItWorksSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Section Title */}
        <View style={styles.header}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
            Comienza tu terapia en 3 pasos
          </Text>
          <Text style={styles.subtitle}>
            Simple, rápido y confidencial
          </Text>
        </View>

        {/* Steps Grid */}
        <View style={[
          styles.stepsContainer,
          isDesktop && styles.stepsContainerDesktop,
          isTablet && styles.stepsContainerTablet,
        ]}>
          {steps.map((step, index) => (
            <View key={step.number} style={styles.stepWrapper}>
              <View style={[
                styles.stepCard,
                isDesktop && styles.stepCardDesktop,
              ]}>
                {/* Number Badge */}
                <View style={[styles.numberBadge, { backgroundColor: step.iconColor }]}>
                  <Text style={styles.numberText}>{step.number}</Text>
                </View>

                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: `${step.iconColor}15` }]}>
                  <Ionicons name={step.icon} size={32} color={step.iconColor} />
                </View>

                {/* Content */}
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              {/* Arrow connector (desktop only) */}
              {isDesktop && index < steps.length - 1 && (
                <View style={styles.arrowConnector}>
                  <View style={styles.arrowLine} />
                  <Ionicons name="chevron-forward" size={20} color={heraLanding.border} />
                </View>
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 100,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },

  // Steps
  stepsContainer: {
    gap: 24,
  },
  stepsContainerDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 0,
  },
  stepsContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },

  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepCard: {
    backgroundColor: heraLanding.background,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
    ...shadows.md,
  },
  stepCardDesktop: {
    width: 320,
    padding: 32,
  },

  // Number Badge
  numberBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  numberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Icon
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Content
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Arrow connector
  arrowConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: heraLanding.border,
    marginRight: -8,
  },
});
