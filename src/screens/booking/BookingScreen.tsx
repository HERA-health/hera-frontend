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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { StyledLogo } from '../../components/common/StyledLogo';
import { ThemeToggleButton } from '../../components/common/ThemeToggleButton';
import type { RootStackParamList } from '../../constants/types';
import * as sessionsService from '../../services/sessionsService';
import { BookingQuote, SessionStatus, SessionType, TimeSlot } from '../../services/sessionsService';
import {
  BookingModalitySection,
  ProfessionalInfoColumn,
  CompactCalendarColumn,
  TimeSlotsColumn,
  BookingLocationMap,
} from './components';
import * as analyticsService from '../../services/analyticsService';
import * as specialistsService from '../../services/specialistsService';
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
  toPublicBookingPatientPayload,
} from './publicBookingValidation';
import {
  mapProfileToBookingSpecialist,
  type BookingSpecialist,
} from './components/bookingPresentation';

type BookingRouteParams = RootStackParamList['Booking'];

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
  mobile: 768,
  desktop: 1180,
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

type ContactInputField = 'firstName' | 'lastName' | 'email' | 'phone';

interface BookingExperienceProps extends BookingScreenProps {
  specialist: BookingSpecialist;
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
  const { theme } = useTheme();
  const styles = useMemo(() => createLoadStyles(theme), [theme]);
  const [specialist, setSpecialist] = useState<BookingSpecialist | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const specialistId = route.params.specialistId.trim();

    setSpecialist(null);
    setLoadError(null);

    if (!specialistId) {
      setLoadError('No hemos podido identificar al profesional.');
      return () => {
        isCurrent = false;
      };
    }

