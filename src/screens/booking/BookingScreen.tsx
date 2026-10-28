import { PaymentConditions } from '../../components/payments/PaymentConditions';
import { storePaymentAccess, type PaymentAcceptance } from '../../services/sessionPaymentService';
import { PublicPackageOffers } from '../../components/packages/PublicPackageOffers';
import { PackageCoverage, frozenPackageOptions } from '../../components/packages/PackageCoverage';
import type { PatientPackage } from '../../services/packageService';
import { PackageBillingFields, emptyPackageBilling } from '../../components/packages/PackageBillingFields';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { formatPrivatePrice } from '../../utils/privateTariff';
import { loadPublicBookingOptions, type PrivateServiceOption } from '../../services/privateCatalogService';
import { initialPrivateOption, privateOptionForModality } from '../../utils/privateServiceSelection';
import { BookingServiceSection } from './components/BookingServiceSection';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { durableCommandKey } from '../../services/heraCommissionService';
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
import { BookingEmailVerification } from './components/BookingEmailVerification';
import { BookingConfirmationPanel } from './components/BookingConfirmationPanel';
import { LandingHeader } from '../landing/components/LandingHeader';
import type { LandingSectionAnchor } from '../landing/types';
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
import { bookGuestReferral, getReferralBookingQuote, type ReferralAccess } from '../../services/referralService';
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
  referralBooking?: { id: string; access: ReferralAccess };
  route: {
    params: BookingRouteParams;
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    addListener?: (event: 'focus', callback: () => void) => () => void;
    getState?: () => { routeNames: readonly string[] };
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

function BookingPublicHeader({ navigation, scrolled = false }: { navigation: BookingScreenProps['navigation']; scrolled?: boolean }) {
  const { isAuthenticated, user, verificationSubmitted } = useAuth();
  const handleGoHome = () => {
    const workspaceRoute = navigation.getState?.().routeNames.includes('RequiredLegalAcceptance')
      ? 'RequiredLegalAcceptance'
      : user?.type === 'professional'
        ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
        : user?.type === 'clinic' ? 'ClinicDashboard' : 'Home';
    navigation.navigate(isAuthenticated ? workspaceRoute : 'Landing');
  };
  const canVisitLanding = navigation.getState?.().routeNames.includes('Landing') ?? !isAuthenticated;
  const navigateToSection = (section: LandingSectionAnchor) => navigation.navigate('Landing', { section });
  return (
    <LandingHeader
      context="directory"
      isScrolled={scrolled}
      accessLabel={isAuthenticated ? 'Mi espacio' : 'Acceder'}
      onLogoPress={handleGoHome}
      onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
      onViewPlans={() => navigation.navigate('Pricing')}
      onExploreProfessionals={canVisitLanding ? () => navigateToSection('forSpecialists') : undefined}
      onScrollToSection={canVisitLanding ? navigateToSection : undefined}
      onAccess={() => isAuthenticated ? handleGoHome() : navigation.navigate('Login', { userType: 'CLIENT' })}
    />
  );

}

export const BookingScreen: React.FC<BookingScreenProps> = ({ route, navigation, referralBooking }) => {
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
        referralBooking={referralBooking}
      />
    );
  }

  return (
    <View style={styles.container}>
      <BookingPublicHeader navigation={navigation} />
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
            <Button variant="outline" onPress={navigation.goBack}>Volver</Button>
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
  referralBooking,
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
  const [bookingOptions, setBookingOptions] = useState<PrivateServiceOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const catalogLoading = optionsLoading && bookingOptions.length === 0;
  const liveBookingOptions = useRef<PrivateServiceOption[]>([]);
  const acquiredOptions = useRef<PrivateServiceOption[]>([]);
  const [patientPackageId, setPatientPackageId] = useState<string | undefined>(route.params.patientPackageId);
  const [packageRevision, setPackageRevision] = useState(0);
  const [packagePaymentError, setPackagePaymentError] = useState('');
  useEffect(() => navigation.addListener?.('focus', () => { setPackageRevision(n => n + 1); setPackagePaymentError(''); }), [navigation]);
  const [consumedIntent, setConsumedIntent] = useState<string>();
  const bookingIntentToken = consumedIntent === route.params.intentToken ? undefined : route.params.intentToken;
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();
  const [optionsError, setOptionsError] = useState('');
  const [quoteRetry, setQuoteRetry] = useState(0);
  const selectedOption = bookingOptions.find(o => o.id === selectedOptionId);
  const [pendingServiceId, setPendingServiceId] = useState<string>();
  const selectedServiceId = selectedOption?.serviceId ?? pendingServiceId;
  const serviceOptions = useMemo(() => bookingOptions.filter(option => option.isActive && option.serviceId === selectedServiceId), [bookingOptions, selectedServiceId]);
  const slotDuration = selectedOption?.durationMinutes ?? specialist.sessionDuration ?? 60;
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
  const isAnonymousBooking = !isAuthenticated && !referralBooking;
  const isAuthenticatedClient = isAuthenticated && user?.type === 'client';
  const styles = useMemo(
    () => createStyles(theme, isDark, isMobile),
    [theme, isDark, isDesktop, isMobile],
  );

  const bookingCompletedRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const pageScrollRef = useRef<ScrollView>(null);
  const pageScrollOffsetRef = useRef(0);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const contactSectionRef = useRef<View>(null);
  const modalityFlags = useMemo(
    () => ({
      offersOnline: serviceOptions.some(o => o.modality === 'VIDEO_CALL'),
      offersInPerson: serviceOptions.some(o => o.modality === 'IN_PERSON'),
      offersPhone: serviceOptions.some(o => o.modality === 'PHONE_CALL'),
    }),
    [serviceOptions],
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
  const loadedSelectionRef = useRef<string | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialSlotSelection?.date ?? null
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(defaultSessionType ?? 'VIDEO_CALL');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [paymentAcceptance, setPaymentAcceptance] = useState<PaymentAcceptance>();
  const [bookingQuote, setBookingQuote] = useState<BookingQuote | null>(null);
  const [patientIdentity, setPatientIdentity] = useState(() => {
    const parts = user?.name?.trim().split(/\s+/) ?? [];
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
  });
  const [sessionBilling, setSessionBilling] = useState({ ...emptyPackageBilling, billingCountry: '' });
  useEffect(() => { if (bookingQuote?.patientIdentity) setPatientIdentity(bookingQuote.patientIdentity); }, [bookingQuote?.patientIdentity?.firstName, bookingQuote?.patientIdentity?.lastName]);
  const needsExternalBilling = Boolean(bookingQuote && !bookingQuote.billingDataComplete && !patientPackageId && bookingQuote.payment?.mode !== 'ONLINE'
    && (bookingQuote.totalCents ?? Math.round(bookingQuote.price * 100)) > 40000);
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
  const [verification, setVerification] = useState<{ requestId: string; expiresAt: string; codeLength?: number }>();
  const [verificationCode, setVerificationCode] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [sessionPhone, setSessionPhone] = useState('');
  useEffect(() => {
    let current = true;
    setOptionsLoading(true);
    loadPublicBookingOptions(specialistId).then(options => {
      if (!current) return;
      liveBookingOptions.current = options;
      setBookingOptions(acquiredOptions.current.length ? acquiredOptions.current : options);
      if (acquiredOptions.current.length) return;
      const initial = initialPrivateOption(options, route.params.optionId);
      if (initial) { setSelectedOptionId(initial.id); setSessionType(initial.modality); }
      else if (route.params.optionId) setOptionsError('La opción seleccionada ya no está disponible. Elige otra para continuar.');
    }).catch(() => { if (current) setOptionsError('No se pudieron cargar las tarifas. Vuelve a abrir la reserva.'); })
      .finally(() => { if (current) setOptionsLoading(false); });
    return () => { current = false; };
  }, [specialistId, route.params.optionId]);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [mobileFooterHeight, setMobileFooterHeight] = useState(120);

  useEffect(() => {
    if (!defaultSessionType) {
      return;
    }

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags)) {
      setSessionType(defaultSessionType);
    }
  }, [defaultSessionType, modalityFlags, sessionType]);

  useEffect(() => { setVerification(undefined); setVerificationCode(''); setIdentityVerified(false); }, [selectedDate, selectedSlot?.startTime, selectedOptionId, publicContact, sessionPhone, bookingIntentToken]);

  const publicContactResult = useMemo(
    () => publicBookingContactSchema.safeParse(publicContact),
    [publicContact],
  );

  useEffect(() => {
    let isCurrent = true;

    if (catalogLoading) {
      setBookingQuote(null);
      setQuoteLoading(true);
      setQuoteError(null);
      return;
    }

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags) || !selectedOption) {
      setBookingQuote(null);
      setQuoteLoading(false);
      setQuoteError(
        availableSessionTypes.length === 0
          ? 'Selecciona un servicio para continuar.'
          : 'Elige la duración para consultar el precio de tu sesión.'
      );
      return () => {
        isCurrent = false;
      };
    }

    setQuoteLoading(true);
    setBookingQuote(null);
    setQuoteError(null);

    const quoteRequest = referralBooking
      ? getReferralBookingQuote(referralBooking.id, referralBooking.access, { type: sessionType, duration: slotDuration, optionId: selectedOptionId })
      : isAnonymousBooking
      ? sessionsService.getPublicBookingQuote({
          specialistId,
          type: sessionType,
          duration: slotDuration,
          optionId: selectedOptionId, patientPackageId,
        })
      : sessionsService.getBookingQuote(specialistId, sessionType, slotDuration, selectedOptionId, patientPackageId);

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

        if (['PACKAGE_PAYMENT_REQUIRED', 'PACKAGE_PAYMENT_REVIEW'].includes(getErrorCode(error) ?? '')) {
          setPackagePaymentError(getErrorMessage(error, 'Consulta el pago de tu bono antes de reservar.'));
          setBookingQuote(null); setQuoteError(null); return;
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
    catalogLoading,
    selectedOptionId, patientPackageId, packageRevision,
    quoteRetry,
    availableSessionTypes.length,
    referralBooking,
    isAnonymousBooking,
    modalityFlags,
    sessionType,
    slotDuration,
    specialistId,
  ]);

  useEffect(() => {
    if (!bookingQuote?.expiresAt) return;
    const remaining = Date.parse(bookingQuote.expiresAt) - Date.now();
    const timer = setTimeout(() => {
      // The automatic refresh is an estimate for guests, so review their personal price again.
      setIdentityVerified(false);
      setBookingQuote(null);
      setQuoteRetry(v => v + 1);
    }, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [bookingQuote?.expiresAt]);
  const quoteReady =
    Boolean(bookingQuote)
    && !!selectedOption
    && (!bookingQuote?.expiresAt || Date.parse(bookingQuote.expiresAt) > Date.now())
    && !quoteLoading
    && !quoteError
    && availableSessionTypes.length > 0;
  const verificationCodeLength = verification?.codeLength ?? 6;
  const verificationComplete = verificationCodeLength === 6
    ? /^\d{6}$/.test(verificationCode)
    : verificationCode.trim().length === verificationCodeLength;
  const canConfirmBooking =
    quoteReady
    && !loadingSlots && !slotsError
    && (!isAnonymousBooking || (publicContactResult.success && (!verification || verificationComplete)));
  const accountCanBook = isAnonymousBooking || isAuthenticatedClient || !!referralBooking;
  const hasSelectedAppointment = Boolean(selectedDate && selectedSlot);
  const canAdvanceBooking = hasSelectedAppointment && quoteReady && !loadingSlots && !slotsError && accountCanBook;
  const primaryActionDisabled = !canAdvanceBooking || loading || (isAnonymousBooking && (!publicContactResult.success || (!!verification && !verificationComplete)));
  const primaryActionLabel =
    isAnonymousBooking && !verification ? 'Continuar con mi reserva' : isAnonymousBooking && !identityVerified ? 'Verificar y revisar precio' : bookingQuote?.payment?.mode === 'ONLINE' ? 'Continuar al pago' : 'Confirmar cita';
  const accountMessage =
    isAuthenticated && !isAuthenticatedClient
      ? 'Esta cuenta no puede reservar citas. Accede con una cuenta de paciente o continúa sin iniciar sesión.'
      : null;
  const quoteIsEstimated = isAnonymousBooking && !identityVerified;
  const displayPrice = bookingQuote?.patientPackageId ? 0 : bookingQuote?.price ?? pricePerSession;
  const mobileTotalText = quoteLoading
    ? 'Calculando...'
    : quoteError
      ? 'No disponible'
      : bookingQuote
        ? bookingQuote.patientPackageId ? 'Incluida en tu bono' : formatBookingAmount(displayPrice)
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

  const selectPackageCoverage = (id: string | undefined, row?: PatientPackage) => {
    setPackagePaymentError('');
    setPatientPackageId(id);
    const options = row ? frozenPackageOptions(row) : [];
    acquiredOptions.current = options;
    const available = row ? options : liveBookingOptions.current;
    setBookingOptions(available);
    const selection = row ? options : available;
    const next = selection.find(option => option.id === selectedOptionId) ?? selection[0];
    if (next) { setSelectedOptionId(next.id); setSessionType(next.modality); setOptionsError(''); }
  };

  const handlePackageAcquired = (row: PatientPackage) => {
    setConsumedIntent(route.params.intentToken);
    setPackageRevision(revision => revision + 1);
    if (row.payment?.required || row.payment?.issueCode) { navigation.navigate('PackagePayment', { patientPackageId: row.id }); return; }
    if (!isAnonymousBooking) selectPackageCoverage(row.id, row);
  };

  const loadAvailableSlots = useCallback(
    async (date: string, options: { keepInitialSlot?: boolean; keepTime?: string } = {}) => {
      const requestId = slotsRequestIdRef.current + 1;
      slotsRequestIdRef.current = requestId;
      const isLatestRequest = () => slotsRequestIdRef.current === requestId;

      setLoadingSlots(true);
      setSlotsError(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      if (!options.keepInitialSlot && !options.keepTime) {
        initialSlotRef.current = null;
        setSelectedSlot(null);
      }

      try {
        const slots = await sessionsService.getAvailableSlots(specialistId, date, selectedOptionId, patientPackageId);
        if (!isLatestRequest()) {
          return;
        }

        setAvailableSlots(slots);
        if (options.keepTime) {
          const matching = slots.find(slot => slot.available !== false && slot.startTime === options.keepTime);
          setSelectedSlot(matching ?? null);
          if (!matching) setOptionsError(`Este servicio necesita ${slotDuration} minutos. Elige otro horario.`);
        }

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

        if (['PACKAGE_PAYMENT_REQUIRED', 'PACKAGE_PAYMENT_REVIEW'].includes(getErrorCode(error) ?? '')) {
          setPackagePaymentError(getErrorMessage(error, 'Consulta el pago de tu bono antes de reservar.'));
          setSlotsError(null); setAvailableSlots([]); return;
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
    [appAlert, specialistId, selectedOptionId, slotDuration, patientPackageId],
  );

  useEffect(() => {
    if (!selectedOptionId) {
      slotsRequestIdRef.current += 1;
      loadedSelectionRef.current = undefined;
      setAvailableSlots(current => current.length ? [] : current);
      setSelectedSlot(null);
      setLoadingSlots(false);
      return;
    }
    const selectionKey = JSON.stringify([specialistId, selectedDate, selectedOptionId, sessionType, slotDuration, patientPackageId, packageRevision]);
    if (loadedSelectionRef.current === selectionKey) return;
    loadedSelectionRef.current = selectionKey;
    const initialDateToLoad = initialDateLoadRef.current;
    if (initialDateToLoad) {
      initialDateLoadRef.current = null;
      void loadAvailableSlots(initialDateToLoad, { keepInitialSlot: true });
    } else if (selectedDate) {
      void loadAvailableSlots(selectedDate, { keepTime: selectedSlot?.startTime });
    }
  }, [specialistId, selectedOptionId, selectedDate, sessionType, slotDuration, patientPackageId, packageRevision, loadAvailableSlots]);

  const handleDateSelect = useCallback(
    (date: string) => {
      if (loading) {
        return;
      }

      setSelectedDate(date);
      setSelectedSlot(null);
    },
    [loading],
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

  const handleServiceSelect = (serviceId: string) => {
    if (loading || serviceId === selectedServiceId) return;
    const options = bookingOptions.filter(option => option.isActive && option.serviceId === serviceId);
    const preferred = options.find(option => option.isPreferred) ?? options[0];
    if (!preferred) return;
    const type = options.some(option => option.modality === sessionType) ? sessionType : preferred.modality;
    const variants = options.filter(option => option.modality === type);
    const next = variants.find(option => option.durationMinutes === selectedOption?.durationMinutes)
      ?? variants.find(option => option.isPreferred) ?? (variants.length === 1 ? variants[0] : undefined);
    setPendingServiceId(serviceId);
    setSessionType(type);
    setSelectedOptionId(next?.id);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setOptionsError('');
  };

  const handleSessionTypeChange = useCallback((type: SessionType) => {
    if (loading || !serviceOptions.some(option => option.modality === type)) return;
    const variants = serviceOptions.filter(option => option.modality === type);
    const next = privateOptionForModality(serviceOptions, selectedOption, type)
      ?? (variants.length === 1 ? variants[0] : undefined);
    setPendingServiceId(selectedServiceId);
    setSessionType(type);
    setSelectedOptionId(next?.id);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setOptionsError('');
  }, [loading, serviceOptions, selectedOption, selectedServiceId]);

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
    if ((isAuthenticatedClient || referralBooking) && (!patientIdentity.firstName.trim() || !patientIdentity.lastName.trim())) {
      showBookingMessage(appAlert, 'Completa tus datos', 'Indica nombre y apellidos antes de reservar.'); return;
    }

    if (!isBookingSessionTypeAvailable(sessionType, modalityFlags)) {
      showBookingMessage(appAlert, 'Error', 'Esta modalidad no está disponible para este especialista');
      return;
    }

    if (sessionType === 'PHONE_CALL' && !sessionPhone.trim()) {
      showBookingMessage(appAlert, 'Error', 'Confirma el teléfono al que debe llamarte el especialista.');
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

    if (bookingQuote.payment?.mode === 'ONLINE' && (!isAnonymousBooking || identityVerified) && !paymentAcceptance) {
      showBookingMessage(appAlert, 'Condiciones del pago', 'Indica tu país de residencia, completa los datos fiscales necesarios y acepta las condiciones.'); return;
    }
    if (needsExternalBilling && (!isAnonymousBooking || identityVerified || referralBooking)
      && !Object.values(sessionBilling).every(value => value.trim())) {
      showBookingMessage(appAlert, 'Datos para la factura completa', 'Esta sesión requiere una factura completa. Completa todos los datos fiscales antes de confirmar la cita.');
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

      if (referralBooking) {
        const payload = { patientIdentity, paymentAcceptance, ...(needsExternalBilling ? { billing: sessionBilling } : {}), date: dateTime, duration: slotDuration, type: sessionType, optionId: selectedOptionId, quoteReference: bookingQuote.quoteReference, sessionPhone };
        const { commandKey } = await durableCommandKey('referral-booking', payload);
        const createdSession = await bookGuestReferral(referralBooking.id, referralBooking.access, { ...payload, commandKey });
        if (createdSession.kind === 'payment') {
          if (createdSession.accessToken) await storePaymentAccess(createdSession.bookingId, createdSession.accessToken);
          bookingCompletedRef.current = true; navigation.navigate('SessionPayment', { bookingId: createdSession.bookingId }); return;
        }
        bookingCompletedRef.current = true;
        setPublicBookingSuccess({ status: createdSession.status, date: selectedDate, time: selectedSlot.startTime, type: sessionType });
        return;
      }

      if (isAnonymousBooking) {
        if (!publicContactResult.success) {
          return;
        }

        if (!verification) {
        const request = await sessionsService.requestPublicBooking({
          specialistId,
          date: dateTime,
          duration: slotDuration,
          type: sessionType,
          optionId: selectedOptionId, patientPackageId,
          sessionPhone,
          patient: toPublicBookingPatientPayload(publicContactResult.data),
          privacyAccepted: true,
          privacyVersion: PUBLIC_BOOKING_PRIVACY_VERSION,
          intentToken: bookingIntentToken,
        }, verificationAttempt);

        setVerification(request);
        return;
        }
        if (!identityVerified) {
          const quote = await sessionsService.verifyPublicBookingQuote(verification.requestId, verificationCode);
          setBookingQuote(quote); setIdentityVerified(true);
          return;
        }
        const createdSession = await sessionsService.verifyPublicBooking(verification.requestId, verificationCode, bookingQuote.quoteReference, paymentAcceptance, needsExternalBilling ? sessionBilling : undefined);
        if (createdSession.kind === 'payment') {
          if (createdSession.accessToken) await storePaymentAccess(createdSession.bookingId, createdSession.accessToken);
          bookingCompletedRef.current = true; navigation.navigate('SessionPayment', { bookingId: createdSession.bookingId }); return;
        }
        bookingCompletedRef.current = true;
        analyticsService.track('session_booked', {
          audience: 'anonymous',
          modality: sessionType === 'IN_PERSON' ? 'in_person' : sessionType === 'PHONE_CALL' ? 'phone' : 'video',
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
        patientIdentity,
        ...(needsExternalBilling ? { billing: sessionBilling } : {}),
        paymentAcceptance,
        specialistId,
        optionId: selectedOptionId, patientPackageId,
        quoteReference: bookingQuote.quoteReference,
        sessionPhone,
        intentToken: bookingIntentToken,
        date: dateTime,
        duration: slotDuration,
        type: sessionType,
      });

      if (createdSession.kind === 'payment') {
          if (createdSession.accessToken) await storePaymentAccess(createdSession.bookingId, createdSession.accessToken);
          bookingCompletedRef.current = true; navigation.navigate('SessionPayment', { bookingId: createdSession.bookingId }); return;
        }
        bookingCompletedRef.current = true;
      analyticsService.track('session_booked', {
        audience: 'authenticated',
        modality: sessionType === 'IN_PERSON' ? 'in_person' : sessionType === 'PHONE_CALL' ? 'phone' : 'video',
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
      if (['PACKAGE_PAYMENT_REQUIRED', 'PACKAGE_PAYMENT_REVIEW'].includes(getErrorCode(error) ?? '')) {
        setPackagePaymentError(getErrorMessage(error, 'Consulta el pago de tu bono antes de reservar.'));
        setQuoteRetry(v => v + 1);
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cita. Intenta de nuevo.';
      setIdentityVerified(false); setQuoteRetry(v => v + 1);
      showBookingMessage(appAlert, 'Error', message);
    } finally {
      submissionInFlightRef.current = false;
      setLoading(false);
    }
  }, [
    selectedOptionId, patientPackageId, packageRevision, sessionPhone, identityVerified, paymentAcceptance, needsExternalBilling, sessionBilling, patientIdentity,
    selectedDate,
    selectedSlot,
    appAlert,
    isAuthenticated,
    referralBooking,
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
    verification,
    verificationCode,
    verificationAttempt,
    bookingIntentToken,
  ]);

  const handlePageScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      pageScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      setHeaderScrolled(event.nativeEvent.contentOffset.y > 12);
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

  const handleContactBlur = (field: ContactInputField) => {
    setFocusedContactField(null);
    const errors = publicContactResult.success ? {} : mapPublicBookingContactErrors(publicContactResult.error);
    setPublicContactErrors(current => ({ ...current, [field]: errors[field] }));
  };

  const handleMobileFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setMobileFooterHeight(nextHeight);
    }
  }, []);

  const renderPublicContactCard = () => {
    if (isAuthenticatedClient || referralBooking) return <View style={styles.publicContactCard}>
      <Text style={styles.sectionTitle}>Datos del paciente</Text>
      <TextInput accessibilityLabel="Nombre del paciente" placeholder="Nombre" value={patientIdentity.firstName} onChangeText={firstName => setPatientIdentity(current => ({ ...current, firstName }))} style={styles.publicContactInput} />
      <TextInput accessibilityLabel="Apellidos del paciente" placeholder="Apellidos" value={patientIdentity.lastName} onChangeText={lastName => setPatientIdentity(current => ({ ...current, lastName }))} style={styles.publicContactInput} />
      <Text style={styles.sectionSubtitle}>Indica nombre y apellidos para preparar la factura. El envío utiliza tu correo verificado.</Text>
    </View>;
    if (!isAnonymousBooking) {
      return null;
    }

    return (
      <View style={styles.publicContactCard}>
        <View style={styles.publicContactFields}>
          <View style={styles.publicContactFieldRow}>
            <View style={styles.publicContactField}>
              <Text style={styles.publicContactLabel}>Nombre</Text>
              <TextInput
                accessibilityLabel="Nombre"
                editable={!loading}
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
                onBlur={() => handleContactBlur('firstName')}
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
                editable={!loading}
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
                onBlur={() => handleContactBlur('lastName')}
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

          <View style={styles.publicContactFieldRow}>
            <View style={styles.publicContactField}>
              <Text style={styles.publicContactLabel}>Correo electrónico</Text>
              <TextInput
                accessibilityLabel="Correo electrónico"
                editable={!loading}
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
                onBlur={() => handleContactBlur('email')}
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
                editable={!loading}
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
                onBlur={() => handleContactBlur('phone')}
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
        </View>

        <AnimatedPressable
          style={styles.privacyCheckRow}
          onPress={() => updatePublicContactField('privacyAccepted', !publicContact.privacyAccepted)}
          hoverLift={false}
          pressScale={0.98}
          accessibilityRole="checkbox"
          accessibilityLabel="Autorizar el uso de datos para gestionar la cita"
          disabled={loading}
          accessibilityState={{ checked: publicContact.privacyAccepted, disabled: loading }}
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
      publicBookingSuccess.type === 'VIDEO_CALL' ? 'Videollamada' : publicBookingSuccess.type === 'PHONE_CALL' ? 'Llamada' : 'Presencial';
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
            {referralBooking ? 'Tu cita queda vinculada a la identidad verificada de la propuesta. Puedes volver a ella para consultar el estado.' : 'Te enviaremos los detalles por email. Si ya tienes cuenta HERA, la cita quedará vinculada a tu historial.'}
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
            {referralBooking ? <Button fullWidth onPress={() => navigation.goBack()}>Volver a la propuesta</Button> : <>
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
            </>}
          </View>
        </View>
      </View>
    );
  };

  const actionHint = !hasSelectedAppointment
    ? 'Selecciona una fecha y una hora para continuar.'
    : isAnonymousBooking && !publicContactResult.success
      ? 'Completa tus datos y acepta la privacidad para continuar. No necesitas crear una cuenta.'
      : isAnonymousBooking && verification && !verificationComplete
        ? `Introduce el código de ${verificationCodeLength} ${verificationCodeLength === 6 ? 'dígitos' : 'caracteres'} para confirmar.`
        : isAnonymousBooking && !verification
          ? 'En el siguiente paso comprobaremos tu correo con un código para confirmar la cita.'
          : 'Revisa los datos antes de confirmar.';

  const renderBookingHeader = () => <BookingPublicHeader navigation={navigation} scrolled={headerScrolled} />;

  const renderSectionHeading = (step: number, title: string, subtitle?: string) => (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionStepBadge}><Text style={styles.sectionStepBadgeText}>{step}</Text></View>
      <View style={styles.sectionHeadingCopy}>
        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const renderScheduleSurface = () => (
    <>
      <View style={styles.mainSurface}>
        {catalogLoading ? (
          <View style={styles.catalogLoading} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>Preparando tu reserva</Text>
            <Text style={[styles.sectionSubtitle, { textAlign: 'center' }]}>Estamos cargando los servicios y modalidades del especialista.</Text>
          </View>
        ) : <>
        <View style={styles.selectionColumns}>
          <View style={styles.selectionColumn}>
            {!!optionsError && <Text accessibilityRole="alert" style={{ color: theme.error }}>{optionsError}</Text>}
            <BookingServiceSection heading={renderSectionHeading(1, 'Tipo de servicio')} options={bookingOptions} serviceId={selectedServiceId} selectedOptionId={selectedOptionId}
              disabled={loading} onServiceSelect={handleServiceSelect} />
          </View>
          <View style={[styles.selectionColumn, styles.modalityColumn]}>
            <BookingModalitySection
              headingMinHeight={new Set(bookingOptions.filter(option => option.isActive).map(option => option.serviceId)).size > 3 && !isMobile ? 36 : 24}
              prices={serviceOptions} selectedType={sessionType} availableSessionTypes={availableSessionTypes}
              duration={slotDuration} onSessionTypeChange={handleSessionTypeChange} disabled={loading} busy={loading}
              bookingQuote={bookingQuote} quoteLoading={quoteLoading} quoteError={selectedServiceId ? quoteError : null}
              quoteIsEstimated={quoteIsEstimated} officeLocation={officeLocation}
            />
            {serviceOptions.filter(option => option.modality === sessionType).length > 1 &&
              <SimpleDropdown accessibilityLabel="Duración y precio del servicio" placeholder="Elige duración y precio"
                value={selectedOptionId ?? null} disabled={loading} presentation="portal" portalAnimation="none" keyboardNavigation
                options={serviceOptions.filter(option => option.modality === sessionType).map(option => ({ value: option.id, label: `${option.durationMinutes} min · ${formatPrivatePrice(option.priceCents)}` }))}
                onSelect={id => { setSelectedOptionId(id); setOptionsError(''); }} />}
            {sessionType === 'PHONE_CALL' && <View style={{ gap: 8 }}><Text style={{ color: theme.textPrimary }}>Tu especialista te llamará al número indicado a la hora de la cita.</Text><TextInput accessibilityLabel="Teléfono para esta cita" value={sessionPhone} onChangeText={setSessionPhone} keyboardType="phone-pad" placeholder="+34 600 000 000" placeholderTextColor={theme.textSecondary} style={{ color: theme.textPrimary, minHeight: 44, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 }} /></View>}
          </View>
        </View>
        {!!serviceOptions[0]?.serviceDescription && <View style={styles.serviceDetails} testID="booking-service-description">
          <Text style={styles.serviceDetailsLabel}>Acerca de «{serviceOptions[0].serviceName ?? serviceOptions[0].name}»</Text>
          <Text style={styles.serviceDetailsText}>{serviceOptions[0].serviceDescription}</Text>
        </View>}
        </>}
      </View>
      <View style={styles.mainSurface}>
        {renderSectionHeading(3, 'Fecha y hora')}
        <CompactCalendarColumn selectedDate={selectedDate} onDateSelect={handleDateSelect} disabled={loading || !selectedOption} busy={loading} />
        <TimeSlotsColumn availabilityKey={`${specialistId}:${selectedOptionId}:${sessionType}`}
          selectedDate={selectedDate} availableSlots={availableSlots} selectedTime={selectedSlot?.startTime || null}
          onTimeSelect={handleTimeSelect} loading={loadingSlots} disabled={loading || !selectedOption} busy={loading}
          error={slotsError} onRetry={handleRetrySlots} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="globe-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.sectionSubtitle}>Horario de Madrid · Europe/Madrid</Text>
        </View>
      </View>
        {!isAnonymousBooking && !referralBooking && <PackageCoverage key={`${specialistId}:${packageRevision}`} specialistId={specialistId} firstVisitFreeApplied={bookingQuote?.firstVisitFreeApplied} optionId={selectedOptionId} value={patientPackageId} initialPackageId={patientPackageId} disabled={loading} onPay={id => navigation.navigate('PackagePayment', { patientPackageId: id })} onChange={selectPackageCoverage} />}
        {!!packagePaymentError && patientPackageId && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: theme.textSecondary }}>{packagePaymentError}</Text><Button variant="secondary" onPress={() => navigation.navigate('PackagePayment', { patientPackageId })}>Consultar pago del bono</Button></View>}
        {!referralBooking && <PublicPackageOffers specialistId={specialistId} anonymous={isAnonymousBooking} intentToken={bookingIntentToken} onAcquired={handlePackageAcquired} onPrivacy={() => navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY' })} />}
      {bookingQuote && (!isAnonymousBooking || identityVerified || referralBooking) && <PaymentConditions key={`${bookingQuote.payment?.termsVersion}:${bookingQuote.payment?.fullInvoiceRequired}`} quote={bookingQuote} value={paymentAcceptance} onChange={setPaymentAcceptance} />}
      {needsExternalBilling && (!isAnonymousBooking || identityVerified || referralBooking) && <PackageBillingFields value={sessionBilling} onChange={setSessionBilling} disabled={loading} description="Se guardarán para la facturación de tus sesiones con este especialista." />}
    </>
  );

  const renderProgressiveContact = () => {
    if (!isAnonymousBooking) {
      return null;
    }

    return (
      <View
        ref={contactSectionRef}
        testID="booking-contact-section"
        style={styles.contactSection}
      >
        {renderSectionHeading(4, 'Tus datos de contacto', 'Solo necesitamos lo imprescindible para gestionar esta cita.')}
        {renderPublicContactCard()}
        <BookingConfirmationPanel
          showSummary={!isDesktop}
          booking={bookingState}
          duration={selectedOption ? slotDuration : null}
          serviceName={serviceOptions[0]?.serviceName ?? serviceOptions[0]?.name}
          bookingQuote={bookingQuote}
          quoteLoading={quoteLoading}
          quoteError={quoteError}
          actionLabel={primaryActionLabel}
          actionHint={actionHint}
          disabled={primaryActionDisabled}
          loading={loading}
          onConfirm={handlePrimaryAction}
        >
          {renderVerification()}
        </BookingConfirmationPanel>
      </View>
    );
  };

  const renderVerification = () => isAnonymousBooking && verification ? <BookingEmailVerification
    email={publicContact.email.trim()} code={verificationCode} codeLength={verificationCodeLength} busy={loading}
    onChange={setVerificationCode}
    onRestart={() => { setVerification(undefined); setVerificationCode(''); setVerificationAttempt(v => v + 1); }}
  /> : null;

  const renderBookingSummary = (sticky: boolean, showAction = true) => (
    <ProfessionalInfoColumn
      specialist={specialist}
      duration={selectedOption ? slotDuration : null}
      serviceName={serviceOptions[0]?.serviceName ?? serviceOptions[0]?.name}
      booking={bookingState}
      availableSessionTypes={availableSessionTypes}
      onPrimaryAction={handlePrimaryAction}
      actionLabel={primaryActionLabel}
      actionDisabled={primaryActionDisabled}
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
            {title || 'Profesional de salud mental'}{selectedOption ? ` · ${slotDuration} min` : ''}
          </Text>
        </View>
        {!isNarrowMobile && <Text style={styles.mobileSpecialistPrice}>{mobileSpecialistPriceText}</Text>}
      </View>
    </View>
  );

  const renderPageContent = () => (
    <View style={[styles.pageContent, isTablet && { paddingHorizontal: 24 }]}>
      <View style={styles.pageIntro}>
        <AnimatedPressable onPress={() => navigation.goBack()} accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior" hoverLift={false} style={styles.backLink}>
          <Ionicons name="arrow-back" size={16} color={theme.primary} />
          <Text style={styles.backButtonText}>Volver</Text>
        </AnimatedPressable>
        <Text accessibilityRole="header" style={styles.pageTitle}>Reserva tu sesión</Text>
        <Text style={styles.pageSubtitle}>
          Elige tu servicio, la modalidad y un momento para ti. Revisa los detalles antes de confirmar.
        </Text>
      </View>

      {!isDesktop ? renderMobileProfessional() : null}

      <View style={[styles.bookingLayout, !isDesktop ? styles.bookingLayoutStacked : null]}>
        <View style={styles.mainColumn}>
          {renderScheduleSurface()}
          {renderProgressiveContact()}
          {isMobile && sessionType === 'IN_PERSON' && hasOfficeCoordinates ? (
            <View style={styles.mobileLocationCard}>
              <BookingLocationMap officeLocation={officeLocation} height={150} />
            </View>
          ) : null}
          {!isDesktop && !isAnonymousBooking ? (
            <View style={styles.mainSurface}>
              {accountMessage && <Text accessibilityRole="alert" style={styles.sectionSubtitle}>{accountMessage}</Text>}
              <BookingConfirmationPanel
                showAction={isTablet}
                booking={bookingState}
                duration={selectedOption ? slotDuration : null}
                serviceName={serviceOptions[0]?.serviceName ?? serviceOptions[0]?.name}
                bookingQuote={bookingQuote}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                actionLabel={primaryActionLabel}
                actionHint={actionHint}
                disabled={primaryActionDisabled}
                loading={loading}
                onConfirm={handlePrimaryAction}
              >{null}</BookingConfirmationPanel>
            </View>
          ) : null}
        </View>

        {isDesktop ? (
          <View style={styles.summaryColumn}>
            {renderBookingSummary(true, !isAnonymousBooking)}
          </View>
        ) : null}
      </View>

      {isMobile && !isAnonymousBooking ? (
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
        disabled={primaryActionDisabled}
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
      {isMobile && !isAnonymousBooking && !catalogLoading ? renderMobileFooter() : null}
    </KeyboardAvoidingView>
  );
};

const createLoadStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bgMuted,
    },
    stateCard: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: 112,
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
      backgroundColor: theme.bgMuted,
    },
    backLink: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: isMobile ? 44 : 32,
      paddingRight: 12,
    },
    backButtonText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
    pageScroll: {
      flex: 1,
    },
    pageScrollContent: {
      flexGrow: 1,
      paddingTop: isMobile ? 68 : 80,
      paddingBottom: isMobile ? 0 : spacing.xxl,
    },
    successScrollContent: {
      flexGrow: 1,
      paddingTop: 80,
    },
    pageContent: {
      width: '100%',
      maxWidth: 1680,
      alignSelf: 'center',
      gap: 12,
      paddingHorizontal: isMobile ? 16 : 32,
      paddingTop: 0,
    },
    pageIntro: {
      maxWidth: 720,
      gap: 0,
    },
    catalogLoading: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 48,
    },
    pageTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: isMobile ? 28 : 32,
      lineHeight: isMobile ? 34 : 38,
    },
    pageSubtitle: {
      maxWidth: 650,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    bookingLayout: {
      flexDirection: 'row',
      gap: 24,
      alignItems: 'flex-start',
    },
    bookingLayoutStacked: {
      flexDirection: 'column',
    },
    mainColumn: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      gap: 12,
    },
    summaryColumn: {
      width: 380,
      flexShrink: 0,
      alignSelf: 'stretch',
    },
    mainSurface: {
      width: '100%',
      gap: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 1,
    },
    selectionColumns: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'stretch',
      gap: 16,
    },
    selectionColumn: {
      flex: isMobile ? undefined : 1,
      minWidth: 0,
      width: isMobile ? '100%' : undefined,
      gap: 10,
    },
    modalityColumn: {
      borderLeftWidth: isMobile ? 0 : 1,
      borderTopWidth: isMobile ? 1 : 0,
      borderColor: theme.borderLight,
      paddingLeft: isMobile ? 0 : 16,
      paddingTop: isMobile ? 12 : 0,
    },
    serviceDetails: {
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: 10,
    },
    serviceDetailsLabel: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 18,
    },
    serviceDetailsText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 18,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionStepBadge: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
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
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: 18,
      lineHeight: 24,
    },
    sectionSubtitle: {
      maxWidth: 600,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 18,
    },
    contactSection: {
      width: '100%',
      gap: 10,
      padding: 14,
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
      gap: spacing.md,
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
      fontSize: 13,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
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
      elevation: 1,
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
      fontSize: 32,
      lineHeight: 38,
      fontFamily: theme.fontDisplay,
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
