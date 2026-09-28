import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleMeetInvitation } from '../GoogleMeetInvitation';
import { getGoogleCalendarStatus, type GoogleCalendarStatus } from '../../../services/googleCalendarService';

let mockUser = { id: 'professional-a', type: 'professional' };
const mockNavigate = jest.fn();
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../../../services/googleCalendarService', () => ({ getGoogleCalendarStatus: jest.fn() }));
const status: GoogleCalendarStatus = { enabled: true, meetAssignmentsEnabled: true, videoProviderPreference: 'DAILY', status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false };
beforeEach(() => {
  jest.resetAllMocks(); mockUser = { id: 'professional-a', type: 'professional' };
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue(status);
});

test('invites Daily users without changing their provider and explains both steps', async () => {
  render(<GoogleMeetInvitation />);
  await screen.findByText(/Conecta Google Calendar y activa Meet/);
  fireEvent.press(screen.getByText('Configurar Google Meet'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'account' });
});

test('a connected calendar only needs the Meet activation invitation', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'CONNECTED' });
  render(<GoogleMeetInvitation />);
  await screen.findByText(/Tu calendario ya está conectado/);
});

test.each([
  { enabled: false }, { meetAssignmentsEnabled: false }, { meetAssignmentsEnabled: undefined },
  { videoProviderPreference: 'GOOGLE_MEET' as const }, { status: 'DISCONNECTING' as const },
])('does not promote unavailable or already selected Meet: %p', async change => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, ...change });
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test('dismissal persists per user and avoids later status requests', async () => {
  const first = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Ocultar sugerencia'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('hera:meet-invitation:v1:professional-a', 'hidden');
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  first.unmount();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('hidden');
  jest.mocked(getGoogleCalendarStatus).mockClear();
  const second = render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(getGoogleCalendarStatus).not.toHaveBeenCalled();
  second.unmount();
  mockUser = { id: 'professional-b', type: 'professional' };
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  expect(AsyncStorage.getItem).toHaveBeenLastCalledWith('hera:meet-invitation:v1:professional-b');
});

test('refreshing after activation removes the invitation', async () => {
  const first = render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  first.unmount();
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test('a failed optional status lookup does not interrupt the home screen', async () => {
  jest.mocked(getGoogleCalendarStatus).mockRejectedValue(new Error('offline'));
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});
