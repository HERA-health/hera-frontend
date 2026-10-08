import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import { lightTheme, darkTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { connectSession } from '../../../services/sessionPaymentService';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import ConnectAccount from '../ConnectAccount.web';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/sessionPaymentService', () => ({ connectSession: jest.fn() }));
jest.mock('../connectFonts', () => ({ connectFonts: async () => [{ family: 'HeraSans', weight: '400', src: 'url("https://example.invalid/font.otf")' }] }));
jest.mock('@stripe/connect-js', () => ({ loadConnectAndInitialize: jest.fn() }));
jest.mock('@stripe/react-connect-js', () => ({
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => children,
  ConnectAccountOnboarding: () => { const { Text } = require('react-native'); return <Text>Formulario conectado</Text>; },
  ConnectAccountManagement: () => null, ConnectBalances: () => null, ConnectPayouts: () => null,
}));

const update = jest.fn();
const logout = jest.fn().mockResolvedValue(undefined);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, mode: 'light', isDark: false, setMode: jest.fn() });
  jest.mocked(connectSession).mockResolvedValue({ publishableKey: 'pk_test_mock', clientSecret: 'mock-secret' });
  // The SDK component double never calls create; the boundary under test owns init/update/logout.
  jest.mocked(loadConnectAndInitialize).mockReturnValue({ update, logout, create: jest.fn() });
});

test('loads explicit fonts and updates the theme without restarting Connect on resize', async () => {
  const exit = jest.fn();
  const result = render(<View style={{ width: 760 }}><ConnectAccount view="onboarding" onExit={exit} /></View>);
  await screen.findByText('Formulario conectado');
  const options = jest.mocked(loadConnectAndInitialize).mock.calls[0][0];
  expect(options.fonts?.[0]).toMatchObject({ family: 'HeraSans' });
  expect(options.appearance?.variables).toMatchObject({ colorBackground: lightTheme.bg, fontFamily: 'HeraSans, sans-serif' });
  expect(await options.fetchClientSecret()).toBe('mock-secret');
  expect(connectSession).toHaveBeenCalledTimes(1);
  await options.fetchClientSecret();
  expect(connectSession).toHaveBeenCalledTimes(2);
  jest.mocked(useTheme).mockReturnValue({ theme: darkTheme, mode: 'dark', isDark: true, setMode: jest.fn() });
  result.rerender(<View style={{ width: 350 }}><ConnectAccount view="onboarding" onExit={exit} /></View>);
  await waitFor(() => expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ appearance: expect.objectContaining({ variables: expect.objectContaining({ colorBackground: darkTheme.bg }) }) })));
  expect(loadConnectAndInitialize).toHaveBeenCalledTimes(1);
  result.unmount();
  expect(logout).toHaveBeenCalledTimes(1);
});

test('session failure offers an explicit retry', async () => {
  jest.mocked(connectSession).mockRejectedValueOnce(new Error('offline'));
  render(<ConnectAccount view="onboarding" onExit={jest.fn()} />);
  await screen.findByText(/No se pudo abrir Stripe/);
  expect(loadConnectAndInitialize).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('Formulario conectado');
  expect(connectSession).toHaveBeenCalledTimes(2);
});
