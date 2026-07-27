import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';

const STEPS = [
  {
    number: '01',
    icon: 'search-outline' as const,
    title: 'Explora perfiles verificados',
    description:
      'Filtra por especialidad, modalidad y precio sin crear una cuenta para empezar a comparar.',
  },
  {
    number: '02',
    icon: 'reader-outline' as const,
    title: 'Conoce cómo trabaja cada profesional',
    description:
      'Revisa su enfoque, experiencia, formatos de sesión y disponibilidad antes de decidir.',
  },
  {
    number: '03',
    icon: 'calendar-clear-outline' as const,
    title: 'Reserva cuando lo tengas claro',
    description:
      'Da el siguiente paso solo cuando encuentres un perfil que encaje contigo y con tu momento.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  return (
    <View
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
        { backgroundColor: theme.landingCanvas },
      ]}
    >
      <View style={styles.content}>
        <MotionView entering="fadeInUp" style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            CÓMO FUNCIONA PARA PACIENTES
          </Text>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Decide con información, sin prisas
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Puedes explorar el directorio y conocer a cada especialista antes de
            iniciar cualquier proceso de reserva.
          </Text>
        </MotionView>

        <View style={[styles.steps, isTablet && styles.stepsWide]}>
          {STEPS.map((step, index) => (
            <MotionView
              key={step.number}
              entering="fadeInUp"
              delay={80 + index * 70}
              style={isTablet ? styles.stepMotion : undefined}
            >
              <View
                style={[
                  styles.step,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    shadowColor: theme.shadowCard,
                  },
                ]}
              >
                <View style={styles.stepTop}>
                  <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
                    <Ionicons name={step.icon} size={22} color={theme.primary} />
                  </View>
                  <Text
                    style={[
                      styles.number,
                      { color: theme.textMuted, fontFamily: theme.fontDisplay },
                    ]}
                  >
                    {step.number}
                  </Text>
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
                    styles.description,
                    { color: theme.textSecondary, fontFamily: theme.fontSans },
                  ]}
                >
                  {step.description}
                </Text>
              </View>
            </MotionView>
          ))}
        </View>

        <View
          style={[
            styles.callout,
            {
              backgroundColor: theme.primaryAlpha12,
              borderColor: theme.primaryAlpha20,
            },
          ]}
        >
          <Ionicons name="link-outline" size={22} color={theme.primary} />
          <Text
            style={[
              styles.calloutText,
              { color: theme.textPrimary, fontFamily: theme.fontSansMedium },
            ]}
          >
            Cuando reservas, la cita se conecta con la agenda y el espacio de trabajo
            del profesional para que ambos compartáis un proceso más claro.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 68,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingTop: 88,
    paddingBottom: 64,
    paddingHorizontal: 60,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  header: {
    maxWidth: 760,
    marginBottom: 42,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 46,
    lineHeight: 54,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
  },
  steps: {
    gap: 16,
  },
  stepsWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepMotion: {
    flex: 1,
  },
  step: {
    height: '100%',
    minHeight: 230,
    padding: 26,
    borderWidth: 1,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 27,
  },
  stepTitle: {
    fontSize: 19,
    lineHeight: 25,
    marginBottom: 9,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  callout: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderRadius: 16,
    borderWidth: 1,
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
});
