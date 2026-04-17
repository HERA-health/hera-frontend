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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';
import { GlassCard } from '../../../components/common/GlassCard';
import { AmbientBackground } from '../../../components/common/AmbientBackground';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';

interface HeroSectionProps {
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  showScrollIndicator?: boolean;
  onScrollIndicatorPress?: () => void;
}

const FLOATING_FEATURES = [
  { icon: 'calendar-outline' as const, label: 'Agenda clara' },
  { icon: 'people-outline' as const, label: 'Pacientes y sesiones' },
  { icon: 'receipt-outline' as const, label: 'Facturación' },
  { icon: 'shield-checkmark-outline' as const, label: 'RGPD y LOPDGDD' },
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
  const showFloatingDetails = width >= 900;
  const { theme, isDark } = useTheme();

  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
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

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <AmbientBackground variant="landing" />

      <View
        style={[
          styles.content,
          isDesktop && styles.contentDesktop,
          isTablet && styles.contentTablet,
        ]}
      >
        <View style={[styles.textContainer, isDesktop && styles.textContainerDesktop]}>
          <MotionView entering="fadeInUp" delay={0} style={styles.badgeWrapper}>
            <GlassCard intensity={28} borderRadius={20} style={styles.badgePill}>
              <Ionicons name="briefcase-outline" size={14} color={theme.primary} />
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold },
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
                { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              ]}
            >
              Tu consulta en un{'\n'}solo espacio para{'\n'}
              <Text
                style={[
                  styles.headlineAccent,
                  { color: theme.primary, fontFamily: theme.fontDisplayItalic },
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
                  backgroundColor: theme.primaryDark,
                  shadowColor: theme.shadowPrimary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  elevation: 6,
                  borderRadius: 14,
                  overflow: 'hidden',
                },
              ]}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCTAGradient}
              >
                <Text style={[styles.primaryCTAText, { fontFamily: theme.fontSansBold }]}>
                  Acceder como profesional
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={onFindSpecialist}
              pressScale={0.96}
              hoverLift={false}
              style={[
                styles.secondaryCTA,
                {
                  borderColor: isDark ? theme.secondaryDark : theme.secondaryAlpha12,
                  backgroundColor: isDark ? theme.secondaryMuted : theme.secondaryAlpha12,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryCTAText,
                  { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Busco terapia
              </Text>
              <Ionicons name="search-outline" size={18} color={theme.secondaryDark} />
            </AnimatedPressable>
          </MotionView>

          <MotionView entering="fadeIn" delay={400}>
            <View style={styles.trustIndicator}>
              <View style={styles.trustPill}>
                <Ionicons name="calendar-clear-outline" size={14} color={theme.primary} />
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
            ...(isDesktop ? [styles.visualContainerDesktop] : []),
            ...(isTablet ? [styles.visualContainerTablet] : []),
          ]}
        >
          <View style={styles.illustrationWrapper}>
            <View
              style={[
                styles.illustrationContainer,
                isDesktop && styles.illustrationContainerDesktop,
              ]}
            >
              <View
                style={[
                  styles.glowRing,
                  {
                    borderColor: theme.primaryAlpha20,
                    shadowColor: theme.primary,
                  },
                ]}
              />

              <GlassCard intensity={70} borderRadius={60} style={styles.centralOrb}>
                <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centralOrbGradient}
                >
                  <Ionicons name="grid-outline" size={42} color="#FFFFFF" />
                </LinearGradient>
              </GlassCard>

              <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit1]}>
                <Ionicons name="calendar-outline" size={22} color={theme.primary} />
              </GlassCard>
              <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit2]}>
                <Ionicons name="people-outline" size={22} color={theme.secondary} />
              </GlassCard>
              {showFloatingDetails && (
                <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit3]}>
                  <Ionicons name="stats-chart-outline" size={22} color={theme.success} />
                </GlassCard>
              )}
            </View>
          </View>

          {showFloatingDetails && (
            <>
              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard1]}>
                <Ionicons name={FLOATING_FEATURES[0].icon} size={18} color={theme.primary} />
                <Text
                  style={[
                    styles.floatingCardText,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {FLOATING_FEATURES[0].label}
                </Text>
              </GlassCard>

              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard2]}>
                <Ionicons name={FLOATING_FEATURES[1].icon} size={18} color={theme.secondary} />
                <Text
                  style={[
                    styles.floatingCardText,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {FLOATING_FEATURES[1].label}
                </Text>
              </GlassCard>

              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard3]}>
                <Ionicons name={FLOATING_FEATURES[2].icon} size={18} color={theme.success} />
                <Text
                  style={[
                    styles.floatingCardText,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {FLOATING_FEATURES[2].label}
                </Text>
              </GlassCard>

              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard4]}>
                <Ionicons name={FLOATING_FEATURES[3].icon} size={18} color={theme.primaryDark} />
                <Text
                  style={[
                    styles.floatingCardText,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {FLOATING_FEATURES[3].label}
                </Text>
              </GlassCard>
            </>
          )}
        </MotionView>
      </View>

      {showScrollIndicator && (
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
            <Ionicons name="chevron-down" size={20} color={theme.primary} />
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
    letterSpacing: -1,
  },
  headlineDesktop: {
    fontSize: 62,
    lineHeight: 72,
    letterSpacing: -2,
  },
  headlineAccent: {},
  subheadline: {
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 32,
    maxWidth: 540,
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
  ctaContainerDesktop: {
    flexDirection: 'row',
    gap: 14,
  },
  primaryCTAWrapper: {},
  primaryCTAGradient: {
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
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
  },
  visualContainerDesktop: {
    flex: 0.45,
    minHeight: 480,
  },
  visualContainerTablet: {
    flex: 0.5,
    minHeight: 350,
  },
  illustrationWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  illustrationContainerDesktop: {
    width: 360,
    height: 360,
  },
  glowRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 0,
  },
  centralOrb: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(139, 157, 131, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  centralOrbGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitElement: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit1: { top: 20, right: 40 },
  orbit2: { bottom: 30, left: 30 },
  orbit3: { top: 84, left: 18 },
  floatingCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: 'rgba(44,62,44,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingCard1: { top: 18, right: 4 },
  floatingCard2: { bottom: 32, left: -2 },
  floatingCard3: { top: 110, left: -18 },
  floatingCard4: { bottom: 108, right: -8 },
  floatingCardText: {
    fontSize: 13,
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
