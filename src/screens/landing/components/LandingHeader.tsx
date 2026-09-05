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

export type LandingHeaderContext = 'landing' | 'directory' | 'access';

interface LandingHeaderProps {
  context: LandingHeaderContext;
  isScrolled: boolean;
  accessLabel?: string;
  accessIconName?: React.ComponentProps<typeof Ionicons>['name'];
  onLogoPress?: () => void;
  onFindSpecialist?: () => void;
  onExploreProfessionals: () => void;
  onAccess: () => void;
  onScrollToSection?: (section: LandingSectionAnchor) => void;
}

const NAV_ITEMS: ReadonlyArray<{ id: LandingSectionAnchor; label: string }> = [
  { id: 'featuredSpecialists', label: 'Especialistas' },
  { id: 'howItWorks', label: 'Cómo funciona' },
  { id: 'forSpecialists', label: 'Para profesionales' },
  { id: 'specializations', label: 'Especialidades' },
  { id: 'about', label: 'Quiénes somos' },
  { id: 'faq', label: 'FAQ' },
];

const WEB_SCROLLBAR_GUTTER = 16;
const MOBILE_BREAKPOINT = 768;
const WIDE_HEADER_BREAKPOINT = 1200;
const BRAND_DESCRIPTOR_BREAKPOINT = 1400;

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  context,
  isScrolled,
  accessLabel = 'Acceder',
  accessIconName = 'arrow-forward',
  onLogoPress,
  onFindSpecialist,
  onExploreProfessionals,
  onAccess,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isMobile = width < MOBILE_BREAKPOINT;
  const isWide = width >= WIDE_HEADER_BREAKPOINT;
  const showBrandDescriptor = width >= BRAND_DESCRIPTOR_BREAKPOINT;
  const isDirectory = context === 'directory';
  const isAccess = context === 'access';
  const scrollProgress = useSharedValue(0);

  useEffect(() => {
    scrollProgress.value = withTiming(isScrolled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.ease),
    });
  }, [isScrolled, scrollProgress]);

  const containerAnimStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(scrollProgress.value, [0, 1], [0, isDark ? 0.9 : 0.94]);
    const borderOpacity = interpolate(scrollProgress.value, [0, 1], [0, 1]);

    return {
      backgroundColor: context === 'landing' ? theme.landingCanvas : isDark
        ? `rgba(36, 37, 31, ${bgOpacity})`
        : `rgba(250, 248, 243, ${bgOpacity})`,
      borderBottomColor: isDark
        ? `rgba(69, 71, 60, ${borderOpacity})`
        : `rgba(220, 213, 202, ${borderOpacity})`,
    };
  });

  const webGlassStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: 'blur(18px) saturate(150%)',
        } as unknown as ViewStyle)
      : undefined;

  const logo = <StyledLogo size={isScrolled ? 42 : 46} />;

  return (
    <Animated.View
      style={[
        styles.container,
        Platform.OS === 'web' && !isMobile && styles.containerWeb,
        containerAnimStyle,
        context !== 'landing' && webGlassStyle,
      ]}
    >
      {context !== 'landing' && Platform.OS !== 'web' && isScrolled ? (
        <BlurView
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={[styles.content, isWide && styles.contentWide, isMobile && styles.contentMobile]}>
        <View style={styles.brandCluster}>
          {onLogoPress ? (
            <AnimatedPressable
              onPress={onLogoPress}
              hoverLift={false}
              pressScale={0.98}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="link"
              accessibilityLabel="Ir al inicio"
              style={styles.logoContainer}
            >
              {logo}
            </AnimatedPressable>
          ) : (
            <View style={styles.logoContainer}>{logo}</View>
          )}

          {showBrandDescriptor ? (
            <View
              style={[
                styles.brandDescriptor,
                { borderLeftColor: theme.borderStrong },
              ]}
            >
              <Text
                style={[
                  styles.brandDescriptorText,
                  {
                    color: theme.textSecondary,
                    fontFamily: theme.fontSansMedium,
                  },
                ]}
              >
                Salud mental
              </Text>
            </View>
          ) : null}
        </View>

        {isWide ? (
          <View style={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <AnimatedPressable
                key={item.id}
                onPress={() => onScrollToSection?.(item.id)}
                hoverLift={false}
                pressScale={0.96}
                accessibilityRole="link"
                accessibilityLabel={`Ir a ${item.label}`}
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
        ) : null}

        <View style={styles.actions}>
          <ThemeToggleButton size="sm" />

          {!isMobile && !isDirectory && onFindSpecialist ? (
            <AnimatedPressable
              onPress={onFindSpecialist}
              hoverLift={false}
              pressScale={0.96}
              accessibilityRole="link"
              accessibilityLabel="Explorar profesionales"
              style={[
                styles.secondaryAction,
                context === 'landing' && styles.landingAction,
                { backgroundColor: theme.secondaryAlpha12, borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                styles.secondaryActionText,
                  {
                    color: isDark ? theme.textPrimary : theme.secondaryDark,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                Explorar profesionales
              </Text>
              <Ionicons
                name="search-outline"
                size={16}
                color={isDark ? theme.textPrimary : theme.secondaryDark}
              />
            </AnimatedPressable>
          ) : null}

          {!isMobile && !isWide && !isAccess ? (
            <AnimatedPressable
              onPress={onExploreProfessionals}
              hoverLift={false}
              pressScale={0.96}
              accessibilityRole="link"
              accessibilityLabel="Ir a HERA para profesionales"
              style={[
                styles.secondaryAction,
                context === 'landing' && styles.landingAction,
                { backgroundColor: theme.primaryAlpha12, borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Para profesionales
              </Text>
            </AnimatedPressable>
          ) : null}

          {isWide || isMobile || isDirectory || isAccess ? (
            <AnimatedPressable
              onPress={onAccess}
              pressScale={0.96}
              hoverLift={context !== 'landing' && !isMobile}
              accessibilityRole="button"
              accessibilityLabel={accessLabel}
              style={[styles.primaryAction, context === 'landing' && styles.landingAction, { backgroundColor: theme.actionPrimary }]}
            >
              <Text
                style={[
                  styles.primaryActionText,
                  { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                {accessLabel}
              </Text>
              {!isMobile ? (
                <Ionicons name={accessIconName} size={16} color={theme.actionPrimaryText} />
              ) : null}
            </AnimatedPressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  landingAction: {
    borderRadius: 8,
    minHeight: 44,
  },
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
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 18,
  },
  contentWide: {
    maxWidth: 1720,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandDescriptor: {
    minHeight: 28,
    justifyContent: 'center',
    marginLeft: 14,
    paddingLeft: 14,
    borderLeftWidth: 1,
  },
  brandDescriptorText: {
    fontSize: 12,
    letterSpacing: 0.35,
  },
  navLinks: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  secondaryAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
  },
  secondaryActionText: {
    fontSize: 14,
  },
  primaryAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 7,
  },
  primaryActionText: {
    fontSize: 14,
  },
});
