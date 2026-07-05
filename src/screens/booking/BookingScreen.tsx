import { showAppAlert, useAppAlert } from '../../components/common/alert';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import * as sessionsService from '../../services/sessionsService';
import { BookingQuote, SessionStatus, SessionType, TimeSlot } from '../../services/sessionsService';
import { ProfessionalInfoColumn, CompactCalendarColumn, TimeSlotsColumn } from './components';
import * as analyticsService from '../../services/analyticsService';
import {
  getAvailableBookingSessionTypes,
  getDefaultBookingSessionType,
  isBookingSessionTypeAvailable,
} from './bookingModalities';
import { formatMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import { useAuth } from '../../contexts/AuthContext';
import {
  mapPublicBookingContactErrors,
  PUBLIC_BOOKING_PRIVACY_VERSION,
  publicBookingContactSchema,
  PublicBookingContactErrors,
} from './publicBookingValidation';

interface BookingRouteParams {
  specialistId: string;
  specialistName: string;
  pricePerSession: number;
  avatar?: string;
  title?: string;
  specializations?: string[];
  slotDuration?: number;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  initialDate?: string;
  initialSlotStartTime?: string;
  initialSlotEndTime?: string;
}

interface BookingScreenProps {
  route: {
    params: BookingRouteParams;
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

const showBookingMessage = (
  appAlert: ReturnType<typeof useAppAlert>,
  title: string,
  message: string,
) => {
  showAppAlert(appAlert, title, message);
};

const formatBookingAmount = (amount: number): string =>
  `${amount.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

interface InitialSlotSelection {
  date: string;
  startTime: string;
  endTime: string;
}

const buildInitialSlotSelection = (
  params: BookingRouteParams
): InitialSlotSelection | null => {
  if (
    !params.initialDate
    || !DATE_KEY_PATTERN.test(params.initialDate)
    || !params.initialSlotStartTime
    || !TIME_PATTERN.test(params.initialSlotStartTime)
    || !params.initialSlotEndTime
    || !TIME_PATTERN.test(params.initialSlotEndTime)
  ) {
    return null;
  }

  return {
    date: params.initialDate,
    startTime: params.initialSlotStartTime,
    endTime: params.initialSlotEndTime,
  };
};

export const BookingScreen: React.FC<BookingScreenProps> = ({ route, navigation }) => {
  const appAlert = useAppAlert();
  const { isAuthenticated, user } = useAuth();
  const routeParams = route.params;
  const initialSlotSelection = useMemo(
    () => buildInitialSlotSelection(routeParams),
    [routeParams],
  );
  const {
    specialistId,
    specialistName,
    pricePerSession,
    avatar,
    title,
    specializations,
    slotDuration: paramSlotDuration,
    offersOnline,
    offersInPerson,
  } = routeParams;
  const slotDuration = paramSlotDuration ?? 60;
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isMobile = width < BREAKPOINTS.tablet;
  const isAnonymousBooking = !isAuthenticated;
  const isAuthenticatedClient = isAuthenticated && user?.type === 'client';
  const styles = useMemo(() => createStyles(theme, isDark, isMobile), [theme, isDark, isMobile]);

  const bookingCompletedRef = useRef(false);
  const modalityFlags = useMemo(
    () => ({
      offersOnline,
      offersInPerson,
    }),
    [offersInPerson, offersOnline],
  );
  const availableSessionTypes = useMemo(
    () => getAvailableBookingSessionTypes(modalityFlags),
    [modalityFlags],
  );
  const defaultSessionType = getDefaultBookingSessionType(modalityFlags);

  useEffect(() => {
    analyticsService.trackScreen('booking', { specialistId });
    return () => {
      if (!bookingCompletedRef.current) {
        analyticsService.track('booking_abandoned', { specialistId });
      }
    };
  }, [specialistId]);

  const initialSlotRef = useRef<InitialSlotSelection | null>(initialSlotSelection);
  const initialDateLoadRef = useRef<string | null>(initialSlotSelection?.date ?? null);
  const slotsRequestIdRef = useRef(0);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialSlotSelection?.date ?? null
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(defaultSessionType ?? 'VIDEO_CALL');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingQuote, setBookingQuote] = useState<BookingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [publicContact, setPublicContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    privacyAccepted: false,
  });
  const [publicContactErrors, setPublicContactErrors] = useState<PublicBookingContactErrors>({});
  const [publicBookingSuccess, setPublicBookingSuccess] = useState<{
    status: SessionStatus;
    date: string;
    time: string;
    type: SessionType;
  } | null>(null);

  useEffect(() => {
    if (!defaultSessionType) {
      return;
    }

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags)) {
      setSessionType(defaultSessionType);
    }
  }, [defaultSessionType, modalityFlags, sessionType]);

  const publicContactResult = useMemo(
    () => publicBookingContactSchema.safeParse(publicContact),
    [publicContact],
  );

  useEffect(() => {
    let isCurrent = true;

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags) || sessionType === 'PHONE_CALL') {
      setBookingQuote(null);
      setQuoteLoading(false);
      setQuoteError(
        availableSessionTypes.length === 0
          ? 'Este especialista no tiene modalidades de reserva activas.'
          : 'Esta modalidad no está disponible para este especialista.'
      );
      return () => {
        isCurrent = false;
      };
    }

    setQuoteLoading(true);
    setQuoteError(null);

    const quoteRequest = isAnonymousBooking
      ? sessionsService.getPublicBookingQuote({
          specialistId,
          type: sessionType,
          duration: slotDuration,
        })
      : sessionsService.getBookingQuote(specialistId, sessionType, slotDuration);

    quoteRequest
      .then((quote) => {
        if (!isCurrent) {
          return;
        }

        setBookingQuote(quote);
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo calcular el precio de la reserva.';
        setBookingQuote(null);
        setQuoteError(message);
      })
      .finally(() => {
        if (isCurrent) {
          setQuoteLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    availableSessionTypes.length,
    isAnonymousBooking,
    modalityFlags,
    sessionType,
    slotDuration,
    specialistId,
  ]);

  const canConfirmBooking =
    Boolean(bookingQuote)
    && !quoteLoading
    && !quoteError
    && availableSessionTypes.length > 0
    && (!isAnonymousBooking || publicContactResult.success);
  const quoteIsEstimated = isAnonymousBooking;
  const displayPrice = bookingQuote?.price ?? pricePerSession;
  const mobileTotalText = quoteLoading
    ? 'Calculando...'
    : quoteError
      ? 'No disponible'
      : bookingQuote
        ? formatBookingAmount(displayPrice)
        : 'Calculando...';
  const mobileSpecialistPriceText = bookingQuote
    ? `${mobileTotalText} / sesión`
    : mobileTotalText;

  const specialist = useMemo(
    () => ({
      id: specialistId,
      name: specialistName,
      title: title || 'Especialista',
      avatar,
      pricePerSession,
      specializations: specializations || [],
      sessionDuration: slotDuration,
      offersOnline: offersOnline ?? true,
      offersInPerson: offersInPerson ?? false,
    }),
    [
      specialistId,
      specialistName,
      title,
      avatar,
      pricePerSession,
      specializations,
      slotDuration,
      offersOnline,
      offersInPerson,
    ],
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
    async (date: string, options: { keepInitialSlot?: boolean } = {}) => {
      const requestId = slotsRequestIdRef.current + 1;
      slotsRequestIdRef.current = requestId;
      const isLatestRequest = () => slotsRequestIdRef.current === requestId;

      setLoadingSlots(true);
      if (!options.keepInitialSlot) {
        initialSlotRef.current = null;
        setSelectedSlot(null);
      }

      try {
        const slots = await sessionsService.getAvailableSlots(specialistId, date);
        if (!isLatestRequest()) {
          return;
        }

        setAvailableSlots(slots);

        const initialSlot = initialSlotRef.current;
        if (initialSlot?.date === date) {
          initialSlotRef.current = null;
          const matchingSlot = slots.find((slot) => (
            slot.available !== false
            && slot.startTime === initialSlot.startTime
            && slot.endTime === initialSlot.endTime
          ));

          if (matchingSlot) {
            setSelectedSlot(matchingSlot);
          } else {
            setSelectedSlot(null);
            showBookingMessage(
              appAlert,
              'Horario no disponible',
              'Ese horario acaba de dejar de estar disponible. Elige otra hora para continuar.'
            );
          }
        }
      } catch (error: unknown) {
        if (!isLatestRequest()) {
          return;
        }

        initialSlotRef.current = null;
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los horarios disponibles';
        showBookingMessage(appAlert, 'Error', message);
        setAvailableSlots([]);
      } finally {
        if (isLatestRequest()) {
          setLoadingSlots(false);
        }
      }
    },
    [appAlert, specialistId],
  );

  useEffect(() => {
    const initialDateToLoad = initialDateLoadRef.current;
    if (!initialDateToLoad) {
      return;
    }

    initialDateLoadRef.current = null;
    void loadAvailableSlots(initialDateToLoad, { keepInitialSlot: true });
  }, [loadAvailableSlots]);

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
        const dayOfWeek = formatMadridDateKey(selectedDate, { weekday: 'long' }, 'en-US');
        analyticsService.track('booking_slot_selected', {
          dayOfWeek,
          timeSlot: slot.startTime,
        });
      }
    },
    [selectedDate],
  );

  const updatePublicContactField = useCallback(
    <T extends keyof typeof publicContact>(field: T, value: (typeof publicContact)[T]) => {
      setPublicContact((current) => ({
        ...current,
        [field]: value,
      }));
      setPublicContactErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    },
    [],
  );

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedSlot) {
      showBookingMessage(appAlert, 'Error', 'Por favor selecciona fecha y hora');
      return;
    }

    if (isAuthenticated && !isAuthenticatedClient) {
      showBookingMessage(appAlert, 'Información', 'No puedes reservar sesiones desde esta cuenta.');
      return;
    }

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags)) {
      showBookingMessage(appAlert, 'Error', 'Esta modalidad no está disponible para este especialista');
      return;
    }

    if (sessionType === 'PHONE_CALL') {
      showBookingMessage(appAlert, 'Error', 'La reserva telefónica no está disponible.');
      return;
    }

    if (!canConfirmBooking || !bookingQuote) {
      showBookingMessage(
        appAlert,
        'Precio no disponible',
        quoteError || 'No se pudo calcular el precio de la reserva. Intenta de nuevo.'
      );
      return;
    }

    if (isAnonymousBooking && !publicContactResult.success) {
      setPublicContactErrors(mapPublicBookingContactErrors(publicContactResult.error));
      showBookingMessage(
        appAlert,
        'Datos incompletos',
        'Revisa tus datos de contacto y acepta la política de privacidad.'
      );
      return;
    }

    try {
      setLoading(true);

      const madridDateTime = parseMadridDateTime(selectedDate, selectedSlot.startTime);
      if (!madridDateTime) {
        showBookingMessage(appAlert, 'Error', 'La fecha u hora no es válida');
        return;
      }

      const dateTime = madridDateTime.iso;

      if (isAnonymousBooking) {
        const createdSession = await sessionsService.createPublicSession({
          specialistId,
          date: dateTime,
          duration: slotDuration,
          type: sessionType,
          patient: {
            firstName: publicContactResult.success ? publicContactResult.data.firstName : '',
            lastName: publicContactResult.success ? publicContactResult.data.lastName : '',
            email: publicContactResult.success ? publicContactResult.data.email : '',
            phone: publicContactResult.success ? publicContactResult.data.phone || null : null,
          },
          privacyAccepted: true,
          privacyVersion: PUBLIC_BOOKING_PRIVACY_VERSION,
        });

        bookingCompletedRef.current = true;
        analyticsService.track('session_booked', {
          specialistId,
          price: bookingQuote.price,
          currency: bookingQuote.currency,
        });
        setPublicBookingSuccess({
          status: createdSession.status,
          date: selectedDate,
          time: selectedSlot.startTime,
          type: sessionType,
        });
        return;
      }

      const createdSession = await sessionsService.createSession({
        specialistId,
        date: dateTime,
        duration: slotDuration,
        type: sessionType,
      });

      bookingCompletedRef.current = true;
      analyticsService.track('session_booked', {
        specialistId,
        price: createdSession.bookedPrice ?? bookingQuote.price,
        currency: createdSession.bookedCurrency ?? bookingQuote.currency,
      });

      navigation.navigate('Sessions', { refresh: true, showSuccess: true });

      setTimeout(() => {
        const formattedDate = formatMadridDateKey(selectedDate, {
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
        const isConfirmed = createdSession.status === 'CONFIRMED';

        showBookingMessage(
          appAlert,
          isConfirmed ? 'Cita confirmada' : 'Solicitud enviada',
          `Tu ${sessionTypeText.toLowerCase()} con ${specialistName} ${isConfirmed ? 'ha quedado confirmada.' : 'ha sido solicitada.'}\n\nEstado: ${isConfirmed ? 'Confirmada' : 'Pendiente de confirmación'}\nFecha: ${formattedDate}\nHora: ${selectedSlot.startTime}\nTipo: ${sessionTypeText}`,
        );
      }, 400);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cita. Intenta de nuevo.';
      showBookingMessage(appAlert, 'Error', message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedDate,
    selectedSlot,
    appAlert,
    isAuthenticated,
    isAuthenticatedClient,
    isAnonymousBooking,
    specialistId,
    specialistName,
    slotDuration,
    sessionType,
    bookingQuote,
    canConfirmBooking,
    quoteError,
    navigation,
    modalityFlags,
    publicContactResult,
  ]);

  const renderPublicContactCard = () => {
    if (!isAnonymousBooking) {
      return null;
    }

    return (
      <View style={styles.publicContactCard}>
        <View style={styles.publicContactHeader}>
          <View style={styles.publicContactIcon}>
            <Ionicons name="person-add-outline" size={17} color={theme.primary} />
          </View>
          <View style={styles.publicContactTitleBlock}>
            <Text style={styles.publicContactTitle}>Tus datos de contacto</Text>
            <Text style={styles.publicContactSubtitle}>
              Los usaremos para gestionar esta cita con el profesional.
            </Text>
          </View>
        </View>

        <View style={styles.publicContactFields}>
          <View style={styles.publicContactFieldRow}>
            <View style={styles.publicContactField}>
              <Text style={styles.publicContactLabel}>Nombre</Text>
              <TextInput
                value={publicContact.firstName}
                onChangeText={(value) => updatePublicContactField('firstName', value)}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.publicContactInput,
                  publicContactErrors.firstName ? styles.publicContactInputError : null,
                ]}
                autoCapitalize="words"
                textContentType="givenName"
              />
              {publicContactErrors.firstName ? (
                <Text style={styles.publicContactError}>{publicContactErrors.firstName}</Text>
              ) : null}
            </View>

            <View style={styles.publicContactField}>
              <Text style={styles.publicContactLabel}>Apellidos</Text>
              <TextInput
                value={publicContact.lastName}
                onChangeText={(value) => updatePublicContactField('lastName', value)}
                placeholder="Tus apellidos"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.publicContactInput,
                  publicContactErrors.lastName ? styles.publicContactInputError : null,
                ]}
                autoCapitalize="words"
                textContentType="familyName"
              />
              {publicContactErrors.lastName ? (
                <Text style={styles.publicContactError}>{publicContactErrors.lastName}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.publicContactField}>
            <Text style={styles.publicContactLabel}>Email</Text>
            <TextInput
              value={publicContact.email}
              onChangeText={(value) => updatePublicContactField('email', value)}
              placeholder="tu@email.com"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.publicContactInput,
                publicContactErrors.email ? styles.publicContactInputError : null,
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {publicContactErrors.email ? (
              <Text style={styles.publicContactError}>{publicContactErrors.email}</Text>
            ) : null}
          </View>

          <View style={styles.publicContactField}>
            <Text style={styles.publicContactLabel}>Teléfono opcional</Text>
            <TextInput
              value={publicContact.phone}
              onChangeText={(value) => updatePublicContactField('phone', value)}
              placeholder="+34 600 000 000"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.publicContactInput,
                publicContactErrors.phone ? styles.publicContactInputError : null,
              ]}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            {publicContactErrors.phone ? (
              <Text style={styles.publicContactError}>{publicContactErrors.phone}</Text>
            ) : null}
          </View>
        </View>

        <AnimatedPressable
          style={styles.privacyCheckRow}
          onPress={() => updatePublicContactField('privacyAccepted', !publicContact.privacyAccepted)}
          hoverLift={false}
          pressScale={0.98}
        >
          <View
            style={[
              styles.privacyCheckBox,
              publicContact.privacyAccepted ? styles.privacyCheckBoxSelected : null,
              publicContactErrors.privacyAccepted ? styles.privacyCheckBoxError : null,
            ]}
          >
            {publicContact.privacyAccepted ? (
              <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />
            ) : null}
          </View>
          <Text style={styles.privacyCheckText}>
            Acepto la política de privacidad y que mis datos se compartan con el profesional para gestionar la cita.
          </Text>
        </AnimatedPressable>
        {publicContactErrors.privacyAccepted ? (
          <Text style={styles.publicContactError}>{publicContactErrors.privacyAccepted}</Text>
        ) : null}
      </View>
    );
  };

  const renderPublicBookingSuccess = () => {
    if (!publicBookingSuccess) {
      return null;
    }

    const sessionTypeText =
      publicBookingSuccess.type === 'VIDEO_CALL' ? 'Videollamada' : 'Presencial';
    const formattedDate = formatMadridDateKey(publicBookingSuccess.date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const isConfirmed = publicBookingSuccess.status === 'CONFIRMED';

    return (
      <View style={styles.successScreen}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons
              name={isConfirmed ? 'checkmark-circle-outline' : 'time-outline'}
              size={34}
              color={theme.success}
            />
          </View>
          <Text style={styles.successTitle}>
            {isConfirmed ? 'Cita confirmada' : 'Solicitud enviada'}
          </Text>
          <Text style={styles.successSubtitle}>
            Te enviaremos los detalles por email. Si ya tienes cuenta HERA, la cita quedará vinculada a tu historial.
          </Text>

          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Profesional</Text>
              <Text style={styles.successDetailValue}>{specialistName}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Fecha</Text>
              <Text style={styles.successDetailValue}>{formattedDate}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Hora</Text>
              <Text style={styles.successDetailValue}>{publicBookingSuccess.time}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Tipo</Text>
              <Text style={styles.successDetailValue}>{sessionTypeText}</Text>
            </View>
          </View>

          <View style={styles.successActions}>
            <Button
              variant="primary"
              size="medium"
              onPress={() => navigation.navigate('Register', { userType: 'CLIENT' })}
              fullWidth
            >
              Crear cuenta
            </Button>
            <Button
              variant="outline"
              size="medium"
              onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
              fullWidth
            >
              Iniciar sesión
            </Button>
          </View>
        </View>
      </View>
    );
  };

  const renderDesktopLayout = () => (
    <View style={styles.desktopContainer}>
      <View style={styles.columnsContainer}>
        <ProfessionalInfoColumn
          specialist={specialist}
          booking={bookingState}
          onConfirm={handleConfirmBooking}
          onSessionTypeChange={setSessionType}
          availableSessionTypes={availableSessionTypes}
          bookingQuote={bookingQuote}
          quoteLoading={quoteLoading}
          quoteError={quoteError}
          quoteIsEstimated={quoteIsEstimated}
          canConfirm={canConfirmBooking}
          loading={loading}
          extraContentBeforeSummary={renderPublicContactCard()}
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
            availableSessionTypes={availableSessionTypes}
            bookingQuote={bookingQuote}
            quoteLoading={quoteLoading}
            quoteError={quoteError}
            quoteIsEstimated={quoteIsEstimated}
            canConfirm={canConfirmBooking}
            loading={loading}
            extraContentBeforeSummary={renderPublicContactCard()}
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
                {mobileSpecialistPriceText}
              </Text>
            </View>
          </View>
        </View>

        <ProfessionalInfoColumn
          specialist={specialist}
          booking={bookingState}
          onConfirm={handleConfirmBooking}
          onSessionTypeChange={setSessionType}
          availableSessionTypes={availableSessionTypes}
          bookingQuote={bookingQuote}
          quoteLoading={quoteLoading}
          quoteError={quoteError}
          quoteIsEstimated={quoteIsEstimated}
          canConfirm={canConfirmBooking}
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

        {renderPublicContactCard()}

        <View style={styles.mobileFooterSpacer} />
      </ScrollView>

      <View style={styles.mobileStickyFooter}>
        <View style={styles.mobileFooterSummary}>
          <View style={styles.mobileFooterPill}>
            <Text style={styles.mobileFooterPillLabel}>Fecha</Text>
            <Text style={styles.mobileFooterPillValue}>
              {selectedDate
                ? formatMadridDateKey(selectedDate, {
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
            <Text style={styles.mobileFooterPillValueStrong}>
              {mobileTotalText}
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          size="medium"
          onPress={handleConfirmBooking}
          disabled={!selectedDate || !selectedSlot || loading || !canConfirmBooking}
          loading={loading}
          fullWidth
        >
          Confirmar reserva
        </Button>
      </View>
    </View>
  );

  if (publicBookingSuccess) {
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
        {isMobile ? (
          <View style={styles.mobileHeader}>
            <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButtonMobile}>
              <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
            </AnimatedPressable>
            <Text style={styles.mobileHeaderTitle}>Reserva enviada</Text>
            <View style={styles.mobileHeaderSpacer} />
          </View>
        ) : null}
        {renderPublicBookingSuccess()}
      </View>
    );
  }

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

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
  isMobile: boolean,
) =>
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
      fontFamily: theme.fontHeading,
      color: theme.primary,
    },
    mobileSpecialistInfo: {
      flex: 1,
      gap: 2,
    },
    mobileSpecialistName: {
      fontSize: 20,
      lineHeight: 24,
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    mobileSpecialistPrice: {
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    publicContactCard: {
      width: '100%',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    publicContactHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    publicContactIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    publicContactTitleBlock: {
      flex: 1,
      gap: 2,
    },
    publicContactTitle: {
      fontSize: 16,
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    publicContactSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    publicContactFields: {
      gap: spacing.sm,
    },
    publicContactFieldRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: spacing.sm,
    },
    publicContactField: {
      flex: 1,
      gap: 6,
    },
    publicContactLabel: {
      fontSize: 11,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    publicContactInput: {
      minHeight: 42,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      fontSize: 14,
      fontFamily: theme.fontSans,
      color: theme.textPrimary,
    },
    publicContactInputError: {
      borderColor: theme.error,
    },
    publicContactError: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: theme.fontSansMedium,
      color: theme.error,
    },
    privacyCheckRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    privacyCheckBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
    },
    privacyCheckBoxSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    privacyCheckBoxError: {
      borderColor: theme.error,
    },
    privacyCheckText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    successScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    successCard: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.xl,
      gap: spacing.md,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 4,
    },
    successIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.successBg,
      borderWidth: 1,
      borderColor: theme.success,
    },
    successTitle: {
      fontSize: 28,
      lineHeight: 32,
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    successSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    successDetails: {
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    successDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    successDetailLabel: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    successDetailValue: {
      flex: 1,
      textAlign: 'right',
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.textPrimary,
      textTransform: 'capitalize',
    },
    successActions: {
      gap: spacing.sm,
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
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    mobileFooterSpacer: {
      height: 120,
    },
  });

export default BookingScreen;
