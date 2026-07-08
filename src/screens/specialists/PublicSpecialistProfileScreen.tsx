import { showAppAlert, useAppAlert } from '../../components/common/alert';
/**
 * PublicSpecialistProfileScreen - Shareable public specialist profile
 *
 * Accessible via deep link: /especialista/:specialistId
 * Works without authentication. Shows HERA branded header instead of back button.
 * Auth-aware CTA: unauthenticated users can request an appointment without registering.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as specialistsService from '../../services/specialistsService';
import { spacing, borderRadius } from '../../constants/colors';
import { getGradientColors } from '../../constants/gradients';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { StyledLogo } from '../../components/common/StyledLogo';

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
import type { Specialist, Review, CertificateItem } from '../specialist-profile/types';
import type { AppNavigationProp, AppRouteProp, RootStackParamList } from '../../constants/types';
import { AnimatedPressable, Button } from '../../components/common';
import type { TimeSlot } from '../../services/sessionsService';

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

interface SelectedProfileSlot {
  date: string;
  slot: TimeSlot;
}

export const PublicSpecialistProfileScreen: React.FC = () => {
  const route = useRoute<AppRouteProp<'PublicSpecialistProfile'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const appAlert = useAppAlert();
  const { isAuthenticated, user } = useAuth();
  const { theme, isDark } = useTheme();
  const { specialistId } = route.params || {};
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;
  const styles = createStyles(theme, isDark, isDesktop, isTablet, isMobile);

  const scrollViewRef = useRef<ScrollView>(null);

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const canBook = specialist
    ? specialist.offersOnline !== false || specialist.offersInPerson === true
    : false;

  // Set document title on web
  useEffect(() => {
    if (Platform.OS === 'web' && specialist) {
      document.title = `${specialist.name} - Especialista en HERA`;
    }
    return () => {
      if (Platform.OS === 'web') {
        document.title = 'HERA';
      }
    };
  }, [specialist]);

  useFocusEffect(
    useCallback(() => {
      loadSpecialistDetails();
    }, [specialistId])
  );

  const loadSpecialistDetails = async () => {
    try {
      setLoading(true);
      setError(false);

      if (!specialistId) {
        throw new Error('No specialist ID provided');
      }

      const data = await specialistsService.getSpecialistDetails(specialistId);

      const mappedSpecialist = specialistsService.mapSpecialistToProfile(data);

      setSpecialist(mappedSpecialist);

      // Reviews: use real data if available
      if (data.reviewCount > 0 && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (err: unknown) {
      console.error('Error loading public profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = useCallback(async (selectedSlot?: SelectedProfileSlot) => {
    if (!specialist) return;

    const bookingParams: RootStackParamList['Booking'] = {
      specialistId: specialist.id,
      specialistName: specialist.name,
      pricePerSession: specialist.pricePerSession,
      avatar: specialist.avatar,
      title: specialist.title,
      specializations: specialist.specializations,
      slotDuration: specialist.slotDuration ?? 60,
      offersOnline: specialist.offersOnline ?? true,
      offersInPerson: specialist.offersInPerson ?? false,
      ...(selectedSlot ? {
        initialDate: selectedSlot.date,
        initialSlotStartTime: selectedSlot.slot.startTime,
        initialSlotEndTime: selectedSlot.slot.endTime,
      } : {}),
    };

    if (!canBook) {
      showAppAlert(
        appAlert,
        'Reserva no disponible',
        'Este especialista no tiene modalidades de reserva activas en este momento.'
      );
      return;
    }

    if (isAuthenticated && user?.type !== 'client') {
      showAppAlert(appAlert, 'Información', 'No puedes reservar sesiones desde esta cuenta.');
      return;
    }

    navigation.navigate('Booking', bookingParams);
  }, [appAlert, canBook, specialist, isAuthenticated, user, navigation]);

  const handleBookSessionPress = useCallback(() => {
    void handleBookSession();
  }, [handleBookSession]);

  const handleAvailabilitySlotSelect = useCallback((date: string, slot: TimeSlot) => {
    void handleBookSession({ date, slot });
  }, [handleBookSession]);

  const handleOpenCertificate = useCallback(async (certificate: CertificateItem) => {
    if (!specialist) {
      return;
    }

    try {
      await specialistsService.openPublicCertificateDocument(
        specialist.id,
        certificate.id,
        certificate.mimeType,
        certificate.documentUrl
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el certificado.';
      showAppAlert(appAlert, 'Error', message);
    }
  }, [appAlert, specialist]);

  const handleGoToLanding = useCallback(() => {
    navigation.navigate('Landing');
  }, [navigation]);

  const handleScrollToReviews = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 800, animated: true });
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isMobile) {
      const scrollY = event.nativeEvent.contentOffset.y;
      setShowStickyBar(scrollY > 400);
    }
  }, [isMobile]);

  // ============== GRADIENT COLORS ==============
  const gradientColors = getGradientColors(specialist?.gradientId);

  // ============== HERA BRANDED HEADER ==============
  const renderHeader = () => (
    <View style={[styles.heraHeader, (isDesktop || isTablet) && styles.heraHeaderDesktop]}>
      <AnimatedPressable
        style={styles.heraLogoContainer}
        onPress={handleGoToLanding}
        hoverLift={false}
        pressScale={0.985}
      >
        <StyledLogo size={36} />
      </AnimatedPressable>

      {!isAuthenticated && (
        <View style={styles.heraHeaderActions}>
          <Button
            variant="ghost"
            size="medium"
            style={styles.heraLoginButton}
            onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
          >
            Iniciar sesión
          </Button>
          <Button
            variant="primary"
            size="medium"
            style={styles.heraRegisterButton}
            onPress={() => navigation.navigate('Register', { userType: 'CLIENT' })}
          >
            Crear cuenta
          </Button>
        </View>
      )}
    </View>
  );

  // ============== LOADING ==============
  if (loading) {
    return (
      <View style={styles.screenContainer}>
        {renderHeader()}
        <ProfileSkeleton isDesktop={!isMobile} />
      </View>
    );
  }

  // ============== ERROR ==============
  if (error || !specialist) {
    return (
      <View style={styles.screenContainer}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.warning} />
          <Text style={styles.errorTitle}>Perfil no disponible</Text>
          <Text style={styles.errorText}>
            Este perfil no existe o no está disponible en este momento.
          </Text>
          <Button variant="primary" size="large" style={styles.errorButton} onPress={handleGoToLanding}>
            Volver a HERA
          </Button>
        </View>
      </View>
    );
  }

  // ============== MAIN CONTENT ==============
  const heroRenderedAbove = isDesktop || isTablet;

  const renderMainContent = (skipHero = false) => (
    <>
      {/* Hero Section */}
      {!skipHero && (
            <ProfileHero
              specialist={specialist}
              onBookPress={handleBookSessionPress}
              onRatingPress={handleScrollToReviews}
              gradientColors={gradientColors}
              bio={specialist.bio}
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
          onOpenCertificate={(certificate) => void handleOpenCertificate(certificate)}
        />
      </View>

      {/* Reviews Section */}
      <View style={styles.section}>
        <ReviewsSection
          specialistId={specialist.id}
          reviews={reviews}
          rating={specialist.rating}
          reviewCount={specialist.reviewCount}
        />
      </View>
    </>
  );

  // Professional info text (when a professional views the profile)
  const isProfessional = isAuthenticated && user?.type === 'professional';

  // ============== PROFESSIONAL BANNER ==============
  const renderProfessionalBanner = () => {
    if (!isProfessional) return null;
    return (
      <View style={styles.professionalInfoBox}>
        <Ionicons name="information-circle" size={20} color={theme.info} />
        <Text style={styles.professionalInfoText}>
          Estás viendo este perfil como profesional. Los pacientes pueden reservar sesiones desde esta página.
        </Text>
      </View>
    );
  };

  // ============== DESKTOP/TABLET LAYOUT ==============
  if (isDesktop || isTablet) {
    return (
      <View style={styles.screenContainer}>
        {renderHeader()}
        {renderProfessionalBanner()}
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.twoColumnContainer}>
            <View style={[styles.leftColumn, isTablet && styles.leftColumnTablet]}>
              <ProfileHero
                specialist={specialist}
                onBookPress={handleBookSessionPress}
                onRatingPress={handleScrollToReviews}
                gradientColors={gradientColors}
                bio={specialist.bio}
                therapeuticApproach={specialist.therapeuticApproach}
              />
              {renderMainContent(heroRenderedAbove)}
              <View style={styles.bottomSpacer} />
            </View>
            <View style={[styles.rightColumn, isTablet && styles.rightColumnTablet]}>
              <BookingSidebar
                specialist={specialist}
                onBookPress={handleBookSessionPress}
                onSlotSelect={handleAvailabilitySlotSelect}
                gradientColors={gradientColors}
                canBook={canBook}
                showLargePhoto
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
        </ScrollView>
      </View>
    );
  }

  // ============== MOBILE LAYOUT ==============
  return (
    <View style={styles.screenContainer}>
      {renderHeader()}
      {renderProfessionalBanner()}
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.mobileContainer}>
          <ProfileHero
            specialist={specialist}
            onBookPress={handleBookSessionPress}
            onRatingPress={handleScrollToReviews}
            gradientColors={gradientColors}
            bio={specialist.bio}
            therapeuticApproach={specialist.therapeuticApproach}
          />
          <View style={styles.section}>
            <BookingSidebar
              specialist={specialist}
              onBookPress={handleBookSessionPress}
              onSlotSelect={handleAvailabilitySlotSelect}
              gradientColors={gradientColors}
              canBook={canBook}
              showLargePhoto={false}
            />
          </View>
          {renderMainContent(true)}
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

      <StickyBookingBar
        specialistName={specialist.name}
        pricePerSession={specialist.pricePerSession}
        onBookPress={handleBookSessionPress}
        visible={showStickyBar}
        canBook={canBook}
      />
    </View>
  );
};

// ============== STYLES ==============
const createStyles = (
  theme: Theme,
  isDark: boolean,
  isDesktop: boolean,
  isTablet: boolean,
  isMobile: boolean
) => StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: isMobile ? 32 : 48,
  },

  // HERA Header
  heraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  heraHeaderDesktop: {
    paddingHorizontal: spacing.xxl,
  },
  heraLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  heraHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heraLoginButton: {
    minWidth: isMobile ? 0 : 132,
  },
  heraRegisterButton: {
    minWidth: isMobile ? 0 : 148,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: theme.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorButton: {
    marginTop: spacing.lg,
    minWidth: 220,
  },

  // Two Column Layout
  twoColumnContainer: {
    flexDirection: 'row',
    maxWidth: 1240,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: isTablet ? spacing.lg : spacing.xxl,
    paddingTop: spacing.xl,
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
  mobileContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomSpacerMobile: {
    height: 100,
  },

  // Professional info banner (full-width strip below header)
  professionalInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  professionalInfoText: {
    flex: 1,
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },

});

export default PublicSpecialistProfileScreen;
