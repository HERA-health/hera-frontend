import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivacyControls } from '../PrivacyControls';
import { PrivacyPreferencesButton } from '../PrivacyPreferences';
import api from '../../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureAnalytics } from '../../../services/analyticsService';
let mockUser: { id: string } | null = null;
const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  clear: jest.fn(async () => { mockStorage.clear(); }),
} }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, isInitialized: true }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('../../../services/analyticsService', () => ({ configureAnalytics: jest.fn(), reset: jest.fn() }));
beforeEach(async () => { mockUser = null; jest.clearAllMocks(); await AsyncStorage.clear(); });

test('the global controller does not render a permanent preferences bar', async () => {
  await AsyncStorage.setItem('hera:visitor-analytics-preference', JSON.stringify({ enabled: false, version: '2026-09-20' }));
  render(<PrivacyControls />);
  await waitFor(() => expect(configureAnalytics).toHaveBeenLastCalledWith(false));
  expect(screen.queryByText('Preferencias de privacidad')).toBeNull();
  expect(screen.queryByText('Tu privacidad')).toBeNull();
});
test('visitors can reject with no account request and reopen preferences', async () => {
  render(<PrivacyControls><PrivacyPreferencesButton /></PrivacyControls>);
  await screen.findByLabelText('Rechazar estadísticas de uso');
  fireEvent.press(screen.getByLabelText('Rechazar estadísticas de uso'));
  await waitFor(() => expect(configureAnalytics).toHaveBeenLastCalledWith(false));
  expect(api.put).not.toHaveBeenCalled();
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('hera:visitor-analytics-preference'))!)).toMatchObject({ enabled: false }));
  fireEvent.press(screen.getByText('Preferencias de privacidad'));
  await screen.findByText('Estadísticas de uso: desactivadas');
});
test('a visitor opt-in does not become consent for an authenticated account or another user', async () => {
  await AsyncStorage.setItem('hera:visitor-analytics-preference', JSON.stringify({ enabled: true, version: '2026-09-20' }));
  mockUser = { id: 'account-a' };
  jest.mocked(api.get).mockResolvedValue({ data: { enabled: false, version: '2026-09-20', decidedAt: null } });
  const view = render(<PrivacyControls><PrivacyPreferencesButton /></PrivacyControls>);
  await screen.findByText('Tu privacidad');
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
  mockUser = { id: 'account-b' }; view.rerender(<PrivacyControls><PrivacyPreferencesButton /></PrivacyControls>);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
});

test('closing the notice leaves analytics disabled without recording consent', async () => {
  render(<PrivacyControls><PrivacyPreferencesButton /></PrivacyControls>);
  fireEvent.press(await screen.findByLabelText('Cerrar aviso de privacidad'));
  expect(screen.queryByText('Tu privacidad')).toBeNull();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(api.put).not.toHaveBeenCalled();
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
  fireEvent.press(screen.getByText('Preferencias de privacidad'));
  await screen.findByText('Tu privacidad');
});

test('accepting explicitly enables analytics and persists the visitor choice', async () => {
  render(<PrivacyControls />);
  fireEvent.press(await screen.findByLabelText('Aceptar estadísticas de uso'));
  await waitFor(() => expect(configureAnalytics).toHaveBeenLastCalledWith(true));
  expect(screen.queryByText('Tu privacidad')).toBeNull();
  expect(configureAnalytics).toHaveBeenLastCalledWith(true);
  expect(JSON.parse((await AsyncStorage.getItem('hera:visitor-analytics-preference'))!)).toMatchObject({ enabled: true });
});

test('a failed save keeps the notice open and does not enable analytics', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('No se ha podido guardar'));
  render(<PrivacyControls />);
  fireEvent.press(await screen.findByLabelText('Aceptar estadísticas de uso'));
  await screen.findByRole('alert');
  expect(screen.getByText('Tu privacidad')).toBeTruthy();
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
  fireEvent.press(screen.getByLabelText('Rechazar estadísticas de uso'));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('hera:visitor-analytics-preference'))!)).toMatchObject({ enabled: false }));
  expect(screen.queryByText('Tu privacidad')).toBeNull();
});
