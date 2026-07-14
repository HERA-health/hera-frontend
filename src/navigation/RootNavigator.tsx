import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from '../constants/types';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import { LandingPage } from '../screens/landing';
import { LegalDocumentScreen } from '../screens/legal/LegalDocumentScreen';
import { RequiredLegalAcceptanceScreen } from '../screens/legal/RequiredLegalAcceptanceScreen';
import { getLegalStatus, type LegalAcceptanceStatus } from '../services/legalService';
import { getErrorCode, getErrorMessage } from '../constants/errors';
import { Button } from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import {
  createDeferredComponent,
  type DeferredComponentModule,
} from '../utils/createDeferredComponent';
import {
  clearPendingBookingIntent,
  consumePendingBookingIntent,
  mapPendingIntentToBookingParams,
} from '../services/pendingBookingIntentService';

const Stack = createNativeStackNavigator<RootStackParamList>();

type StackRouteProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const renderWithMainLayout = (content: React.ReactElement) => {
  const { MainLayout } = require('../components/navigation/MainLayout') as {
    MainLayout: React.ComponentType<{ children: React.ReactNode }>;
  };

  return <MainLayout>{content}</MainLayout>;
};

const createDeferredRoute = <T extends keyof RootStackParamList>(
  loadModule: () => DeferredComponentModule<StackRouteProps<T>>,
  options: {
    displayName: string;
    exportName?: string;
  }
): React.FC<StackRouteProps<T>> =>
  createDeferredComponent<StackRouteProps<T>>(loadModule, options);

const createDeferredLayoutRoute = <T extends keyof RootStackParamList>(
  loadModule: () => DeferredComponentModule<StackRouteProps<T>>,
  options: {
    displayName: string;
    exportName?: string;
  }
): React.FC<StackRouteProps<T>> => {
  const DeferredScreen = createDeferredRoute(loadModule, options);

  const DeferredLayoutRoute: React.FC<StackRouteProps<T>> = (props) =>
    renderWithMainLayout(<DeferredScreen {...props} />);

  DeferredLayoutRoute.displayName = `${options.displayName}WithLayout`;

  return DeferredLayoutRoute;
};

