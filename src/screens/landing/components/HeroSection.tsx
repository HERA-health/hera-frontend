/**
 * HeroSection - HERA Design System v5.0
 *
 * Specialist-first hero that keeps the editorial look and premium motion
 * while shifting the message from marketplace discovery to business operations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated as RNAnimated,
  Platform,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';
import { GlassCard } from '../../../components/common/GlassCard';
import { AmbientBackground } from '../../../components/common/AmbientBackground';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { StyledLogo } from '../../../components/common/StyledLogo';

interface HeroSectionProps {
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  showScrollIndicator?: boolean;
  onScrollIndicatorPress?: () => void;
}

type HeroHubFeature = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

const HERO_HUB_FEATURES: HeroHubFeature[] = [
  {
    icon: 'calendar-outline',
    title: 'Agenda',
    description: 'Organiza tu agenda de manera sencilla.',
  },
  {
    icon: 'people-outline',
    title: 'Pacientes y sesiones',
    description: 'Historial, citas y seguimiento en un solo lugar.',
  },
  {
    icon: 'receipt-outline',
    title: 'Facturación',
    description: 'Crea, gestiona y envía tus facturas.',
  },
  {
    icon: 'document-text-outline',
    title: 'Gestión clínica segura',
    description: 'Documentos y consentimientos cifrados para trabajar con seguridad.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'RGPD y LOPDGDD',
    description: 'Privacidad y cumplimiento alineados con la normativa.',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFindSpecialist,
  onJoinAsProfessional,
  showScrollIndicator = true,
  onScrollIndicatorPress,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;
  const isCompactMobile = width < 420;
  const showOrbitalLayout = width >= 1200;
  const { theme, isDark } = useTheme();

  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
      return undefined;
    }

    const bounceAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );

    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, [bounceAnim]);

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const hubCardPositions = [
    styles.hubCardAgenda,
    styles.hubCardPatients,
    styles.hubCardBilling,
    styles.hubCardClinical,
    styles.hubCardCompliance,
  ];
  const hubFeatureCardWebShadow = Platform.OS === 'web'
    ? ({
        boxShadow: isDark
          ? `0 18px 34px ${theme.shadowStrong}, 0 6px 16px ${theme.shadowNeutral}`
          : `0 18px 34px ${theme.shadowSecondary}, 0 6px 16px ${theme.shadowNeutral}`,
      } as ViewStyle)
    : null;

  const renderHubFeature = (feature: HeroHubFeature, index: number) => (
    <View
      key={feature.title}
      style={[
        styles.hubFeatureCard,
        showOrbitalLayout ? hubCardPositions[index] : styles.hubFeatureCardInline,
        isTablet && styles.hubFeatureCardTablet,
        isMobile && styles.hubFeatureCardMobile,
        {
          backgroundColor: isDark ? theme.bgCard : theme.bgElevated,
          borderColor: isDark ? theme.border : theme.borderLight,
          shadowColor: isDark ? theme.shadowNeutral : theme.shadowSecondary,
        },
        hubFeatureCardWebShadow,
      ]}
    >
      <View
        style={[
          styles.hubFeatureIcon,
          {
            backgroundColor: isDark ? theme.secondaryMuted : theme.secondaryAlpha12,
            borderColor: isDark ? theme.border : theme.borderStrong,
          },
        ]}
      >
        <Ionicons
          name={feature.icon}
          size={17}
          color={isDark ? theme.logoTint : theme.secondaryDark}
        />
      </View>
      <View style={styles.hubFeatureCopy}>
        <Text
          style={[
            styles.hubFeatureTitle,
            {
              color: theme.textPrimary,
              fontFamily: theme.fontSansBold,
            },
          ]}
        >
          {feature.title}
        </Text>
        <Text
          style={[
            styles.hubFeatureDescription,
            {
              color: theme.textSecondary,
              fontFamily: theme.fontSans,
            },
          ]}
        >
          {feature.description}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isMobile && styles.containerMobile, isDesktop && styles.containerDesktop]}>
      <AmbientBackground variant="landing" />

      <View
        style={[
          styles.content,
          isDesktop && styles.contentDesktop,
          isTablet && styles.contentTablet,
        ]}
      >
        <View style={[styles.textContainer, isMobile && styles.textContainerMobile, isDesktop && styles.textContainerDesktop]}>
          <MotionView entering="fadeInUp" delay={0} style={styles.badgeWrapper}>
            <GlassCard intensity={28} borderRadius={20} style={styles.badgePill}>
              <Ionicons name="briefcase-outline" size={14} color={isDark ? theme.logoTint : theme.primary} />
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isDark ? theme.textSecondary : theme.primaryDark,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                Aplicación de gestión para especialistas en salud mental
              </Text>
            </GlassCard>
          </MotionView>

          <MotionView entering="fadeInUp" delay={100} duration={500}>
            <Text
              style={[
                styles.headline,
                isDesktop && styles.headlineDesktop,
                isMobile && styles.headlineMobile,
                isCompactMobile && styles.headlineCompactMobile,
                { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              ]}
            >
              {isDesktop ? 'Tu consulta en un\nsolo espacio para\n' : 'Tu consulta en un solo espacio para\n'}
              <Text
                style={[
                  styles.headlineAccent,
                  { color: isDark ? theme.link : theme.primary, fontFamily: theme.fontDisplay },
                ]}
              >
                gestionar mejor
              </Text>
            </Text>
          </MotionView>

          <MotionView entering="fadeInUp" delay={200}>
            <Text
              style={[
                styles.subheadline,
                isMobile && styles.subheadlineMobile,
                isDesktop && styles.subheadlineDesktop,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              Organiza agenda, pacientes, sesiones, disponibilidad y facturación
              desde una experiencia clara, privada y pensada para tu operativa
              diaria en salud mental.
            </Text>
          </MotionView>

          <MotionView
            entering="fadeInUp"
            delay={300}
            style={[
              styles.ctaContainer,
              ...(isCompactMobile ? [styles.ctaContainerCompactMobile] : []),
              ...(isDesktop ? [styles.ctaContainerDesktop] : []),
            ]}
          >
            <AnimatedPressable
              onPress={onJoinAsProfessional}
              pressScale={0.96}
              hoverLift
              style={[
                styles.primaryCTAWrapper,
                {
                  backgroundColor: theme.actionPrimary,
                  shadowColor: theme.shadowSecondary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  elevation: 6,
                  borderRadius: 14,
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={[styles.primaryCTASurface, { backgroundColor: theme.actionPrimary }]}>
                <Text
                  style={[
                    styles.primaryCTAText,
                    { color: theme.actionPrimaryText, fontFamily: theme.fontSansBold },
                  ]}
                >
                  Acceder como profesional
                </Text>
                <Ionicons name="arrow-forward" size={20} color={theme.actionPrimaryText} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={onFindSpecialist}
              pressScale={0.96}
              hoverLift={false}
              style={[
                styles.secondaryCTA,
                {
                  borderColor: isDark ? theme.borderStrong : theme.secondaryAlpha12,
                  backgroundColor: isDark ? theme.bgMuted : theme.secondaryAlpha12,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryCTAText,
                  {
                    color: isDark ? theme.textSecondary : theme.secondaryDark,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                Busco terapia
              </Text>
              <Ionicons
                name="search-outline"
                size={18}
                color={isDark ? theme.textMuted : theme.secondaryDark}
              />
            </AnimatedPressable>
          </MotionView>

          <MotionView entering="fadeIn" delay={400}>
            <View style={styles.trustIndicator}>
              <View style={styles.trustPill}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={14}
                  color={isDark ? theme.textMuted : theme.primary}
                />
                <Text
                style={[
                  styles.trustPillText,
                  { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                ]}
                >
                  Agenda, pacientes, seguimiento y cumplimiento
                </Text>
              </View>
            </View>
          </MotionView>
        </View>

        <MotionView
          entering="fadeIn"
          delay={150}
          duration={600}
          damping={25}
          style={[
            styles.visualContainer,
            ...(isMobile ? [styles.visualContainerMobile] : []),
            ...(isCompactMobile ? [styles.visualContainerCompactMobile] : []),
            ...(isDesktop ? [styles.visualContainerDesktop] : []),
            ...(isTablet ? [styles.visualContainerTablet] : []),
          ]}
        >
          <View
            style={[
              styles.hubStage,
              ...(isMobile ? [styles.hubStageMobile] : []),
              ...(isCompactMobile ? [styles.hubStageCompactMobile] : []),
              ...(isTablet ? [styles.hubStageTablet] : []),
              ...(showOrbitalLayout ? [styles.hubStageDesktop] : []),
            ]}
          >
            <View
              style={[
                styles.hubOrbit,
                ...(isMobile ? [styles.hubOrbitMobile] : []),
                ...(showOrbitalLayout ? [styles.hubOrbitDesktop] : []),
              ]}
            >
              <View
                style={[
                  styles.hubCenter,
                  showOrbitalLayout && styles.hubCenterDesktop,
                  {
                    backgroundColor: isDark ? theme.bgCard : theme.primary,
                    shadowColor: theme.shadowSecondary,
                  },
                ]}
              >
                <StyledLogo
                  variant="mark"
                  size={showOrbitalLayout ? 58 : 48}
                  tone={isDark ? 'beigeLight' : 'beigeLight'}
                  tintColor={isDark ? theme.logoTint : theme.surfaceWarm}
                />
              </View>

              {showOrbitalLayout ? HERO_HUB_FEATURES.map(renderHubFeature) : null}
            </View>

            {!showOrbitalLayout ? (
              <View style={[styles.hubFeatureGrid, isMobile && styles.hubFeatureGridMobile]}>
                {HERO_HUB_FEATURES.map(renderHubFeature)}
              </View>
            ) : null}
          </View>
        </MotionView>
      </View>

      {showScrollIndicator && !isMobile && (
        <AnimatedPressable
          onPress={onScrollIndicatorPress}
          hoverLift={false}
          pressScale={0.92}
          style={styles.scrollIndicatorContainer}
        >
          <RNAnimated.View
            style={[
              styles.scrollIndicator,
              { transform: [{ translateY: bounceTranslate }] },
            ]}
          >
            <Text
              style={[
                styles.scrollIndicatorText,
                { color: theme.textMuted, fontFamily: theme.fontSans },
              ]}
            >
              Descubre las herramientas
            </Text>
            <Ionicons name="chevron-down" size={20} color={isDark ? theme.textMuted : theme.primary} />
          </RNAnimated.View>
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 580,
    overflow: 'hidden',
  },
  containerMobile: {
    paddingTop: 14,
    paddingBottom: 24,
    minHeight: 0,
  },
  containerDesktop: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  textContainer: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  textContainerMobile: {
    marginBottom: 22,
  },
  textContainerDesktop: {
    flex: 0.55,
    marginBottom: 0,
    paddingRight: 60,
  },
  badgeWrapper: {
    marginBottom: 24,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
  },
  headline: {
    fontSize: 40,
    lineHeight: 50,
    marginBottom: 20,
    letterSpacing: 0,
  },
  headlineMobile: {
    fontSize: 38,
    lineHeight: 47,
  },
  headlineCompactMobile: {
    fontSize: 35,
    lineHeight: 43,
  },
  headlineDesktop: {
    fontSize: 62,
    lineHeight: 72,
    letterSpacing: 0,
  },
  headlineAccent: {},
  subheadline: {
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 32,
    maxWidth: 540,
  },
  subheadlineMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
  },
  subheadlineDesktop: {
    fontSize: 18,
    lineHeight: 29,
  },
  ctaContainer: {
    gap: 12,
    marginBottom: 28,
    width: '100%',
    maxWidth: 520,
  },
  ctaContainerCompactMobile: {
    marginBottom: 18,
  },
  ctaContainerDesktop: {
    flexDirection: 'row',
    gap: 14,
  },
  primaryCTAWrapper: {},
  primaryCTASurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 28,
    gap: 10,
    borderRadius: 14,
  },
  primaryCTAText: {
    fontSize: 16,
    letterSpacing: 0,
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    minHeight: 58,
  },
  secondaryCTAText: {
    fontSize: 15,
  },
  trustIndicator: {
    maxWidth: 560,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustPillText: {
    fontSize: 14,
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 320,
    width: '100%',
  },
  visualContainerMobile: {
    minHeight: 0,
  },
  visualContainerCompactMobile: {
    minHeight: 0,
  },
  visualContainerDesktop: {
    flex: 0.45,
    minHeight: 500,
  },
  visualContainerTablet: {
    flexBasis: '100%',
    minHeight: 0,
    marginTop: 18,
  },
  hubStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 560,
  },
  hubStageDesktop: {
    maxWidth: 680,
    minHeight: 470,
  },
  hubStageTablet: {
    maxWidth: 680,
    alignSelf: 'center',
  },
  hubStageMobile: {
    maxWidth: 430,
  },
  hubStageCompactMobile: {
    maxWidth: 360,
  },
  hubOrbit: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 18,
  },
  hubOrbitMobile: {
    width: 210,
    height: 210,
    marginBottom: 14,
  },
  hubOrbitDesktop: {
    width: 680,
    height: 470,
    marginBottom: 0,
  },
  hubCenter: {
    width: 104,
    height: 104,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  hubCenterDesktop: {
    width: 118,
    height: 118,
    borderRadius: 30,
  },
  hubFeatureGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  hubFeatureGridMobile: {
    gap: 8,
  },
  hubFeatureCard: {
    position: 'absolute',
    width: 230,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  hubFeatureCardInline: {
    position: 'relative',
    width: '48%',
  },
  hubFeatureCardTablet: {
    width: '48%',
  },
  hubFeatureCardMobile: {
    width: '100%',
    minHeight: 0,
  },
  hubCardAgenda: {
    top: 18,
    right: 112,
  },
  hubCardPatients: {
    bottom: 8,
    left: 54,
  },
  hubCardBilling: {
    top: 150,
    left: -4,
  },
  hubCardClinical: {
    top: 165,
    right: -6,
  },
  hubCardCompliance: {
    right: 68,
    bottom: 30,
  },
  hubFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hubFeatureCopy: {
    flex: 1,
    minWidth: 0,
  },
  hubFeatureTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
  },
  hubFeatureDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  scrollIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  scrollIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  scrollIndicatorText: {
    fontSize: 13,
  },
});
