import React from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { acceptLegalDocuments, getLegalStatus } from '../../services/legalService';
import { notifyLegalUpdate } from '../../services/legalEvents';
import { LEGAL_DOCUMENTS } from '../../constants/legal';
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

// This suite exercises navigation; workspace data loading has its own tests.
jest.mock('../../contexts/ProfessionalWorkspaceContext', () => ({
  ProfessionalWorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../contexts/ProfessionalClinicWorkspaceContext', () => ({
  ProfessionalClinicWorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../services/heraCommissionService', () => ({
  configuration: jest.fn().mockResolvedValue({ mode: 'OFF', terms: null, canAccept: false, accounts: [], scale: [2000, 1000, 1000, 500] }),
}));

jest.mock('../../services/legalService', () => ({
  getLegalStatus: jest.fn().mockResolvedValue({ requiresAcceptance: false }),
  acceptLegalDocuments: jest.fn(),
}));

jest.mock('../../services/googleCalendarService', () => ({ disconnectGoogleCalendar: jest.fn() }));

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
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: true,
      legalStatusSnapshot: null,
      user: null,
      verificationSubmitted: null,
    };
  });

  it('persists acceptance across refresh and remount, ignores stale reads, and prompts for a new version', async () => {
    const doc = LEGAL_DOCUMENTS.TERMS_OF_SERVICE;
    const pending: LegalAcceptanceStatus = { documents: [{ ...doc, publicPath: doc.routePath }], requiredDocumentKeys: ['TERMS_OF_SERVICE'], acceptedDocuments: [], missingDocumentKeys: ['TERMS_OF_SERVICE'], requiresAcceptance: true };
    const accepted: LegalAcceptanceStatus = { ...pending, missingDocumentKeys: [], requiresAcceptance: false, acceptedDocuments: [{ documentKey: doc.key, version: doc.version, acceptedAt: '2026-09-20T12:00:00Z', source: 'required-gate' }] };
    mockAuthState = { isAuthenticated: true, isInitialized: true, legalStatusSnapshot: pending, user: { id: 'client-1', email: 'client@hera.test', emailVerified: true, type: 'client' }, verificationSubmitted: null };
    jest.mocked(acceptLegalDocuments).mockResolvedValue(accepted);
    let resolveStale: (value: LegalAcceptanceStatus) => void = () => { throw new Error('Request not started'); };
    jest.mocked(getLegalStatus).mockImplementationOnce(() => new Promise(resolve => { resolveStale = resolve; }));
    const view = render(<NavigationContainer><RootNavigator /></NavigationContainer>);
    await screen.findByText('Antes de continuar');
    fireEvent.press(screen.getByRole('checkbox'));
    act(() => notifyLegalUpdate());
    fireEvent.press(screen.getByText('Aceptar y continuar'));
    await screen.findByText('Inicio de paciente');
    await act(async () => { resolveStale(pending); });
    expect(screen.queryByText('Antes de continuar')).toBeNull();
    jest.mocked(getLegalStatus).mockResolvedValue(accepted);
    act(() => notifyLegalUpdate());
    await waitFor(() => expect(screen.getByText('Inicio de paciente')).toBeTruthy());
    expect(acceptLegalDocuments).toHaveBeenCalledTimes(1);
    view.unmount();
    mockAuthState.legalStatusSnapshot = null;
    render(<NavigationContainer><RootNavigator /></NavigationContainer>);
    await screen.findByText('Inicio de paciente');
    expect(screen.queryByText('Antes de continuar')).toBeNull();
    jest.mocked(getLegalStatus).mockResolvedValue({ ...pending, documents: [{ ...pending.documents[0], version: '2026-10-01' }] });
    act(() => notifyLegalUpdate());
    await screen.findByText('Antes de continuar');
    expect(screen.getByText('Versión 2026-10-01')).toBeTruthy();
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
    jest.mocked(getLegalStatus).mockResolvedValue(accepted);
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
