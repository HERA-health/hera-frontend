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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as specialistsService from '../../services/specialistsService';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';

// Import modular components
import {
  ProfileHero,
  CompactHero,
  AboutSection,
  SpecializationsGrid,
  ExperienceSection,
  ReviewsSection,
  StickyBookingBar,
  BookingSidebar,
} from '../specialist-profile/components';
import type { Specialist, Review } from '../specialist-profile/types';

// Types
interface SpecialistDetailScreenProps {
  route: any;
  navigation: any;
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

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;

  const scrollViewRef = useRef<ScrollView>(null);

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    loadSpecialistDetails();
  }, [specialistId]);

  // ============== DATA FETCHING (PRESERVED) ==============
  const loadSpecialistDetails = async () => {
    try {
      setLoading(true);

      if (!specialistId) {
        throw new Error('No specialist ID provided');
      }

      // Fetch specialist details from backend (UNCHANGED)
      const data = await specialistsService.getSpecialistDetails(specialistId);

      // Map backend data to new Specialist type
      const mappedSpecialist: Specialist = {
        id: data.id,
        name: data.user.name,
        title: data.specialization,
        avatar: data.avatar || undefined,
        bio: data.description,
        rating: data.rating,
        reviewCount: data.reviewCount,
        pricePerSession: data.pricePerSession,
        specializations: (data as any).matchingProfile?.specialties || [],
        experienceYears: (data as any).matchingProfile?.experienceYears || 0,
        therapeuticApproach: Array.isArray((data as any).matchingProfile?.therapeuticApproach)
          ? (data as any).matchingProfile.therapeuticApproach.join(', ')
          : (data as any).matchingProfile?.therapeuticApproach || undefined,
        languages: (data as any).matchingProfile?.language || [],
        sessionTypes: (() => {
          const formats = (data as any).matchingProfile?.format || [];
          const types: ('VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL')[] = [];
          if (formats.includes('online') || formats.includes('VIDEO_CALL')) types.push('VIDEO_CALL');
          if (formats.includes('in-person') || formats.includes('IN_PERSON')) types.push('IN_PERSON');
          if (formats.includes('hybrid')) {
            types.push('VIDEO_CALL');
            types.push('IN_PERSON');
          }
          return types.length > 0 ? types : ['VIDEO_CALL'];
        })(),
        isAvailableToday: true,
        isOnline: true,
        education: [],
        experience: [],
        certifications: [],
        // Mock address for in-person specialists
        address: (data as any).matchingProfile?.format?.includes('in-person') ? {
          street: 'C/ Gran Vía 123',
          city: 'Madrid',
          postalCode: '28013',
        } : undefined,
        // Mock schedule
        schedule: {
          monday: { start: '09:00', end: '20:00', available: true },
          tuesday: { start: '09:00', end: '20:00', available: true },
          wednesday: { start: '09:00', end: '20:00', available: true },
          thursday: { start: '09:00', end: '20:00', available: true },
          friday: { start: '09:00', end: '20:00', available: true },
          saturday: { start: '10:00', end: '14:00', available: true },
          sunday: { start: '', end: '', available: false },
        },
      };

      setSpecialist(mappedSpecialist);

      // Mock reviews for display
      if (data.reviewCount > 0) {
        setReviews([
          {
            id: '1',
            rating: 5,
            text: 'Excelente profesional. Me ayudó mucho a entender y gestionar mi ansiedad. Muy recomendable.',
            authorName: 'María G.',
            date: 'Hace 2 semanas',
          },
          {
            id: '2',
            rating: 5,
            text: 'Muy empática y profesional. Las sesiones son muy productivas y me siento escuchada.',
            authorName: 'Carlos R.',
            date: 'Hace 1 mes',
          },
          {
            id: '3',
            rating: 4,
            text: 'Gran experiencia. El enfoque terapéutico es muy efectivo para mi situación.',
            authorName: 'Ana P.',
            date: 'Hace 1 mes',
          },
        ]);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo cargar el perfil del especialista';
      Alert.alert('Error', errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ============== NAVIGATION HANDLERS (PRESERVED) ==============
  const handleBookSession = useCallback(() => {
    if (!specialist) return;

    navigation.navigate('Booking', {
      specialistId: specialist.id,
      specialistName: specialist.name,
      pricePerSession: specialist.pricePerSession,
      avatar: specialist.avatar,
      title: specialist.title,
      specializations: specialist.specializations,
    });
  }, [specialist, navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScrollToReviews = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 800, animated: true });
  }, []);

  // Scroll handler for sticky bar (mobile only)
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isMobile) {
      const scrollY = event.nativeEvent.contentOffset.y;
      setShowStickyBar(scrollY > 400);
    }
  }, [isMobile]);

  // ============== LOADING STATE ==============
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // ============== ERROR STATE ==============
  if (!specialist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={heraLanding.warning} />
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButtonError}>
          <Text style={styles.backButtonErrorText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============== MAIN CONTENT SECTIONS ==============
  const renderMainContent = () => (
    <>
      {/* Hero Section - Compact on desktop, Full on mobile */}
      {isDesktop || isTablet ? (
        <CompactHero
          specialist={specialist}
          affinity={affinity}
          onRatingPress={handleScrollToReviews}
        />
      ) : (
        <ProfileHero
          specialist={specialist}
          affinity={affinity}
          onBookPress={handleBookSession}
          onRatingPress={handleScrollToReviews}
        />
      )}

      {/* About Section */}
      <View style={styles.section}>
        <AboutSection
          bio={specialist.bio}
          therapeuticApproach={specialist.therapeuticApproach}
        />
      </View>

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
      <View style={styles.section}>
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>

          {/* Two Column Layout */}
          <View style={styles.twoColumnContainer}>
            {/* Left Column - Main Content */}
            <View style={[
              styles.leftColumn,
              isTablet && styles.leftColumnTablet,
            ]}>
              {renderMainContent()}
              <View style={styles.bottomSpacer} />
            </View>

            {/* Right Column - Sticky Sidebar */}
            <View style={[
              styles.rightColumn,
              isTablet && styles.rightColumnTablet,
            ]}>
              <BookingSidebar
                specialist={specialist}
                onBookPress={handleBookSession}
              />
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mobileContainer}>
          {renderMainContent()}
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
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
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
  },
  backButtonText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
  },

  // Two Column Layout
  twoColumnContainer: {
    flexDirection: 'row',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: spacing.xxl,
  },
  leftColumn: {
    flex: 0.6,
    minWidth: 0,
  },
  leftColumnTablet: {
    flex: 0.55,
  },
  rightColumn: {
    flex: 0.35,
    minWidth: 0,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 24,
        alignSelf: 'flex-start',
      },
    }),
  },
  rightColumnTablet: {
    flex: 0.4,
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

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: heraLanding.textSecondary,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backButtonError: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm + 4,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
  },
  backButtonErrorText: {
    fontSize: 16,
    color: heraLanding.textOnPrimary,
    fontWeight: '600',
  },
});

export default SpecialistDetailScreen;
