import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VerificationBanner } from '../VerificationBanner';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as authService from '../../../services/authService';
import { lightTheme } from '../../../constants/theme';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/authService', () => ({
  resendVerificationEmail: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('VerificationBanner', () => {
  const refreshCurrentUser = jest.fn();
  const buildAuthContextValue = (emailVerified?: boolean) => ({
    user: {
      id: 'user-1',
      name: 'Lucía',
      email: 'lucia@hera.com',
      type: 'client' as const,
      emailVerified,
    },
    isAuthenticated: true,
    isInitialized: true,
    loading: false,
    error: null,
    verificationSubmitted: null,
    markVerificationSubmitted: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    setUserType: jest.fn(),
    updateUser: jest.fn(),
    refreshCurrentUser,
    clearError: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });

    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue(buildAuthContextValue(false));
  });

  it('does not show the banner when emailVerified is undefined', async () => {
    mockedUseAuth.mockReturnValue(buildAuthContextValue(undefined));

    const { queryByText } = render(<VerificationBanner />);

    await waitFor(() => {
      expect(queryByText('Verifica tu email para acceso completo')).toBeNull();
    });
  });

  it('shows the banner only when emailVerified is explicitly false', async () => {
    const { getByText } = render(<VerificationBanner />);

    await waitFor(() => {
      expect(getByText('Verifica tu email para acceso completo')).toBeTruthy();
    });
  });

  it('refreshes the user and hides the banner when resend returns already verified', async () => {
    mockedAuthService.resendVerificationEmail.mockRejectedValue(
      new Error('Este correo ya ha sido verificado')
    );

    const { getByText, queryByText } = render(<VerificationBanner />);

    await waitFor(() => {
      expect(getByText('Verifica tu email para acceso completo')).toBeTruthy();
    });

    fireEvent.press(getByText('Verificar'));

    await waitFor(() => {
      expect(refreshCurrentUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(queryByText('Verifica tu email para acceso completo')).toBeNull();
    });
  });
});
