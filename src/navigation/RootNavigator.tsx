import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../constants/types';
import { MainLayout } from '../components/navigation/MainLayout';
import { useAuth } from '../contexts/AuthContext';

// Loading screen
import LoadingScreen from '../screens/LoadingScreen';

// Landing page
import { LandingPage } from '../screens/landing';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { EmailSentVerificationScreen } from '../screens/auth/EmailSentVerificationScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { EmailSentPasswordResetScreen } from '../screens/auth/EmailSentPasswordResetScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { ProfessionalVerificationScreen } from '../screens/auth/ProfessionalVerificationScreen';

// Main screens
import HomeScreen from '../screens/home/HomeScreen';
import SpecialistsScreen from '../screens/specialists/SpecialistsScreen';
import { SpecialistDetailScreen } from '../screens/specialists/SpecialistDetailScreen';
import SessionsScreen from '../screens/sessions/SessionsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileCompletionScreen from '../screens/profile/ProfileCompletionScreen';
import { BookingScreen } from '../screens/booking/BookingScreen';

// Questionnaire screens
import { QuestionnaireScreen } from '../screens/questionnaire/QuestionnaireScreen';
import { QuestionnaireResultsScreen } from '../screens/questionnaire/QuestionnaireResultsScreen';

// On-Duty screens
import { OnDutyPsychologistScreen } from '../screens/onduty/OnDutyPsychologistScreen';

// Professional screens
import { ProfessionalHomeScreen } from '../screens/professional/ProfessionalHomeScreen';
import { ProfessionalClientsScreen } from '../screens/professional/ProfessionalClientsScreen';
import { ProfessionalSessionsScreen } from '../screens/professional/ProfessionalSessionsScreen';
import { ProfessionalProfileEditorScreen } from '../screens/professional/ProfessionalProfileEditorScreen';
import { SpecialistProfileScreen } from '../screens/professional/SpecialistProfileScreen';
import { ProfessionalAvailabilityScreen } from '../screens/professional/ProfessionalAvailabilityScreen';
import { BillingScreen } from '../screens/professional/BillingScreen';
import { DashboardScreen } from '../screens/professional/DashboardScreen';
import { CreateInvoiceScreen } from '../screens/professional/CreateInvoiceScreen';
import { ClientProfileScreen } from '../screens/professional/ClientProfileScreen';

// Admin screens
import { AdminPanelTabbedScreen } from '../screens/admin/AdminPanelTabbedScreen';
import { AdminSpecialistDetailScreen } from '../screens/admin/AdminSpecialistDetailScreen';
import { SpecialistDetailAdminScreen } from '../screens/admin/SpecialistDetailAdminScreen';

