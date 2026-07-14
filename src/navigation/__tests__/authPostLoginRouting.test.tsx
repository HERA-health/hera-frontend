import React from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { RootStackParamList } from '../../constants/types';
import { RootNavigator } from '../RootNavigator';

type MockAuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean;
  legalStatusSnapshot: null;
  user: { type: 'client' | 'professional' | 'clinic' } | null;
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
    ['professional', 'Inicio profesional'],
    ['client', 'Inicio de paciente'],
    ['clinic', 'Inicio de clínica'],
  ] as const)('opens %s workspace after signing in from the public directory', async (userType, expectedScreen) => {
    const navigationRef = createNavigationContainerRef<RootStackParamList>();
    const view = render(
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    );

    await waitFor(() => expect(navigationRef.isReady()).toBe(true));
    act(() => navigationRef.navigate('PublicSpecialists'));
    await waitFor(() => expect(screen.getByText('Directorio público')).toBeTruthy());

    mockAuthState = {
      isAuthenticated: true,
      isInitialized: true,
      legalStatusSnapshot: null,
      user: { type: userType },
      verificationSubmitted: true,
    };
    view.rerender(
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    );

    await waitFor(() => expect(screen.getByText(expectedScreen)).toBeTruthy());
    expect(screen.queryByText('Directorio público')).toBeNull();
  });
});
