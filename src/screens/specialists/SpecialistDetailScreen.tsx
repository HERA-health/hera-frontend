/**
 * SpecialistDetailScreen - Specialist Profile Detail
 * Two-column layout on desktop, single column on mobile
 *
 * PRESERVED FUNCTIONALITY:
 * - API calls and data fetching (unchanged)
 * - Booking flow trigger (unchanged)
 * - Navigation behavior (unchanged)
 * - All business logic (unchanged)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as specialistsService from '../../services/specialistsService';
import { spacing, borderRadius, shadows } from '../../constants/colors';
import { getGradientColors } from '../../constants/gradients';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';

// Import modular components
import {
  ProfileHero,
  SpecializationsGrid,
  ExperienceSection,
  ReviewsSection,
  StickyBookingBar,
  BookingSidebar,
  PhotoGallerySection,
  VideoSection,
  ProfileSkeleton,
} from '../specialist-profile/components';
import type { Specialist, Review } from '../specialist-profile/types';
import { LocationMapPreview, ModalityBadges } from '../../components/location';
import * as analyticsService from '../../services/analyticsService';
import { AnimatedPressable, Button } from '../../components/common';

// Types
interface SpecialistDetailScreenProps {
  route: { params?: { specialistId?: string; affinity?: number } };
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack: () => void };
}

// Breakpoints
const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

// Main Component
export const SpecialistDetailScreen: React.FC<SpecialistDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { specialistId, affinity } = route?.params || {};
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;
  const styles = createStyles(theme, isDark);

  const scrollViewRef = useRef<ScrollView>(null);
  const reviewsYOffset = useRef<number>(0);

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreen('specialist_detail', { specialistId });
      loadSpecialistDetails();
    }, [specialistId])
  );

  // ============== DATA FETCHING (PRESERVED) ==============
  const loadSpecialistDetails = async () => {
    try {
      setLoading(true);

      if (!specialistId) {
        throw new Error('No specialist ID provided');
      }

      // Fetch specialist details from backend (UNCHANGED)
      const data = await specialistsService.getSpecialistDetails(specialistId);

      // Map backend data to Specialist type
      const mappedSpecialist = specialistsService.mapSpecialistToProfile(data);

      setSpecialist(mappedSpecialist);

      // Reviews: use real data if available, empty otherwise
      if (data.reviewCount > 0 && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo cargar el perfil del especialista';
      Alert.alert('Error', errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ============== NAVIGATION HANDLERS (PRESERVED) ==============
  const handleBookSession = useCallback(() => {
    if (!specialist) return;

    analyticsService.track('booking_initiated', { specialistId: specialist.id });
    navigation.navigate('Booking', {
      specialistId: specialist.id,
      specialistName: specialist.name,
      pricePerSession: specialist.pricePerSession,
      avatar: specialist.avatar,
      title: specialist.title,
      specializations: specialist.specializations,
      slotDuration: specialist.slotDuration ?? 60,
    });
  }, [specialist, navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScrollToReviews = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: reviewsYOffset.current, animated: true });
  }, []);

  // Scroll handler for sticky bar (mobile only)
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isMobile) {
      const scrollY = event.nativeEvent.contentOffset.y;
      setShowStickyBar(scrollY > 400);
    }
  }, [isMobile]);

  // ============== GRADIENT COLORS ==============
  const gradientColors = getGradientColors(specialist?.gradientId);

  // ============== LOADING STATE ==============
  if (loading) {
    return <ProfileSkeleton isDesktop={!isMobile} />;
  }

  // ============== ERROR STATE ==============
  if (!specialist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.warning} />
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <Button onPress={handleGoBack} variant="primary" size="large" style={styles.backButtonError}>Volver</Button>
      </View>
    );
  }

  // ============== MAIN CONTENT SECTIONS ==============
  const heroRenderedAbove = isDesktop || isTablet;

  const renderMainContent = (skipHero = false) => (
    <>
      {/* Hero Section */}
      {!skipHero && (
        <ProfileHero
          specialist={specialist}
          affinity={affinity}
          onBookPress={handleBookSession}
          onRatingPress={handleScrollToReviews}
          gradientColors={gradientColors}
          bio={specialist.bio}
          personalMotto={specialist.personalMotto}
          therapeuticApproach={specialist.therapeuticApproach}
        />
      )}

      {/* Video Section */}
      {specialist.presentationVideoUrl ? (
        <View style={styles.section}>
          <VideoSection
            presentationVideoUrl={specialist.presentationVideoUrl}
            specialistName={specialist.name}
            gradientColors={gradientColors}
          />
        </View>
      ) : null}

      {/* Specializations Grid */}
      {specialist.specializations.length > 0 && (
        <View style={styles.section}>
          <SpecializationsGrid
            specializations={specialist.specializations}
            specializationsDetail={specialist.specializationsDetail}
          />
        </View>
      )}

      {/* Experience & Education Section */}
      <View style={styles.section}>
        <ExperienceSection
          education={specialist.education}
          experience={specialist.experience}
          certifications={specialist.certifications}
          collegiateNumber={specialist.collegiateNumber}
          experienceYears={specialist.experienceYears}
        />
      </View>

      {/* Reviews Section */}
      <View
        style={styles.section}
        onLayout={(e) => { reviewsYOffset.current = e.nativeEvent.layout.y; }}
      >
        <ReviewsSection
          reviews={reviews}
          rating={specialist.rating}
          reviewCount={specialist.reviewCount}
        />
      </View>
    </>
  );

  // ============== DESKTOP/TABLET TWO-COLUMN LAYOUT ==============
  if (isDesktop || isTablet) {
    return (
      <View style={styles.screenContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Navigation */}
          <View style={styles.headerTwoColumn}>
            <AnimatedPressable
              style={styles.backButton}
              onPress={handleGoBack}
              hoverLift={false}
              pressScale={0.985}
            >
              <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
              <Text style={styles.backButtonText}>Volver</Text>
            </AnimatedPressable>
          </View>

          {/* Two Column Container */}
          <View style={styles.twoColumnContainer}>

            {/* Columns */}
            <View style={styles.columnsRow}>
              {/* Left Column - Main Content */}
              <View style={[
                styles.leftColumn,
                isTablet && styles.leftColumnTablet,
              ]}>
                <ProfileHero
                  specialist={specialist}
                  affinity={affinity}
                  onBookPress={handleBookSession}
                  onRatingPress={handleScrollToReviews}
                  gradientColors={gradientColors}
                  bio={specialist.bio}
                  personalMotto={specialist.personalMotto}
                  therapeuticApproach={specialist.therapeuticApproach}
                />
                {renderMainContent(heroRenderedAbove)}
                <View style={styles.bottomSpacer} />
              </View>

              {/* Right Column - Booking Sidebar + Photo Gallery */}
              <View style={[
                styles.rightColumn,
                isTablet && styles.rightColumnTablet,
              ]}>
                <BookingSidebar
                  specialist={specialist}
                  onBookPress={handleBookSession}
                  gradientColors={gradientColors}
                />
                {specialist.photoGallery && specialist.photoGallery.length > 0 && (
                  <View style={styles.rightColumnGallery}>
                    <PhotoGallerySection
                      photoGallery={specialist.photoGallery}
                      specialistName={specialist.name}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============== MOBILE SINGLE-COLUMN LAYOUT ==============
  return (
    <View style={styles.screenContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Back Navigation */}
        <View style={styles.header}>
          <AnimatedPressable
            style={styles.backButton}
            onPress={handleGoBack}
            hoverLift={false}
            pressScale={0.985}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
            <Text style={styles.backButtonText}>Volver</Text>
          </AnimatedPressable>
        </View>

        {/* Main Content */}
        <View style={styles.mobileContainer}>
          {renderMainContent(heroRenderedAbove)}
          <View style={styles.section}>
            <BookingSidebar
              specialist={specialist}
              onBookPress={handleBookSession}
              gradientColors={gradientColors}
            />
          </View>
          {specialist.photoGallery && specialist.photoGallery.length > 0 && (
            <View style={styles.section}>
              <PhotoGallerySection
                photoGallery={specialist.photoGallery}
                specialistName={specialist.name}
              />
            </View>
          )}
          <View style={styles.bottomSpacerMobile} />
        </View>
      </ScrollView>

      {/* Sticky Booking Bar (Mobile Only) */}
      <StickyBookingBar
        specialistName={specialist.name}
        pricePerSession={specialist.pricePerSession}
        onBookPress={handleBookSession}
        visible={showStickyBar}
      />
    </View>
  );
};

// ============== STYLES ==============
const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    width: '100%',
  },

  // Header / Back Navigation
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTwoColumn: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 15,
    color: theme.textSecondary,
  },

  // Two Column Layout
  twoColumnContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  leftColumn: {
    flex: 0.62,
    minWidth: 0,
  },
  leftColumnTablet: {
    flex: 0.58,
  },
  rightColumn: {
    flex: 0.38,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  rightColumnTablet: {
    flex: 0.42,
  },
  rightColumnGallery: {
    marginTop: spacing.md,
  },

  // Mobile Container
  mobileContainer: {
    paddingHorizontal: spacing.lg,
  },

  // Sections
  section: {
    marginTop: spacing.xl,
  },

  // Bottom Spacers
  bottomSpacer: {
    height: 40,
  },
  bottomSpacerMobile: {
    height: 100,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backButtonError: {
    marginTop: spacing.lg,
    minWidth: 180,
  },

  // Location Section
  locationSection: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: spacing.md,
  },
  modalityBadges: {
    marginBottom: spacing.lg,
  },
  mapContainer: {
    marginTop: spacing.sm,
  },
  addressTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    borderRadius: borderRadius.md,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  addressCity: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2,
  },
});

export default SpecialistDetailScreen;
