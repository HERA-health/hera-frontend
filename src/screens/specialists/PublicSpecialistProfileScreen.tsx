/**
 * PublicSpecialistProfileScreen - Shareable public specialist profile
 *
 * Accessible via deep link: /especialista/:specialistId
 * Works without authentication. Shows HERA branded header instead of back button.
 * Auth-aware CTA: unauthenticated users see register/login modal.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Alert,
  Modal,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as specialistsService from '../../services/specialistsService';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import { getGradientColors } from '../../constants/gradients';
import { useAuth } from '../../contexts/AuthContext';
import { StyledLogo } from '../../components/common/StyledLogo';
import { LocationMapPreview, ModalityBadges } from '../../components/location';

import {
  ProfileHero,
  CompactHero,
  AboutSection,
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
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

export const PublicSpecialistProfileScreen: React.FC = () => {
  const route = useRoute<AppRouteProp<'PublicSpecialistProfile'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const { isAuthenticated, user } = useAuth();
  const { specialistId } = route.params || {};
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;

  const scrollViewRef = useRef<ScrollView>(null);

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  useEffect(() => {
    loadSpecialistDetails();
  }, [specialistId]);

  const loadSpecialistDetails = async () => {
    try {
      setLoading(true);
      setError(false);

      if (!specialistId) {
        throw new Error('No specialist ID provided');
      }

      const data = await specialistsService.getSpecialistDetails(specialistId);

      const mp = data.matchingProfile as Record<string, unknown> | undefined;
      const mappedSpecialist: Specialist = {
        id: data.id,
        name: data.user.name,
        title: data.specialization,
        avatar: data.avatar || undefined,
        bio: data.description,
        rating: data.rating,
        reviewCount: data.reviewCount,
        pricePerSession: data.pricePerSession,
        specializations: (mp?.specialties as string[]) || [],
        experienceYears: (mp?.experienceYears as number) || 0,
        therapeuticApproach: Array.isArray(mp?.therapeuticApproach)
          ? (mp.therapeuticApproach as string[]).join(', ')
          : (mp?.therapeuticApproach as string) || undefined,
        languages: (mp?.language as string[]) || [],
        sessionTypes: (() => {
          const types: ('VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL')[] = [];
          if (data.offersOnline !== false) types.push('VIDEO_CALL');
          if (data.offersInPerson === true) types.push('IN_PERSON');
          const formats = (mp?.format as string[]) || [];
          if (formats.includes('in-person') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
          if (formats.includes('hybrid') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
          return types.length > 0 ? types : ['VIDEO_CALL'];
        })(),
        isAvailableToday: true,
        isOnline: true,
        // Real data from API
        education: data.education ?? [],
        experience: data.experience ?? [],
        certifications: data.certificates ?? [],
        address: data.offersInPerson && data.officeAddress ? {
          street: data.officeAddress,
          city: data.officeCity || '',
          postalCode: data.officePostalCode || '',
          latitude: data.officeLat ?? undefined,
          longitude: data.officeLng ?? undefined,
        } : undefined,
        offersOnline: data.offersOnline ?? true,
        offersInPerson: data.offersInPerson ?? false,
        // New profile fields
        gradientId: data.gradientId || undefined,
        personalMotto: data.personalMotto || null,
        photoGallery: data.photoGallery || [],
        presentationVideoUrl: data.presentationVideoUrl || null,
        yearsInPractice: data.yearsInPractice ?? null,
        languagesSpoken: data.languagesSpoken || [],
        verificationStatus: data.verificationStatus || undefined,
        firstVisitFree: data.firstVisitFree || false,
        collegiateNumber: data.collegiateNumber || undefined,
      };

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

  const handleBookSession = useCallback(() => {
    if (!specialist) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (user?.type === 'professional') {
      if (Platform.OS === 'web') {
        window.alert('No puedes reservar tu propia sesión');
      } else {
        Alert.alert('Información', 'No puedes reservar tu propia sesión');
      }
      return;
    }

    navigation.navigate('Booking', {
      specialistId: specialist.id,
      specialistName: specialist.name,
      pricePerSession: specialist.pricePerSession,
      avatar: specialist.avatar,
    });
  }, [specialist, isAuthenticated, user, navigation]);

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
      <TouchableOpacity
        style={styles.heraLogoContainer}
        onPress={handleGoToLanding}
        activeOpacity={0.7}
      >
        <StyledLogo size={32} />
        <Text style={styles.heraLogoText}>HERA</Text>
      </TouchableOpacity>

      {!isAuthenticated && (
        <View style={styles.heraHeaderActions}>
          <TouchableOpacity
            style={styles.heraLoginButton}
            onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
            activeOpacity={0.7}
          >
            <Text style={styles.heraLoginButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heraRegisterButton}
            onPress={() => navigation.navigate('Register', { userType: 'CLIENT' })}
            activeOpacity={0.7}
          >
            <Text style={styles.heraRegisterButtonText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ============== AUTH MODAL ==============
  const renderAuthModal = () => (
    <Modal
      visible={showAuthModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAuthModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowAuthModal(false)}>
        <Pressable style={[styles.modalContent, isMobile && styles.modalContentMobile]} onPress={e => e.stopPropagation()}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAuthModal(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
          </TouchableOpacity>

          <View style={styles.modalBody}>
            <View style={styles.modalLogoRow}>
              <StyledLogo size={40} />
            </View>
            <Text style={styles.modalTitle}>
              Crea tu cuenta gratuita
            </Text>
            <Text style={styles.modalSubtitle}>
              para reservar tu sesión con {specialist?.name}
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Register', { userType: 'CLIENT' });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalPrimaryButtonText}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Login', { userType: 'CLIENT' });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSecondaryButtonText}>Ya tengo cuenta</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
          <Ionicons name="alert-circle" size={64} color={heraLanding.warning} />
          <Text style={styles.errorTitle}>Perfil no disponible</Text>
          <Text style={styles.errorText}>
            Este perfil no existe o no está disponible en este momento.
          </Text>
          <TouchableOpacity onPress={handleGoToLanding} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Volver a HERA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============== MAIN CONTENT ==============
  const renderMainContent = () => (
    <>
      {isDesktop || isTablet ? (
        <CompactHero
          specialist={specialist}
          onRatingPress={handleScrollToReviews}
          gradientColors={gradientColors}
        />
      ) : (
        <ProfileHero
          specialist={specialist}
          onBookPress={handleBookSession}
          onRatingPress={handleScrollToReviews}
          gradientColors={gradientColors}
        />
      )}

      {/* Photo Gallery */}
      {specialist.photoGallery && specialist.photoGallery.length > 0 && (
        <View style={styles.section}>
          <PhotoGallerySection photoGallery={specialist.photoGallery} />
        </View>
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

      <View style={styles.section}>
        <AboutSection
          bio={specialist.bio}
          therapeuticApproach={specialist.therapeuticApproach}
        />
      </View>

      {(specialist.offersOnline || specialist.offersInPerson) && (
        <View style={styles.section}>
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Modalidad y ubicación</Text>
            <ModalityBadges
              offersOnline={specialist.offersOnline ?? true}
              offersInPerson={specialist.offersInPerson ?? false}
              style={styles.modalityBadges}
            />
            {specialist.offersInPerson && specialist.address && specialist.address.latitude && specialist.address.longitude && (
              <View style={styles.mapContainer}>
                <LocationMapPreview
                  lat={specialist.address.latitude}
                  lng={specialist.address.longitude}
                  address={specialist.address.street}
                  city={specialist.address.city}
                  showDirectionsButton
                  width={isMobile ? width - 64 : 350}
                  height={200}
                />
              </View>
            )}
            {specialist.offersInPerson && specialist.address && !specialist.address.latitude && (
              <View style={styles.addressTextContainer}>
                <Ionicons name="location" size={18} color={heraLanding.primary} />
                <View>
                  <Text style={styles.addressText}>{specialist.address.street}</Text>
                  <Text style={styles.addressCity}>{specialist.address.postalCode} {specialist.address.city}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {specialist.specializations.length > 0 && (
        <View style={styles.section}>
          <SpecializationsGrid
            specializations={specialist.specializations}
            specializationsDetail={specialist.specializationsDetail}
          />
        </View>
      )}

      <View style={styles.section}>
        <ExperienceSection
          education={specialist.education}
          experience={specialist.experience}
          certifications={specialist.certifications}
          collegiateNumber={specialist.collegiateNumber}
          experienceYears={specialist.experienceYears}
        />
      </View>

      <View style={styles.section}>
        <ReviewsSection
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
        <Ionicons name="information-circle" size={20} color={heraLanding.info} />
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
              {renderMainContent()}
              <View style={styles.bottomSpacer} />
            </View>
            <View style={[styles.rightColumn, isTablet && styles.rightColumnTablet]}>
              <BookingSidebar
                specialist={specialist}
                onBookPress={handleBookSession}
                gradientColors={gradientColors}
              />
            </View>
          </View>
        </ScrollView>
        {renderAuthModal()}
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
          {renderMainContent()}
          <View style={styles.bottomSpacerMobile} />
        </View>
      </ScrollView>

      <StickyBookingBar
        specialistName={specialist.name}
        pricePerSession={specialist.pricePerSession}
        onBookPress={handleBookSession}
        visible={showStickyBar}
      />
      {renderAuthModal()}
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

  // HERA Header
  heraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: heraLanding.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  heraHeaderDesktop: {
    paddingHorizontal: spacing.xxl,
  },
  heraLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  heraLogoText: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: 1,
  },
  heraHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heraLoginButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  heraLoginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  heraRegisterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  heraRegisterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
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
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm + 4,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  errorButtonText: {
    fontSize: 16,
    color: heraLanding.textOnPrimary,
    fontWeight: '600',
  },

  // Two Column Layout
  twoColumnContainer: {
    flexDirection: 'row',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: spacing.xxl,
    paddingTop: spacing.lg,
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
  mobileContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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

  // Location Section
  locationSection: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: heraLanding.textPrimary,
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
    backgroundColor: heraLanding.background,
    borderRadius: borderRadius.md,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  addressCity: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },

  // Professional info banner (full-width strip below header)
  professionalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.cardBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  professionalInfoText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },

  // Auth Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '90%',
    maxWidth: 420,
    position: 'relative',
  },
  modalContentMobile: {
    width: '92%',
    padding: spacing.xl,
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalLogoRow: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  modalPrimaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  modalSecondaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: heraLanding.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
});

export default PublicSpecialistProfileScreen;
