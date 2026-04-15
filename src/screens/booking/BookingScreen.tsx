import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import * as sessionsService from '../../services/sessionsService';
import { SessionType, TimeSlot } from '../../services/sessionsService';
import { ProfessionalInfoColumn, CompactCalendarColumn, TimeSlotsColumn } from './components';
import * as analyticsService from '../../services/analyticsService';

interface BookingScreenProps {
  route: {
    params: {
      specialistId: string;
      specialistName: string;
      pricePerSession: number;
      avatar?: string;
      title?: string;
      specializations?: string[];
      slotDuration?: number;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

const BREAKPOINTS = {
  tablet: 1024,
  desktop: 1200,
};

const showBookingMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(message);
    return;
  }

  Alert.alert(title, message);
};

export const BookingScreen: React.FC<BookingScreenProps> = ({ route, navigation }) => {
  const {
    specialistId,
    specialistName,
    pricePerSession,
    avatar,
    title,
    specializations,
    slotDuration: paramSlotDuration,
  } = route.params;
  const slotDuration = paramSlotDuration ?? 60;
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isMobile = width < BREAKPOINTS.tablet;

  const bookingCompletedRef = useRef(false);

  useEffect(() => {
    analyticsService.trackScreen('booking', { specialistId });
    return () => {
      if (!bookingCompletedRef.current) {
        analyticsService.track('booking_abandoned', { specialistId });
      }
    };
  }, [specialistId]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('VIDEO_CALL');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const specialist = useMemo(
    () => ({
      id: specialistId,
      name: specialistName,
      title: title || 'Especialista',
      avatar,
      pricePerSession,
      specializations: specializations || [],
      sessionDuration: slotDuration,
    }),
    [specialistId, specialistName, title, avatar, pricePerSession, specializations, slotDuration],
  );

  const bookingState = useMemo(
    () => ({
      selectedDate,
      selectedTime: selectedSlot?.startTime || null,
      sessionType,
    }),
    [selectedDate, selectedSlot, sessionType],
  );

  const loadAvailableSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      setSelectedSlot(null);

      try {
        const slots = await sessionsService.getAvailableSlots(specialistId, date);
        setAvailableSlots(slots.filter((slot) => slot.available !== false));
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los horarios disponibles';
        showBookingMessage('Error', message);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [specialistId],
  );

  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      loadAvailableSlots(date);
    },
    [loadAvailableSlots],
  );

