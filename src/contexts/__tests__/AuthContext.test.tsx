jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  initializeAuth: jest.fn(),
  registerSessionExpiredHandler: jest.fn(),
  setAuthSession: jest.fn(),
  logoutServerSession: jest.fn(),
}));

jest.mock('../../services/professionalService', () => ({
  getVerificationStatus: jest.fn(),
}));

jest.mock('../../services/authService', () => ({
  authenticateWithGoogle: jest.fn(),
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}));

jest.mock('../../services/analyticsService', () => ({
  identify: jest.fn(),
  reset: jest.fn(),
}));

jest.mock('../../services/secureSessionStorage', () => ({
  clearPersistedClinicalAccessSession: jest.fn(),
}));

jest.mock('../../services/specialistsService', () => ({
  invalidateSpecialistsCache: jest.fn(),
}));

jest.mock('../../services/requestCache', () => ({
  rotateRequestCacheScope: jest.fn(),
}));

import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { initializeAuth } from '../../services/api';
import { rotateRequestCacheScope } from '../../services/requestCache';
import * as authService from '../../services/authService';
import {
  AuthProvider,
  deriveKnownVerificationSubmission,
  mapAuthUser,
  mapBackendUserType,
  useAuth,
} from '../AuthContext';
import type { AuthResponse } from '../../services/authService';

describe('AuthContext user type mapping', () => {
  it('maps backend clinic users to the clinic frontend type', () => {
    expect(mapBackendUserType('CLINIC')).toBe('clinic');
  });

  it('does not map clinic auth responses as professionals', () => {
    const user: AuthResponse['user'] = {
      id: 'clinic-user',
      email: 'clinic@example.com',
      name: 'Clinica Demo',
      userType: 'CLINIC',
      emailVerified: true,
      isAdmin: false,
    };

    expect(mapAuthUser(user).type).toBe('clinic');
  });

  it('falls back to the verification endpoint when an older user response omits the submission date', () => {
    const user = mapAuthUser({
      id: 'professional-user',
      email: 'professional@example.com',
      name: 'Professional Example',
      userType: 'PROFESSIONAL',
      emailVerified: true,
      specialist: {
        verificationStatus: 'PENDING',
      },
    });

    expect(deriveKnownVerificationSubmission(user)).toBeNull();
  });

  it('distinguishes a submitted request from a new professional explicitly', () => {
    const pendingUser = mapAuthUser({
      id: 'professional-user',
      email: 'professional@example.com',
      name: 'Professional Example',
      userType: 'PROFESSIONAL',
      emailVerified: true,
      specialist: {
        verificationStatus: 'PENDING',
        verificationSubmittedAt: '2026-09-04T19:30:39.242Z',
      },
    });
    const newUser = {
      ...pendingUser,
      specialist: {
        verificationStatus: 'PENDING' as const,
        verificationSubmittedAt: null,
      },
    };

    expect(deriveKnownVerificationSubmission(pendingUser)).toBe(true);
    expect(deriveKnownVerificationSubmission(newUser)).toBe(false);
  });
});

function AuthProbe(): React.ReactElement {
  const { isInitialized, logout, refreshCurrentUser, user } = useAuth();
  return (
    <>
      <Text>{isInitialized ? 'initialized' : 'initializing'}</Text>
      <Text testID="auth-user">{user?.id ?? 'guest'}</Text>
      <Text testID="refresh-user" onPress={() => { void refreshCurrentUser(); }}>refresh</Text>
      <Text testID="logout" onPress={() => { void logout(); }}>logout</Text>
    </>
  );
}

describe('AuthContext cache boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rotates the request cache when initialization confirms there is no session', async () => {
    jest.mocked(initializeAuth).mockResolvedValue(null);

    const screen = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('initialized')).toBeTruthy());
    expect(rotateRequestCacheScope).toHaveBeenCalledTimes(1);
  });

  it('ignores an account response that finishes after logout', async () => {
    let resolveUser!: (user: AuthResponse['user']) => void;
    jest.mocked(initializeAuth).mockResolvedValue(null);
    jest.mocked(authService.getCurrentUser).mockReturnValue(new Promise((resolve) => {
      resolveUser = resolve;
    }));
    jest.mocked(authService.logout).mockResolvedValue(undefined);

    const screen = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('initialized')).toBeTruthy());

    fireEvent.press(screen.getByTestId('refresh-user'));
    fireEvent.press(screen.getByTestId('logout'));
    await act(async () => {
      resolveUser({
        id: 'account-a',
        email: 'a@example.com',
        name: 'Account A',
        userType: 'CLIENT',
        emailVerified: true,
        isAdmin: false,
      });
      await Promise.resolve();
    });

    expect(screen.getByTestId('auth-user').props.children).toBe('guest');
  });
});
