import React from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { RootStackParamList } from '../../constants/types';
import type { LegalAcceptanceStatus } from '../../services/legalService';
import { RootNavigator } from '../RootNavigator';

type MockAuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean;
  legalStatusSnapshot: LegalAcceptanceStatus | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    type: 'client' | 'professional' | 'clinic';
  } | null;
  verificationSubmitted: boolean | null;
};

let mockAuthState: MockAuthState = {
  isAuthenticated: false,
  isInitialized: true,
  legalStatusSnapshot: null,
  user: null,
  verificationSubmitted: null,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../../services/legalService', () => ({
  getLegalStatus: jest.fn().mockResolvedValue({ requiresAcceptance: false }),
}));

jest.mock('../../services/pendingBookingIntentService', () => ({
  clearPendingBookingIntent: jest.fn().mockResolvedValue(undefined),
  consumePendingBookingIntent: jest.fn().mockResolvedValue(null),
  mapPendingIntentToBookingParams: jest.fn(),
}));

jest.mock('../../screens/landing', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { LandingPage: () => ReactModule.createElement(Text, null, 'Landing pública') };
});

jest.mock('../../screens/specialists/PublicSpecialistsScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { PublicSpecialistsScreen: () => ReactModule.createElement(Text, null, 'Directorio público') };
});

jest.mock('../../screens/auth/WelcomeScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { WelcomeScreen: () => ReactModule.createElement(Text, null, 'Elegir acceso') };
});

jest.mock('../../screens/auth/LoginScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { LoginScreen: () => ReactModule.createElement(Text, null, 'Formulario de acceso') };
});

jest.mock('../../screens/professional/ProfessionalHomeScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { ProfessionalHomeScreen: () => ReactModule.createElement(Text, null, 'Inicio profesional') };
});

jest.mock('../../screens/home/HomeScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { default: () => ReactModule.createElement(Text, null, 'Inicio de paciente') };
});

jest.mock('../../screens/clinic/ClinicDashboardScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return { ClinicDashboardScreen: () => ReactModule.createElement(Text, null, 'Inicio de clínica') };
});

jest.mock('../../components/navigation/MainLayout', () => {
  const ReactModule = require('react');
  return {
    MainLayout: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

describe('post-login routing', () => {
  beforeEach(() => {
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: true,
      legalStatusSnapshot: null,
      user: null,
      verificationSubmitted: null,
    };
  });

  it.each([
    ['professional', 'Inicio profesional', false],
    ['client', 'Inicio de paciente', false],
    ['clinic', 'Inicio de clínica', false],
    ['professional', 'Inicio profesional', true],
    ['client', 'Inicio de paciente', true],
    ['clinic', 'Inicio de clínica', true],
  ] as const)('opens %s workspace (%s) after directory login with legal snapshot: %s', async (userType, expectedScreen, hasLegalSnapshot) => {
    const navigationRef = createNavigationContainerRef<RootStackParamList>();
    const view = render(
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    );

    await waitFor(() => expect(navigationRef.isReady()).toBe(true));
    act(() => navigationRef.navigate('PublicSpecialists'));
    await waitFor(() => expect(screen.getByText('Directorio público')).toBeTruthy());
    act(() => navigationRef.navigate('Welcome'));
    const loginUserTypes = { client: 'CLIENT', professional: 'PROFESSIONAL', clinic: 'CLINIC' } as const;
    act(() => navigationRef.navigate('Login', { userType: loginUserTypes[userType] }));
    await waitFor(() => expect(screen.getByText('Formulario de acceso')).toBeTruthy());

    mockAuthState = {
      isAuthenticated: true,
      isInitialized: true,
      legalStatusSnapshot: hasLegalSnapshot ? {
        documents: [],
        requiredDocumentKeys: [],
        acceptedDocuments: [],
        missingDocumentKeys: [],
        requiresAcceptance: false,
      } : null,
      user: {
        id: `${userType}-1`,
        email: `${userType}@hera.test`,
        emailVerified: true,
        type: userType,
      },
      verificationSubmitted: true,
    };
    view.rerender(
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    );

    await waitFor(() => expect(screen.getByText(expectedScreen)).toBeTruthy());
    expect(screen.queryByText('Directorio público')).toBeNull();
    expect(navigationRef.canGoBack()).toBe(false);

    // The public directory remains available when intentionally opened while signed in.
    act(() => navigationRef.navigate('PublicSpecialists'));
    await waitFor(() => expect(screen.getByText('Directorio público')).toBeTruthy());
    act(() => navigationRef.goBack());
    await waitFor(() => expect(screen.getByText(expectedScreen)).toBeTruthy());

    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    };
    view.rerender(
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    );
    await waitFor(() => expect(screen.getByText('Landing pública')).toBeTruthy());
    expect(navigationRef.canGoBack()).toBe(false);
  });
});