  const handleTimeSelect = useCallback(
    (slot: TimeSlot) => {
      setSelectedSlot(slot);
      if (selectedDate) {
        const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
        });
        analyticsService.track('booking_slot_selected', {
          dayOfWeek,
          timeSlot: slot.startTime,
        });
      }
    },
    [selectedDate],
  );

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedSlot) {
      showBookingMessage('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);

      const [hours, minutes] = selectedSlot.startTime.split(':');
      const dateObj = new Date(selectedDate);
      dateObj.setHours(parseInt(hours, 10));
      dateObj.setMinutes(parseInt(minutes, 10));
      dateObj.setSeconds(0);
      dateObj.setMilliseconds(0);

      const dateTime = dateObj.toISOString();

      await sessionsService.createSession({
        specialistId,
        date: dateTime,
        duration: slotDuration,
        type: sessionType,
      });

      bookingCompletedRef.current = true;
      analyticsService.track('session_booked', { specialistId, price: pricePerSession });

      navigation.navigate('Sessions', { refresh: true, showSuccess: true });

      setTimeout(() => {
        const formattedDate = new Date(dateTime).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const sessionTypeText =
          sessionType === 'VIDEO_CALL'
            ? 'Videollamada'
            : sessionType === 'IN_PERSON'
              ? 'Presencial'
              : 'Llamada';

        showBookingMessage(
          'Reserva confirmada',
          `Tu ${sessionTypeText.toLowerCase()} con ${specialistName} ha sido solicitada.\n\nEstado: Pendiente de confirmacion\nFecha: ${formattedDate}\nHora: ${selectedSlot.startTime}\nTipo: ${sessionTypeText}`,
        );
      }, 400);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cita. Intenta de nuevo.';
      showBookingMessage('Error', message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedDate,
    selectedSlot,
    specialistId,
    specialistName,
    slotDuration,
    sessionType,
    pricePerSession,
    navigation,
  ]);

  const renderDesktopLayout = () => (
    <View style={styles.desktopContainer}>
      <View style={styles.columnsContainer}>
        <ProfessionalInfoColumn
          specialist={specialist}
          booking={bookingState}
          onConfirm={handleConfirmBooking}
          onSessionTypeChange={setSessionType}
          loading={loading}
        />

        <CompactCalendarColumn
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        <TimeSlotsColumn
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedTime={selectedSlot?.startTime || null}
          onTimeSelect={handleTimeSelect}
          loading={loadingSlots}
        />
      </View>
    </View>
  );

  const renderTabletLayout = () => (
    <View style={styles.tabletContainer}>
      <View style={styles.tabletContent}>
        <View style={styles.tabletLeftColumn}>
          <ProfessionalInfoColumn
            specialist={specialist}
            booking={bookingState}
            onConfirm={handleConfirmBooking}
            onSessionTypeChange={setSessionType}
            loading={loading}
          />
        </View>

        <View style={styles.tabletRightColumn}>
          <CompactCalendarColumn
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />

          <TimeSlotsColumn
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedTime={selectedSlot?.startTime || null}
            onTimeSelect={handleTimeSelect}
            loading={loadingSlots}
          />
        </View>
      </View>
    </View>
  );

  const renderMobileLayout = () => (
    <View style={styles.mobileContainer}>
      <View style={styles.mobileHeader}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButtonMobile}>
          <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
        </AnimatedPressable>
        <Text style={styles.mobileHeaderTitle}>Reservar cita</Text>
        <View style={styles.mobileHeaderSpacer} />
      </View>

      <ScrollView
        style={styles.mobileScroll}
        contentContainerStyle={styles.mobileScrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.mobileSpecialistCard}>
          <View style={styles.mobileSpecialistRow}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.mobileAvatar} />
            ) : (
              <View style={styles.mobileAvatarPlaceholder}>
                <Text style={styles.mobileAvatarInitial}>
                  {specialistName?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}

            <View style={styles.mobileSpecialistInfo}>
              <Text style={styles.mobileSpecialistName}>{specialistName}</Text>
              <Text style={styles.mobileSpecialistPrice}>
                {pricePerSession}€ / sesion
              </Text>
            </View>
          </View>
        </View>

        <ProfessionalInfoColumn
          specialist={specialist}
          booking={bookingState}
          onConfirm={handleConfirmBooking}
          onSessionTypeChange={setSessionType}
          loading={loading}
          showConfirmButton={false}
          showSummary={false}
        />

        <CompactCalendarColumn
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        <TimeSlotsColumn
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedTime={selectedSlot?.startTime || null}
          onTimeSelect={handleTimeSelect}
          loading={loadingSlots}
        />

        <View style={styles.mobileFooterSpacer} />
      </ScrollView>

      <View style={styles.mobileStickyFooter}>
        <View style={styles.mobileFooterSummary}>
          <View style={styles.mobileFooterPill}>
            <Text style={styles.mobileFooterPillLabel}>Fecha</Text>
            <Text style={styles.mobileFooterPillValue}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Pendiente'}
            </Text>
          </View>

          <View style={styles.mobileFooterPill}>
            <Text style={styles.mobileFooterPillLabel}>Hora</Text>
            <Text style={styles.mobileFooterPillValue}>
              {selectedSlot?.startTime || 'Pendiente'}
            </Text>
          </View>

          <View style={styles.mobileFooterPill}>
            <Text style={styles.mobileFooterPillLabel}>Total</Text>
            <Text style={styles.mobileFooterPillValueStrong}>{pricePerSession}€</Text>
          </View>
        </View>

        <Button
          variant="primary"
          size="medium"
          onPress={handleConfirmBooking}
          disabled={!selectedDate || !selectedSlot || loading}
          loading={loading}
          fullWidth
        >
          Confirmar reserva
        </Button>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isMobile && (
        <View style={styles.topBar}>
          <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
            <Text style={styles.backButtonText}>Volver</Text>
          </AnimatedPressable>
        </View>
      )}

      {isDesktop && renderDesktopLayout()}
      {isTablet && renderTabletLayout()}
      {isMobile && renderMobileLayout()}
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    topBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    backButtonText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    desktopContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    columnsContainer: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'stretch',
      justifyContent: 'center',
    },
    tabletContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    tabletContent: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.lg,
    },
    tabletLeftColumn: {
      width: 340,
      flexShrink: 0,
    },
    tabletRightColumn: {
      flex: 1,
      gap: spacing.lg,
    },
    mobileContainer: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.bg,
    },
    backButtonMobile: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mobileHeaderTitle: {
      fontSize: 16,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    mobileHeaderSpacer: {
      width: 36,
      height: 36,
    },
    mobileScroll: {
      flex: 1,
    },
    mobileScrollContent: {
      padding: spacing.md,
      gap: spacing.md,
      alignItems: 'stretch',
    },
    mobileSpecialistCard: {
      width: '100%',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    mobileSpecialistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    mobileAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    mobileAvatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    mobileAvatarInitial: {
      fontSize: 18,
      fontFamily: theme.fontDisplayBold,
      color: theme.primary,
    },
    mobileSpecialistInfo: {
      flex: 1,
      gap: 2,
    },
    mobileSpecialistName: {
      fontSize: 20,
      lineHeight: 24,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    mobileSpecialistPrice: {
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    mobileStickyFooter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: theme.bgCard,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: spacing.sm,
    },
    mobileFooterSummary: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    mobileFooterPill: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
      gap: 2,
    },
    mobileFooterPillLabel: {
      fontSize: 10,
      letterSpacing: 0.4,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    mobileFooterPillValue: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    mobileFooterPillValueStrong: {
      fontSize: 16,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    mobileFooterSpacer: {
      height: 120,
    },
  });

export default BookingScreen;