    specialistsService.getPublicSpecialistDetails(specialistId)
      .then((data) => {
        if (!isCurrent) {
          return;
        }

        setSpecialist(
          mapProfileToBookingSpecialist(
            specialistsService.mapPublicSpecialistToProfile(data),
          ),
        );
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError('No hemos podido cargar los datos del profesional. Inténtalo de nuevo.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt, route.params.specialistId]);

  if (specialist) {
    return (
      <BookingExperience
        route={route}
        navigation={navigation}
        specialist={specialist}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior"
          onPress={navigation.goBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
          <Text style={styles.backButtonText}>Volver</Text>
        </AnimatedPressable>
        <StyledLogo size={38} />
        <ThemeToggleButton size="sm" />
      </View>
      <View
        accessibilityRole={loadError ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        style={styles.stateCard}
      >
        {loadError ? (
          <>
            <Ionicons name="alert-circle-outline" size={34} color={theme.error} />
            <Text style={styles.stateTitle}>No se pudo abrir la reserva</Text>
            <Text style={styles.stateMessage}>{loadError}</Text>
            <Button
              variant="primary"
              size="medium"
              onPress={() => setLoadAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.stateTitle}>Preparando tu reserva</Text>
            <Text style={styles.stateMessage}>Estamos cargando la información actualizada.</Text>
          </>
        )}
      </View>
    </View>
  );
};

const BookingExperience: React.FC<BookingExperienceProps> = ({
  route,
  navigation,
  specialist,
}) => {
  const appAlert = useAppAlert();
  const { isAuthenticated, user } = useAuth();
  const routeParams = route.params;
  const initialSlotSelection = useMemo(
    () => buildInitialSlotSelection(routeParams),
    [routeParams],
  );
  const specialistId = specialist.id;
  const specialistName = specialist.name;
  const pricePerSession = specialist.pricePerSession;
  const avatar = specialist.avatar;
  const title = specialist.title;
  const slotDuration = specialist.sessionDuration ?? 60;
  const offersOnline = specialist.offersOnline;
  const offersInPerson = specialist.offersInPerson;
  const officeLocation = specialist.officeLocation;
  const hasOfficeCoordinates =
    typeof officeLocation?.latitude === 'number'
    && Number.isFinite(officeLocation.latitude)
    && typeof officeLocation.longitude === 'number'
    && Number.isFinite(officeLocation.longitude);
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop;
  const isMobile = width < BREAKPOINTS.mobile;
  const isNarrowMobile = width < 360;
  const isAnonymousBooking = !isAuthenticated;
  const isAuthenticatedClient = isAuthenticated && user?.type === 'client';
  const styles = useMemo(
    () => createStyles(theme, isDark, isMobile),
    [theme, isDark, isDesktop, isMobile],
  );

  const bookingCompletedRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const pageScrollRef = useRef<ScrollView>(null);
  const pageScrollOffsetRef = useRef(0);
  const contactSectionRef = useRef<View>(null);
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
    analyticsService.trackScreen('booking');
    return () => {
      if (!bookingCompletedRef.current) {
        analyticsService.track('booking_abandoned');
      }
    };
  }, []);

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
  const [slotsError, setSlotsError] = useState<string | null>(null);
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
  const [focusedContactField, setFocusedContactField] = useState<ContactInputField | null>(null);
  const [publicBookingSuccess, setPublicBookingSuccess] = useState<{
    status: SessionStatus;
    date: string;
    time: string;
    type: SessionType;
  } | null>(null);
  const [mobileFooterHeight, setMobileFooterHeight] = useState(120);

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

  const quoteReady =
    Boolean(bookingQuote)
    && !quoteLoading
    && !quoteError
    && availableSessionTypes.length > 0;
  const canConfirmBooking =
    quoteReady
    && (!isAnonymousBooking || publicContactResult.success);
  const accountCanBook = isAnonymousBooking || isAuthenticatedClient;
  const hasSelectedAppointment = Boolean(selectedDate && selectedSlot);
  const canAdvanceBooking = hasSelectedAppointment && quoteReady && accountCanBook;
  const primaryActionLabel =
    isAnonymousBooking && hasSelectedAppointment && !publicContactResult.success
      ? 'Completar mis datos'
      : 'Confirmar cita';
  const accountMessage =
    isAuthenticated && !isAuthenticatedClient
      ? 'Esta cuenta no puede reservar citas. Accede con una cuenta de paciente o continúa sin iniciar sesión.'
      : null;
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
      setSlotsError(null);
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
        setSlotsError(message);
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
      if (loading) {
        return;
      }

      setSelectedDate(date);
      loadAvailableSlots(date);
    },
    [loadAvailableSlots, loading],
  );

  const handleTimeSelect = useCallback(
    (slot: TimeSlot) => {
      if (loading) {
        return;
      }

      setSelectedSlot(slot);
      analyticsService.track('booking_slot_selected');
    },
    [loading],
  );

  const handleSessionTypeChange = useCallback((type: SessionType) => {
    if (!loading) {
      setSessionType(type);
    }
  }, [loading]);

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
    if (submissionInFlightRef.current) {
      return;
    }

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

    submissionInFlightRef.current = true;

    try {
      setLoading(true);

      const madridDateTime = parseMadridDateTime(selectedDate, selectedSlot.startTime);
      if (!madridDateTime) {
        showBookingMessage(appAlert, 'Error', 'La fecha u hora no es válida');
        return;
      }

      const dateTime = madridDateTime.iso;

      if (isAnonymousBooking) {
        if (!publicContactResult.success) {
          return;
        }

        const createdSession = await sessionsService.createPublicSession({
          specialistId,
          date: dateTime,
          duration: slotDuration,
          type: sessionType,
          patient: toPublicBookingPatientPayload(publicContactResult.data),
          privacyAccepted: true,
          privacyVersion: PUBLIC_BOOKING_PRIVACY_VERSION,
        });

        bookingCompletedRef.current = true;
        analyticsService.track('session_booked', {
          audience: 'anonymous',
          modality: sessionType === 'IN_PERSON' ? 'in_person' : 'video',
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
        audience: 'authenticated',
        modality: sessionType === 'IN_PERSON' ? 'in_person' : 'video',
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
      submissionInFlightRef.current = false;
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

  const handlePageScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      pageScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const scrollToContact = useCallback(() => {
    contactSectionRef.current?.measure((_x, _y, _width, _height, _pageX, pageY) => {
      pageScrollRef.current?.scrollTo({
        y: Math.max(pageScrollOffsetRef.current + pageY - 108, 0),
        animated: true,
      });
    });
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (isAnonymousBooking && hasSelectedAppointment && !publicContactResult.success) {
      setPublicContactErrors(mapPublicBookingContactErrors(publicContactResult.error));
      scrollToContact();
      return;
    }

    void handleConfirmBooking();
  }, [
    handleConfirmBooking,
    hasSelectedAppointment,
    isAnonymousBooking,
    publicContactResult.success,
    scrollToContact,
  ]);

  const handleRetrySlots = useCallback(() => {
    if (selectedDate && !loading) {
      void loadAvailableSlots(selectedDate);
    }
  }, [loadAvailableSlots, loading, selectedDate]);

  const handleMobileFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setMobileFooterHeight(nextHeight);
    }
  }, []);

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
                accessibilityLabel="Nombre"
                value={publicContact.firstName}
                onChangeText={(value) => updatePublicContactField('firstName', value)}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.publicContactInput,
                  focusedContactField === 'firstName'
                    ? styles.publicContactInputFocused
                    : null,
                  publicContactErrors.firstName ? styles.publicContactInputError : null,
                ]}
                autoCapitalize="words"
                textContentType="givenName"
                onFocus={() => setFocusedContactField('firstName')}
                onBlur={() => setFocusedContactField(null)}
              />
              {publicContactErrors.firstName ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={styles.publicContactError}
                >
                  {publicContactErrors.firstName}
                </Text>
              ) : null}
            </View>