const WelcomeRoute = createDeferredRoute<'Welcome'>(
  () => require('../screens/auth/WelcomeScreen'),
  { displayName: 'WelcomeRoute', exportName: 'WelcomeScreen' }
);
const LoginRoute = createDeferredRoute<'Login'>(
  () => require('../screens/auth/LoginScreen'),
  { displayName: 'LoginRoute', exportName: 'LoginScreen' }
);
const RegisterRoute = createDeferredRoute<'Register'>(
  () => require('../screens/auth/RegisterScreen'),
  { displayName: 'RegisterRoute', exportName: 'RegisterScreen' }
);
const EmailSentVerificationRoute = createDeferredRoute<'EmailSentVerification'>(
  () => require('../screens/auth/EmailSentVerificationScreen'),
  {
    displayName: 'EmailSentVerificationRoute',
    exportName: 'EmailSentVerificationScreen',
  }
);
const EmailVerificationRoute = createDeferredRoute<'EmailVerification'>(
  () => require('../screens/auth/EmailVerificationScreen'),
  { displayName: 'EmailVerificationRoute', exportName: 'EmailVerificationScreen' }
);
const ClinicalConsentRoute = createDeferredRoute<'ClinicalConsent'>(
  () => require('../screens/clinical/ClinicalConsentScreen'),
  { displayName: 'ClinicalConsentRoute', exportName: 'ClinicalConsentScreen' }
);
const ClinicConsentRoute = createDeferredRoute<'ClinicConsent'>(
  () => require('../screens/clinic/ClinicConsentScreen'),
  { displayName: 'ClinicConsentRoute', exportName: 'ClinicConsentScreen' }
);
const ForgotPasswordRoute = createDeferredRoute<'ForgotPassword'>(
  () => require('../screens/auth/ForgotPasswordScreen'),
  { displayName: 'ForgotPasswordRoute', exportName: 'ForgotPasswordScreen' }
);
const EmailSentPasswordResetRoute = createDeferredRoute<'EmailSentPasswordReset'>(
  () => require('../screens/auth/EmailSentPasswordResetScreen'),
  {
    displayName: 'EmailSentPasswordResetRoute',
    exportName: 'EmailSentPasswordResetScreen',
  }
);
const ResetPasswordRoute = createDeferredRoute<'ResetPassword'>(
  () => require('../screens/auth/ResetPasswordScreen'),
  { displayName: 'ResetPasswordRoute', exportName: 'ResetPasswordScreen' }
);
const ProfessionalVerificationRoute = createDeferredRoute<'ProfessionalVerification'>(
  () => require('../screens/auth/ProfessionalVerificationScreen'),
  {
    displayName: 'ProfessionalVerificationRoute',
    exportName: 'ProfessionalVerificationScreen',
  }
);
const ClinicPendingRoute = createDeferredRoute<'ClinicPending'>(
  () => require('../screens/clinic/ClinicPendingScreen'),
  {
    displayName: 'ClinicPendingRoute',
    exportName: 'ClinicPendingScreen',
  }
);
const ClinicDashboardRoute = createDeferredLayoutRoute<'ClinicDashboard'>(
  () => require('../screens/clinic/ClinicDashboardScreen'),
  {
    displayName: 'ClinicDashboardRoute',
    exportName: 'ClinicDashboardScreen',
  }
);
const ClinicSettingsRoute = createDeferredLayoutRoute<'ClinicSettings'>(
  () => require('../screens/clinic/ClinicSettingsScreen'),
  {
    displayName: 'ClinicSettingsRoute',
    exportName: 'ClinicSettingsScreen',
  }
);
const ClinicAdministratorsRoute = createDeferredLayoutRoute<'ClinicAdministrators'>(
  () => require('../screens/clinic/ClinicAdministratorsScreen'),
  {
    displayName: 'ClinicAdministratorsRoute',
    exportName: 'ClinicAdministratorsScreen',
  }
);
const ClinicTeamRoute = createDeferredLayoutRoute<'ClinicTeam'>(
  () => require('../screens/clinic/ClinicTeamScreen'),
  {
    displayName: 'ClinicTeamRoute',
    exportName: 'ClinicTeamScreen',
  }
);
const ClinicPatientsRoute = createDeferredLayoutRoute<'ClinicPatients'>(
  () => require('../screens/clinic/ClinicPatientsScreen'),
  {
    displayName: 'ClinicPatientsRoute',
    exportName: 'ClinicPatientsScreen',
  }
);
const ClinicAgendaRoute = createDeferredLayoutRoute<'ClinicAgenda'>(
  () => require('../screens/clinic/ClinicAgendaScreen'),
  {
    displayName: 'ClinicAgendaRoute',
    exportName: 'ClinicAgendaScreen',
  }
);
const ClinicBillingRoute = createDeferredLayoutRoute<'ClinicBilling'>(
  () => require('../screens/clinic/ClinicBillingScreen'),
  {
    displayName: 'ClinicBillingRoute',
    exportName: 'ClinicBillingScreen',
  }
);
const ClinicInvoiceCreateRoute = createDeferredLayoutRoute<'ClinicInvoiceCreate'>(
  () => require('../screens/clinic/ClinicInvoiceCreateScreen'),
  {
    displayName: 'ClinicInvoiceCreateRoute',
    exportName: 'ClinicInvoiceCreateScreen',
  }
);
const HomeRoute = createDeferredLayoutRoute<'Home'>(
  () => require('../screens/home/HomeScreen'),
  { displayName: 'HomeRoute' }
);
const SpecialistsRoute = createDeferredLayoutRoute<'Specialists'>(
  () => require('../screens/specialists/SpecialistsScreen'),
  { displayName: 'SpecialistsRoute' }
);
const SpecialistDetailRoute = createDeferredLayoutRoute<'SpecialistDetail'>(
  () => require('../screens/specialists/SpecialistDetailScreen'),
  { displayName: 'SpecialistDetailRoute', exportName: 'SpecialistDetailScreen' }
);
const SessionsRoute = createDeferredLayoutRoute<'Sessions'>(
  () => require('../screens/sessions/SessionsScreen'),
  { displayName: 'SessionsRoute' }
);
const ProfileRoute = createDeferredLayoutRoute<'Profile'>(
  () => require('../screens/profile/ProfileScreen'),
  { displayName: 'ProfileRoute' }
);
const ProfileCompletionRoute = createDeferredRoute<'ProfileCompletion'>(
  () => require('../screens/profile/ProfileCompletionScreen'),
  { displayName: 'ProfileCompletionRoute' }
);
const BookingRoute = createDeferredLayoutRoute<'Booking'>(
  () => require('../screens/booking/BookingScreen'),
  { displayName: 'BookingRoute', exportName: 'BookingScreen' }
);
const PublicBookingRoute = createDeferredRoute<'Booking'>(
  () => require('../screens/booking/BookingScreen'),
  { displayName: 'PublicBookingRoute', exportName: 'BookingScreen' }
);
const QuestionnaireRoute = createDeferredLayoutRoute<'Questionnaire'>(
  () => require('../screens/questionnaire/QuestionnaireScreen'),
  { displayName: 'QuestionnaireRoute', exportName: 'QuestionnaireScreen' }
);
const QuestionnaireResultsRoute = createDeferredLayoutRoute<'QuestionnaireResults'>(
  () => require('../screens/questionnaire/QuestionnaireResultsScreen'),
  {
    displayName: 'QuestionnaireResultsRoute',
    exportName: 'QuestionnaireResultsScreen',
  }
);
const OnDutyPsychologistRoute = createDeferredLayoutRoute<'OnDutyPsychologist'>(
  () => require('../screens/onduty/OnDutyPsychologistScreen'),
  {
    displayName: 'OnDutyPsychologistRoute',
    exportName: 'OnDutyPsychologistScreen',
  }
);
const ProfessionalHomeRoute = createDeferredLayoutRoute<'ProfessionalHome'>(
  () => require('../screens/professional/ProfessionalHomeScreen'),
  { displayName: 'ProfessionalHomeRoute', exportName: 'ProfessionalHomeScreen' }
);
const ProfessionalDashboardRoute = createDeferredLayoutRoute<'ProfessionalDashboard'>(
  () => require('../screens/professional/DashboardScreen'),
  { displayName: 'ProfessionalDashboardRoute', exportName: 'DashboardScreen' }
);
const ProfessionalClientsRoute = createDeferredLayoutRoute<'ProfessionalClients'>(
  () => require('../screens/professional/ProfessionalClientsScreen'),
  { displayName: 'ProfessionalClientsRoute', exportName: 'ProfessionalClientsScreen' }
);
const ProfessionalClinicPatientDetailRoute = createDeferredLayoutRoute<'ProfessionalClinicPatientDetail'>(
  () => require('../screens/professional/ProfessionalClinicPatientDetailScreen'),
  {
    displayName: 'ProfessionalClinicPatientDetailRoute',
    exportName: 'ProfessionalClinicPatientDetailScreen',
  }
);
const ProfessionalSessionsRoute = createDeferredLayoutRoute<'ProfessionalSessions'>(
  () => require('../screens/professional/ProfessionalSessionsScreen'),
  {
    displayName: 'ProfessionalSessionsRoute',
    exportName: 'ProfessionalSessionsScreen',
  }
);
const ProfessionalBillingRoute = createDeferredLayoutRoute<'ProfessionalBilling'>(
  () => require('../screens/professional/BillingScreen'),
  { displayName: 'ProfessionalBillingRoute', exportName: 'BillingScreen' }
);
const CreateInvoiceRoute = createDeferredLayoutRoute<'CreateInvoice'>(
  () => require('../screens/professional/CreateInvoiceScreen'),
  { displayName: 'CreateInvoiceRoute', exportName: 'CreateInvoiceScreen' }
);
const ProfessionalProfileRoute = createDeferredLayoutRoute<'ProfessionalProfile'>(
  () => require('../screens/professional/SpecialistProfileScreen'),
  { displayName: 'ProfessionalProfileRoute', exportName: 'SpecialistProfileScreen' }
);
const ProfessionalAvailabilityRoute = createDeferredLayoutRoute<'ProfessionalAvailability'>(
  () => require('../screens/professional/ProfessionalAvailabilityScreen'),
  {
    displayName: 'ProfessionalAvailabilityRoute',
    exportName: 'ProfessionalAvailabilityScreen',
  }
);
const ClientProfileRoute = createDeferredLayoutRoute<'ClientProfile'>(
  () => require('../screens/professional/ClientProfileScreen'),
  { displayName: 'ClientProfileRoute', exportName: 'ClientProfileScreen' }
);
const AdminPanelRoute = createDeferredLayoutRoute<'AdminPanel'>(
  () => require('../screens/admin/AdminPanelTabbedScreen'),
  { displayName: 'AdminPanelRoute', exportName: 'AdminPanelTabbedScreen' }
);
const AdminSpecialistDetailRoute = createDeferredLayoutRoute<'AdminSpecialistDetail'>(
  () => require('../screens/admin/AdminSpecialistDetailScreen'),
  {
    displayName: 'AdminSpecialistDetailRoute',
    exportName: 'AdminSpecialistDetailScreen',
  }
);
const SpecialistDetailAdminRoute = createDeferredLayoutRoute<'SpecialistDetailAdmin'>(
  () => require('../screens/admin/SpecialistDetailAdminScreen'),
  {
    displayName: 'SpecialistDetailAdminRoute',
    exportName: 'SpecialistDetailAdminScreen',
  }
);
const PublicSpecialistProfileRoute = createDeferredRoute<'PublicSpecialistProfile'>(
  () => require('../screens/specialists/PublicSpecialistProfileScreen'),
  {
    displayName: 'PublicSpecialistProfileRoute',
    exportName: 'PublicSpecialistProfileScreen',
  }
);
const PublicSpecialistsRoute = createDeferredRoute<'PublicSpecialists'>(
  () => require('../screens/specialists/PublicSpecialistsScreen'),
  {
    displayName: 'PublicSpecialistsRoute',
    exportName: 'PublicSpecialistsScreen',
  }
);
const PublicReviewRoute = createDeferredRoute<'PublicReview'>(
  () => require('../screens/reviews/PublicReviewScreen'),
  {
    displayName: 'PublicReviewRoute',
    exportName: 'PublicReviewScreen',
  }
);

