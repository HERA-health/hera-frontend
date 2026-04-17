/**
 * HowItWorksSection - HERA Design System v5.0
 *
 * Keeps the current bento layout but reframes the flow around the
 * professional workspace instead of patient discovery.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
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
    number: '01',
    icon: 'log-in-outline',
    title: 'Accede a tu espacio profesional',
    description:
      'Entra con tu cuenta o únete como profesional para centralizar tu consulta desde el primer momento.',
  },
  {
    number: '02',
    icon: 'options-outline',
    title: 'Configura agenda, disponibilidad y tarifas',
    description:
      'Define tu operativa con claridad: franjas horarias, sesiones, precios y reglas básicas del trabajo diario.',
  },
  {
    number: '03',
    icon: 'layers-outline',
    title: 'Gestiona pacientes, sesiones y facturación',
    description:
      'Haz seguimiento de tu actividad, organiza tu calendario y trabaja con una vista más ordenada de todo el negocio.',
  },
];

const STEP_ACCENT_COLORS = [
  (theme: Theme) => [theme.primary, theme.primaryDark] as [string, string],
  (theme: Theme) => [theme.secondary, theme.secondaryDark] as [string, string],
  (theme: Theme) => [theme.success, theme.primaryDark] as [string, string],
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
            Una entrada más clara para tu operativa diaria, sin cambiar la calma visual de HERA.
          </Text>
        </MotionView>

        {isDesktop ? (
          <View style={styles.bentoGrid}>
            <MotionView entering="fadeInUp" delay={100} style={styles.bentoLarge}>
              <StepCard step={STEPS[0]} index={0} theme={theme} large />
            </MotionView>

            <View style={styles.bentoSmallCol}>
              <MotionView entering="fadeInUp" delay={180} style={{ flex: 1 }}>
                <StepCard step={STEPS[1]} index={1} theme={theme} />
              </MotionView>
              <MotionView entering="fadeInUp" delay={260} style={{ flex: 1 }}>
                <StepCard step={STEPS[2]} index={2} theme={theme} />
              </MotionView>
            </View>
          </View>
        ) : (
          <View style={[styles.columnGrid, isTablet && styles.tabletGrid]}>
            {STEPS.map((step, index) => (
              <MotionView key={step.number} entering="fadeInUp" delay={80 + index * 80}>
                <StepCard step={step} index={index} theme={theme} />
              </MotionView>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

interface StepCardProps {
  step: Step;
  index: number;
  theme: Theme;
  large?: boolean;
}

function StepCard({ step, index, theme, large = false }: StepCardProps) {
  const gradientColors = STEP_ACCENT_COLORS[index](theme);

  return (
    <GlassCard
      intensity={40}
      borderRadius={20}
      style={[styles.stepCard, ...(large ? [styles.stepCardLarge] : [])]}
    >
      <Text
        style={[
          styles.ghostNumber,
          { color: theme.primary, fontFamily: theme.fontDisplay },
          ...(large ? [styles.ghostNumberLarge] : []),
        ]}
      >
        {step.number}
      </Text>

      <View style={styles.iconWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name={step.icon} size={large ? 32 : 26} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text
        style={[
          styles.stepTitle,
          large && styles.stepTitleLarge,
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
    paddingVertical: 100,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  titleDesktop: {
    fontSize: 44,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 760,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  bentoLarge: {
    flex: 2,
  },
  bentoSmallCol: {
    flex: 1,
    gap: 16,
  },
  columnGrid: {
    gap: 16,
  },
  tabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepCard: {
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 200,
  },
  stepCardLarge: {
    minHeight: 280,
    padding: 36,
  },
  ghostNumber: {
    position: 'absolute',
    bottom: -10,
    right: 16,
    fontSize: 100,
    opacity: 0.06,
    lineHeight: 110,
  },
  ghostNumberLarge: {
    fontSize: 140,
    lineHeight: 150,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 18,
    marginBottom: 8,
    lineHeight: 24,
  },
  stepTitleLarge: {
    fontSize: 22,
    lineHeight: 28,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
});
