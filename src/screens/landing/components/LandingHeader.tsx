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
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyledLogo } from '../../../components/common/StyledLogo';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { ThemeToggleButton } from '../../../components/common/ThemeToggleButton';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LandingSectionAnchor } from '../types';

interface LandingHeaderProps {
  isScrolled: boolean;
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  onJoinAsClinic: () => void;
  onScrollToSection?: (section: LandingSectionAnchor) => void;
}

const NAV_ITEMS = [
  { id: 'howItWorks' as const, label: 'Cómo funciona' },
  { id: 'forSpecialists' as const, label: 'Herramientas' },
  { id: 'specializations' as const, label: 'Especialidades' },
  { id: 'about' as const, label: 'Quiénes somos' },
  { id: 'faq' as const, label: 'FAQ' },
];

type NavItem = (typeof NAV_ITEMS)[number];

const WEB_SCROLLBAR_GUTTER = 16;
const DESKTOP_HEADER_BREAKPOINT = 1024;
const DESKTOP_NAV_BREAKPOINT = 1180;

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  isScrolled,
  onFindSpecialist,
  onJoinAsProfessional,
  onJoinAsClinic,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_HEADER_BREAKPOINT;
  const showDesktopNav = width >= DESKTOP_NAV_BREAKPOINT;
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
        ? `rgba(39, 40, 33, ${bgOpacity})`
        : `rgba(245, 240, 232, ${bgOpacity})`,
      borderBottomColor: isDark
        ? `rgba(71, 73, 62, ${borderOpacity})`
        : `rgba(223, 216, 205, ${borderOpacity})`,
    };
  });

  const webGlassStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        } as unknown as ViewStyle)
      : undefined;

  const renderNavItem = (item: NavItem) => {
    return (
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
            {
              color: theme.textSecondary,
              fontFamily: theme.fontSansMedium,
            },
          ]}
        >
          {item.label}
        </Text>
      </AnimatedPressable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        Platform.OS === 'web' && !isMobile && styles.containerWeb,
        containerAnimStyle,
        webGlassStyle,
      ]}
    >
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
          <StyledLogo size={isScrolled ? 42 : 46} />
        </View>

        {showDesktopNav && (
          <View style={styles.navLinks}>
            {NAV_ITEMS.map(renderNavItem)}
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
                  backgroundColor: isDark ? theme.bgMuted : theme.secondaryAlpha12,
                  borderColor: isDark ? theme.border : theme.secondaryAlpha12,
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
                name="arrow-forward"
                size={16}
                color={isDark ? theme.textSecondary : theme.secondaryDark}
              />
            </AnimatedPressable>
          )}

          {isDesktop ? (
            <AnimatedPressable
              onPress={onJoinAsClinic}
              hoverLift={false}
              pressScale={0.96}
              style={[
                styles.secondaryCTA,
                {
                  backgroundColor: isDark ? theme.bgMuted : theme.primaryAlpha12,
                  borderColor: isDark ? theme.border : theme.primaryAlpha12,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryCTAText,
                  {
                    color: isDark ? theme.textSecondary : theme.primaryDark,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                Clínicas
              </Text>
              <Ionicons
                name="business-outline"
                size={16}
                color={isDark ? theme.textSecondary : theme.primaryDark}
              />
            </AnimatedPressable>
          ) : null}

          <AnimatedPressable
            onPress={onJoinAsProfessional}
            pressScale={0.96}
            hoverLift
            style={[
              styles.primaryCTA,
              ...(isMobile ? [styles.primaryCTAMobile] : []),
              {
                backgroundColor: theme.actionPrimary,
                shadowColor: theme.shadowSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryCTAText,
                { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Soy profesional
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.actionPrimaryText} />
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
  containerWeb: {
    right: WEB_SCROLLBAR_GUTTER,
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
    flexShrink: 1,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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
