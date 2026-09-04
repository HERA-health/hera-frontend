import React from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../contexts/AuthContext';
import * as authService from '../../services/authService';
import { initializeAuth } from '../../services/api';
import { RootNavigator } from '../RootNavigator';
import type { RootStackParamList } from '../../constants/types';

jest.mock('../../services/api', () => ({
  initializeAuth: jest.fn(),
  registerSessionExpiredHandler: jest.fn(),
}));
jest.mock('../../services/authService', () => ({
  register: jest.fn(), login: jest.fn(), logout: jest.fn(), getCurrentUser: jest.fn(),
  updateUnverifiedProfessionalEmail: jest.fn(), resendVerificationEmail: jest.fn(),
  verifyEmail: jest.fn(),
}));
jest.mock('../../services/professionalService', () => ({ getVerificationStatus: jest.fn() }));
jest.mock('../../services/analyticsService', () => ({ identify: jest.fn(), reset: jest.fn() }));
jest.mock('../../services/secureSessionStorage', () => ({ clearPersistedClinicalAccessSession: jest.fn() }));
jest.mock('../../services/requestCache', () => ({ rotateRequestCacheScope: jest.fn() }));
jest.mock('../../services/legalService', () => ({
  getLegalStatus: jest.fn().mockResolvedValue({ requiresAcceptance: false }),
}));
jest.mock('../../services/pendingBookingIntentService', () => ({ clearPendingBookingIntent: jest.fn() }));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../constants/theme').lightTheme, isDark: false }),
}));
jest.mock('../../components/navigation/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../screens/landing', () => {
  const ReactModule = require('react');
  const { Text, View } = require('react-native');
  const { useAuth } = require('../../contexts/AuthContext') as typeof import('../../contexts/AuthContext');
  return { LandingPage: () => {
    const { register, login } = useAuth();
    return ReactModule.createElement(View, null,
      ReactModule.createElement(Text, { onPress: () => void register('old@example.test', 'Password1!', 'Professional', 'professional', []) }, 'Crear cuenta de prueba'),
      ReactModule.createElement(Text, { onPress: () => void login('old@example.test', 'Password1!') }, 'Entrar en cuenta de prueba'),
    );
  }};
});
jest.mock('../../screens/professional/ProfessionalHomeScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  const { useAuth } = require('../../contexts/AuthContext') as typeof import('../../contexts/AuthContext');
  return { ProfessionalHomeScreen: () => {
    const { refreshCurrentUser } = useAuth();
    return ReactModule.createElement(Text, { onPress: () => void refreshCurrentUser() }, 'Actualizar cuenta profesional');
  }};
});
jest.mock('../../screens/auth/ProfessionalVerificationScreen', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  const { useAuth } = require('../../contexts/AuthContext') as typeof import('../../contexts/AuthContext');
  return { ProfessionalVerificationScreen: () => {
    const { markVerificationSubmitted } = useAuth();
    return ReactModule.createElement(Text, { onPress: markVerificationSubmitted }, 'Formulario de carnet');
  }};
});

const professional: authService.AuthResponse['user'] = {
  id: 'professional-1', email: 'old@example.test', name: 'Professional',
  userType: 'PROFESSIONAL', emailVerified: false,
  specialist: { verificationStatus: 'PENDING', verificationSubmittedAt: null },
};

const renderFlow = () => render(<AuthProvider><NavigationContainer><RootNavigator /></NavigationContainer></AuthProvider>);
const registerProfessional = async (sent = true) => {
  jest.mocked(authService.register).mockResolvedValue({
    token: 'token', refreshToken: 'refresh', user: professional, verificationEmailSent: sent,
  });
  renderFlow();
  await waitFor(() => expect(screen.getByText('Crear cuenta de prueba')).toBeTruthy());
  fireEvent.press(screen.getByText('Crear cuenta de prueba'));
  await waitFor(() => expect(screen.getByText('Confirma tu correo antes de continuar')).toBeTruthy());
};

