import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { MotionView } from '../../components/common/MotionView';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';
import { trackProfessionalShowcaseEvent } from '../../services/professionalShowcaseAnalytics';
import { LandingHeader } from './components/LandingHeader';
import { PROFESSIONAL_SHOWCASE_STEPS } from './professionalShowcaseContent';
import type { LandingSectionAnchor } from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalShowcase'>;
type RegisterPlacement = 'header' | 'stage' | 'final';

const DESKTOP_BREAKPOINT = 1040;
const TABLET_BREAKPOINT = 720;

export function ProfessionalShowcaseScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT;
  const activeStep = PROFESSIONAL_SHOWCASE_STEPS[activeIndex];
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === PROFESSIONAL_SHOWCASE_STEPS.length - 1;

  useWebPageMetadata({
    title: 'Hera | Software para psicólogos y especialistas',
    description:
      'Descubre cómo HERA ayuda a psicólogos y especialistas a gestionar pacientes, agenda, disponibilidad, facturación y estadísticas en un solo espacio.',
    canonicalPath: '/profesionales/recorrido',
    indexable: true,
  });

  useEffect(() => {
    trackProfessionalShowcaseEvent({
      event: 'professional_showcase_step_viewed',
      properties: {
        step: activeStep.id,
        position: activeIndex + 1,
      },
    });
  }, [activeIndex, activeStep.id]);

  const handleLandingSection = useCallback(
    (section: LandingSectionAnchor) => {
      navigation.navigate('Landing', { section });
    },
    [navigation],
  );

  const handleRegister = useCallback(
    (placement: RegisterPlacement) => {
      trackProfessionalShowcaseEvent({
        event: 'professional_showcase_register_clicked',
        properties: {
          step: activeStep.id,
          placement,
        },
      });
      navigation.navigate('Register', { userType: 'PROFESSIONAL' });
    },
    [activeStep.id, navigation],
  );

  const handleSelectStep = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((current) =>
      Math.min(PROFESSIONAL_SHOWCASE_STEPS.length - 1, current + 1),
    );
  }, []);

  const handleBackToLanding = useCallback(() => {
    navigation.navigate('Landing', { section: 'forSpecialists' });
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.landingCanvas }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.landingCanvas}
      />

      <LandingHeader
        context="access"
        isScrolled
        accessLabel="Crear cuenta"
        onLogoPress={() => navigation.navigate('Landing')}
        onExploreProfessionals={() => handleLandingSection('forSpecialists')}
        onAccess={() => handleRegister('header')}
        onScrollToSection={handleLandingSection}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <LinearGradient
          colors={[
            theme.landingCanvas,
            theme.landingProfessional,
            theme.landingCanvas,
          ]}
          locations={[0, 0.46, 1]}
          style={styles.gradientCanvas}
        >
          <View
            style={[
              styles.ambientOrb,
              styles.ambientOrbTop,
              { backgroundColor: theme.primaryAlpha20, pointerEvents: 'none' },
            ]}
          />
          <View
            style={[
              styles.ambientOrb,
              styles.ambientOrbBottom,
              { backgroundColor: theme.secondaryAlpha12, pointerEvents: 'none' },
            ]}
          />

          <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
            <MotionView entering="fadeInUp" delay={0}>
              <AnimatedPressable
                onPress={handleBackToLanding}
                hoverLift={false}
                pressScale={0.98}
                accessibilityRole="link"
                accessibilityLabel="Volver a HERA para profesionales"
                style={styles.backLink}
              >
                <Ionicons name="arrow-back" size={16} color={theme.primary} />
                <Text
                  style={[
                    styles.backLinkText,
                    { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  HERA para profesionales
                </Text>
              </AnimatedPressable>
            </MotionView>

            <View style={[styles.heroLayout, isDesktop && styles.heroLayoutDesktop]}>
              <MotionView
                entering="fadeInUp"
                delay={70}
                style={isDesktop ? styles.heroCopyDesktop : undefined}
              >
                <View
                  style={[
                    styles.eyebrowPill,
                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                  ]}
                >
                  <View style={[styles.eyebrowDot, { backgroundColor: theme.primary }]} />
                  <Text
                    style={[
                      styles.heroEyebrow,
                      { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    RECORRIDO POR EL PRODUCTO
                  </Text>
                </View>

                <Text
                  accessibilityRole="header"
                  aria-level={1}
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleTablet,
                    isDesktop && styles.heroTitleDesktop,
                    { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                  ]}
                >
                  Tu consulta, conectada de principio a fin.
                </Text>
                <Text
                  style={[
                    styles.heroSubtitle,
                    { color: theme.textSecondary, fontFamily: theme.fontSans },
                  ]}
                >
                  Conoce cómo HERA reúne la jornada, los pacientes, la agenda y la
                  gestión administrativa en un espacio profesional claro y privado.
                </Text>
              </MotionView>

              <MotionView
                entering="fadeIn"
                delay={160}
                style={isDesktop ? styles.heroAsideDesktop : undefined}
              >
                <View
                  style={[
                    styles.heroAside,
                    {
                      backgroundColor: theme.glassBg,
                      borderColor: theme.glassBorder,
                      shadowColor: theme.shadowCard,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroAsideLabel,
                      { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    EN ESTE RECORRIDO
                  </Text>
                  <View style={styles.heroFacts}>
                    <View style={styles.heroFact}>
                      <Text
                        style={[
                          styles.heroFactValue,
                          { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                        ]}
                      >
                        6
                      </Text>
                      <Text
                        style={[
                          styles.heroFactLabel,
                          { color: theme.textSecondary, fontFamily: theme.fontSans },
                        ]}
                      >
                        áreas esenciales
                      </Text>
                    </View>
                    <View style={[styles.heroFactDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.heroFact}>
                      <Ionicons name="eye-outline" size={24} color={theme.primary} />
                      <Text
                        style={[
                          styles.heroFactLabel,
                          { color: theme.textSecondary, fontFamily: theme.fontSans },
                        ]}
                      >
                        Sin crear una cuenta
                      </Text>
                    </View>
                  </View>
                </View>
              </MotionView>
            </View>
          </View>

          <MotionView entering="fadeInUp" delay={220} style={styles.showcaseMotion}>
            <View
              style={[
                styles.showcaseShell,
                isDesktop && styles.showcaseShellDesktop,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.landingPanelBorder,
                  shadowColor: theme.shadowStrong,
                },
              ]}
            >
              {isDesktop ? (
                <View
                  style={[
                    styles.navigationRail,
                    { backgroundColor: theme.bgAlt, borderRightColor: theme.border },
                  ]}
                >
                  <View style={styles.navigationRailHeading}>
                    <Text
                      style={[
                        styles.navigationRailEyebrow,
                        { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
                      ]}
                    >
                      RECORRIDO
                    </Text>
                    <Text
                      style={[
                        styles.navigationRailTitle,
                        { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                      ]}
                    >
                      Un espacio, seis momentos
                    </Text>
                  </View>

                  <View style={styles.stepList}>
                    {PROFESSIONAL_SHOWCASE_STEPS.map((step, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <AnimatedPressable
                          key={step.id}
                          onPress={() => handleSelectStep(index)}
                          hoverLift={false}
                          pressScale={0.985}
                          accessibilityLabel={`Ver ${step.navigationLabel}: ${step.navigationSummary}`}
                          accessibilityState={{ selected: isActive }}
                          style={[
                            styles.stepButton,
                            {
                              backgroundColor: isActive ? theme.bgCard : theme.bgAlt,
                              borderColor: isActive ? theme.borderStrong : theme.bgAlt,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.stepNumber,
                              {
                                backgroundColor: isActive
                                  ? theme.actionPrimary
                                  : theme.bgMuted,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepNumberText,
                                {
                                  color: isActive
                                    ? theme.actionPrimaryText
                                    : theme.textMuted,
                                  fontFamily: theme.fontSansSemiBold,
                                },
                              ]}
                            >
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                          </View>
                          <View style={styles.stepCopy}>
                            <Text
                              style={[
                                styles.stepLabel,
                                {
                                  color: theme.textPrimary,
                                  fontFamily: theme.fontSansSemiBold,
                                },
                              ]}
                            >
                              {step.navigationLabel}
                            </Text>
                            <Text
                              style={[
                                styles.stepSummary,
                                { color: theme.textMuted, fontFamily: theme.fontSans },
                              ]}
                            >
                              {step.navigationSummary}
                            </Text>
                          </View>
                          {isActive ? (
                            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                          ) : null}
                        </AnimatedPressable>
                      );
                    })}
                  </View>

                  <View style={styles.railProgressBlock}>
                    <View style={[styles.progressTrack, { backgroundColor: theme.borderLight }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: theme.primary,
                            width: `${((activeIndex + 1) / PROFESSIONAL_SHOWCASE_STEPS.length) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: theme.textMuted, fontFamily: theme.fontSansMedium },
                      ]}
                    >
                      {activeIndex + 1} de {PROFESSIONAL_SHOWCASE_STEPS.length}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.productStage}>
                {!isDesktop ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mobileStepList}
                  >
                    {PROFESSIONAL_SHOWCASE_STEPS.map((step, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <AnimatedPressable
                          key={step.id}
                          onPress={() => handleSelectStep(index)}
                          hoverLift={false}
                          accessibilityLabel={`Ver ${step.navigationLabel}`}
                          accessibilityState={{ selected: isActive }}
                          style={[
                            styles.mobileStep,
                            {
                              backgroundColor: isActive ? theme.actionPrimary : theme.bgMuted,
                              borderColor: isActive ? theme.actionPrimary : theme.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={step.icon}
                            size={15}
                            color={isActive ? theme.actionPrimaryText : theme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.mobileStepText,
                              {
                                color: isActive
                                  ? theme.actionPrimaryText
                                  : theme.textSecondary,
                                fontFamily: theme.fontSansSemiBold,
                              },
                            ]}
                          >
                            {step.navigationLabel}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <View
                  style={[
                    styles.productFrame,
                    { backgroundColor: theme.bgElevated, borderColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.productToolbar,
                      { backgroundColor: theme.bgAlt, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.windowDots}>
                      <View style={[styles.windowDot, { backgroundColor: theme.warning }]} />
                      <View style={[styles.windowDot, { backgroundColor: theme.secondary }]} />
                      <View style={[styles.windowDot, { backgroundColor: theme.primary }]} />
                    </View>
                    <View style={[styles.productToolbarLabel, { backgroundColor: theme.bgMuted }]}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.productToolbarText,
                          { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
                        ]}
                      >
                        Espacio profesional HERA
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.productToolbarCount,
                        { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
                      ]}
                    >
                      {String(activeIndex + 1).padStart(2, '0')} / 06
                    </Text>
                  </View>

                  <MotionView
                    key={`${activeStep.id}-${isDark ? 'dark' : 'light'}`}
                    entering="fadeIn"
                    duration={320}
                    style={styles.screenshotMotion}
                  >
                    <View style={[styles.screenshotCanvas, { backgroundColor: theme.bgAlt }]}>
                      <Image
                        source={activeStep.images[isDark ? 'dark' : 'light']}
                        resizeMode="contain"
                        accessibilityLabel={activeStep.imageAccessibilityLabel}
                        style={styles.screenshot}
                      />
                      <View
                        style={[
                          styles.screenshotBadge,
                          { backgroundColor: theme.glassBg, borderColor: theme.glassBorder },
                        ]}
                      >
                        <Ionicons name={activeStep.icon} size={15} color={theme.primary} />
                        <Text
                          style={[
                            styles.screenshotBadgeText,
                            { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                          ]}
                        >
                          {activeStep.navigationLabel}
                        </Text>
                      </View>
                    </View>
                  </MotionView>
                </View>

                <MotionView
                  key={`${activeStep.id}-copy`}
                  entering="fadeInUp"
                  duration={300}
                  style={styles.stageCopyMotion}
                >
                  <View style={[styles.stageCopy, isTablet && styles.stageCopyTablet]}>
                    <View style={styles.stageNarrative}>
                      <Text
                        style={[
                          styles.stageEyebrow,
                          { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                        ]}
                      >
                        {activeStep.eyebrow}
                      </Text>
                      <Text
                        accessibilityRole="header"
                        aria-level={2}
                        accessibilityLiveRegion="polite"
                        style={[
                          styles.stageTitle,
                          { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                        ]}
                      >
                        {activeStep.title}
                      </Text>
                      <Text
                        style={[
                          styles.stageDescription,
                          { color: theme.textSecondary, fontFamily: theme.fontSans },
                        ]}
                      >
                        {activeStep.description}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.highlightPanel,
                        { backgroundColor: theme.bgAlt, borderColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.highlightLabel,
                          { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
                        ]}
                      >
                        QUÉ PUEDES HACER
                      </Text>
                      <View style={styles.highlights}>
                        {activeStep.highlights.map((highlight) => (
                          <View key={highlight} style={styles.highlightRow}>
                            <View
                              style={[
                                styles.highlightIcon,
                                { backgroundColor: theme.primaryAlpha12 },
                              ]}
                            >
                              <Ionicons name="checkmark" size={14} color={theme.primary} />
                            </View>
                            <Text
                              style={[
                                styles.highlightText,
                                { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
                              ]}
                            >
                              {highlight}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </MotionView>

                <View style={[styles.stageFooter, { borderTopColor: theme.borderLight }]}>
                  <View style={styles.stageControls}>
                    <AnimatedPressable
                      onPress={handlePrevious}
                      disabled={isFirstStep}
                      hoverLift={false}
                      accessibilityLabel="Ver pantalla anterior"
                      accessibilityState={{ disabled: isFirstStep }}
                      style={[
                        styles.controlButton,
                        {
                          backgroundColor: theme.bgMuted,
                          borderColor: theme.border,
                          opacity: isFirstStep ? 0.42 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={handleNext}
                      disabled={isLastStep}
                      hoverLift={false}
                      accessibilityLabel="Ver pantalla siguiente"
                      accessibilityState={{ disabled: isLastStep }}
                      style={[
                        styles.controlButton,
                        {
                          backgroundColor: theme.bgMuted,
                          borderColor: theme.border,
                          opacity: isLastStep ? 0.42 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="arrow-forward" size={18} color={theme.textSecondary} />
                    </AnimatedPressable>
                    {!isDesktop ? (
                      <Text
                        style={[
                          styles.mobileProgressLabel,
                          { color: theme.textMuted, fontFamily: theme.fontSansMedium },
                        ]}
                      >
                        {activeIndex + 1} de {PROFESSIONAL_SHOWCASE_STEPS.length}
                      </Text>
                    ) : null}
                  </View>

                  <AnimatedPressable
                    onPress={() => handleRegister('stage')}
                    pressScale={0.98}
                    accessibilityLabel="Crear cuenta profesional"
                    style={[
                      styles.stageRegisterButton,
                      { backgroundColor: theme.actionPrimary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageRegisterText,
                        { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold },
                      ]}
                    >
                      Crear cuenta profesional
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color={theme.actionPrimaryText} />
                  </AnimatedPressable>
                </View>
              </View>
            </View>
          </MotionView>

          <MotionView entering="fadeInUp" delay={100} style={styles.finalCtaMotion}>
            <View
              style={[
                styles.finalCta,
                isDesktop && styles.finalCtaDesktop,
                {
                  backgroundColor: theme.landingCta,
                  borderColor: theme.landingPanelBorder,
                  shadowColor: theme.shadowStrong,
                },
              ]}
            >
              <View style={styles.finalCtaCopy}>
                <Text
                  style={[
                    styles.finalCtaEyebrow,
                    { color: theme.landingCtaMutedText, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  TU ESPACIO PROFESIONAL
                </Text>
                <Text
                  style={[
                    styles.finalCtaTitle,
                    { color: theme.landingCtaText, fontFamily: theme.fontDisplay },
                  ]}
                >
                  Prepara HERA para trabajar a tu manera.
                </Text>
                <Text
                  style={[
                    styles.finalCtaDescription,
                    { color: theme.landingCtaMutedText, fontFamily: theme.fontSans },
                  ]}
                >
                  Crea tu cuenta y completa la verificación profesional para configurar
                  el perfil, la agenda y la operativa de tu consulta.
                </Text>
              </View>
              <View style={[styles.finalCtaActions, isDesktop && styles.finalCtaActionsDesktop]}>
                <AnimatedPressable
                  onPress={() => handleRegister('final')}
                  accessibilityLabel="Empezar como profesional"
                  style={[
                    styles.finalPrimaryAction,
                    { backgroundColor: theme.landingCtaText },
                  ]}
                >
                  <Text
                    style={[
                      styles.finalPrimaryText,
                      { color: theme.landingCta, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    Empezar como profesional
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.landingCta} />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleBackToLanding}
                  hoverLift={false}
                  accessibilityLabel="Volver a la página principal"
                  style={[
                    styles.finalSecondaryAction,
                    { borderColor: theme.landingCtaMutedText },
                  ]}
                >
                  <Text
                    style={[
                      styles.finalSecondaryText,
                      { color: theme.landingCtaText, fontFamily: theme.fontSansSemiBold },
                    ]}
                  >
                    Volver a la landing
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </MotionView>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradientCanvas: {
    minHeight: '100%',
    paddingTop: 112,
    paddingBottom: 64,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  ambientOrbTop: {
    width: 420,
    height: 420,
    top: -170,
    right: -130,
  },
  ambientOrbBottom: {
    width: 520,
    height: 520,
    bottom: 220,
    left: -260,
  },
  hero: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    marginBottom: 36,
  },
  heroDesktop: {
    paddingHorizontal: 20,
    marginBottom: 48,
  },
  backLink: {
    alignSelf: 'flex-start',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    marginBottom: 22,
  },
  backLinkText: {
    fontSize: 14,
  },
  heroLayout: {
    gap: 24,
  },
  heroLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 64,
  },
  heroCopyDesktop: {
    flex: 1,
    maxWidth: 790,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 18,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.25,
  },
  heroTitle: {
    maxWidth: 800,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  heroTitleTablet: {
    fontSize: 54,
    lineHeight: 60,
    letterSpacing: -1.1,
  },
  heroTitleDesktop: {
    fontSize: 68,
    lineHeight: 72,
    letterSpacing: -1.6,
  },
  heroSubtitle: {
    maxWidth: 750,
    marginTop: 18,
    fontSize: 17,
    lineHeight: 27,
  },
  heroAsideDesktop: {
    width: 330,
  },
  heroAside: {
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 5,
  },
  heroAsideLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 15,
  },
  heroFacts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  heroFact: {
    flex: 1,
    gap: 5,
  },
  heroFactDivider: {
    width: 1,
    height: 56,
  },
  heroFactValue: {
    fontSize: 34,
    lineHeight: 37,
  },
  heroFactLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  showcaseMotion: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
  showcaseShell: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 1,
    shadowRadius: 54,
    elevation: 9,
  },
  showcaseShellDesktop: {
    minHeight: 820,
    flexDirection: 'row',
    borderRadius: 30,
  },
  navigationRail: {
    width: 310,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRightWidth: 1,
  },
  navigationRailHeading: {
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  navigationRailEyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  navigationRailTitle: {
    fontSize: 24,
    lineHeight: 29,
  },
  stepList: {
    gap: 8,
  },
  stepButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 16,
  },
  stepNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  stepSummary: {
    fontSize: 12,
    lineHeight: 16,
  },
  railProgressBlock: {
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingTop: 30,
  },
  progressTrack: {
    height: 3,
    overflow: 'hidden',
    borderRadius: 999,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    marginTop: 10,
    fontSize: 11,
  },
  productStage: {
    flex: 1,
    minWidth: 0,
    padding: 14,
  },
  mobileStepList: {
    gap: 8,
    paddingBottom: 14,
  },
  mobileStep: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  mobileStepText: {
    fontSize: 12,
  },
  productFrame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
  },
  productToolbar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  windowDots: {
    flexDirection: 'row',
    gap: 5,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productToolbarLabel: {
    flex: 1,
    minWidth: 0,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  productToolbarText: {
    fontSize: 11,
  },
  productToolbarCount: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  screenshotMotion: {
    width: '100%',
  },
  screenshotCanvas: {
    width: '100%',
    aspectRatio: 2.22,
    position: 'relative',
  },
  screenshot: {
    width: '100%',
    height: '100%',
  },
  screenshotBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 999,
  },
  screenshotBadgeText: {
    fontSize: 11,
  },
  stageCopyMotion: {
    width: '100%',
  },
  stageCopy: {
    gap: 18,
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  stageCopyTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
  },
  stageNarrative: {
    flex: 1,
  },
  stageEyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  stageTitle: {
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  stageDescription: {
    maxWidth: 680,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  highlightPanel: {
    flex: 0.75,
    minWidth: 250,
    padding: 17,
    borderWidth: 1,
    borderRadius: 16,
  },
  highlightLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  highlights: {
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  highlightIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  stageFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingTop: 18,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  stageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },
  mobileProgressLabel: {
    marginLeft: 5,
    fontSize: 11,
  },
  stageRegisterButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  stageRegisterText: {
    fontSize: 13,
  },
  finalCtaMotion: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    marginTop: 46,
  },
  finalCta: {
    padding: 28,
    borderWidth: 1,
    borderRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 7,
    gap: 26,
  },
  finalCtaDesktop: {
    minHeight: 240,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 42,
    paddingHorizontal: 48,
  },
  finalCtaCopy: {
    flex: 1,
    maxWidth: 720,
  },
  finalCtaEyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 11,
  },
  finalCtaTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  finalCtaDescription: {
    marginTop: 11,
    fontSize: 14,
    lineHeight: 22,
  },
  finalCtaActions: {
    gap: 10,
  },
  finalCtaActionsDesktop: {
    minWidth: 248,
  },
  finalPrimaryAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  finalPrimaryText: {
    fontSize: 14,
  },
  finalSecondaryAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 14,
  },
  finalSecondaryText: {
    fontSize: 13,
  },
});

export default ProfessionalShowcaseScreen;
