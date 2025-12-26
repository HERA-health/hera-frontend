/**
 * LandingPage - HERA Mental Health Platform
 *
 * Production-ready landing page combining all sections.
 * Premium healthcare meets modern SaaS design.
 *
 * Sections:
 * 1. Hero - Hook visitors in 3 seconds with dual CTAs
 * 2. How It Works - Show simplicity in 3 steps
 * 3. Trust Indicators - Build credibility with benefits
 * 4. For Specialists - Secondary CTA for professionals
 * 5. Specializations - Show breadth of services
 * 6. Testimonials - Social proof
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

import { heraLanding } from '../../constants/colors';

type NavigationProp = NativeStackNavigationProp<any>;

// Threshold for header compact mode
const HEADER_SCROLL_THRESHOLD = 50;
// Threshold to hide scroll indicator
const SCROLL_INDICATOR_THRESHOLD = 80;

export const LandingPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

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
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={heraLanding.background}
      />

      {/* Always-visible Sticky Header */}
      <LandingHeader
        isScrolled={headerScrolled}
        onFindSpecialist={handleFindSpecialist}
        onJoinAsProfessional={handleJoinAsProfessional}
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
        <HowItWorksSection />

        {/* Section 3: Trust Indicators */}
        <TrustIndicatorsSection />

        {/* Section 4: For Specialists */}
        <ForSpecialistsSection
          onLearnMore={handleLearnMoreProfessional}
        />

        {/* Section 5: Specializations */}
        <SpecializationsSection
          onSpecializationPress={handleSpecializationPress}
        />

        {/* Section 6: Testimonials */}
        <TestimonialsSection />

        {/* Section 7: Final CTA */}
        <FinalCTASection
          onFindSpecialist={handleFindSpecialist}
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
    backgroundColor: heraLanding.background,
    // Force scrollbar visibility on web
    ...(Platform.OS === 'web' ? {
      overflow: 'auto',
    } : {}),
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
