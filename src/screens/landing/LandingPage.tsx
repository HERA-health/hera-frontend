/**
 * LandingPage - HERA Mental Health Platform
 *
 * Production-ready landing page combining all sections.
 * Premium healthcare meets modern SaaS design.
 *
 * Sections:
 * 1. Hero - Hook visitors in 3 seconds with dual CTAs
 * 2. How It Works - Show simplicity in 3 steps
 * 3. About Us - Explain the product direction with a human tone
 * 4. For Specialists - Product-focused section for professionals
 * 5. Trust Indicators - Show sensitive workflow safeguards
 * 6. Specializations - Show breadth of supported practice areas
 * 7. Testimonials - Reframed as real use cases
 * 8. FAQ - Answer mixed professional and patient questions
 * 9. Final CTA - Convert after they've seen everything
 * 10. Footer - Navigation and legal
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppRouteProp, RootStackParamList } from '../../constants/types';
import { LandingHeader } from './components/LandingHeader';
import { HeroSection } from './components/HeroSection';
import { useTheme } from '../../contexts/ThemeContext';
import { createWebDeferredComponent } from '../../utils/createDeferredComponent';
import {
  LANDING_SECTION_NATIVE_IDS,
  type LandingSectionAnchor,
} from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type SectionPositions = Record<LandingSectionAnchor, number>;
type DeferredSectionProps = Record<string, never>;
type SpecialistCTASectionProps = {
  onLearnMore: () => void;
};
type FeaturedSpecialistsSectionProps = {
  onOpenSpecialist: (specialistId: string) => void;
  onViewAll: () => void;
};
type SpecializationsSectionProps = {
  onSpecializationPress: (specializationId: string) => void;
};
type SharedCTASectionProps = {
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
  onJoinAsClinic: () => void;
};
type FooterSectionProps = SharedCTASectionProps & {
  onScrollToSection: (section: LandingSectionAnchor) => void;
};

const HEADER_SCROLL_THRESHOLD = 50;
const SCROLL_INDICATOR_THRESHOLD = 80;
const HEADER_HEIGHT = 80;
const WEB_SECTION_SCROLL_MARGIN = HEADER_HEIGHT + 12;
const DEFERRED_SECTIONS_DELAY_MS = 180;
const ROUTED_SECTION_SCROLL_DELAY_MS = 250;
const ROUTED_SECTION_STABILIZE_DELAY_MS = 1400;
const WEB_SECTION_SCROLL_RETRY_MS = 50;
const WEB_SECTION_SCROLL_MAX_RETRIES = 20;

const getRequestedLandingSection = (
  routeSection: LandingSectionAnchor | undefined
): LandingSectionAnchor | undefined => {
  if (routeSection) {
    return routeSection;
  }

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const querySection = new URLSearchParams(window.location.search).get('section');

  if (querySection && querySection in LANDING_SECTION_NATIVE_IDS) {
    return querySection as LandingSectionAnchor;
  }

  return undefined;
};

const getScrollableWebAncestor = (target: HTMLElement): HTMLElement | null => {
  let current = target.parentElement;

  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;

    if (
      current.scrollHeight > current.clientHeight + 1 &&
      (overflowY === 'auto' || overflowY === 'scroll')
    ) {
      return current;
    }

    current = current.parentElement;
  }

  const documentScroller = document.scrollingElement;

  if (
    documentScroller instanceof HTMLElement
    && documentScroller.scrollHeight > documentScroller.clientHeight + 1
  ) {
    return documentScroller;
  }

  return null;
};

const HowItWorksSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/HowItWorksSection'),
  () => import('./components/HowItWorksSection'),
  { displayName: 'DeferredHowItWorksSection', exportName: 'HowItWorksSection' }
);
const FeaturedSpecialistsSection = createWebDeferredComponent<FeaturedSpecialistsSectionProps>(
  () => require('./components/FeaturedSpecialistsSection'),
  () => import('./components/FeaturedSpecialistsSection'),
  {
    displayName: 'DeferredFeaturedSpecialistsSection',
    exportName: 'FeaturedSpecialistsSection',
  }
);
const TrustIndicatorsSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/TrustIndicatorsSection'),
  () => import('./components/TrustIndicatorsSection'),
  {
    displayName: 'DeferredTrustIndicatorsSection',
    exportName: 'TrustIndicatorsSection',
  }
);
const AboutUsSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/AboutUsSection'),
  () => import('./components/AboutUsSection'),
  { displayName: 'DeferredAboutUsSection', exportName: 'AboutUsSection' }
);
const TestimonialsSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/TestimonialsSection'),
  () => import('./components/TestimonialsSection'),
  {
    displayName: 'DeferredTestimonialsSection',
    exportName: 'TestimonialsSection',
  }
);
const ForSpecialistsSection = createWebDeferredComponent<SpecialistCTASectionProps>(
  () => require('./components/ForSpecialistsSection'),
  () => import('./components/ForSpecialistsSection'),
  {
    displayName: 'DeferredForSpecialistsSection',
    exportName: 'ForSpecialistsSection',
  }
);
const SpecializationsSection = createWebDeferredComponent<SpecializationsSectionProps>(
  () => require('./components/SpecializationsSection'),
  () => import('./components/SpecializationsSection'),
  {
    displayName: 'DeferredSpecializationsSection',
    exportName: 'SpecializationsSection',
  }
);
const FAQSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/FAQSection'),
  () => import('./components/FAQSection'),
  { displayName: 'DeferredFAQSection', exportName: 'FAQSection' }
);
const FinalCTASection = createWebDeferredComponent<SharedCTASectionProps>(
  () => require('./components/FinalCTASection'),
  () => import('./components/FinalCTASection'),
  { displayName: 'DeferredFinalCTASection', exportName: 'FinalCTASection' }
);
const FooterSection = createWebDeferredComponent<FooterSectionProps>(
  () => require('./components/FooterSection'),
  () => import('./components/FooterSection'),
  { displayName: 'DeferredFooterSection', exportName: 'FooterSection' }
);

export const LandingPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AppRouteProp<'Landing'>>();
  const requestedLandingSection = getRequestedLandingSection(route.params?.section);
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<SectionPositions>({
    howItWorks: 0,
    featuredSpecialists: 0,
    about: 0,
    forSpecialists: 0,
    specializations: 0,
    faq: 0,
  });
  const pendingSectionScroll = useRef<LandingSectionAnchor | null>(null);
  const webSectionScrollRequest = useRef(0);
  const headerScrolledRef = useRef(false);
  const scrollIndicatorVisibleRef = useRef(true);

  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showDeferredSections, setShowDeferredSections] = useState(
    Platform.OS !== 'web' || requestedLandingSection !== undefined
  );
  const revealDeferredSections = useCallback(() => {
    setShowDeferredSections(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || showDeferredSections) {
      return;
    }

    const revealTimer = setTimeout(revealDeferredSections, DEFERRED_SECTIONS_DELAY_MS);

    return () => clearTimeout(revealTimer);
  }, [revealDeferredSections, showDeferredSections]);

  const scrollToSection = useCallback((section: LandingSectionAnchor): boolean => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const target = document.getElementById(LANDING_SECTION_NATIVE_IDS[section]);
      const scrollContainer = target ? getScrollableWebAncestor(target) : null;

      if (target && scrollContainer) {
        target.style.scrollMarginTop = `${WEB_SECTION_SCROLL_MARGIN}px`;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }

      return false;
    }

    const yPosition = sectionPositions.current[section];
    const adjustedPosition = yPosition - HEADER_HEIGHT + 70;
    scrollViewRef.current?.scrollTo({ y: adjustedPosition, animated: true });
    return true;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const nextHeaderScrolled = offsetY > HEADER_SCROLL_THRESHOLD;
      const nextShowScrollIndicator = offsetY < SCROLL_INDICATOR_THRESHOLD;

      if (nextHeaderScrolled !== headerScrolledRef.current) {
        headerScrolledRef.current = nextHeaderScrolled;
        setHeaderScrolled(nextHeaderScrolled);
      }

      if (nextShowScrollIndicator !== scrollIndicatorVisibleRef.current) {
        scrollIndicatorVisibleRef.current = nextShowScrollIndicator;
        setShowScrollIndicator(nextShowScrollIndicator);
      }

      if (!showDeferredSections && offsetY > 24) {
        revealDeferredSections();
      }
    },
    [revealDeferredSections, showDeferredSections]
  );

  const handleScrollToContent = useCallback(() => {
    revealDeferredSections();
    scrollViewRef.current?.scrollTo({ y: 600, animated: true });
  }, [revealDeferredSections]);

  const handleSectionLayout = useCallback(
    (section: LandingSectionAnchor) => (event: LayoutChangeEvent) => {
      sectionPositions.current[section] = event.nativeEvent.layout.y;

      if (pendingSectionScroll.current === section) {
        pendingSectionScroll.current = null;
        requestAnimationFrame(() => scrollToSection(section));
      }
    },
    [scrollToSection]
  );

  const handleScrollToSection = useCallback(
    (section: LandingSectionAnchor) => {
      revealDeferredSections();
      scrollIndicatorVisibleRef.current = false;
      setShowScrollIndicator(false);

      if (Platform.OS === 'web') {
        const requestId = webSectionScrollRequest.current + 1;
        webSectionScrollRequest.current = requestId;
        let retries = 0;

        const scrollWhenReady = () => {
          if (webSectionScrollRequest.current !== requestId) {
            return;
          }

          if (scrollToSection(section)) {
            return;
          }

          if (retries >= WEB_SECTION_SCROLL_MAX_RETRIES) {
            return;
          }

          retries += 1;
          setTimeout(scrollWhenReady, WEB_SECTION_SCROLL_RETRY_MS);
        };

        requestAnimationFrame(scrollWhenReady);
        return;
      }

      if (sectionPositions.current[section] <= 0) {
        pendingSectionScroll.current = section;
        return;
      }

      scrollToSection(section);
    },
    [revealDeferredSections, scrollToSection]
  );

  useEffect(() => {
    const requestedSection = requestedLandingSection;

    if (!requestedSection) {
      return undefined;
    }

    const scrollTimer = setTimeout(
      () => handleScrollToSection(requestedSection),
      Platform.OS === 'web' ? ROUTED_SECTION_SCROLL_DELAY_MS : 0
    );
    const stabilizeTimer = Platform.OS === 'web'
      ? setTimeout(
          () => handleScrollToSection(requestedSection),
          ROUTED_SECTION_STABILIZE_DELAY_MS
        )
      : undefined;

    return () => {
      clearTimeout(scrollTimer);
      if (stabilizeTimer) {
        clearTimeout(stabilizeTimer);
      }
    };
  }, [handleScrollToSection, requestedLandingSection]);

  useEffect(
    () => () => {
      webSectionScrollRequest.current += 1;
    },
    []
  );

  const handleFindSpecialist = useCallback(() => {
    navigation.navigate('Login', { userType: 'CLIENT' });
  }, [navigation]);

  const handleOpenPublicSpecialist = useCallback((specialistId: string) => {
    navigation.navigate('PublicSpecialistProfile', { specialistId });
  }, [navigation]);

  const handleViewAllSpecialists = useCallback(() => {
    navigation.navigate('PublicSpecialists');
  }, [navigation]);

  const handleJoinAsProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigation]);

  const handleJoinAsClinic = useCallback(() => {
    navigation.navigate('Login', { userType: 'CLINIC' });
  }, [navigation]);

  const handleSpecializationPress = useCallback(
    (specializationId: string) => {
      navigation.navigate('Login', {
        userType: 'CLIENT',
        specialization: specializationId,
      });
    },
    [navigation]
  );

  const handleLearnMoreProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <LandingHeader
        isScrolled={headerScrolled}
        onFindSpecialist={handleFindSpecialist}
        onJoinAsProfessional={handleJoinAsProfessional}
        onJoinAsClinic={handleJoinAsClinic}
        onScrollToSection={handleScrollToSection}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={24}
      >
        <HeroSection
          onFindSpecialist={handleFindSpecialist}
          onJoinAsProfessional={handleJoinAsProfessional}
          onJoinAsClinic={handleJoinAsClinic}
          showScrollIndicator={showScrollIndicator}
          onScrollIndicatorPress={handleScrollToContent}
        />

        {showDeferredSections && (
          <>
            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.howItWorks}
              onLayout={handleSectionLayout('howItWorks')}
            >
              <HowItWorksSection />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.featuredSpecialists}
              onLayout={handleSectionLayout('featuredSpecialists')}
            >
              <FeaturedSpecialistsSection
                onOpenSpecialist={handleOpenPublicSpecialist}
                onViewAll={handleViewAllSpecialists}
              />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.forSpecialists}
              onLayout={handleSectionLayout('forSpecialists')}
            >
              <ForSpecialistsSection onLearnMore={handleLearnMoreProfessional} />
            </View>

            <TrustIndicatorsSection />

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.specializations}
              onLayout={handleSectionLayout('specializations')}
            >
              <SpecializationsSection
                onSpecializationPress={handleSpecializationPress}
              />
            </View>

            <TestimonialsSection />

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.about}
              onLayout={handleSectionLayout('about')}
            >
              <AboutUsSection />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.faq}
              onLayout={handleSectionLayout('faq')}
            >
              <FAQSection />
            </View>

            <FinalCTASection
              onFindSpecialist={handleFindSpecialist}
              onJoinAsProfessional={handleJoinAsProfessional}
              onJoinAsClinic={handleJoinAsClinic}
            />

            <FooterSection
              onFindSpecialist={handleFindSpecialist}
              onJoinAsProfessional={handleJoinAsProfessional}
              onJoinAsClinic={handleJoinAsClinic}
              onScrollToSection={handleScrollToSection}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 70,
  },
});

export default LandingPage;