// Public screens
import { PublicSpecialistProfileScreen } from '../screens/specialists/PublicSpecialistProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isInitialized, user, verificationSubmitted } = useAuth();

  // Show loading screen while checking authentication
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Show landing/auth flow
    return (
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="EmailSentVerification" component={EmailSentVerificationScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="EmailSentPasswordReset" component={EmailSentPasswordResetScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="ProfessionalVerification" component={ProfessionalVerificationScreen} />
        <Stack.Screen name="PublicSpecialistProfile" component={PublicSpecialistProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // Show main app based on user type
  const isProfessional = user?.type === 'professional';

  // VERIFICATION GATE: If a professional has NOT submitted verification data,
  // lock them into the verification screen. No way to bypass this.
  if (isProfessional && verificationSubmitted === false) {
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="ProfessionalVerification"
          component={ProfessionalVerificationScreen}
        />
        <Stack.Screen
          name="EmailSentVerification"
          component={EmailSentVerificationScreen}
        />
        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
        />
        <Stack.Screen name="PublicSpecialistProfile" component={PublicSpecialistProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // Professional experience
  if (isProfessional) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="ProfessionalHome"
          options={{ headerTitle: 'Panel Profesional' }}
        >
          {() => (
            <MainLayout>
              <ProfessionalHomeScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalDashboard"
          options={{ headerTitle: 'Dashboard' }}
        >
          {() => (
            <MainLayout>
              <DashboardScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalClients"
          options={{ headerTitle: 'Mis Clientes' }}
        >
          {() => (
            <MainLayout>
              <ProfessionalClientsScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalSessions"
          options={{ headerTitle: 'Sesiones' }}
        >
          {() => (
            <MainLayout>
              <ProfessionalSessionsScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalBilling"
          options={{ headerTitle: 'Facturación' }}
        >
          {() => (
            <MainLayout>
              <BillingScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="CreateInvoice"
          options={{ headerTitle: 'Nueva Factura' }}
        >
          {({ route, navigation }) => (
            <MainLayout>
              <CreateInvoiceScreen route={route} navigation={navigation} />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalProfile"
          options={{ headerTitle: 'Mi Perfil Profesional' }}
        >
          {() => (
            <MainLayout>
              <SpecialistProfileScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfessionalAvailability"
          options={{
            headerTitle: 'Mi Disponibilidad',
            headerShown: false,
          }}
        >
          {({ navigation }) => (
            <MainLayout>
              <ProfessionalAvailabilityScreen navigation={navigation} />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ClientProfile"
          options={{
            headerTitle: 'Perfil del Cliente',
            headerShown: false,
          }}
        >
          {({ route, navigation }) => (
            <MainLayout>
              <ClientProfileScreen route={route} navigation={navigation} />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="AdminPanel"
          options={{ headerTitle: 'Panel de Admin' }}
        >
          {() => (
            <MainLayout>
              <AdminPanelTabbedScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="AdminSpecialistDetail"
          options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
        >
          {() => (
            <MainLayout>
              <AdminSpecialistDetailScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="SpecialistDetailAdmin"
          options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
        >
          {({ route, navigation }) => (
            <MainLayout>
              <SpecialistDetailAdminScreen route={route} navigation={navigation} />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="EmailSentVerification"
          component={EmailSentVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfessionalVerification"
          component={ProfessionalVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SpecialistDetail"
          options={{ headerTitle: 'Perfil del Especialista', headerShown: false }}
        >
          {({ route, navigation }) => (
            <MainLayout>
              <SpecialistDetailScreen route={route} navigation={navigation} />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="PublicSpecialistProfile" component={PublicSpecialistProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // Client experience (default)
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Home"
        options={{ headerTitle: 'HERA' }}
      >
        {() => (
          <MainLayout>
            <HomeScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Specialists"
        options={{ headerTitle: 'Especialistas' }}
      >
        {() => (
          <MainLayout>
            <SpecialistsScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="SpecialistDetail"
        options={{
          headerTitle: 'Perfil del Especialista',
          headerShown: false,
        }}
      >
        {({ route, navigation }) => (
          <MainLayout>
            <SpecialistDetailScreen route={route} navigation={navigation} />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Booking"
        options={{
          headerTitle: 'Reservar Sesión',
          headerShown: false,
        }}
      >
        {({ route, navigation }) => (
          <MainLayout>
            <BookingScreen route={route} navigation={navigation} />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Sessions"
        options={{ headerTitle: 'Mis Sesiones' }}
      >
        {() => (
          <MainLayout>
            <SessionsScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="OnDutyPsychologist"
        options={{ headerTitle: 'Psicólogo de Guardia' }}
      >
        {() => (
          <MainLayout>
            <OnDutyPsychologistScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Profile"
        options={{ headerTitle: 'Mi Perfil' }}
      >
        {() => (
          <MainLayout>
            <ProfileScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ProfileCompletion"
        component={ProfileCompletionScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Questionnaire"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          <MainLayout>
            <QuestionnaireScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="QuestionnaireResults"
        options={{ headerTitle: 'Tus Resultados' }}
      >
        {() => (
          <MainLayout>
            <QuestionnaireResultsScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AdminPanel"
        options={{ headerTitle: 'Panel de Admin' }}
      >
        {() => (
          <MainLayout>
            <AdminPanelTabbedScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AdminSpecialistDetail"
        options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
      >
        {() => (
          <MainLayout>
            <AdminSpecialistDetailScreen />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="SpecialistDetailAdmin"
        options={{ headerTitle: 'Detalle del Especialista', headerShown: false }}
      >
        {({ route, navigation }) => (
          <MainLayout>
            <SpecialistDetailAdminScreen route={route} navigation={navigation} />
          </MainLayout>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="EmailSentVerification"
        component={EmailSentVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PublicSpecialistProfile" component={PublicSpecialistProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
