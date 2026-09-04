import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useProfileCompletion } from '../../../contexts/ProfileCompletionContext';
import { ProfessionalVerificationScreen } from '../ProfessionalVerificationScreen';
import * as professionalService from '../../../services/professionalService';
import * as ImagePicker from 'expo-image-picker';

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

jest.mock('../../../contexts/ProfileCompletionContext', () => ({
  useProfileCompletion: jest.fn(),
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
  getVerificationStatus: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {
    Images: 'Images',
  },
  PermissionStatus: {
    GRANTED: 'granted',
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
const mockedUseProfileCompletion = jest.mocked(useProfileCompletion);

describe('ProfessionalVerificationScreen', () => {
  const logout = jest.fn();
  const markVerificationSubmitted = jest.fn();
  const refreshCurrentUser = jest.fn();
  const refreshCompletion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    logout.mockResolvedValue(undefined);
    refreshCurrentUser.mockResolvedValue(null);
    refreshCompletion.mockResolvedValue(undefined);
    jest.mocked(professionalService.getVerificationStatus).mockResolvedValue({
      verificationStatus: 'NOT_SUBMITTED',
    });

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

    mockedUseProfileCompletion.mockReturnValue({
      snapshot: null,
      loading: false,
      status: 'ready',
      error: null,
      refresh: refreshCompletion,
      setClinicScope: jest.fn(),
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
      markVerificationSubmitted,
      login: jest.fn(),
      authenticateWithGoogle: jest.fn(),
      register: jest.fn(),
      logout,
      setUserType: jest.fn(),
      updateUser: jest.fn(),
      refreshCurrentUser,
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

  it('leaves the form state immediately after a successful submission and refreshes canonical status', async () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      user: {
        id: 'professional-1',
        name: 'Lucía',
        email: 'lucia@hera.test',
        type: 'professional',
        emailVerified: true,
      },
    });
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      status: ImagePicker.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file:///colegiado.png',
        width: 1200,
        height: 800,
        type: 'image',
        mimeType: 'image/png',
        fileName: 'colegiado.png',
      }],
    });
    jest.mocked(professionalService.submitVerification).mockResolvedValue({
      success: true,
      message: 'Datos de verificación enviados correctamente',
      data: { verificationStatus: 'PENDING' },
    });

    render(<ProfessionalVerificationScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Ej: M-12345'), 'M-12345');
    fireEvent.press(screen.getByText('Toca para subir foto del carnet de colegiado'));
    const imageAlertButtons = mockedShowAppAlert.mock.calls[0]?.[3];
    await act(async () => {
      imageAlertButtons?.find((button) => button.text === 'Elegir de galería')?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('Cambiar foto')).toBeTruthy());
    fireEvent.press(screen.getByText(/Acepto que HERA procese/));
    fireEvent.press(screen.getByText('Enviar para verificación'));

    await waitFor(() => {
      expect(markVerificationSubmitted).toHaveBeenCalledTimes(1);
      expect(refreshCurrentUser).toHaveBeenCalledTimes(1);
      expect(refreshCompletion).toHaveBeenCalledTimes(1);
    });
  });
});
