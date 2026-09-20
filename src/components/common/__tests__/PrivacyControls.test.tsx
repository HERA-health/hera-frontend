import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivacyControls } from '../PrivacyControls';
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
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('../../../services/analyticsService', () => ({ configureAnalytics: jest.fn(), reset: jest.fn() }));
beforeEach(async () => { mockUser = null; jest.clearAllMocks(); await AsyncStorage.clear(); });
test('visitors can reject with no account request and reopen preferences', async () => {
  render(<PrivacyControls />);
  await screen.findByText('Rechazar analítica opcional');
  fireEvent.press(screen.getByText('Rechazar analítica opcional'));
  await waitFor(() => expect(configureAnalytics).toHaveBeenLastCalledWith(false));
  expect(api.put).not.toHaveBeenCalled();
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('hera:visitor-analytics-preference'))!)).toMatchObject({ enabled: false }));
  fireEvent.press(screen.getByText('Preferencias de privacidad'));
  await screen.findByText('Analítica: desactivada');
});
test('a visitor opt-in does not become consent for an authenticated account or another user', async () => {
  await AsyncStorage.setItem('hera:visitor-analytics-preference', JSON.stringify({ enabled: true, version: '2026-09-20' }));
  mockUser = { id: 'account-a' };
  jest.mocked(api.get).mockResolvedValue({ data: { enabled: false, version: '2026-09-20', decidedAt: null } });
  const view = render(<PrivacyControls />);
  await screen.findByText('Analítica: desactivada');
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
  mockUser = { id: 'account-b' }; view.rerender(<PrivacyControls />);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(configureAnalytics).not.toHaveBeenCalledWith(true);
});