const ClientHomeRoute: React.FC<StackRouteProps<'Home'>> = (props) => {
  const consumedIntentRef = useRef(false);

  useEffect(() => {
    if (consumedIntentRef.current) {
      return undefined;
    }

    consumedIntentRef.current = true;
    let active = true;

    const consumeIntent = async () => {
      const intent = await consumePendingBookingIntent();
      if (!active || !intent) {
        return;
      }

      props.navigation.navigate('Booking', mapPendingIntentToBookingParams(intent));
    };

    void consumeIntent();

    return () => {
      active = false;
    };
  }, [props.navigation]);

  return <HomeRoute {...props} />;
};

interface LegalStatusUnavailableScreenProps {
  loading: boolean;
  message: string;
  onRetry: () => void;
}

function LegalStatusUnavailableScreen({
  loading,
  message,
  onRetry,
}: LegalStatusUnavailableScreenProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.legalErrorScreen, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.legalErrorCard,
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.legalErrorTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
          No hemos podido cargar tu área privada
        </Text>
        <Text style={[styles.legalErrorText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          {message}
        </Text>
        <Button
          variant="primary"
          size="medium"
          onPress={onRetry}
          loading={loading}
        >
          Reintentar
        </Button>
      </View>
    </View>
  );
}

const LEGAL_STATUS_RETRY_DELAYS_MS = [400, 1200] as const;

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const getResponseStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
};

