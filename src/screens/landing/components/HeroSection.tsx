/**
 * HeroSection Component
 *
 * The most critical section - hooks visitors in 3 seconds.
 * Features dual CTAs for clients and professionals.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';

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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Infinite bounce animation for scroll indicator
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
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
      <View style={[
        styles.content,
        isDesktop && styles.contentDesktop,
        isTablet && styles.contentTablet,
      ]}>
        {/* Left Side: Text Content */}
        <Animated.View
          style={[
            styles.textContainer,
            isDesktop && styles.textContainerDesktop,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color={heraLanding.primary} />
            <Text style={styles.badgeText}>Especialistas verificados</Text>
          </View>

          {/* Main Headline */}
          <Text style={[styles.headline, isDesktop && styles.headlineDesktop]}>
            Tu bienestar emocional{'\n'}merece la mejor{'\n'}
            <Text style={styles.headlineAccent}>atención</Text>
          </Text>

          {/* Subheadline */}
          <Text style={[styles.subheadline, isDesktop && styles.subheadlineDesktop]}>
            Conecta con especialistas verificados desde cualquier lugar.{'\n'}
            Terapia online o presencial, tú decides.
          </Text>

          {/* CTAs */}
          <View style={[styles.ctaContainer, isDesktop && styles.ctaContainerDesktop]}>
            {/* Primary CTA */}
            <TouchableOpacity
              style={styles.primaryCTA}
              onPress={onFindSpecialist}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[heraLanding.primary, heraLanding.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryCTAGradient}
              >
                <Text style={styles.primaryCTAText}>Encuentra tu especialista</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity
              style={styles.secondaryCTA}
              onPress={onJoinAsProfessional}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryCTAText}>Únete como profesional</Text>
              <Ionicons name="briefcase-outline" size={18} color={heraLanding.secondary} />
            </TouchableOpacity>
          </View>

          {/* Trust Indicator */}
          <View style={styles.trustIndicator}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={16}
                  color="#FFB800"
                />
              ))}
            </View>
            <Text style={styles.trustText}>4.9/5 valoración media · +100 especialistas</Text>
          </View>
        </Animated.View>

        {/* Right Side: Visual */}
        <Animated.View
          style={[
            styles.visualContainer,
            isDesktop && styles.visualContainerDesktop,
            isTablet && styles.visualContainerTablet,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.illustrationWrapper}>
            {/* Decorative background shapes */}
            <View style={[styles.decorativeCircle, styles.circle1]} />
            <View style={[styles.decorativeCircle, styles.circle2]} />

            {/* Abstract illustration - Wellness visual */}
            <View style={[styles.illustrationContainer, isDesktop && styles.illustrationContainerDesktop]}>
              {/* Central icon */}
              <View style={styles.centralIconWrapper}>
                <LinearGradient
                  colors={[heraLanding.primary, heraLanding.primaryLight]}
                  style={styles.centralIconGradient}
                >
                  <Ionicons name="heart" size={48} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Orbiting elements */}
              <View style={[styles.orbitElement, styles.orbit1]}>
                <Ionicons name="chatbubble-ellipses" size={24} color={heraLanding.secondary} />
              </View>
              <View style={[styles.orbitElement, styles.orbit2]}>
                <Ionicons name="people" size={24} color={heraLanding.primary} />
              </View>
              <View style={[styles.orbitElement, styles.orbit3]}>
                <Ionicons name="shield-checkmark" size={24} color={heraLanding.success} />
              </View>
            </View>
          </View>

          {/* Floating cards */}
          <View style={[styles.floatingCard, styles.floatingCard1]}>
            <Ionicons name="videocam" size={20} color={heraLanding.primary} />
            <Text style={styles.floatingCardText}>Sesiones online</Text>
          </View>

          <View style={[styles.floatingCard, styles.floatingCard2]}>
            <Ionicons name="lock-closed" size={20} color={heraLanding.secondary} />
            <Text style={styles.floatingCardText}>100% privado</Text>
          </View>
        </Animated.View>
      </View>

      {/* Scroll indicator - shows on all screen sizes when visible */}
      {showScrollIndicator && (
        <TouchableOpacity
          style={styles.scrollIndicatorContainer}
          onPress={onScrollIndicatorPress}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.scrollIndicator,
              { transform: [{ translateY: bounceTranslate }] },
            ]}
          >
            <Text style={styles.scrollIndicatorText}>Descubre más</Text>
            <View style={styles.scrollIndicatorArrows}>
              <Ionicons name="chevron-down" size={20} color={heraLanding.primary} />
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.background,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 580,
  },
  containerDesktop: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 60,
    minHeight: 'auto',
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

  // Text Container
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primaryDark,
  },

  // Headlines
  headline: {
    fontSize: 40,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    lineHeight: 48,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  headlineDesktop: {
    fontSize: 56,
    lineHeight: 64,
  },
  headlineAccent: {
    color: heraLanding.primary,
  },
  subheadline: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    lineHeight: 26,
    marginBottom: 32,
    maxWidth: 500,
  },
  subheadlineDesktop: {
    fontSize: 18,
    lineHeight: 28,
  },

  // CTAs
  ctaContainer: {
    gap: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  ctaContainerDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryCTA: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.lg,
    shadowColor: heraLanding.primary,
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
  },
  primaryCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: heraLanding.secondaryLight,
    backgroundColor: 'transparent',
    gap: 8,
  },
  secondaryCTAText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.secondaryDark,
  },

  // Trust Indicator
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
    fontSize: 14,
    color: heraLanding.textSecondary,
  },

  // Visual Container
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
    width: 380,
    height: 380,
  },
  centralIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  orbitElement: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  orbit1: {
    top: 20,
    right: 40,
  },
  orbit2: {
    bottom: 30,
    left: 30,
  },
  orbit3: {
    top: 80,
    left: 20,
  },

  // Decorative circles
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: heraLanding.primaryMuted,
    opacity: 0.4,
    top: -20,
    right: -30,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: heraLanding.secondaryMuted,
    opacity: 0.5,
    bottom: -10,
    left: -20,
  },

  // Floating cards
  floatingCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    ...shadows.md,
  },
  floatingCard1: {
    top: 20,
    right: 10,
  },
  floatingCard2: {
    bottom: 40,
    left: 0,
  },
  floatingCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
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
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  scrollIndicatorArrows: {
    alignItems: 'center',
  },
});
