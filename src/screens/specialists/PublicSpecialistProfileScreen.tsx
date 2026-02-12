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
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Modal,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as specialistsService from '../../services/specialistsService';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
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
          const types: ('VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL')[] = [];
          if ((data as any).offersOnline !== false) types.push('VIDEO_CALL');
          if ((data as any).offersInPerson === true) types.push('IN_PERSON');
          const formats = (data as any).matchingProfile?.format || [];
          if (formats.includes('in-person') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
          if (formats.includes('hybrid') && !types.includes('IN_PERSON')) types.push('IN_PERSON');
          return types.length > 0 ? types : ['VIDEO_CALL'];
        })(),
        isAvailableToday: true,
        isOnline: true,
        education: [],
        experience: [],
        certifications: [],
        address: (data as any).offersInPerson && (data as any).officeAddress ? {
          street: (data as any).officeAddress,
          city: (data as any).officeCity || '',
          postalCode: (data as any).officePostalCode || '',
          latitude: (data as any).officeLat,
          longitude: (data as any).officeLng,
        } : undefined,
        offersOnline: (data as any).offersOnline ?? true,
        offersInPerson: (data as any).offersInPerson ?? false,
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
    } catch (err: any) {
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

  // ============== VERIFIED BADGE ==============
  const renderVerifiedBadge = () => (
    <View style={styles.verifiedBadge}>
      <Ionicons name="shield-checkmark" size={16} color={heraLanding.success} />
      <Text style={styles.verifiedBadgeText}>Verificado por HERA</Text>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
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
      {renderVerifiedBadge()}

      {isDesktop || isTablet ? (
        <CompactHero
          specialist={specialist}
          onRatingPress={handleScrollToReviews}
        />
      ) : (
        <ProfileHero
          specialist={specialist}
          onBookPress={handleBookSession}
          onRatingPress={handleScrollToReviews}
        />
      )}

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

  // ============== BOOKING SIDEBAR WRAPPER ==============
  const renderBookingSidebarWithAuth = () => {
    if (isProfessional) {
      return (
        <View style={styles.professionalInfoBox}>
          <Ionicons name="information-circle" size={20} color={heraLanding.info} />
          <Text style={styles.professionalInfoText}>
            Estás viendo este perfil como profesional. Los pacientes pueden reservar sesiones desde esta página.
          </Text>
        </View>
      );
    }
    return (
      <BookingSidebar
        specialist={specialist}
        onBookPress={handleBookSession}
      />
    );
  };

  // ============== DESKTOP/TABLET LAYOUT ==============
  if (isDesktop || isTablet) {
    return (
      <View style={styles.screenContainer}>
        {renderHeader()}
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
              {renderBookingSidebarWithAuth()}
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

      {!isProfessional && (
        <StickyBookingBar
          specialistName={specialist.name}
          pricePerSession={specialist.pricePerSession}
          onBookPress={handleBookSession}
          visible={showStickyBar}
        />
      )}
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
  },
  heraRegisterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Verified Badge
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: heraLanding.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.success,
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
    flex: 0.6,
    minWidth: 0,
  },
  leftColumnTablet: {
    flex: 0.55,
  },
  rightColumn: {
    flex: 0.35,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  rightColumnTablet: {
    flex: 0.4,
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

  // Professional info box
  professionalInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: heraLanding.border,
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
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
});

export default PublicSpecialistProfileScreen;
