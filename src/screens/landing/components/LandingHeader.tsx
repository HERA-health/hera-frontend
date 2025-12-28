/**
 * LandingHeader Component
 *
 * Always-visible sticky header with compact mode on scroll.
 * Shows logo, navigation links, and CTAs.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';
import { StyledLogo } from '../../../components/common/StyledLogo';

interface LandingHeaderProps {
  isScrolled: boolean;
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  onScrollToSection?: (section: 'howItWorks' | 'specializations' | 'forSpecialists') => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  isScrolled,
  onFindSpecialist,
  onJoinAsProfessional,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  // Animation values for scroll transition
  const heightAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const bgOpacityAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: isScrolled ? 0.85 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: isScrolled ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(bgOpacityAnim, {
        toValue: isScrolled ? 0.98 : 0.95,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isScrolled]);

  const animatedShadowStyle = {
    shadowOpacity: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.1],
    }),
    elevation: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

  const animatedBgStyle = {
    backgroundColor: bgOpacityAnim.interpolate({
      inputRange: [0.95, 0.98],
      outputRange: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)'],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedShadowStyle,
        animatedBgStyle,
        isScrolled && styles.containerScrolled,
      ]}
    >
      <View style={[
        styles.content,
        isDesktop && styles.contentDesktop,
        isMobile && styles.contentMobile,
      ]}>
        {/* Logo */}
        <TouchableOpacity style={styles.logoContainer} activeOpacity={0.8}>
          <StyledLogo size={isScrolled ? 32 : 38} />
          <Text style={[styles.brandName, isScrolled && styles.brandNameScrolled]}>
            HERA
          </Text>
        </TouchableOpacity>

        {/* Navigation Links (desktop only) */}
        {isDesktop && (
          <View style={styles.navLinks}>
            <TouchableOpacity
              style={styles.navLink}
              activeOpacity={0.7}
              onPress={() => onScrollToSection?.('howItWorks')}
            >
              <Text style={styles.navLinkText}>Cómo funciona</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              activeOpacity={0.7}
              onPress={() => onScrollToSection?.('specializations')}
            >
              <Text style={styles.navLinkText}>Especialidades</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              activeOpacity={0.7}
              onPress={() => onScrollToSection?.('forSpecialists')}
            >
              <Text style={styles.navLinkText}>Para profesionales</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CTAs */}
        <View style={styles.ctaContainer}>
          {isDesktop && (
            <TouchableOpacity
              style={styles.secondaryCTA}
              onPress={onJoinAsProfessional}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryCTAText}>Soy profesional</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryCTA, isScrolled && styles.primaryCTAScrolled]}
            onPress={onFindSpecialist}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryCTAText}>Empezar</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    // Backdrop blur effect for web
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  containerScrolled: {
    borderBottomColor: heraLanding.borderLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 18,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Logo
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    letterSpacing: 0.5,
  },
  brandNameScrolled: {
    fontSize: 22,
  },

  // Navigation
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navLink: {
    paddingVertical: 8,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },

  // CTAs
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
    ...shadows.sm,
  },
  primaryCTAScrolled: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  primaryCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryCTA: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.secondary,
  },
});