            <View style={styles.publicContactField}>
              <Text style={styles.publicContactLabel}>Apellidos</Text>
              <TextInput
                accessibilityLabel="Apellidos"
                value={publicContact.lastName}
                onChangeText={(value) => updatePublicContactField('lastName', value)}
                placeholder="Tus apellidos"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.publicContactInput,
                  focusedContactField === 'lastName'
                    ? styles.publicContactInputFocused
                    : null,
                  publicContactErrors.lastName ? styles.publicContactInputError : null,
                ]}
                autoCapitalize="words"
                textContentType="familyName"
                onFocus={() => setFocusedContactField('lastName')}
                onBlur={() => setFocusedContactField(null)}
              />
              {publicContactErrors.lastName ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={styles.publicContactError}
                >
                  {publicContactErrors.lastName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.publicContactField}>
            <Text style={styles.publicContactLabel}>Email</Text>
            <TextInput
              accessibilityLabel="Correo electrónico"
              value={publicContact.email}
              onChangeText={(value) => updatePublicContactField('email', value)}
              placeholder="tu@email.com"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.publicContactInput,
                focusedContactField === 'email'
                  ? styles.publicContactInputFocused
                  : null,
                publicContactErrors.email ? styles.publicContactInputError : null,
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              onFocus={() => setFocusedContactField('email')}
              onBlur={() => setFocusedContactField(null)}
            />
            {publicContactErrors.email ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={styles.publicContactError}
              >
                {publicContactErrors.email}
              </Text>
            ) : null}
          </View>

          <View style={styles.publicContactField}>
            <Text style={styles.publicContactLabel}>Teléfono opcional</Text>
            <TextInput
              accessibilityLabel="Teléfono opcional"
              value={publicContact.phone}
              onChangeText={(value) => updatePublicContactField('phone', value)}
              placeholder="+34 600 000 000"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.publicContactInput,
                focusedContactField === 'phone'
                  ? styles.publicContactInputFocused
                  : null,
                publicContactErrors.phone ? styles.publicContactInputError : null,
              ]}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              onFocus={() => setFocusedContactField('phone')}
              onBlur={() => setFocusedContactField(null)}
            />
            {publicContactErrors.phone ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={styles.publicContactError}
              >
                {publicContactErrors.phone}
              </Text>
            ) : null}
          </View>
        </View>

        <AnimatedPressable
          style={styles.privacyCheckRow}
          onPress={() => updatePublicContactField('privacyAccepted', !publicContact.privacyAccepted)}
          hoverLift={false}
          pressScale={0.98}
          accessibilityRole="checkbox"
          accessibilityLabel="Autorizar el uso de datos para gestionar la cita"
          accessibilityState={{ checked: publicContact.privacyAccepted }}
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
            Acepto que mis datos se compartan con el profesional para gestionar esta cita.
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityRole="link"
          accessibilityLabel="Consultar la política de privacidad"
          onPress={() => navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY' })}
          hoverLift={false}
          pressScale={0.98}
          style={styles.privacyPolicyLink}
        >
          <Ionicons name="document-text-outline" size={16} color={theme.primary} />
          <Text style={styles.privacyPolicyLinkText}>Consultar la política de privacidad</Text>
          <Ionicons name="arrow-forward" size={15} color={theme.primary} />
        </AnimatedPressable>
        {publicContactErrors.privacyAccepted ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.publicContactError}
          >
            {publicContactErrors.privacyAccepted}
          </Text>
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

  const actionHint = !hasSelectedAppointment
    ? 'Selecciona una fecha y una hora para continuar.'
    : primaryActionLabel === 'Completar mis datos'
      ? 'Puedes reservar sin crear una cuenta.'
      : 'Revisa los datos antes de confirmar.';

  const renderBookingHeader = () => (
    <View style={styles.bookingHeader}>
      <View style={styles.bookingHeaderContent}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
          {!isMobile ? <Text style={styles.backButtonText}>Volver</Text> : null}
        </AnimatedPressable>

        <View style={styles.brandCluster}>
          <StyledLogo size={isMobile ? 34 : 40} />
          {!isMobile ? (
            <View style={styles.brandDescriptor}>
              <Text style={styles.brandDescriptorText}>Salud mental</Text>
            </View>
          ) : null}
        </View>

        <ThemeToggleButton size="sm" />
      </View>
    </View>
  );

  const renderScheduleSurface = () => (
    <View style={[styles.mainSurface, isNarrowMobile ? styles.narrowSurface : null]}>
      <BookingModalitySection
        selectedType={sessionType}
        availableSessionTypes={availableSessionTypes}
        duration={slotDuration}
        onSessionTypeChange={handleSessionTypeChange}
        disabled={loading}
        busy={loading}
        bookingQuote={bookingQuote}
        quoteLoading={quoteLoading}
        quoteError={quoteError}
        quoteIsEstimated={quoteIsEstimated}
        officeLocation={officeLocation}
      />

      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionStepBadge}>
            <Text style={styles.sectionStepBadgeText}>2</Text>
          </View>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionEyebrow}>FECHA Y HORA</Text>
            <Text style={styles.sectionTitle}>Encuentra un momento que te venga bien</Text>
            <Text style={styles.sectionSubtitle}>
              La disponibilidad se consulta directamente en la agenda del profesional.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.scheduleGrid,
            width < 940 ? styles.scheduleGridStacked : null,
          ]}
        >
          <CompactCalendarColumn
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            disabled={loading}
            busy={loading}
          />
          <View
            style={[
              styles.scheduleDivider,
              width < 940 ? styles.scheduleDividerStacked : null,
            ]}
          />
          <TimeSlotsColumn
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedTime={selectedSlot?.startTime || null}
            onTimeSelect={handleTimeSelect}
            loading={loadingSlots}
            disabled={loading}
            busy={loading}
            error={slotsError}
            onRetry={handleRetrySlots}
          />
        </View>
      </View>
    </View>
  );

  const renderProgressiveContact = () => {
    if (!isAnonymousBooking || !selectedSlot) {
      return null;
    }

    return (
      <View
        ref={contactSectionRef}
        style={[styles.contactSection, isNarrowMobile ? styles.narrowSurface : null]}
      >
        <View style={styles.sectionHeading}>
          <View style={styles.sectionStepBadge}>
            <Text style={styles.sectionStepBadgeText}>3</Text>
          </View>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionEyebrow}>TUS DATOS</Text>
            <Text style={styles.sectionTitle}>¿Cómo podemos contactarte?</Text>
            <Text style={styles.sectionSubtitle}>
              Solo necesitamos lo imprescindible para gestionar esta cita.
            </Text>
          </View>
        </View>
        {renderPublicContactCard()}
      </View>
    );
  };

  const renderBookingSummary = (sticky: boolean, showAction = true) => (
    <ProfessionalInfoColumn
      specialist={specialist}
      booking={bookingState}
      availableSessionTypes={availableSessionTypes}
      onPrimaryAction={handlePrimaryAction}
      actionLabel={primaryActionLabel}
      actionDisabled={!canAdvanceBooking || loading}
      actionHint={actionHint}
      accountMessage={accountMessage}
      bookingQuote={bookingQuote}
      quoteLoading={quoteLoading}
      quoteError={quoteError}
      quoteIsEstimated={quoteIsEstimated}
      loading={loading}
      sticky={sticky}
      showAction={showAction}
    />
  );

  const renderMobileProfessional = () => (
    <View style={styles.mobileSpecialistCard}>
      <View style={styles.mobileSpecialistRow}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={styles.mobileAvatar}
            accessibilityLabel={`Foto de ${specialistName}`}
          />
        ) : (
          <View style={styles.mobileAvatarPlaceholder}>
            <Text style={styles.mobileAvatarInitial}>
              {specialistName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}

        <View style={styles.mobileSpecialistInfo}>
          <Text style={styles.mobileSpecialistEyebrow}>CITA CON</Text>
          <Text style={styles.mobileSpecialistName}>{specialistName}</Text>
          <Text style={styles.mobileSpecialistMeta}>
            {title || 'Profesional de salud mental'} · {slotDuration} min
          </Text>
        </View>
        <Text style={styles.mobileSpecialistPrice}>{mobileSpecialistPriceText}</Text>
      </View>
    </View>
  );

  const renderPageContent = () => (
    <View style={[styles.pageContent, isNarrowMobile ? styles.narrowPageContent : null]}>
      <View style={styles.pageIntro}>
        <Text style={styles.pageEyebrow}>RESERVA ONLINE</Text>
        <Text style={styles.pageTitle}>Reserva tu cita</Text>
        <Text style={styles.pageSubtitle}>
          Elige la modalidad, la fecha y la hora. Te mostraremos siempre el resumen antes de confirmar.
        </Text>
      </View>

      {isMobile ? renderMobileProfessional() : null}

      <View style={[styles.bookingLayout, !isDesktop ? styles.bookingLayoutStacked : null]}>
        <View style={styles.mainColumn}>
          {renderScheduleSurface()}
          {renderProgressiveContact()}
          {isMobile && sessionType === 'IN_PERSON' && hasOfficeCoordinates ? (
            <View style={styles.mobileLocationCard}>
              <BookingLocationMap officeLocation={officeLocation} height={150} />
            </View>
          ) : null}
          {isTablet ? renderBookingSummary(false) : null}
        </View>

        {isDesktop ? (
          <View style={styles.summaryColumn}>
            {renderBookingSummary(true)}
          </View>
        ) : null}
      </View>

      {isMobile ? (
        <View
          style={[
            styles.mobileFooterSpacer,
            { height: Math.max(mobileFooterHeight + spacing.md, 120) },
          ]}
        />
      ) : null}
    </View>
  );

  const renderMobileFooter = () => (
    <SafeAreaView
      edges={['bottom']}
      onLayout={handleMobileFooterLayout}
      style={styles.mobileStickyFooter}
    >
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
          <Text style={styles.mobileFooterPillValueStrong}>{mobileTotalText}</Text>
        </View>
      </View>

      {accountMessage ? (
        <Text accessibilityRole="alert" style={styles.mobileAccountNotice}>
          Esta cuenta no puede reservar citas.
        </Text>
      ) : null}

      <Button
        variant="primary"
        size="medium"
        onPress={handlePrimaryAction}
        disabled={!canAdvanceBooking || loading}
        loading={loading}
        fullWidth
      >
        {primaryActionLabel}
      </Button>
    </SafeAreaView>
  );

  if (publicBookingSuccess) {
    return (
      <View style={styles.container}>
        {renderBookingHeader()}
        <ScrollView
          testID="booking-success-scroll"
          style={styles.pageScroll}
          contentContainerStyle={styles.successScrollContent}
          showsVerticalScrollIndicator
        >
          {renderPublicBookingSuccess()}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderBookingHeader()}
      <ScrollView
        ref={pageScrollRef}
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        onScroll={handlePageScroll}
        scrollEventThrottle={16}
      >
        {renderPageContent()}
      </ScrollView>
      {isMobile ? renderMobileFooter() : null}
    </KeyboardAvoidingView>
  );
};

const createLoadStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      width: '100%',
      maxWidth: 1240,
      minHeight: 72,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    backButton: {
      minWidth: 96,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    backButtonText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 14,
    },
    stateCard: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 24,
      textAlign: 'center',
    },
    stateMessage: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
  });

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
    bookingHeader: {
      zIndex: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.bg,
    },
    bookingHeaderContent: {
      width: '100%',
      maxWidth: 1240,
      minHeight: isMobile ? 62 : 72,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
    },
    backButton: {
      minWidth: isMobile ? 40 : 96,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: isMobile ? 0 : spacing.md,
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
    brandCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    brandDescriptor: {
      minHeight: 26,
      justifyContent: 'center',
      paddingLeft: spacing.sm,
      borderLeftWidth: 1,
      borderLeftColor: theme.borderStrong,
    },
    brandDescriptorText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
    },
    pageScroll: {
      flex: 1,
    },
    pageScrollContent: {
      flexGrow: 1,
      paddingBottom: isMobile ? 0 : spacing.xxl,
    },
    successScrollContent: {
      flexGrow: 1,
    },
    pageContent: {
      width: '100%',
      maxWidth: 1240,
      alignSelf: 'center',
      gap: isMobile ? spacing.md : spacing.lg,
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
      paddingTop: isMobile ? spacing.md : spacing.lg,
    },
    narrowPageContent: {
      paddingHorizontal: spacing.sm,
    },
    pageIntro: {
      maxWidth: 720,
      gap: 3,
    },
    pageEyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
      letterSpacing: 1.25,
    },
    pageTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: isMobile ? 30 : 38,
      lineHeight: isMobile ? 35 : 44,
    },
    pageSubtitle: {
      maxWidth: 650,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: isMobile ? 13 : 14,
      lineHeight: isMobile ? 19 : 21,
    },
    bookingLayout: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'flex-start',
    },
    bookingLayoutStacked: {
      flexDirection: 'column',
    },
    mainColumn: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      gap: spacing.lg,
    },
    summaryColumn: {
      width: 340,
      flexShrink: 0,
    },
    mainSurface: {
      width: '100%',
      gap: spacing.lg,
      padding: isMobile ? spacing.md : spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 28,
      elevation: 4,
    },
    narrowSurface: {
      padding: spacing.sm,
    },
    scheduleSection: {
      gap: spacing.lg,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    sectionStepBadge: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: theme.primary,
    },
    sectionStepBadgeText: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
    },
    sectionHeadingCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    sectionEyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
      letterSpacing: 1.15,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: isMobile ? 19 : 21,
      lineHeight: isMobile ? 24 : 27,
    },
    sectionSubtitle: {
      maxWidth: 600,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 17,
    },
    scheduleGrid: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
    },
    scheduleGridStacked: {
      flexDirection: 'column',
    },
    scheduleDivider: {
      width: 1,
      minHeight: 368,
      alignSelf: 'stretch',
      backgroundColor: theme.borderLight,
    },
    scheduleDividerStacked: {
      width: '100%',
      height: 1,
      minHeight: 1,
    },
    contactSection: {
      width: '100%',
      gap: spacing.lg,
      padding: isMobile ? spacing.md : spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 3,
    },
    mobileSpecialistCard: {
      width: '100%',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
    },
    mobileSpecialistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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
    mobileSpecialistEyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 8,
      letterSpacing: 1,
    },
    mobileSpecialistName: {
      fontSize: 17,
      lineHeight: 21,
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    mobileSpecialistMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 10,
      lineHeight: 14,
    },
    mobileSpecialistPrice: {
      maxWidth: 90,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      textAlign: 'right',
    },
    publicContactCard: {
      width: '100%',
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: isMobile ? spacing.md : spacing.lg,
      gap: spacing.md,
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
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    publicContactInput: {
      minHeight: 46,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.textMuted,
      backgroundColor: theme.bgCard,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      fontSize: 14,
      fontFamily: theme.fontSans,
      color: theme.textPrimary,
    },
    publicContactInputFocused: {
      borderWidth: 2,
      borderColor: theme.primary,
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
      borderColor: theme.textSecondary,
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
    privacyPolicyLink: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
    },
    privacyPolicyLinkText: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    mobileLocationCard: {
      width: '100%',
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
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
      color: theme.textSecondary,
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
    mobileAccountNotice: {
      color: theme.warningAmber,
      fontFamily: theme.fontSansMedium,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
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
      color: theme.textSecondary,
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
      minHeight: 120,
    },
  });

export default BookingScreen;
