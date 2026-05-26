/**
 * HowItWorksSection
 *
 * Three equal steps for the professional onboarding flow.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { GlassCard } from '../../../components/common/GlassCard';
import { MotionView } from '../../../components/common/MotionView';
import type { Theme } from '../../../constants/theme';

interface Step {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: '1',
    icon: 'log-in-outline',
    title: 'Accede a tu espacio profesional',
    description:
      'Entra con tu cuenta o únete como profesional para empezar desde un panel pensado para consulta.',
  },
  {
    number: '2',
    icon: 'options-outline',
    title: 'Configura cómo trabajas',
    description:
      'Define disponibilidad, tarifas, modalidades y datos clave antes de recibir nuevas reservas.',
  },
  {
    number: '3',
    icon: 'layers-outline',
    title: 'Gestiona la continuidad',
    description:
      'Organiza pacientes, sesiones, facturas y seguimiento diario sin perder el contexto de cada caso.',
  },
];

const STEP_ACCENT_COLORS = [
  (theme: Theme) => theme.primary,
  (theme: Theme) => theme.secondaryDark,
  (theme: Theme) => theme.success,
];

export const HowItWorksSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgAlt },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <MotionView entering="fadeInUp" delay={0} style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            FLUJO
          </Text>
          <Text
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Empieza a trabajar en 3 pasos
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Un recorrido sencillo para pasar de la cuenta inicial a una consulta
            organizada dentro de HERA.
          </Text>
        </MotionView>

        <View
          style={[
            styles.stepsGrid,
            isDesktop && styles.stepsGridDesktop,
            isTablet && styles.stepsGridTablet,
          ]}
        >
          {STEPS.map((step, index) => (
            <MotionView
              key={step.number}
              entering="fadeInUp"
              delay={90 + index * 80}
              style={isDesktop || isTablet ? styles.stepMotion : undefined}
            >
              <StepCard step={step} index={index} theme={theme} />
            </MotionView>
          ))}
        </View>
      </View>
    </View>
  );
};

interface StepCardProps {
  step: Step;
  index: number;
  theme: Theme;
}

function StepCard({ step, index, theme }: StepCardProps) {
  const accentColor = STEP_ACCENT_COLORS[index](theme);
  const iconColor = accentColor === theme.primary ? theme.textOnPrimary : '#FFFFFF';

  return (
    <GlassCard intensity={40} borderRadius={8} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={[styles.iconSurface, { backgroundColor: accentColor }]}>
          <Ionicons name={step.icon} size={25} color={iconColor} />
        </View>

        <View
          style={[
            styles.stepBadge,
            {
              backgroundColor: theme.primaryAlpha12,
              borderColor: theme.primaryAlpha20,
            },
          ]}
        >
          <Text
            style={[
              styles.stepBadgeText,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            Paso {step.number}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.stepTitle,
          { color: theme.textPrimary, fontFamily: theme.fontSansBold },
        ]}
      >
        {step.title}
      </Text>
      <Text
        style={[
          styles.stepDescription,
          { color: theme.textSecondary, fontFamily: theme.fontSans },
        ]}
      >
        {step.description}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 96,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0,
  },
  titleDesktop: {
    fontSize: 44,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 760,
  },
  stepsGrid: {
    gap: 16,
  },
  stepsGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  stepsGridTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepMotion: {
    flex: 1,
  },
  stepCard: {
    padding: 28,
    minHeight: 230,
    height: '100%',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 24,
  },
  iconSurface: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  stepBadgeText: {
    fontSize: 12,
  },
  stepTitle: {
    fontSize: 20,
    marginBottom: 10,
    lineHeight: 26,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 23,
  },
});
