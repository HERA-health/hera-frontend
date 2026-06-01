import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { ProfessionalVerificationScreen } from '../ProfessionalVerificationScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  track: jest.fn(),
  trackScreen: jest.fn(),
}));

jest.mock('../../../services/authService', () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock('../../../services/professionalService', () => ({
  submitVerification: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {
    Images: 'Images',
  },
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedShowAppAlert = jest.mocked(showAppAlert);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseTheme = jest.mocked(useTheme);

describe('ProfessionalVerificationScreen', () => {
  const logout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    logout.mockResolvedValue(undefined);

    mockedUseNavigation.mockReturnValue({
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);

    mockedUseAppAlert.mockReturnValue({} as ReturnType<typeof useAppAlert>);

    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'professional-1',
        name: 'Lucía',
        email: 'lucia@hera.test',
        type: 'professional',
        emailVerified: false,
      },
      isAuthenticated: true,
      isInitialized: true,
      loading: false,
      error: null,
      legalStatusSnapshot: null,
      verificationSubmitted: false,
      markVerificationSubmitted: jest.fn(),
      login: jest.fn(),
      authenticateWithGoogle: jest.fn(),
      register: jest.fn(),
      logout,
      setUserType: jest.fn(),
      updateUser: jest.fn(),
      refreshCurrentUser: jest.fn(),
      clearError: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders an explicit exit control for professionals', () => {
    render(<ProfessionalVerificationScreen />);

    expect(screen.getByText('Ahora no')).toBeTruthy();
    expect(screen.getByLabelText('Salir de la verificación profesional')).toBeTruthy();
  });

  it('logs out directly when the verification form is empty', async () => {
    render(<ProfessionalVerificationScreen />);

    fireEvent.press(screen.getByLabelText('Salir de la verificación profesional'));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalled();
  });

  it('asks for confirmation before leaving with unsent verification data', async () => {
    render(<ProfessionalVerificationScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Ej: M-12345'), 'M-12345');
    fireEvent.press(screen.getByLabelText('Salir de la verificación profesional'));

    expect(logout).not.toHaveBeenCalled();
    expect(mockedShowAppAlert).toHaveBeenCalledWith(
      expect.anything(),
      'Salir de la verificación',
      expect.stringContaining('no se guardarán'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Seguir aquí', style: 'cancel' }),
        expect.objectContaining({ text: 'Salir al inicio', style: 'destructive' }),
      ]),
      { cancelable: true }
    );

    const alertButtons = mockedShowAppAlert.mock.calls[0]?.[3];
    await act(async () => {
      alertButtons?.[1]?.onPress?.();
    });

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
