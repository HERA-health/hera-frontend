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
import { useAuth } from '../../contexts/AuthContext';
import { createWebDeferredComponent } from '../../utils/createDeferredComponent';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';
import {
  LANDING_SECTION_NATIVE_IDS,
  type LandingSectionAnchor,
} from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type SectionPositions = Partial<Record<LandingSectionAnchor, number>>;
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
const DEFERRED_SECTIONS_DELAY_MS = 180;

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
  const {
    isAuthenticated,
    user,
    legalStatusSnapshot,
    verificationSubmitted,
  } = useAuth();
  const route = useRoute<AppRouteProp<'Landing'>>();
  const requestedLandingSection = getRequestedLandingSection(route.params?.section);
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<SectionPositions>({});
  const pendingSectionScroll = useRef<LandingSectionAnchor | null>(null);
  const headerScrolledRef = useRef(false);
  const scrollIndicatorVisibleRef = useRef(true);

  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showDeferredSections, setShowDeferredSections] = useState(
    Platform.OS !== 'web' || requestedLandingSection !== undefined
  );

  useWebPageMetadata({
    title: 'Hera | Inicio',
    description: 'HERA conecta a pacientes con especialistas verificados y ofrece herramientas de gestión para profesionales de salud mental.',
    canonicalPath: '/',
  });
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
    const yPosition = sectionPositions.current[section];
    if (yPosition === undefined) {
      return false;
    }

    const adjustedPosition = Math.max(0, yPosition - HEADER_HEIGHT + 70);
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
        scrollToSection(section);
      }
    },
    [scrollToSection]
  );

  const handleScrollToSection = useCallback(
    (section: LandingSectionAnchor) => {
      revealDeferredSections();
      scrollIndicatorVisibleRef.current = false;
      setShowScrollIndicator(false);
      pendingSectionScroll.current = section;

      if (scrollToSection(section)) {
        pendingSectionScroll.current = null;
      }
    },
    [revealDeferredSections, scrollToSection]
  );

  useEffect(() => {
    const requestedSection = requestedLandingSection;

    if (!requestedSection) {
      return undefined;
    }

    handleScrollToSection(requestedSection);

    if (route.params?.section !== undefined) {
      navigation.setParams({ section: undefined });
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('section')) {
        url.searchParams.delete('section');
        window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
      }
    }
  }, [handleScrollToSection, navigation, requestedLandingSection, route.params?.section]);

  const navigateToAuthenticatedWorkspace = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    const workspaceRoute = user.type === 'professional'
      ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
      : (user.type === 'clinic' ? 'ClinicDashboard' : 'Home');
    const workspaceIsAvailable = navigation.getState().routeNames.includes(workspaceRoute);

    navigation.navigate(
      legalStatusSnapshot?.requiresAcceptance || !workspaceIsAvailable
        ? 'RequiredLegalAcceptance'
        : workspaceRoute
    );
    return true;
  }, [
    isAuthenticated,
    legalStatusSnapshot?.requiresAcceptance,
    navigation,
    user,
    verificationSubmitted,
  ]);

  const handleFindSpecialist = useCallback(() => {
    if (isAuthenticated) {
      navigation.navigate('PublicSpecialists');
      return;
    }

    navigation.navigate('Login', { userType: 'CLIENT' });
  }, [isAuthenticated, navigation]);

  const handleOpenPublicSpecialist = useCallback((specialistId: string) => {
    navigation.navigate('PublicSpecialistProfile', { specialistId });
  }, [navigation]);

  const handleViewAllSpecialists = useCallback(() => {
    navigation.navigate('PublicSpecialists');
  }, [navigation]);

  const handleJoinAsProfessional = useCallback(() => {
    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const handleJoinAsClinic = useCallback(() => {
    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Login', { userType: 'CLINIC' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const handleSpecializationPress = useCallback(
    (specializationId: string) => {
      if (isAuthenticated) {
        navigation.navigate('PublicSpecialists');
        return;
      }

      navigation.navigate('Login', {
        userType: 'CLIENT',
        specialization: specializationId,
      });
    },
    [isAuthenticated, navigation]
  );

  const handleLearnMoreProfessional = useCallback(() => {
    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <LandingHeader
        isScrolled={headerScrolled}
        showAccessActions={!isAuthenticated}
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