const shouldRetryLegalStatusError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT') {
    return true;
  }

  const status = getResponseStatus(error);
  return typeof status === 'number' && status >= 500;
};

const getLegalStatusErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);

  if (code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT') {
    return 'No hemos podido conectar con HERA. Si ya aceptaste las condiciones, no tendrás que repetirlo cuando recuperemos la conexión.';
  }

  if (code === 'RATE_LIMIT_EXCEEDED') {
    return 'Hemos recibido demasiadas comprobaciones seguidas. Espera unos segundos y vuelve a intentarlo; tus aceptaciones no se han perdido.';
  }

  return getErrorMessage(
    error,
    'Necesitamos comprobar tu sesión y tus condiciones vigentes antes de abrir el área privada. Si ya las aceptaste, no tendrás que repetirlo.'
  );
};

const fetchLegalStatusWithRetry = async (): Promise<LegalAcceptanceStatus> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= LEGAL_STATUS_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await getLegalStatus();
    } catch (error: unknown) {
      lastError = error;
      const retryDelay = LEGAL_STATUS_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined || !shouldRetryLegalStatusError(error)) {
        throw error;
      }

      await delay(retryDelay);
    }
  }

  throw lastError;
};

export function RootNavigator() {
  const {
    isAuthenticated,
    isInitialized,
    legalStatusSnapshot,
    user,
    verificationSubmitted,
  } = useAuth();
  const [legalStatus, setLegalStatus] = useState<LegalAcceptanceStatus | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalStatusError, setLegalStatusError] = useState(false);
  const [legalStatusErrorMessage, setLegalStatusErrorMessage] = useState(
    'Necesitamos comprobar tu sesión y tus condiciones vigentes antes de abrir el área privada.'
  );

  const refreshLegalStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setLegalStatus(null);
      setLegalStatusError(false);
      setLegalLoading(false);
      return;
    }

    setLegalLoading(true);
    try {
      const nextStatus = await fetchLegalStatusWithRetry();
      setLegalStatus(nextStatus);
      setLegalStatusError(false);
    } catch (error: unknown) {
      if (getErrorCode(error) === 'SESSION_EXPIRED') {
        setLegalStatus(null);
        setLegalStatusError(false);
        return;
      }

      setLegalStatus(null);
      setLegalStatusErrorMessage(getLegalStatusErrorMessage(error));
      setLegalStatusError(true);
    } finally {
      setLegalLoading(false);
    }
  }, [isAuthenticated]);

  const handleLegalAccepted = useCallback((nextStatus: LegalAcceptanceStatus) => {
    setLegalStatus(nextStatus);
    setLegalStatusError(false);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (isAuthenticated && legalStatusSnapshot) {
      setLegalStatus(legalStatusSnapshot);
      setLegalStatusError(false);
      return;
    }

    void refreshLegalStatus();
  }, [isAuthenticated, isInitialized, legalStatusSnapshot, refreshLegalStatus, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.type && user.type !== 'client') {
      void clearPendingBookingIntent();
    }
  }, [isAuthenticated, user?.type]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        key="guest"
        initialRouteName="Landing"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen
          name="PublicSpecialists"
          component={PublicSpecialistsRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Welcome" component={WelcomeRoute} />
        <Stack.Screen name="Login" component={LoginRoute} />
        <Stack.Screen name="Register" component={RegisterRoute} />
        <Stack.Screen
          name="EmailSentVerification"
          component={EmailSentVerificationRoute}
        />
        <Stack.Screen name="EmailVerification" component={EmailVerificationRoute} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordRoute} />
        <Stack.Screen
          name="EmailSentPasswordReset"
          component={EmailSentPasswordResetRoute}
        />
        <Stack.Screen name="ResetPassword" component={ResetPasswordRoute} />
        <Stack.Screen
          name="ProfessionalVerification"
          component={ProfessionalVerificationRoute}
        />
        <Stack.Screen
          name="PublicSpecialistProfile"
          component={PublicSpecialistProfileRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicReview"
          component={PublicReviewRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Booking"
          component={PublicBookingRoute}
          options={{ headerTitle: 'Reservar sesión', headerShown: false }}
        />
        <Stack.Screen
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicConsent"
          component={ClinicConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (legalLoading && !legalStatus) {
    return <LoadingScreen />;
  }

  if (legalStatusError) {
    return (
      <LegalStatusUnavailableScreen
        loading={legalLoading}
        message={legalStatusErrorMessage}
        onRetry={() => void refreshLegalStatus()}
      />
    );
  }

  if (legalStatus?.requiresAcceptance) {
    const RequiredLegalAcceptanceRoute = () => (
      <RequiredLegalAcceptanceScreen
        requiredDocumentKeys={legalStatus.missingDocumentKeys}
        onAccepted={handleLegalAccepted}
      />
    );

    return (
      <Stack.Navigator
        key="legal-acceptance"
        initialRouteName="RequiredLegalAcceptance"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="PublicSpecialists"
          component={PublicSpecialistsRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicSpecialistProfile"
          component={PublicSpecialistProfileRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RequiredLegalAcceptance"
          component={RequiredLegalAcceptanceRoute}
        />
        <Stack.Screen
          name="PublicReview"
          component={PublicReviewRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (user?.type === 'clinic') {
    return (
      <Stack.Navigator
        key="clinic"
        initialRouteName="ClinicDashboard"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="PublicSpecialists"
          component={PublicSpecialistsRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicSpecialistProfile"
          component={PublicSpecialistProfileRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicDashboard"
          component={ClinicDashboardRoute}
          options={{ headerTitle: 'Panel de clínica' }}
        />
        <Stack.Screen
          name="ClinicSettings"
          component={ClinicSettingsRoute}
          options={{ headerTitle: 'Configuración de clínica' }}
        />
        <Stack.Screen
          name="ClinicAdministrators"
          component={ClinicAdministratorsRoute}
          options={{ headerTitle: 'Administradores de clínica' }}
        />
        <Stack.Screen
          name="ClinicTeam"
          component={ClinicTeamRoute}
          options={{ headerTitle: 'Equipo de clínica' }}
        />
        <Stack.Screen
          name="ClinicPatients"
          component={ClinicPatientsRoute}
          options={{ headerTitle: 'Pacientes de clínica' }}
        />
        <Stack.Screen
          name="ClinicAgenda"
          component={ClinicAgendaRoute}
          options={{ headerTitle: 'Agenda de clínica' }}
        />
        <Stack.Screen
          name="ClinicBilling"
          component={ClinicBillingRoute}
          options={{ headerTitle: 'Facturación de clínica' }}
        />
        <Stack.Screen
          name="ClinicInvoiceCreate"
          component={ClinicInvoiceCreateRoute}
          options={{ headerTitle: 'Nueva factura de clínica' }}
        />
        <Stack.Screen
          name="ClinicPending"
          component={ClinicPendingRoute}
        />
        <Stack.Screen
          name="ClinicConsent"
          component={ClinicConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicReview"
          component={PublicReviewRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  const isProfessional = user?.type === 'professional';

  if (isProfessional && verificationSubmitted === false) {
    return (
      <Stack.Navigator
        key="professional-verification"
        initialRouteName="ProfessionalVerification"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="ProfessionalVerification"
          component={ProfessionalVerificationRoute}
        />
        <Stack.Screen
          name="EmailSentVerification"
          component={EmailSentVerificationRoute}
        />
        <Stack.Screen name="EmailVerification" component={EmailVerificationRoute} />
        <Stack.Screen
          name="PublicSpecialistProfile"
          component={PublicSpecialistProfileRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicSpecialists"
          component={PublicSpecialistsRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicReview"
          component={PublicReviewRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicConsent"
          component={ClinicConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (isProfessional) {
    return (
      <Stack.Navigator
        key="professional"
        initialRouteName="ProfessionalHome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="PublicSpecialists"
          component={PublicSpecialistsRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfessionalHome"
          component={ProfessionalHomeRoute}
          options={{ headerTitle: 'Panel Profesional' }}
        />
        <Stack.Screen
          name="ProfessionalDashboard"
          component={ProfessionalDashboardRoute}
          options={{ headerTitle: 'Dashboard' }}
        />
        <Stack.Screen
          name="ProfessionalClients"
          component={ProfessionalClientsRoute}
          options={{ headerTitle: 'Mis Clientes' }}
        />
        <Stack.Screen
          name="ProfessionalClinicPatientDetail"
          component={ProfessionalClinicPatientDetailRoute}
          options={{
            headerTitle: 'Paciente de clínica',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ProfessionalSessions"
          component={ProfessionalSessionsRoute}
          options={{ headerTitle: 'Sesiones' }}
        />
        <Stack.Screen
          name="ProfessionalBilling"
          component={ProfessionalBillingRoute}
          options={{ headerTitle: 'Facturación' }}
        />
        <Stack.Screen
          name="CreateInvoice"
          component={CreateInvoiceRoute}
          options={{ headerTitle: 'Nueva Factura' }}
        />
        <Stack.Screen
          name="ProfessionalProfile"
          component={ProfessionalProfileRoute}
          options={{ headerTitle: 'Mi Perfil Profesional' }}
        />
        <Stack.Screen
          name="ProfessionalAvailability"
          component={ProfessionalAvailabilityRoute}
          options={{
            headerTitle: 'Mi Disponibilidad',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ClientProfile"
          component={ClientProfileRoute}
          options={{
            headerTitle: 'Perfil del Cliente',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ClinicDashboard"
          component={ClinicDashboardRoute}
          options={{ headerTitle: 'Panel de clínica' }}
        />
        <Stack.Screen
          name="ClinicSettings"
          component={ClinicSettingsRoute}
          options={{ headerTitle: 'Configuración de clínica' }}
        />
        <Stack.Screen
          name="ClinicAdministrators"
          component={ClinicAdministratorsRoute}
          options={{ headerTitle: 'Administradores de clínica' }}
        />
        <Stack.Screen
          name="ClinicTeam"
          component={ClinicTeamRoute}
          options={{ headerTitle: 'Equipo de clínica' }}
        />
        <Stack.Screen
          name="ClinicPatients"
          component={ClinicPatientsRoute}
          options={{ headerTitle: 'Pacientes de clínica' }}
        />
        <Stack.Screen
          name="ClinicAgenda"
          component={ClinicAgendaRoute}
          options={{ headerTitle: 'Agenda de clínica' }}
        />
        <Stack.Screen
          name="ClinicBilling"
          component={ClinicBillingRoute}
          options={{ headerTitle: 'Facturación de clínica' }}
        />
        <Stack.Screen
          name="ClinicInvoiceCreate"
          component={ClinicInvoiceCreateRoute}
          options={{ headerTitle: 'Nueva factura de clínica' }}
        />
        <Stack.Screen
          name="AdminPanel"
          component={AdminPanelRoute}
          options={{ headerTitle: 'Panel de Admin' }}
        />
        <Stack.Screen
          name="AdminSpecialistDetail"
          component={AdminSpecialistDetailRoute}
          options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
        />
        <Stack.Screen
          name="SpecialistDetailAdmin"
          component={SpecialistDetailAdminRoute}
          options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
        />
        <Stack.Screen
          name="EmailSentVerification"
          component={EmailSentVerificationRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfessionalVerification"
          component={ProfessionalVerificationRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SpecialistDetail"
          component={SpecialistDetailRoute}
          options={{ headerTitle: 'Perfil del Especialista', headerShown: false }}
        />
        <Stack.Screen
          name="PublicSpecialistProfile"
          component={PublicSpecialistProfileRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PublicReview"
          component={PublicReviewRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicConsent"
          component={ClinicConsentRoute}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      key="client"
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={ClientHomeRoute}
        options={{ headerTitle: 'HERA' }}
      />
      <Stack.Screen
        name="Specialists"
        component={SpecialistsRoute}
        options={{ headerTitle: 'Especialistas' }}
      />
      <Stack.Screen
        name="SpecialistDetail"
        component={SpecialistDetailRoute}
        options={{
          headerTitle: 'Perfil del Especialista',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingRoute}
        options={{
          headerTitle: 'Reservar Sesión',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Sessions"
        component={SessionsRoute}
        options={{ headerTitle: 'Mis Sesiones' }}
      />
      <Stack.Screen
        name="OnDutyPsychologist"
        component={OnDutyPsychologistRoute}
        options={{ headerTitle: 'Psicólogo de Guardia' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileRoute}
        options={{ headerTitle: 'Mi Perfil' }}
      />
      <Stack.Screen
        name="ProfileCompletion"
        component={ProfileCompletionRoute}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireRoute}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="QuestionnaireResults"
        component={QuestionnaireResultsRoute}
        options={{ headerTitle: 'Tus Resultados' }}
      />
      <Stack.Screen
        name="AdminPanel"
        component={AdminPanelRoute}
        options={{ headerTitle: 'Panel de Admin' }}
      />
      <Stack.Screen
        name="AdminSpecialistDetail"
        component={AdminSpecialistDetailRoute}
        options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
      />
      <Stack.Screen
        name="SpecialistDetailAdmin"
        component={SpecialistDetailAdminRoute}
        options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
      />
      <Stack.Screen
        name="EmailSentVerification"
        component={EmailSentVerificationRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PublicSpecialistProfile"
        component={PublicSpecialistProfileRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PublicSpecialists"
        component={PublicSpecialistsRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PublicReview"
        component={PublicReviewRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClinicalConsent"
        component={ClinicalConsentRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClinicConsent"
        component={ClinicConsentRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  legalErrorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  legalErrorCard: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    gap: 16,
  },
  legalErrorTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  legalErrorText: {
    fontSize: 15,
    lineHeight: 23,
  },
});
