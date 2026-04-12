/**
 * HeroSection — HERA Design System v5.0
 *
 * Premium hero with:
 * - Fraunces-Black display typography
 * - AmbientBackground gradient blobs
 * - GlassCard floating elements + central orb
 * - MotionView staggered entry (Reanimated)
 * - AnimatedPressable CTAs
 * - Dark mode via useTheme()
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
import { Ionicons } from '@expo/vector-icons';
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

  // Bounce animation for scroll indicator (keep RN Animated for this simple loop)
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
  }, []);

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {/* Ambient gradient blobs — landing variant */}
      <AmbientBackground variant="landing" />

      <View style={[
        styles.content,
        isDesktop && styles.contentDesktop,
        isTablet && styles.contentTablet,
      ]}>
        {/* ── Left: Text Content ────────────────────────────────────────── */}
        <View style={[styles.textContainer, isDesktop && styles.textContainerDesktop]}>

          {/* Badge — stagger 0ms */}
          <MotionView entering="fadeInUp" delay={0} style={styles.badgeWrapper}>
            <GlassCard intensity={28} borderRadius={20} style={styles.badgePill}>
              <Ionicons name="shield-checkmark" size={14} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold }]}>
                Especialistas verificados
              </Text>
            </GlassCard>
          </MotionView>

          {/* Headline — stagger 100ms */}
          <MotionView entering="fadeInUp" delay={100} duration={500}>
            <Text style={[
              styles.headline,
              isDesktop && styles.headlineDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}>
              Tu bienestar emocional{'\n'}merece la mejor{'\n'}
              <Text style={[styles.headlineAccent, { color: theme.primary, fontFamily: theme.fontDisplayItalic }]}>
                atención
              </Text>
            </Text>
          </MotionView>

          {/* Subheadline — stagger 200ms */}
          <MotionView entering="fadeInUp" delay={200}>
            <Text style={[
              styles.subheadline,
              isDesktop && styles.subheadlineDesktop,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}>
              Conecta con especialistas verificados desde cualquier lugar.{'\n'}
              Terapia online o presencial, tú decides.
            </Text>
          </MotionView>

          {/* CTAs — stagger 300ms */}
          <MotionView entering="fadeInUp" delay={300} style={[styles.ctaContainer, ...(isDesktop ? [styles.ctaContainerDesktop] : [])]}>
            {/* Primary CTA */}
            <AnimatedPressable
              onPress={onFindSpecialist}
              pressScale={0.96}
              hoverLift={true}
              style={[styles.primaryCTAWrapper, {
                shadowColor: theme.shadowPrimary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 1,
                shadowRadius: 18,
                elevation: 6,
                borderRadius: 14,
                overflow: 'hidden',
              }]}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCTAGradient}
              >
                <Text style={[styles.primaryCTAText, { fontFamily: theme.fontSansBold }]}>
                  Encuentra tu especialista
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </AnimatedPressable>

            {/* Secondary CTA */}
            <AnimatedPressable
              onPress={onJoinAsProfessional}
              pressScale={0.96}
              hoverLift={false}
              style={[styles.secondaryCTA, {
                borderColor: theme.border,
                backgroundColor: isDark ? theme.bgCard : 'rgba(255,255,255,0.72)',
              }]}
            >
              <Text style={[styles.secondaryCTAText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                Únete como profesional
              </Text>
              <Ionicons name="briefcase-outline" size={18} color={theme.secondary} />
            </AnimatedPressable>
          </MotionView>

          {/* Trust Indicator — stagger 400ms */}
          <MotionView entering="fadeIn" delay={400}>
            <View style={styles.trustIndicator}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={15} color={theme.starRating} />
                ))}
              </View>
              <Text style={[styles.trustText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                4.9/5 valoración media · +100 especialistas
              </Text>
            </View>
          </MotionView>
        </View>

        {/* ── Right: Visual ──────────────────────────────────────────────── */}
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
          {/* Central orb with glass + gradient */}
          <View style={styles.illustrationWrapper}>
            <View style={[styles.illustrationContainer, isDesktop && styles.illustrationContainerDesktop]}>
              {/* Outer glow ring */}
              <View style={[styles.glowRing, {
                borderColor: theme.primaryAlpha20,
                shadowColor: theme.primary,
              }]} />

              {/* Central glass orb */}
              <GlassCard
                intensity={70}
                borderRadius={60}
                style={styles.centralOrb}
              >
                <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centralOrbGradient}
                >
                  <Ionicons name="heart" size={44} color="#FFFFFF" />
                </LinearGradient>
              </GlassCard>

              {/* Orbit elements — glass pills */}
              <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit1]}>
                <Ionicons name="chatbubble-ellipses" size={22} color={theme.secondary} />
              </GlassCard>
              <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit2]}>
                <Ionicons name="people" size={22} color={theme.primary} />
              </GlassCard>
              {showFloatingDetails && (
                <GlassCard intensity={26} borderRadius={24} style={[styles.orbitElement, styles.orbit3]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.success} />
                </GlassCard>
              )}
            </View>
          </View>

          {/* Floating info cards — GlassCard */}
          {showFloatingDetails && (
            <>
              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard1]}>
                <Ionicons name="videocam" size={18} color={theme.primary} />
                <Text style={[styles.floatingCardText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Sesiones online
                </Text>
              </GlassCard>

              <GlassCard intensity={24} borderRadius={12} style={[styles.floatingCard, styles.floatingCard2]}>
                <Ionicons name="lock-closed" size={18} color={theme.secondary} />
                <Text style={[styles.floatingCardText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  100% privado
                </Text>
              </GlassCard>
            </>
          )}
        </MotionView>
      </View>

      {/* Scroll indicator */}
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
            <Text style={[styles.scrollIndicatorText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
              Descubre más
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

  // Text container
  textContainer: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  textContainerDesktop: {
    flex: 0.55,
    marginBottom: 0,
    paddingRight: 60,
  },

  // Badge
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

  // Headlines
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
  headlineAccent: {
    // Fraunces-Italic applied via fontFamily
  },
  subheadline: {
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 32,
    maxWidth: 500,
  },
  subheadlineDesktop: {
    fontSize: 18,
    lineHeight: 29,
  },

  // CTAs
  ctaContainer: {
    gap: 12,
    marginBottom: 28,
    width: '100%',
    maxWidth: 420,
  },
  ctaContainerDesktop: {
    flexDirection: 'row',
    gap: 14,
  },
  primaryCTAWrapper: {
    // shadow styles added inline
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 28,
    gap: 10,
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
  },
  secondaryCTAText: {
    fontSize: 15,
  },

  // Trust
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  trustText: {
    fontSize: 13,
  },

  // Visual container
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 300,
  },
  visualContainerDesktop: {
    flex: 0.45,
    minHeight: 450,
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

  // Central orb
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
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
  orbit3: { top: 80, left: 20 },

  // Floating cards
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
  floatingCard1: { top: 20, right: 10 },
  floatingCard2: { bottom: 40, left: 0 },
  floatingCardText: {
    fontSize: 13,
  },

  // Scroll indicator
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
