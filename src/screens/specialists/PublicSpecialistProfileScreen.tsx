import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AnimatedPressable, Button } from '../../components/common';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { StyledLogo } from '../../components/common/StyledLogo';
import { spacing } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp, RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';
import * as specialistsService from '../../services/specialistsService';
import { SpecialistProfileLayout } from '../specialist-profile/SpecialistProfileLayout';
import { ProfileSkeleton } from '../specialist-profile/components';
import type {
  CertificateItem,
  Review,
  SelectedProfileSlot,
  Specialist,
} from '../specialist-profile/types';

export const PublicSpecialistProfileScreen: React.FC = () => {
  const route = useRoute<AppRouteProp<'PublicSpecialistProfile'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const appAlert = useAppAlert();
  const {
    isAuthenticated,
    user,
    legalStatusSnapshot,
    verificationSubmitted,
  } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { profileRef } = route.params ?? {};
  const isWide = width >= 768;
  const isMobile = width < 768;
  const styles = createStyles(theme, isDark, isWide, isMobile);
  const profileRequestRef = useRef(0);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canBook = specialist
    ? specialist.offersOnline !== false || specialist.offersInPerson === true
    : false;
  const hasIndexableProfile = Boolean(
    !loading
    && !error
    && specialist?.isPubliclyListed === true
    && specialist.avatar
    && specialist.pricePerSession > 0,
  );
  // Crawlers must not observe a transient noindex while public data is still resolving.
  const shouldIndexProfilePage = loading || hasIndexableProfile;
  const canonicalProfileRef = specialist?.publicSlug ?? profileRef;

  useWebPageMetadata({
    title: specialist ? `${specialist.name} | Especialista en HERA` : 'Hera | Perfil público',
    description: specialist
      ? `Consulta el perfil profesional de ${specialist.name}, sus áreas de acompañamiento y modalidades de sesión en HERA.`
      : 'Consulta perfiles públicos de especialistas verificados en HERA.',
    canonicalPath: canonicalProfileRef
      ? `/especialista/${encodeURIComponent(canonicalProfileRef)}`
      : '/especialista',
    indexable: shouldIndexProfilePage,
    openGraphType: 'profile',
  });

  const loadSpecialistDetails = useCallback(async () => {
    const requestId = profileRequestRef.current + 1;
    profileRequestRef.current = requestId;
    try {
      setLoading(true);
      setError(false);
      setReviews([]);
      setReviewsVisible(false);
      if (!profileRef) throw new Error('No specialist profile reference provided');

      const data = await specialistsService.getPublicSpecialistDetails(profileRef);
      if (profileRequestRef.current !== requestId) return;
      setSpecialist(specialistsService.mapPublicSpecialistToProfile(data));
      setReviewsVisible(data.reviewCount !== null);
      if (data.reviewCount !== null && data.reviewCount > 0 && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (loadError: unknown) {
      if (profileRequestRef.current !== requestId) return;
      console.error('Error loading public profile:', loadError);
      setError(true);
    } finally {
      if (profileRequestRef.current === requestId) setLoading(false);
    }
  }, [profileRef]);

  useFocusEffect(useCallback(() => {
    void loadSpecialistDetails();
    return () => { profileRequestRef.current += 1; };
  }, [loadSpecialistDetails]));

  const handleBookSession = useCallback((selectedSlot?: SelectedProfileSlot) => {
    if (!specialist) return;
    if (!canBook) {
      showAppAlert(
        appAlert,
        'Reserva no disponible',
        'Este especialista no tiene modalidades de reserva activas en este momento.',
      );
      return;
    }
    if (isAuthenticated && user?.type !== 'client') {
      showAppAlert(appAlert, 'Información', 'No puedes reservar sesiones desde esta cuenta.');
      return;
    }
    const bookingRouteIsAvailable = navigation.getState().routeNames.includes('Booking');
    if (isAuthenticated && (legalStatusSnapshot?.requiresAcceptance || !bookingRouteIsAvailable)) {
      navigation.navigate('RequiredLegalAcceptance');
      return;
    }

    const params: RootStackParamList['Booking'] = {
      specialistId: specialist.id,
      ...(selectedSlot ? {
        initialDate: selectedSlot.date,
        initialSlotStartTime: selectedSlot.slot.startTime,
        initialSlotEndTime: selectedSlot.slot.endTime,
      } : {}),
    };
    navigation.navigate('Booking', params);
  }, [
    appAlert,
    canBook,
    isAuthenticated,
    legalStatusSnapshot?.requiresAcceptance,
    navigation,
    specialist,
    user?.type,
  ]);

  const handleOpenCertificate = useCallback(async (certificate: CertificateItem) => {
    if (!specialist) return;
    try {
      await specialistsService.openPublicCertificateDocument(
        specialist.id,
        certificate.id,
        certificate.mimeType,
        certificate.documentUrl,
      );
    } catch (certificateError: unknown) {
      const message = certificateError instanceof Error
        ? certificateError.message
        : 'No se pudo abrir el certificado.';
      showAppAlert(appAlert, 'Error', message);
    }
  }, [appAlert, specialist]);

  const handleGoToLanding = useCallback(() => {
    if (!isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
      return;
    }
    const workspaceRoute = legalStatusSnapshot?.requiresAcceptance
      ? 'RequiredLegalAcceptance'
      : user?.type === 'professional'
        ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
        : user?.type === 'clinic'
          ? 'ClinicDashboard'
          : 'Home';
    navigation.reset({ index: 0, routes: [{ name: workspaceRoute }] });
  }, [
    isAuthenticated,
    legalStatusSnapshot?.requiresAcceptance,
    navigation,
    user?.type,
    verificationSubmitted,
  ]);

  const renderHeader = () => (
    <View style={[styles.header, isWide && styles.headerWide]}>
      <AnimatedPressable
        style={styles.logo}
        onPress={handleGoToLanding}
        hoverLift={false}
        pressScale={0.985}
        accessibilityRole="link"
        accessibilityLabel="Ir al inicio"
        testID="public-specialist-profile-home"
      >
        <StyledLogo size={36} />
      </AnimatedPressable>
      {!isAuthenticated ? (
        <View style={styles.headerActions}>
          <Button
            variant="ghost"
            size="medium"
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
          >
            Iniciar sesión
          </Button>
          <Button
            variant="primary"
            size="medium"
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register', { userType: 'CLIENT' })}
          >
            Crear cuenta
          </Button>
        </View>
      ) : null}
    </View>
  );

  const professionalBanner = isAuthenticated && user?.type === 'professional' ? (
    <View style={styles.professionalBanner}>
      <Ionicons name="information-circle" size={20} color={theme.info} />
      <Text style={styles.professionalBannerText}>
        Estás viendo este perfil como profesional. Los pacientes pueden reservar sesiones desde esta página.
      </Text>
    </View>
  ) : null;

  if (loading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <ProfileSkeleton isDesktop={isWide} />
      </View>
    );
  }

  if (error || !specialist) {
    return (
      <View style={styles.screen}>
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

  return (
    <View style={styles.screen}>
      {renderHeader()}
      {professionalBanner}
      <SpecialistProfileLayout
        specialist={specialist}
        reviews={reviews}
        reviewsVisible={reviewsVisible}
        canBook={canBook}
        isAuthenticated={isAuthenticated}
        isClient={user?.type === 'client'}
        onBrowseSpecialists={() => navigation.navigate('PublicSpecialists')}
        onBookSession={handleBookSession}
        onOpenCertificate={(certificate) => void handleOpenCertificate(certificate)}
        onReviewSubmitted={() => void loadSpecialistDetails()}
      />
    </View>
  );
};

const createStyles = (
  theme: Theme,
  isDark: boolean,
  isWide: boolean,
  isMobile: boolean,
) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    backgroundColor: theme.bgCard,
  },
  headerWide: { paddingHorizontal: spacing.xxl },
  logo: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loginButton: { minWidth: isMobile ? 0 : 132 },
  registerButton: { minWidth: isMobile ? 0 : 148 },
  professionalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
  },
  professionalBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    marginTop: spacing.md,
    fontSize: 20,
    fontFamily: theme.fontHeading,
    color: theme.textPrimary,
  },
  errorText: {
    maxWidth: 320,
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 21,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  errorButton: { minWidth: 220, marginTop: spacing.lg },
});

export default PublicSpecialistProfileScreen;
