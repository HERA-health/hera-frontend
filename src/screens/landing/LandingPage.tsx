/**
 * LandingPage - HERA Mental Health Platform
 *
 * Production-ready landing page combining all sections.
 * Premium healthcare meets modern SaaS design.
 *
 * One public entry point with distinct patient and professional journeys.
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
import * as analyticsService from '../../services/analyticsService';
import { trackProfessionalShowcaseEvent } from '../../services/professionalShowcaseAnalytics';
import type { ProfessionalSpecialtyValue } from '../../constants/professionalMatchingOptions';
import {
  LANDING_SECTION_NATIVE_IDS,
  isLandingSectionAnchor,
  type LandingSectionAnchor,
} from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type SectionLayout = {
  y: number;
  height: number;
};
type SectionLayouts = Partial<Record<LandingSectionAnchor, SectionLayout>>;
type DeferredSectionProps = Record<string, never>;
type ProfessionalCTASectionProps = {
  primaryActionLabel: string;
  showLoginAction: boolean;
  onProductTour: () => void;
  onPrimaryAction: () => void;
  onLogin: () => void;
  onClinicAccess: () => void;
};
type FeaturedSpecialistsSectionProps = {
  onOpenSpecialist: (profileRef: string) => void;
  onViewAll: () => void;
};
type SpecializationsSectionProps = {
  onSpecializationPress: (specializationId: ProfessionalSpecialtyValue) => void;
};
type FinalCTASectionProps = {
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
};
type FooterSectionProps = {
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
  onProfessionalLogin: () => void;
  onClinicAccess: () => void;
  onScrollToSection: (section: LandingSectionAnchor) => void;
};

const HEADER_SCROLL_THRESHOLD = 50;
const SCROLL_INDICATOR_THRESHOLD = 80;
const HEADER_HEIGHT = 80;
const SCROLL_CONTENT_TOP_PADDING = 70;
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

  return isLandingSectionAnchor(querySection) ? querySection : undefined;
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
const ForSpecialistsSection = createWebDeferredComponent<ProfessionalCTASectionProps>(
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
const FinalCTASection = createWebDeferredComponent<FinalCTASectionProps>(
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
  const sectionLayouts = useRef<SectionLayouts>({});
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
    const measuredLayout = sectionLayouts.current[section];

    if (!measuredLayout || measuredLayout.height <= 0) {
      return false;
    }

    const adjustedPosition = Math.max(0, measuredLayout.y - HEADER_HEIGHT + 70);
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
      const { y, height } = event.nativeEvent.layout;

      if (height <= 0) {
        delete sectionLayouts.current[section];
        return;
      }

      sectionLayouts.current[section] = { y, height };

      if (
        pendingSectionScroll.current === section
        && scrollToSection(section)
      ) {
        pendingSectionScroll.current = null;
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

  const navigateToSpecialists = useCallback(() => {
    navigation.navigate('PublicSpecialists');
  }, [navigation]);

  const handlePatientCTA = useCallback((placement: string) => {
    analyticsService.track('landing_patient_cta_clicked', {
      placement,
      audience: 'patient',
    });
    navigateToSpecialists();
  }, [navigateToSpecialists]);

  const handleOpenPublicSpecialist = useCallback((profileRef: string) => {
    navigation.navigate('PublicSpecialistProfile', { profileRef });
  }, [navigation]);

  const handleViewAllSpecialists = useCallback(() => {
    handlePatientCTA('featured_specialists');
  }, [handlePatientCTA]);

  const handleProfessionalRegister = useCallback((placement: string) => {
    analyticsService.track('landing_professional_register_clicked', {
      placement,
      audience: 'professional',
    });

    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Register', { userType: 'PROFESSIONAL' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const handleProfessionalShowcase = useCallback(() => {
    trackProfessionalShowcaseEvent({
      event: 'landing_professional_showcase_opened',
      properties: { placement: 'professional_section' },
    });
    navigation.navigate('ProfessionalShowcase');
  }, [navigation]);

  const handleProfessionalLogin = useCallback(() => {
    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const handleClinicAccess = useCallback((placement: string) => {
    analyticsService.track('landing_clinic_access_clicked', {
      placement,
      audience: 'clinic',
    });

    if (navigateToAuthenticatedWorkspace()) {
      return;
    }

    navigation.navigate('Login', { userType: 'CLINIC' });
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const handleSpecializationPress = useCallback(
    (specializationId: ProfessionalSpecialtyValue) => {
      navigation.navigate('PublicSpecialists', { specialty: specializationId });
    },
    [navigation]
  );

  const handleExploreProfessionals = useCallback((placement: string) => {
    analyticsService.track('landing_professional_cta_clicked', {
      placement,
      audience: 'professional',
    });
    handleScrollToSection('forSpecialists');
  }, [handleScrollToSection]);

  const handleAccess = useCallback(() => {
    if (!navigateToAuthenticatedWorkspace()) {
      navigation.navigate('Welcome');
    }
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const professionalActionLabel = isAuthenticated
    ? 'Ir a mi espacio'
    : 'Crear cuenta profesional';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <LandingHeader
        context="landing"
        isScrolled={headerScrolled}
        accessLabel={isAuthenticated ? 'Mi espacio' : 'Acceder'}
        onFindSpecialist={() => handlePatientCTA('header')}
        onExploreProfessionals={() => handleExploreProfessionals('header')}
        onAccess={handleAccess}
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
          onFindSpecialist={() => handlePatientCTA('hero')}
          onExploreProfessionals={() => handleExploreProfessionals('hero')}
          showScrollIndicator={showScrollIndicator}
          onScrollIndicatorPress={handleScrollToContent}
        />

        {showDeferredSections && (
          <>
            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.featuredSpecialists}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('featuredSpecialists')}
            >
              <FeaturedSpecialistsSection
                onOpenSpecialist={handleOpenPublicSpecialist}
                onViewAll={handleViewAllSpecialists}
              />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.howItWorks}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('howItWorks')}
            >
              <HowItWorksSection />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.forSpecialists}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('forSpecialists')}
            >
              <ForSpecialistsSection
                primaryActionLabel={professionalActionLabel}
                showLoginAction={!isAuthenticated}
                onProductTour={handleProfessionalShowcase}
                onPrimaryAction={() => handleProfessionalRegister('professional_section')}
                onLogin={handleProfessionalLogin}
                onClinicAccess={() => handleClinicAccess('professional_section')}
              />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.specializations}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('specializations')}
            >
              <SpecializationsSection
                onSpecializationPress={handleSpecializationPress}
              />
            </View>

            <TrustIndicatorsSection />

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.about}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('about')}
            >
              <AboutUsSection />
            </View>

            <View
              nativeID={LANDING_SECTION_NATIVE_IDS.faq}
              style={styles.sectionAnchor}
              onLayout={handleSectionLayout('faq')}
            >
              <FAQSection />
            </View>

            <FinalCTASection
              onFindSpecialist={() => handlePatientCTA('final_cta')}
              professionalActionLabel={professionalActionLabel}
              onProfessionalAction={() => handleProfessionalRegister('final_cta')}
            />

            <FooterSection
              onFindSpecialist={() => handlePatientCTA('footer')}
              professionalActionLabel={professionalActionLabel}
              onProfessionalAction={() => handleProfessionalRegister('footer')}
              onProfessionalLogin={handleProfessionalLogin}
              onClinicAccess={() => handleClinicAccess('footer')}
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
    paddingTop: SCROLL_CONTENT_TOP_PADDING,
  },
  sectionAnchor: {
    alignSelf: 'stretch',
    width: '100%',
  },
});

export default LandingPage;
