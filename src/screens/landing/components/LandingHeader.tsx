import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { StyledLogo } from '../../../components/common/StyledLogo';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { ThemeToggleButton } from '../../../components/common/ThemeToggleButton';
import { useTheme } from '../../../contexts/ThemeContext';

interface LandingHeaderProps {
  isScrolled: boolean;
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  onScrollToSection?: (section: 'howItWorks' | 'specializations' | 'forSpecialists') => void;
}

const NAV_ITEMS = [
  { id: 'howItWorks' as const, label: 'Cómo funciona' },
  { id: 'forSpecialists' as const, label: 'Herramientas' },
  { id: 'specializations' as const, label: 'Especialidades' },
];

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  isScrolled,
  onFindSpecialist,
  onJoinAsProfessional,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const { theme, isDark } = useTheme();
  const scrollProgress = useSharedValue(0);

  useEffect(() => {
    scrollProgress.value = withTiming(isScrolled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.ease),
    });
  }, [isScrolled, scrollProgress]);

  const containerAnimStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(scrollProgress.value, [0, 1], [0, isDark ? 0.84 : 0.92]);
    const borderOpacity = interpolate(scrollProgress.value, [0, 1], [0, 1]);

    return {
      backgroundColor: isDark
        ? `rgba(15, 20, 16, ${bgOpacity})`
        : `rgba(245, 247, 245, ${bgOpacity})`,
      borderBottomColor: isDark
        ? `rgba(42, 58, 42, ${borderOpacity})`
        : `rgba(226, 232, 226, ${borderOpacity})`,
    };
  });

  const webGlassStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        } as unknown as ViewStyle)
      : undefined;

  return (
    <Animated.View style={[styles.container, containerAnimStyle, webGlassStyle]}>
      {Platform.OS !== 'web' && isScrolled && (
        <BlurView
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={[
          styles.content,
          isDesktop && styles.contentDesktop,
          isMobile && styles.contentMobile,
        ]}
      >
        <View style={styles.logoContainer}>
          <StyledLogo size={isScrolled ? 32 : 36} />
          <Text
            style={[
              styles.brandName,
              isMobile && styles.brandNameMobile,
              { color: theme.textPrimary, fontFamily: theme.fontDisplayBold },
            ]}
          >
            HERA
          </Text>
        </View>

        {isDesktop && (
          <View style={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <AnimatedPressable
                key={item.id}
                onPress={() => onScrollToSection?.(item.id)}
                hoverLift={false}
                pressScale={0.96}
                style={styles.navLink}
              >
                <Text
                  style={[
                    styles.navLinkText,
                    { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
                  ]}
                >
                  {item.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        )}

        <View style={[styles.ctaContainer, isMobile && styles.ctaContainerMobile]}>
          <ThemeToggleButton size="sm" />

          {isDesktop && (
            <AnimatedPressable
              onPress={onFindSpecialist}
              hoverLift={false}
              pressScale={0.96}
              style={[
                styles.secondaryCTA,
                {
                  backgroundColor: theme.secondaryAlpha12,
                  borderColor: theme.secondaryAlpha12,
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
              <Ionicons name="arrow-forward" size={16} color={theme.secondaryDark} />
            </AnimatedPressable>
          )}

          <AnimatedPressable
            onPress={onJoinAsProfessional}
            pressScale={0.96}
            hoverLift
            style={[
              styles.primaryCTA,
              ...(isMobile ? [styles.primaryCTAMobile] : []),
              {
                backgroundColor: theme.primary,
                shadowColor: theme.shadowPrimary,
              },
            ]}
          >
            <Text style={[styles.primaryCTAText, { fontFamily: theme.fontSansSemiBold }]}>
              Soy profesional
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </AnimatedPressable>
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
    gap: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandNameMobile: {
    fontSize: 20,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaContainerMobile: {
    gap: 8,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryCTAMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryCTAText: {
    fontSize: 14,
  },
});
