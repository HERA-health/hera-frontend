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
import type { Specialist, Review } from '../specialist-profile/types';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { AnimatedPressable, Button } from '../../components/common';

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

export const PublicSpecialistProfileScreen: React.FC = () => {
  const route = useRoute<AppRouteProp<'PublicSpecialistProfile'>>();
  const navigation = useNavigation<AppNavigationProp>();
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

  const handleBookSession = useCallback(() => {
    if (!specialist) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (user?.type === 'professional') {
      Alert.alert('Información', 'No puedes reservar tu propia sesión');
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
      <AnimatedPressable
        style={styles.heraLogoContainer}
        onPress={handleGoToLanding}
        hoverLift={false}
        pressScale={0.985}
      >
        <StyledLogo size={32} />
        <Text style={styles.heraLogoText}>HERA</Text>
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
          <AnimatedPressable
            style={styles.modalCloseButton}
            onPress={() => setShowAuthModal(false)}
            hoverLift={false}
            pressScale={0.96}
          >
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </AnimatedPressable>

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

            <Button
              variant="primary"
              size="large"
              fullWidth
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Register', { userType: 'CLIENT' });
              }}
            >
              Crear cuenta
            </Button>

            <Button
              variant="outline"
              size="large"
              fullWidth
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Login', { userType: 'CLIENT' });
              }}
            >
              Ya tengo cuenta
            </Button>
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
            <View style={[styles.rightColumn, isTablet && styles.rightColumnTablet]}>
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
          {renderMainContent(false)}
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
    gap: spacing.sm,
    minHeight: 44,
  },
  heraLogoText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: 0.8,
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

  // Auth Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(6, 10, 8, 0.76)' : 'rgba(23, 30, 25, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '90%',
    maxWidth: 420,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 32,
    elevation: 10,
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
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  modalPrimaryButton: {
    marginBottom: spacing.sm,
  },
  modalSecondaryButton: {},
});

export default PublicSpecialistProfileScreen;
