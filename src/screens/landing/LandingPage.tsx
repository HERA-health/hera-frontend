/**
 * LandingPage - HERA Mental Health Platform
 *
 * Production-ready landing page combining all sections.
 * Premium healthcare meets modern SaaS design.
 *
 * Sections:
 * 1. Hero - Hook visitors in 3 seconds with dual CTAs
 * 2. How It Works - Show simplicity in 3 steps
 * 3. For Specialists - Product-focused section for professionals
 * 4. Trust Indicators - Show concrete specialist capabilities
 * 5. Specializations - Show breadth of supported practice areas
 * 6. Testimonials - Reframed as real use cases
 * 7. Final CTA - Convert after they've seen everything
 * 8. Footer - Navigation and legal
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../constants/types';
import { LandingHeader } from './components/LandingHeader';
import { HeroSection } from './components/HeroSection';
import { useTheme } from '../../contexts/ThemeContext';
import { createWebDeferredComponent } from '../../utils/createDeferredComponent';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type LandingSectionAnchor = 'howItWorks' | 'specializations' | 'forSpecialists';
type SectionPositions = Record<LandingSectionAnchor, number>;
type DeferredSectionProps = Record<string, never>;
type SpecialistCTASectionProps = {
  onLearnMore: () => void;
};
type SpecializationsSectionProps = {
  onSpecializationPress: (specializationId: string) => void;
};
type SharedCTASectionProps = {
  onFindSpecialist: () => void;
  onJoinAsProfessional: () => void;
};

const HEADER_SCROLL_THRESHOLD = 50;
const SCROLL_INDICATOR_THRESHOLD = 80;
const HEADER_HEIGHT = 80;
const DEFERRED_SECTIONS_DELAY_MS = 180;

const HowItWorksSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/HowItWorksSection'),
  () => import('./components/HowItWorksSection'),
  { displayName: 'DeferredHowItWorksSection', exportName: 'HowItWorksSection' }
);
const TrustIndicatorsSection = createWebDeferredComponent<DeferredSectionProps>(
  () => require('./components/TrustIndicatorsSection'),
  () => import('./components/TrustIndicatorsSection'),
  {
    displayName: 'DeferredTrustIndicatorsSection',
    exportName: 'TrustIndicatorsSection',
  }
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
const FinalCTASection = createWebDeferredComponent<SharedCTASectionProps>(
  () => require('./components/FinalCTASection'),
  () => import('./components/FinalCTASection'),
  { displayName: 'DeferredFinalCTASection', exportName: 'FinalCTASection' }
);
const FooterSection = createWebDeferredComponent<SharedCTASectionProps>(
  () => require('./components/FooterSection'),
  () => import('./components/FooterSection'),
  { displayName: 'DeferredFooterSection', exportName: 'FooterSection' }
);

export const LandingPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<SectionPositions>({
    howItWorks: 0,
    specializations: 0,
    forSpecialists: 0,
  });
  const pendingSectionScroll = useRef<LandingSectionAnchor | null>(null);
  const headerScrolledRef = useRef(false);
  const scrollIndicatorVisibleRef = useRef(true);

  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showDeferredSections, setShowDeferredSections] = useState(
    Platform.OS !== 'web'
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

  const scrollToSection = useCallback((section: LandingSectionAnchor) => {
    const yPosition = sectionPositions.current[section];
    const adjustedPosition = yPosition - HEADER_HEIGHT + 70;
    scrollViewRef.current?.scrollTo({ y: adjustedPosition, animated: true });
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
      if (!showDeferredSections) {
        pendingSectionScroll.current = section;
        revealDeferredSections();
        return;
      }

      scrollToSection(section);
    },
    [revealDeferredSections, scrollToSection, showDeferredSections]
  );

  const handleFindSpecialist = useCallback(() => {
    navigation.navigate('Login', { userType: 'CLIENT' });
  }, [navigation]);

  const handleJoinAsProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
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
          showScrollIndicator={showScrollIndicator}
          onScrollIndicatorPress={handleScrollToContent}
        />

        {showDeferredSections && (
          <>
            <View onLayout={handleSectionLayout('howItWorks')}>
              <HowItWorksSection />
            </View>

            <View onLayout={handleSectionLayout('forSpecialists')}>
              <ForSpecialistsSection onLearnMore={handleLearnMoreProfessional} />
            </View>

            <TrustIndicatorsSection />

            <View onLayout={handleSectionLayout('specializations')}>
              <SpecializationsSection
                onSpecializationPress={handleSpecializationPress}
              />
            </View>

            <TestimonialsSection />

            <FinalCTASection
              onFindSpecialist={handleFindSpecialist}
              onJoinAsProfessional={handleJoinAsProfessional}
            />

            <FooterSection
              onFindSpecialist={handleFindSpecialist}
              onJoinAsProfessional={handleJoinAsProfessional}
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
