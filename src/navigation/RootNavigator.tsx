import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../constants/types';
import { MainLayout } from '../components/navigation/MainLayout';
import { useAuth } from '../contexts/AuthContext';

// Loading screen
import LoadingScreen from '../screens/LoadingScreen';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Main screens
import HomeScreen from '../screens/home/HomeScreen';
import SpecialistsScreen from '../screens/specialists/SpecialistsScreen';
import { SpecialistDetailScreen } from '../screens/specialists/SpecialistDetailScreen';
import SessionsScreen from '../screens/sessions/SessionsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileCompletionScreen from '../screens/profile/ProfileCompletionScreen';

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
import { ClientProfileScreen } from '../screens/professional/ClientProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isInitialized, user } = useAuth();

  // Show loading screen while checking authentication
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Show auth flow
    return (
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // Show main app based on user type
  const isProfessional = user?.type === 'professional' || user?.userType === 'PROFESSIONAL';

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
          name="ProfessionalProfile"
          options={{ headerTitle: 'Editar Perfil' }}
        >
          {() => (
            <MainLayout>
              <ProfessionalProfileEditorScreen />
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
        options={{ headerTitle: 'MindConnect' }}
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
        component={QuestionnaireScreen}
        options={{
          headerShown: false,
        }}
      />
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
    </Stack.Navigator>
  );
}
