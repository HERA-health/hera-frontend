import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from '../constants/types';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import { LandingPage } from '../screens/landing';
import {
  createDeferredComponent,
  type DeferredComponentModule,
} from '../utils/createDeferredComponent';

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

export function RootNavigator() {
  const { isAuthenticated, isInitialized, user, verificationSubmitted } = useAuth();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Landing" component={LandingPage} />
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
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  const isProfessional = user?.type === 'professional';

  if (isProfessional && verificationSubmitted === false) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (isProfessional) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
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
          name="ClinicalConsent"
          component={ClinicalConsentRoute}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeRoute}
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
        name="ClinicalConsent"
        component={ClinicalConsentRoute}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