describe('professional verification flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(initializeAuth).mockResolvedValue(null);
    jest.mocked(authService.getCurrentUser).mockResolvedValue(professional);
    jest.mocked(authService.resendVerificationEmail).mockResolvedValue({ success: true, message: 'Correo reenviado' });
  });

  it('reports failed registration delivery and allows recovery through resend', async () => {
    await registerProfessional(false);
    expect(screen.getByText(/Tu cuenta está creada, pero no hemos podido enviar/)).toBeTruthy();
    expect(screen.queryByText('Enlace enviado a')).toBeNull();
    fireEvent.press(screen.getByText('Reenviar enlace'));
    await waitFor(() => expect(screen.getByText('Email enviado. Revisa tu bandeja de entrada.')).toBeTruthy());
    expect(screen.queryByText(/Tu cuenta está creada, pero no hemos podido enviar/)).toBeNull();
    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('old@example.test');
  });

  it.each([true, false])('preserves correction feedback and resend availability when delivery is %s', async (sent) => {
    await registerProfessional();
    jest.mocked(authService.updateUnverifiedProfessionalEmail).mockResolvedValue({
      email: 'new@example.test', verificationEmailSent: sent,
    });
    fireEvent.press(screen.getByText('Corregir email'));
    fireEvent.changeText(screen.getByDisplayValue('old@example.test'), '  NEW@Example.test  ');
    fireEvent.press(screen.getByText('Guardar y enviar'));
    await waitFor(() => expect(screen.getByText('new@example.test')).toBeTruthy());
    expect(authService.updateUnverifiedProfessionalEmail).toHaveBeenCalledWith('new@example.test');
    if (sent) {
      expect(screen.getByText('Correo actualizado. Te hemos enviado un enlace nuevo.')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reenviar en/ })).toBeDisabled();
    } else {
      expect(screen.getByText(/Correo actualizado, pero no hemos podido enviar/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reenviar enlace/ })).not.toBeDisabled();
      fireEvent.press(screen.getByText('Reenviar enlace'));
      await waitFor(() => expect(authService.resendVerificationEmail).toHaveBeenCalledWith('new@example.test'));
    }
  });

  it('prevents resending to the previous address during a correction', async () => {
    await registerProfessional();
    let completeCorrection: ((result: authService.UpdateUnverifiedEmailResult) => void) | undefined;
    jest.mocked(authService.updateUnverifiedProfessionalEmail).mockReturnValue(new Promise((resolve) => { completeCorrection = resolve; }));
    fireEvent.press(screen.getByText('Corregir email'));
    fireEvent.changeText(screen.getByDisplayValue('old@example.test'), 'new@example.test');
    fireEvent.press(screen.getByText('Guardar y enviar'));
    expect(screen.getByRole('button', { name: /Reenviar enlace/ })).toBeDisabled();
    fireEvent.press(screen.getByText('Reenviar enlace'));
    expect(authService.resendVerificationEmail).not.toHaveBeenCalled();
    await act(async () => { completeCorrection?.({ email: 'new@example.test', verificationEmailSent: true }); });
  });

  it('keeps the entered address when correction fails', async () => {
    await registerProfessional();
    jest.mocked(authService.updateUnverifiedProfessionalEmail).mockRejectedValue(new Error('Este email ya está registrado'));
    fireEvent.press(screen.getByText('Corregir email'));
    fireEvent.changeText(screen.getByDisplayValue('old@example.test'), 'taken@example.test');
    fireEvent.press(screen.getByText('Guardar y enviar'));
    await waitFor(() => expect(screen.getByText('Este email ya está registrado')).toBeTruthy());
    expect(screen.getByDisplayValue('taken@example.test')).toBeTruthy();
    expect(screen.getByText('old@example.test')).toBeTruthy();
  });

  it('opens documents only after verifying email and then permits the pending workspace', async () => {
    await registerProfessional();
    expect(screen.queryByText('Formulario de carnet')).toBeNull();
    jest.mocked(authService.getCurrentUser).mockResolvedValue({ ...professional, emailVerified: true });
    fireEvent.press(screen.getByText('Ya lo he verificado'));
    await waitFor(() => expect(screen.getByText('Formulario de carnet')).toBeTruthy());
    fireEvent.press(screen.getByText('Formulario de carnet'));
    await waitFor(() => expect(screen.getByText('Actualizar cuenta profesional')).toBeTruthy());
  });

  it('opens the resubmission form when a rejection is refreshed during an open session', async () => {
    const pendingUser: authService.AuthResponse['user'] = {
      ...professional, emailVerified: true,
      specialist: { verificationStatus: 'PENDING', verificationSubmittedAt: '2026-09-04T10:00:00Z' },
    };
    jest.mocked(authService.login).mockResolvedValue({ token: 'token', refreshToken: 'refresh', user: pendingUser });
    jest.mocked(authService.getCurrentUser).mockResolvedValue(pendingUser);
    renderFlow();
    await waitFor(() => expect(screen.getByText('Entrar en cuenta de prueba')).toBeTruthy());
    fireEvent.press(screen.getByText('Entrar en cuenta de prueba'));
    await waitFor(() => expect(screen.getByText('Actualizar cuenta profesional')).toBeTruthy());
    jest.mocked(authService.getCurrentUser).mockResolvedValue({
      ...pendingUser, specialist: { ...pendingUser.specialist, verificationStatus: 'REJECTED' },
    });
    fireEvent.press(screen.getByText('Actualizar cuenta profesional'));
    await waitFor(() => expect(screen.getByText('Formulario de carnet')).toBeTruthy());
    expect(screen.queryByText('Actualizar cuenta profesional')).toBeNull();
  });

  it('continues from a verification link to the workspace when documents are already pending', async () => {
    const pendingUser: authService.AuthResponse['user'] = {
      ...professional, emailVerified: true,
      specialist: { verificationStatus: 'PENDING', verificationSubmittedAt: '2026-09-04T10:00:00Z' },
    };
    jest.mocked(authService.getCurrentUser).mockResolvedValue(pendingUser);
    jest.mocked(initializeAuth).mockResolvedValue({ token: 'token', user: pendingUser, legalStatus: null });
    jest.mocked(authService.verifyEmail).mockResolvedValue({ success: true, message: 'Correo verificado', userType: 'PROFESSIONAL' });
    const navigationRef = createNavigationContainerRef<RootStackParamList>();
    const unhandledAction = jest.fn();
    render(<AuthProvider><NavigationContainer ref={navigationRef} onUnhandledAction={unhandledAction}><RootNavigator /></NavigationContainer></AuthProvider>);
    await waitFor(() => expect(screen.getByText('Actualizar cuenta profesional')).toBeTruthy());
    act(() => navigationRef.navigate('EmailVerification', { token: 'pending-professional-link' }));
    await waitFor(() => expect(screen.getByText('Comenzar')).toBeTruthy());
    fireEvent.press(screen.getByText('Comenzar'));
    await waitFor(() => expect(navigationRef.getCurrentRoute()?.name).toBe('ProfessionalHome'));
    expect(unhandledAction).not.toHaveBeenCalled();
  });
});
