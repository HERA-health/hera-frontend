import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { MotionView } from '../../../components/common/MotionView';
import { useTheme } from '../../../contexts/ThemeContext';

interface ForSpecialistsSectionProps {
  primaryActionLabel: string;
  showLoginAction: boolean;
  onPrimaryAction: () => void;
  onLogin: () => void;
  onClinicAccess: () => void;
}

const PILLARS = [
  {
    eyebrow: 'VISIBILIDAD',
    icon: 'eye-outline' as const,
    title: 'Una presencia pública que explica cómo trabajas',
    description:
      'Presenta tu perfil, modalidades, tarifas y disponibilidad para que cada persona pueda decidir con más contexto.',
    features: ['Perfil profesional verificado', 'Modalidades y tarifas claras', 'Disponibilidad y reservas'],
  },
  {
    eyebrow: 'GESTIÓN',
    icon: 'layers-outline' as const,
    title: 'La operativa de tu consulta, conectada',
    description:
      'Organiza el trabajo cotidiano desde un espacio privado, calmado y diseñado para profesionales de salud mental.',
    features: ['Agenda, pacientes y sesiones', 'Documentos y consentimientos', 'Facturación y seguimiento'],
  },
];

export const ForSpecialistsSection: React.FC<ForSpecialistsSectionProps> = ({
  primaryActionLabel,
  showLoginAction,
  onPrimaryAction,
  onLogin,
  onClinicAccess,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  return (
    <LinearGradient
      colors={[
        theme.landingCanvas,
        theme.landingProfessional,
        theme.landingProfessional,
        theme.landingCanvas,
      ]}
      locations={[0, 0.09, 0.91, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <MotionView entering="fadeInUp" style={styles.intro}>
          <View style={[styles.introRule, { backgroundColor: theme.primary }]} />
          <View style={styles.introCopy}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              HERA PARA PROFESIONALES
            </Text>
            <Text
              accessibilityRole="header"
              style={[
                styles.title,
                isDesktop && styles.titleDesktop,
                { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              ]}
            >
              Hazte visible. Gestiona tu consulta.
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              Dos partes de un mismo recorrido: ayudar a nuevas personas a conocerte
              y darte un espacio fiable para cuidar el trabajo que viene después.
            </Text>
          </View>
        </MotionView>

        <View style={[styles.pillars, isDesktop && styles.pillarsDesktop]}>
          {PILLARS.map((pillar, index) => (
            <MotionView
              key={pillar.eyebrow}
              entering="fadeInUp"
              delay={90 + index * 80}
              style={isDesktop ? styles.pillarMotion : undefined}
            >
              <View
                style={[
                  styles.pillar,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    shadowColor: theme.shadowCard,
                  },
                ]}
              >
                <View style={styles.pillarHeader}>
                  <View style={[styles.pillarIcon, { backgroundColor: theme.primaryAlpha12 }]}>
                    <Ionicons name={pillar.icon} size={25} color={theme.primary} />
                  </View>
                  <Text
                    style={[
                      styles.pillarEyebrow,
                      { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    {pillar.eyebrow}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pillarTitle,
                    { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                  ]}
                >
                  {pillar.title}
                </Text>
                <Text
                  style={[
                    styles.pillarDescription,
                    { color: theme.textSecondary, fontFamily: theme.fontSans },
                  ]}
                >
                  {pillar.description}
                </Text>
                <View style={styles.features}>
                  {pillar.features.map((feature) => (
                    <View key={feature} style={styles.feature}>
                      <Ionicons name="checkmark" size={17} color={theme.success} />
                      <Text
                        style={[
                          styles.featureText,
                          { color: theme.textPrimary, fontFamily: theme.fontSansMedium },
                        ]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </MotionView>
          ))}
        </View>

        <View style={[styles.actionsRow, isMobile && styles.actionsMobile]}>
          <AnimatedPressable
            onPress={onPrimaryAction}
            pressScale={0.97}
            hoverLift
            accessibilityRole="button"
            accessibilityLabel={primaryActionLabel}
            style={[styles.primaryAction, { backgroundColor: theme.actionPrimary }]}
          >
            <Text
              style={[
                styles.primaryActionText,
                { color: theme.actionPrimaryText, fontFamily: theme.fontSansBold },
              ]}
            >
              {primaryActionLabel}
            </Text>
            <Ionicons name="arrow-forward" size={19} color={theme.actionPrimaryText} />
          </AnimatedPressable>

          {showLoginAction ? (
            <AnimatedPressable
              onPress={onLogin}
              pressScale={0.97}
              hoverLift={false}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión como profesional"
              style={[
                styles.secondaryAction,
                { backgroundColor: theme.bgCard, borderColor: theme.borderStrong },
              ]}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Iniciar sesión
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>

        <View style={[styles.clinicLine, { borderTopColor: theme.border }]}>
          <View style={styles.clinicCopy}>
            <Ionicons name="business-outline" size={20} color={theme.primary} />
            <Text
              style={[
                styles.clinicText,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              ¿Gestionas un centro? Accede al espacio específico para clínicas.
            </Text>
          </View>
          <AnimatedPressable
            onPress={onClinicAccess}
            hoverLift={false}
            pressScale={0.97}
            accessibilityRole="link"
            accessibilityLabel="Acceso para clínicas"
            style={styles.clinicAction}
          >
            <Text
              style={[
                styles.clinicActionText,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Acceso para clínicas
            </Text>
            <Ionicons name="arrow-forward" size={17} color={theme.primary} />
          </AnimatedPressable>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 72,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 88,
    paddingHorizontal: 60,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  intro: {
    flexDirection: 'row',
    gap: 18,
    maxWidth: 850,
    marginBottom: 42,
  },
  introRule: {
    width: 4,
    borderRadius: 2,
  },
  introCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 35,
    lineHeight: 43,
    marginBottom: 13,
  },
  titleDesktop: {
    fontSize: 48,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 27,
    maxWidth: 780,
  },
  pillars: {
    gap: 18,
  },
  pillarsDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pillarMotion: {
    flex: 1,
  },
  pillar: {
    height: '100%',
    minHeight: 390,
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 3,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  pillarIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarEyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
  },
  pillarTitle: {
    fontSize: 23,
    lineHeight: 30,
    marginBottom: 12,
  },
  pillarDescription: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 23,
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionsMobile: {
    flexDirection: 'column',
  },
  primaryAction: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 9,
  },
  primaryActionText: {
    fontSize: 16,
  },
  secondaryAction: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 15,
  },
  clinicLine: {
    marginTop: 34,
    paddingTop: 24,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  clinicCopy: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clinicText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  clinicAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 7,
  },
  clinicActionText: {
    fontSize: 14,
  },
});
