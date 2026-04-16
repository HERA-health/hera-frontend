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

import React, { useRef, useCallback, useState } from 'react';
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

// Section Components
import {
  LandingHeader,
  HeroSection,
  HowItWorksSection,
  TrustIndicatorsSection,
  ForSpecialistsSection,
  SpecializationsSection,
  TestimonialsSection,
  FinalCTASection,
  FooterSection,
} from './components';

import { useTheme } from '../../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

// Threshold for header compact mode
const HEADER_SCROLL_THRESHOLD = 50;
// Threshold to hide scroll indicator
const SCROLL_INDICATOR_THRESHOLD = 80;
// Header height offset for scroll positioning
const HEADER_HEIGHT = 80;

// Section position type
type SectionPositions = {
  howItWorks: number;
  specializations: number;
  forSpecialists: number;
};

export const LandingPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const sectionPositions = useRef<SectionPositions>({
    howItWorks: 0,
    specializations: 0,
    forSpecialists: 0,
  });

  // Track scroll position for header state and scroll indicator
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setHeaderScrolled(offsetY > HEADER_SCROLL_THRESHOLD);
    setShowScrollIndicator(offsetY < SCROLL_INDICATOR_THRESHOLD);
  };

  // Scroll to next section (for scroll indicator click)
  const handleScrollToContent = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 600, animated: true });
  }, []);

  // Handle section layout to track positions
  const handleSectionLayout = useCallback(
    (section: keyof SectionPositions) => (event: LayoutChangeEvent) => {
      sectionPositions.current[section] = event.nativeEvent.layout.y;
    },
    []
  );

  // Scroll to a specific section
  const handleScrollToSection = useCallback(
    (section: keyof SectionPositions) => {
      const yPosition = sectionPositions.current[section];
      // Subtract header height and add a small offset for visual spacing
      const adjustedPosition = yPosition - HEADER_HEIGHT + 70; // 70 is the paddingTop offset
      scrollViewRef.current?.scrollTo({ y: adjustedPosition, animated: true });
    },
    []
  );

  // Navigation handlers
  const handleFindSpecialist = useCallback(() => {
    navigation.navigate('Login', { userType: 'CLIENT' });
  }, [navigation]);

  const handleJoinAsProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigation]);

  const handleSpecializationPress = useCallback((specializationId: string) => {
    navigation.navigate('Login', { userType: 'CLIENT', specialization: specializationId });
  }, [navigation]);

  const handleLearnMoreProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      {/* Always-visible Sticky Header */}
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
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Section 1: Hero */}
        <HeroSection
          onFindSpecialist={handleFindSpecialist}
          onJoinAsProfessional={handleJoinAsProfessional}
          showScrollIndicator={showScrollIndicator}
          onScrollIndicatorPress={handleScrollToContent}
        />

        {/* Section 2: How It Works */}
        <View onLayout={handleSectionLayout('howItWorks')}>
          <HowItWorksSection />
        </View>

        {/* Section 3: For Specialists */}
        <View onLayout={handleSectionLayout('forSpecialists')}>
          <ForSpecialistsSection
            onLearnMore={handleLearnMoreProfessional}
          />
        </View>

        {/* Section 4: Trust Indicators */}
        <TrustIndicatorsSection />

        {/* Section 5: Specializations */}
        <View onLayout={handleSectionLayout('specializations')}>
          <SpecializationsSection
            onSpecializationPress={handleSpecializationPress}
          />
        </View>

        {/* Section 6: Testimonials */}
        <TestimonialsSection />

        {/* Section 7: Final CTA */}
        <FinalCTASection
          onFindSpecialist={handleFindSpecialist}
          onJoinAsProfessional={handleJoinAsProfessional}
        />

        {/* Section 8: Footer */}
        <FooterSection
          onFindSpecialist={handleFindSpecialist}
          onJoinAsProfessional={handleJoinAsProfessional}
        />
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
    // Add padding for the always-visible header
    paddingTop: 70,
  },
});

export default LandingPage;
