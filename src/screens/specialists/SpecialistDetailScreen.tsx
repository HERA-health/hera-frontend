import { useDiscoveryRevalidation } from '../../hooks/useDiscoveryRevalidation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/common';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as specialistsService from '../../services/specialistsService';
import { SpecialistProfileLayout } from '../specialist-profile/SpecialistProfileLayout';
import { ProfilePackages } from '../../components/packages/ProfilePackages';
import { ProfileSkeleton } from '../specialist-profile/components';
import type {
  CertificateItem,
  Review,
  SelectedProfileSlot,
  Specialist,
} from '../specialist-profile/types';

interface SpecialistDetailScreenProps {
  route: { params?: { specialistId?: string; affinity?: number; intentToken?: string; optionId?: string } };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export const SpecialistDetailScreen: React.FC<SpecialistDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const appAlert = useAppAlert();
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { specialistId, affinity } = route.params ?? {};
  const styles = createStyles(theme);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const canBook = specialist
    ? specialist.offersOnline !== false || specialist.offersInPerson === true || specialist.offersPhone === true
    : false;

  const loadSpecialistDetails = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      setLoading(true);
      setLoadError(null);
      setSpecialist(null);
      setReviews([]);
      if (!specialistId) throw new Error('No specialist ID provided');

      const data = await specialistsService.getSpecialistDetails(specialistId);
      if (requestId !== requestSequence.current) return;
      setSpecialist(specialistsService.mapSpecialistToProfile(data));
      if (data.reviewCount > 0 && data.reviews) setReviews(data.reviews);
    } catch (error: unknown) {
      if (requestId !== requestSequence.current) return;
      const message = error instanceof Error
        ? error.message
        : 'No se pudo cargar el perfil del especialista';
      setLoadError(message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [specialistId]);

  useDiscoveryRevalidation(loadSpecialistDetails, false);

  useFocusEffect(useCallback(() => {
    analyticsService.trackScreen('specialist_detail');
    void loadSpecialistDetails();
    return () => { requestSequence.current += 1; };
  }, [loadSpecialistDetails]));

  const handleBookSession = useCallback((selectedSlot?: SelectedProfileSlot, optionId?: string) => {
    if (!specialist) return;
    if (!canBook) {
      showAppAlert(
        appAlert,
        'Reserva no disponible',
        'Este especialista no tiene modalidades de reserva activas en este momento.',
      );
      return;
    }

    analyticsService.track('booking_initiated');
    navigation.navigate('Booking', {
      specialistId: specialist.id,
      optionId,
      intentToken: route.params?.intentToken,
      ...(selectedSlot ? {
        initialDate: selectedSlot.date,
        initialSlotStartTime: selectedSlot.slot.startTime,
        initialSlotEndTime: selectedSlot.slot.endTime,
      } : {}),
    });
  }, [appAlert, canBook, navigation, specialist, route.params?.intentToken]);

  const handleOpenCertificate = useCallback(async (certificate: CertificateItem) => {
    if (!specialist) return;
    try {
      await specialistsService.openPublicCertificateDocument(
        specialist.id,
        certificate.id,
        certificate.mimeType,
        certificate.documentUrl,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el certificado.';
      showAppAlert(appAlert, 'Error', message);
    }
  }, [appAlert, specialist]);

  if (loading) return <ProfileSkeleton isDesktop={width >= 768} />;

  if (!specialist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.warning} />
        <Text accessibilityRole="alert" style={styles.errorText}>{loadError ?? 'No se pudo cargar el perfil'}</Text>
        <Button onPress={() => void loadSpecialistDetails()} style={styles.errorButton}>Reintentar</Button>
        {specialistId ? <Button onPress={() => navigation.navigate('PublicSpecialistProfile', { profileRef: specialistId })} variant="outline" style={styles.errorButton}>
          Ver perfil público
        </Button> : null}
        <Button onPress={navigation.goBack} variant="primary" size="large" style={styles.errorButton}>
          Volver
        </Button>
      </View>
    );
  }

  return (
    <SpecialistProfileLayout
      packageSection={<ProfilePackages specialistId={specialist.id} intentToken={route.params?.intentToken} />}
        initialOptionId={route.params?.optionId}
      specialist={specialist}
      reviews={reviews}
      affinity={affinity}
      canBook={canBook}
      isAuthenticated={isAuthenticated}
      isClient={user?.type === 'client'}
      onBrowseSpecialists={() => navigation.navigate('Specialists')}
      onBookSession={handleBookSession}
      onOpenCertificate={(certificate) => void handleOpenCertificate(certificate)}
      onReviewSubmitted={() => void loadSpecialistDetails()}
    />
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: theme.bg,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  errorButton: {
    minWidth: 180,
    marginTop: spacing.lg,
  },
});

export default SpecialistDetailScreen;
