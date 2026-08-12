import React from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { MotionView } from '../../../components/common/MotionView';
import { useTheme } from '../../../contexts/ThemeContext';
import { PROFESSIONAL_PREVIEW_IMAGES } from '../professionalPreviewAssets';

interface ForSpecialistsSectionProps {
  primaryActionLabel: string;
  showLoginAction: boolean;
  onProductTour: () => void;
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

const PREVIEW_ASPECT_RATIO = 1917 / 866;
const PREVIEW_TOOLBAR_HEIGHT = 36;
const DESKTOP_CONTENT_MAX_WIDTH = 1200;
const DESKTOP_SECTION_HORIZONTAL_PADDING = 120;
const DESKTOP_PREVIEW_GUTTERS = 84;

export const ForSpecialistsSection: React.FC<ForSpecialistsSectionProps> = ({
  primaryActionLabel,
  showLoginAction,
  onProductTour,
  onPrimaryAction,
  onLogin,
  onClinicAccess,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const desktopContentWidth = Math.min(
    Math.max(width - DESKTOP_SECTION_HORIZONTAL_PADDING, 0),
    DESKTOP_CONTENT_MAX_WIDTH,
  );
  const desktopPreviewWidth = Math.min(
    620,
    Math.max(440, (desktopContentWidth - DESKTOP_PREVIEW_GUTTERS) * 0.56),
  );
  const desktopPreviewImageHeight = desktopPreviewWidth / PREVIEW_ASPECT_RATIO;
  const responsivePreviewHeight = Math.min(
    300,
    Math.max(140, (Math.min(width, 1200) - 80) / PREVIEW_ASPECT_RATIO),
  );

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

        <MotionView entering="fadeInUp" delay={70} style={styles.previewMotion}>
          <AnimatedPressable
            onPress={onProductTour}
            href="/profesionales/recorrido"
            pressScale={0.992}
            hoverLift
            accessibilityRole="link"
            accessibilityLabel="Ver HERA por dentro"
            style={styles.previewPressable}
          >
            <LinearGradient
              colors={[theme.bgCard, theme.bgAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.preview,
                isDesktop && styles.previewDesktop,
                { borderColor: theme.borderStrong, shadowColor: theme.shadowCard },
              ]}
            >
              <View style={[styles.previewCopy, isDesktop && styles.previewCopyDesktop]}>
                <View style={styles.previewKicker}>
                  <View style={[styles.previewKickerIcon, { backgroundColor: theme.primaryAlpha12 }]}>
                    <Ionicons name="sparkles-outline" size={17} color={theme.primary} />
                  </View>
                  <Text
                    style={[
                      styles.previewKickerText,
                      { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    RECORRIDO INTERACTIVO
                  </Text>
                </View>

                <Text
                  style={[
                    styles.previewTitle,
                    isDesktop && styles.previewTitleDesktop,
                    { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                  ]}
                >
                  Conoce HERA antes de registrarte
                </Text>
                <Text
                  style={[
                    styles.previewDescription,
                    { color: theme.textSecondary, fontFamily: theme.fontSans },
                  ]}
                >
                  Explora cómo se conectan la agenda, los pacientes y la gestión de tu
                  consulta en una visita guiada, sin crear una cuenta.
                </Text>

                <View style={styles.previewMetaRow}>
                  <View style={[styles.previewMeta, { backgroundColor: theme.bgMuted }]}>
                    <Ionicons name="images-outline" size={14} color={theme.primary} />
                    <Text
                      style={[
                        styles.previewMetaText,
                        { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
                      ]}
                    >
                      6 áreas guiadas
                    </Text>
                  </View>
                  <View style={[styles.previewMeta, { backgroundColor: theme.bgMuted }]}>
                    <Ionicons name="eye-outline" size={14} color={theme.primary} />
                    <Text
                      style={[
                        styles.previewMetaText,
                        { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
                      ]}
                    >
                      Sin registro
                    </Text>
                  </View>
                </View>

                <View style={[styles.previewAction, { backgroundColor: theme.actionPrimary }]}>
                  <Text
                    style={[
                      styles.previewActionText,
                      { color: theme.actionPrimaryText, fontFamily: theme.fontSansBold },
                    ]}
                  >
                    Ver HERA por dentro
                  </Text>
                  <Ionicons name="arrow-forward" size={19} color={theme.actionPrimaryText} />
                </View>
              </View>

              <View
                style={[
                  styles.previewVisual,
                  isDesktop && styles.previewVisualDesktop,
                  isDesktop && {
                    width: desktopPreviewWidth,
                    height: desktopPreviewImageHeight + PREVIEW_TOOLBAR_HEIGHT,
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewWindow,
                    { backgroundColor: theme.bg, borderColor: theme.borderStrong },
                  ]}
                >
                  <View style={[styles.previewToolbar, { borderBottomColor: theme.border }]}>
                    <View style={styles.previewDots}>
                      <View style={[styles.previewDot, { backgroundColor: theme.warning }]} />
                      <View style={[styles.previewDot, { backgroundColor: theme.secondary }]} />
                      <View style={[styles.previewDot, { backgroundColor: theme.primary }]} />
                    </View>
                    <View style={styles.previewToolbarLabel}>
                      <Ionicons name="shield-checkmark-outline" size={13} color={theme.primary} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.previewToolbarText,
                          { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
                        ]}
                      >
                        Espacio profesional HERA
                      </Text>
                    </View>
                  </View>
                  <Image
                    source={PROFESSIONAL_PREVIEW_IMAGES[isDark ? 'dark' : 'light']}
                    resizeMode="contain"
                    accessibilityLabel="Vista previa del inicio del espacio profesional de HERA"
                    style={[
                      styles.previewImage,
                      {
                        height: isDesktop
                          ? desktopPreviewImageHeight
                          : responsivePreviewHeight,
                      },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.previewExploreBadge,
                    { backgroundColor: theme.glassBg, borderColor: theme.glassBorder },
                  ]}
                >
                  <Ionicons name="open-outline" size={14} color={theme.primary} />
                  <Text
                    style={[
                      styles.previewExploreText,
                      { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    Pulsa para explorar
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </AnimatedPressable>
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
            hoverLift={false}
            accessibilityRole="button"
            accessibilityLabel={primaryActionLabel}
            style={[
              styles.registerAction,
              { backgroundColor: theme.bgCard, borderColor: theme.borderStrong },
            ]}
          >
            <Text
              style={[
                styles.registerActionText,
                { color: theme.primary, fontFamily: theme.fontSansBold },
              ]}
            >
              {primaryActionLabel}
            </Text>
            <Ionicons name="arrow-forward" size={19} color={theme.primary} />
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
  previewMotion: {
    marginBottom: 28,
  },
  previewPressable: {
    width: '100%',
  },
  preview: {
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderRadius: 24,
    gap: 22,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  previewDesktop: {
    minHeight: 292,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 26,
    gap: 32,
  },
  previewCopy: {
    padding: 4,
  },
  previewCopyDesktop: {
    flex: 1,
    paddingLeft: 8,
  },
  previewKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  previewKickerIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  previewKickerText: {
    fontSize: 11,
    letterSpacing: 1.35,
  },
  previewTitle: {
    fontSize: 29,
    lineHeight: 36,
    marginBottom: 10,
  },
  previewTitleDesktop: {
    fontSize: 34,
    lineHeight: 41,
  },
  previewDescription: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 460,
  },
  previewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 17,
  },
  previewMeta: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  previewMetaText: {
    fontSize: 11,
  },
  previewAction: {
    minHeight: 50,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  previewActionText: {
    fontSize: 15,
  },
  previewVisual: {
    position: 'relative',
    width: '100%',
  },
  previewVisualDesktop: {
    flexGrow: 0,
    flexShrink: 0,
  },
  previewWindow: {
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
  },
  previewToolbar: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  previewDots: {
    flexDirection: 'row',
    gap: 5,
  },
  previewDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  previewToolbarLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingRight: 30,
  },
  previewToolbarText: {
    fontSize: 10,
  },
  previewImage: {
    width: '100%',
  },
  previewExploreBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  previewExploreText: {
    fontSize: 11,
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
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionsMobile: {
    flexDirection: 'column',
  },
  registerAction: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
  },
  registerActionText: {
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
