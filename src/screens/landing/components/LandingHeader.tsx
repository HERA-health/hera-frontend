import { PUBLIC_HEADER_LINKS } from '../../../constants/publicHeaderLinks';
import React, { useEffect } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
  type LayoutChangeEvent,
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

export type LandingHeaderContext = 'landing' | 'directory' | 'access' | 'pricing' | 'questionnaire' | 'psychology';

interface LandingHeaderProps {
  onLayout?: (event: LayoutChangeEvent) => void;
  context: LandingHeaderContext;
  isScrolled: boolean;
  accessLabel?: string;
  accessIconName?: React.ComponentProps<typeof Ionicons>['name'];
  onLogoPress?: () => void;
  onFindSpecialist?: () => void;
  onQuestionnaire?: () => void;
  onExploreProfessionals?: () => void;
  onAccess: () => void;
  onViewPlans?: () => void;
  onScrollToSection?: (section: LandingSectionAnchor) => void;
}

const WEB_SCROLLBAR_GUTTER = 16;
const MOBILE_BREAKPOINT = 768;
const WIDE_HEADER_BREAKPOINT = 1200;
const BRAND_DESCRIPTOR_BREAKPOINT = 1400;
const COMPACT_PROFESSIONAL_LINK_BREAKPOINT = 1024;
const WORDMARK_BREAKPOINT = 360;

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onLayout,
  context,
  isScrolled,
  accessLabel = 'Acceder',
  accessIconName = 'arrow-forward',
  onLogoPress,
  onFindSpecialist,
  onQuestionnaire,
  onExploreProfessionals,
  onAccess,
  onViewPlans,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isMobile = width < MOBILE_BREAKPOINT;
  const landing = context === 'landing';
  const isWide = width >= (onViewPlans ? BRAND_DESCRIPTOR_BREAKPOINT : WIDE_HEADER_BREAKPOINT);
  const compactLanding = landing && width < 1600;
  const scrollLanding = landing && width < 1280;
  const showBrandDescriptor = !landing && width >= BRAND_DESCRIPTOR_BREAKPOINT && (!onViewPlans || width >= 1600);
  const isDirectory = context === 'directory' || context === 'questionnaire';
  const isAccess = context === 'access' || context === 'pricing' || context === 'psychology';
  const scrollProgress = useSharedValue(0);

  useEffect(() => {
    scrollProgress.value = withTiming(isScrolled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.ease),
    });
  }, [isScrolled, scrollProgress]);

  const containerAnimStyle = useAnimatedStyle(() => {
    // The questionnaire already paints a continuous background behind the header.
    if (context === 'questionnaire') {
      return { backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: 'transparent' };
    }
    if (context === 'pricing' || context === 'psychology') {
      return {
        backgroundColor: theme.landingCanvas,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
      };
    }
    const bgOpacity = interpolate(scrollProgress.value, [0, 1], [0, isDark ? 0.9 : 0.94]);
    const borderOpacity = interpolate(scrollProgress.value, [0, 1], [0, 1]);

    return {
      backgroundColor: context === 'landing' ? theme.surfaceWarm : isDark
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

  const logo = <StyledLogo variant={(landing && isMobile) || (onViewPlans && width < WORDMARK_BREAKPOINT) ? 'mark' : 'wordmark'} size={landing ? (isMobile ? 34 : 52) : isScrolled ? 42 : 46} />;
  const plansLink = onViewPlans && !(context === 'questionnaire' && isMobile) ? (
    <AnimatedPressable
      onPress={onViewPlans}
      href="/planes"
      hoverLift={false}
      pressScale={1}
      accessibilityRole="link"
      accessibilityLabel="Ver planes para psicólogos/as"
      accessibilityState={Platform.OS === 'web' ? undefined : { selected: context === 'pricing' }}
      ariaCurrent={context === 'pricing' ? 'page' : undefined}
      style={[styles.navLink, { minHeight: 44, justifyContent: 'center' }]}
    >
      <Text style={[styles.navLinkText, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>{isMobile && !landing ? 'Planes' : 'Planes y precios'}</Text>
    </AnimatedPressable>
  ) : null;

  const navigationLinks = (
    <View style={[styles.navLinks, landing && { flexGrow: scrollLanding ? 0 : 1, flexShrink: 0, flexBasis: scrollLanding ? 'auto' : 0 }]}>
      {(onScrollToSection ? PUBLIC_HEADER_LINKS : []).map((item) => (
        <React.Fragment key={item.id}>
          <AnimatedPressable
            onPress={() => onScrollToSection?.(item.id)}
            href={`/?section=${item.id}`}
            hoverLift={false}
            pressScale={0.96}
            accessibilityRole="link"
            accessibilityLabel={`Ir a ${item.label}`}
            style={[styles.navLink, landing && { minHeight: 44, justifyContent: 'center' }]}
          >
            <Text style={[styles.navLinkText, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>
              {item.label}
            </Text>
          </AnimatedPressable>
          {item.id === 'forSpecialists' ? plansLink : null}
        </React.Fragment>
      ))}
      {!onScrollToSection ? plansLink : null}
    </View>
  );

  const headerContent = (
      <View style={[styles.content, isWide && styles.contentWide, isMobile && styles.contentMobile, landing && styles.landingContent, landing && width < 1400 && { gap: isMobile ? 6 : 12, paddingHorizontal: isMobile ? 8 : 16 }, scrollLanding && { width: 'auto', minWidth: '100%', justifyContent: 'flex-start' }]}>
        <View style={styles.brandCluster}>
          {onLogoPress ? (
            <AnimatedPressable
              onPress={onLogoPress}
              href="/"
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
                Psicología y consulta
              </Text>
            </View>
          ) : null}
        </View>

        {!scrollLanding && (landing || isWide) ? navigationLinks : null}

        <View style={[styles.actions, landing && isMobile && { gap: 6 }]}>
          {!isWide && !landing ? plansLink : null}
          {!landing || !isMobile ? <ThemeToggleButton size="sm" /> : null}
          {landing && onQuestionnaire ? <AnimatedPressable onPress={onQuestionnaire} href="/cuestionario" accessibilityRole="link" accessibilityLabel="Hacer cuestionario" hoverLift={false} pressScale={1} style={[styles.secondaryAction, styles.landingAction, { paddingHorizontal: compactLanding ? 10 : 12, backgroundColor: theme.secondaryMuted, borderColor: theme.border }]}>
            <Text style={{ fontFamily: theme.fontSansSemiBold, fontSize: 14, color: theme.textPrimary }}>{compactLanding ? 'Cuestionario' : 'Hacer cuestionario'}</Text>
          </AnimatedPressable> : null}

          {(landing || !isMobile) && !isDirectory && onFindSpecialist ? (
            <AnimatedPressable
              onPress={onFindSpecialist}
              href="/especialistas"
              hoverLift={false}
              pressScale={0.96}
              accessibilityRole="link"
              accessibilityLabel="Buscar psicólogo/a"
              style={[
                styles.secondaryAction,
                context === 'landing' && styles.landingAction,
                compactLanding && { paddingHorizontal: 10, gap: 4, minWidth: 44 },
                { backgroundColor: theme.secondaryAlpha12, borderColor: theme.border },
              ]}
            >
              {!(landing && isMobile) ? <Text
                style={[
                styles.secondaryActionText,
                  {
                    color: isDark ? theme.textPrimary : theme.secondaryDark,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                {compactLanding ? 'Psicólogos/as' : 'Buscar psicólogo/a'}
              </Text> : null}
              <Ionicons
                name="search-outline"
                size={16}
                color={isDark ? theme.textPrimary : theme.secondaryDark}
              />
            </AnimatedPressable>
          ) : null}

          {!isMobile && !isWide && !isAccess && onExploreProfessionals && !landing && width >= COMPACT_PROFESSIONAL_LINK_BREAKPOINT ? (
            <AnimatedPressable
              onPress={onExploreProfessionals}
              href="/?section=forSpecialists"
              hoverLift={false}
              pressScale={0.96}
              accessibilityRole="link"
              accessibilityLabel="Ir a HERA para psicólogos/as"
              style={[
                styles.secondaryAction,
                { backgroundColor: theme.primaryAlpha12, borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Para psicólogos/as
              </Text>
            </AnimatedPressable>
          ) : null}

          {context === 'landing' || isWide || isMobile || isDirectory || isAccess ? (
            <AnimatedPressable
              onPress={onAccess}
              pressScale={0.96}
              hoverLift={context !== 'landing' && !isMobile}
              accessibilityRole="button"
              accessibilityLabel={accessLabel}
              style={[styles.primaryAction, compactLanding && { paddingHorizontal: 10 }, context === 'landing' && styles.landingAction, { backgroundColor: theme.actionPrimary }]}
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
        {scrollLanding ? navigationLinks : null}
        {landing && isMobile ? <ThemeToggleButton size="sm" /> : null}
      </View>
  );

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.container,
        Platform.OS === 'web' && !isMobile && styles.containerWeb,
        containerAnimStyle,
        context !== 'landing' && context !== 'pricing' && context !== 'psychology' && context !== 'questionnaire' && webGlassStyle,
      ]}
    >
      {context !== 'landing' && context !== 'pricing' && context !== 'psychology' && context !== 'questionnaire' && Platform.OS !== 'web' && isScrolled ? (
        <BlurView
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {landing ? (
        <ScrollView horizontal scrollEnabled={scrollLanding} showsHorizontalScrollIndicator={scrollLanding} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1, justifyContent: scrollLanding ? 'flex-start' : 'center' }}>
          {headerContent}
        </ScrollView>
      ) : headerContent}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  landingContent: {
    maxWidth: 1500,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
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
