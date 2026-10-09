import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleMeetInvitation } from '../GoogleMeetInvitation';
import { PrivacyControlsVisibleContext } from '../../common/PrivacyPreferences';
import { getGoogleCalendarStatus, type GoogleCalendarStatus } from '../../../services/googleCalendarService';

let mockUser = { id: 'professional-a', type: 'professional' };
const mockNavigate = jest.fn();
let mockFocused = true;
let mockAlertVisible = false;
let mockTour: { isRunning: boolean; activeTourId: string | null } | null = null;
let userSequence = 0;
const deviceStorage = new Map<string, string>();
const discoveryKey = () => `hera:meet-invitation:v2:${mockUser.id}`;
const renewalKey = (version = '2026-10-09') => `hera:meet-renewal:${version}:${mockUser.id}`;
jest.mock('../../common/alert', () => ({ useAppAlertState: () => ({ isVisible: mockAlertVisible }) }));
jest.mock('../../onboarding/professionalTourContext', () => ({ useOptionalProfessionalTour: () => mockTour }));
jest.mock('../../onboarding/professionalTourStorage', () => ({ hasSeenProfessionalTour: jest.fn(async () => true) }));
import { hasSeenProfessionalTour } from '../../onboarding/professionalTourStorage';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => mockFocused,
  useFocusEffect: (callback: () => (() => void)) => require('react').useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../../../services/googleCalendarService', () => ({ getGoogleCalendarStatus: jest.fn(), setVideoPreference: jest.fn(), connectGoogleCalendar: jest.fn() }));
import { setVideoPreference, connectGoogleCalendar } from '../../../services/googleCalendarService';
const status: GoogleCalendarStatus = { enabled: true, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-10-09', videoProviderPreference: 'DAILY', videoSetupCompleted: false, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false };
beforeEach(() => {
  jest.resetAllMocks(); mockUser = { id: `professional-${++userSequence}`, type: 'professional' };
  deviceStorage.clear();
  mockFocused = true; mockAlertVisible = false; mockTour = null;
  jest.mocked(hasSeenProfessionalTour).mockResolvedValue(true);
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => deviceStorage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { deviceStorage.set(key, value); });
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue(status);
});

test('invites Daily users without changing their provider and explains both steps', async () => {
  render(<GoogleMeetInvitation />);
  await screen.findByText(/Ahora puedes conectar Google Calendar con HERA/);
  fireEvent.press(screen.getByText('Configurar Google Meet'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'google' });
  expect(setVideoPreference).not.toHaveBeenCalled();
  expect(connectGoogleCalendar).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(discoveryKey(), 'hidden');
});

test('a connected calendar only needs the Meet activation invitation', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'CONNECTED' });
  render(<GoogleMeetInvitation />);
  await screen.findByText(/Tu Google Calendar ya está conectado/);
});

test.each([
  { enabled: false }, { meetAssignmentsEnabled: false }, { meetAssignmentsEnabled: undefined },
  { videoProviderPreference: undefined }, { status: 'DISCONNECTING' as const },
  { status: 'CONNECTED' as const, videoProviderPreference: 'GOOGLE_MEET' as const, meetEnabled: true },
])('does not promote unavailable or already selected Meet: %p', async change => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, ...change });
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test('dismissal persists per user across remounts without hiding another account notice', async () => {
  const first = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Ahora no'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(discoveryKey(), 'hidden');
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  first.unmount();
  jest.mocked(getGoogleCalendarStatus).mockClear();
  const second = render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(getGoogleCalendarStatus).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  second.unmount();
  mockUser = { id: 'professional-b', type: 'professional' };
  render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  expect(AsyncStorage.getItem).toHaveBeenLastCalledWith('hera:meet-invitation:v2:professional-b');
});

test('refreshing after activation removes the invitation', async () => {
  const first = render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  first.unmount();
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'CONNECTED', meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET', videoSetupCompleted: true });
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test.each([true, undefined])('invites established Daily specialists regardless of setup completion: %p', async videoSetupCompleted => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, videoSetupCompleted });
  render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
});

test.each([{ status: 'REAUTH_REQUIRED' as const, meetEnabled: true },
  { status: 'CONNECTED' as const, privacyUpdateRequired: true }, { status: 'CONNECTED' as const, meetEnabled: false }])(
  'helps previously selected Meet renew its authorization: %p', async change => {
    jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, ...change, videoProviderPreference: 'GOOGLE_MEET', videoSetupCompleted: true });
    render(<GoogleMeetInvitation />);
    await screen.findByText('Sigamos con Google Meet.');
    await screen.findByText(change.status === 'CONNECTED' && !('privacyUpdateRequired' in change)
      ? /Tu calendario sigue conectado/
      : /reconecta la misma cuenta de Google/);
    fireEvent.press(screen.getByText('Renovar conexión'));
    expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'google' });
    expect(setVideoPreference).not.toHaveBeenCalled();
    expect(connectGoogleCalendar).not.toHaveBeenCalled();
  });

test.each(['close', 'backdrop', 'back'])('can postpone through %s without activating anything', async action => {
  render(<GoogleMeetInvitation />);
  await screen.findByText('Ahora no');
  if (action === 'close') fireEvent.press(screen.getByLabelText('Cerrar invitación de Google Meet'));
  else if (action === 'backdrop') fireEvent.press(screen.getByTestId('meet-invitation-backdrop', { includeHiddenElements: true }));
  else fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(discoveryKey(), 'hidden');
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('does not overlap an existing alert and appears when that alert closes', async () => {
  mockAlertVisible = true;
  const view = render(<GoogleMeetInvitation />);
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalled());
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  mockAlertVisible = false; view.rerender(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
});

test('waits until the privacy notice closes without dismissing the invitation', async () => {
  const content = (visible: boolean) => <PrivacyControlsVisibleContext.Provider value={visible}><GoogleMeetInvitation /></PrivacyControlsVisibleContext.Provider>;
  const view = render(content(true));
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalled());
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  view.rerender(content(false));
  await screen.findByText('Configurar Google Meet');
});

test('lets the home tour finish before displaying the announcement', async () => {
  mockTour = { isRunning: false, activeTourId: null };
  jest.mocked(hasSeenProfessionalTour).mockResolvedValue(false);
  const view = render(<GoogleMeetInvitation />);
  await waitFor(() => expect(hasSeenProfessionalTour).toHaveBeenCalled());
  expect(getGoogleCalendarStatus).not.toHaveBeenCalled();
  mockTour = { isRunning: true, activeTourId: 'professional_home_v1' }; view.rerender(<GoogleMeetInvitation />);
  jest.mocked(hasSeenProfessionalTour).mockResolvedValue(true);
  mockTour = { isRunning: false, activeTourId: null }; view.rerender(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
});

test('discards a response from an account that is no longer active', async () => {
  let resolve!: (value: GoogleCalendarStatus) => void;
  jest.mocked(getGoogleCalendarStatus).mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<GoogleMeetInvitation />);
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalled());
  mockUser = { id: 'patient', type: 'client' }; view.rerender(<GoogleMeetInvitation />);
  await act(async () => { resolve(status); });
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test('hides the modal when its screen loses focus', async () => {
  const view = render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test('a failed optional status lookup does not interrupt the home screen', async () => {
  jest.mocked(getGoogleCalendarStatus).mockRejectedValue(new Error('offline'));
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Configurar Google Meet')).toBeNull();
});

test.each(['discovery', 'renewal'])('a saved %s dismissal survives a fresh component session', async kind => {
  const renewing = kind === 'renewal';
  if (renewing) jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'REAUTH_REQUIRED', videoProviderPreference: 'GOOGLE_MEET' });
  deviceStorage.set(renewing ? renewalKey() : discoveryKey(), 'hidden');
  render(<GoogleMeetInvitation />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test('closing discovery does not suppress a later renewal for the same specialist', async () => {
  const view = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Ahora no'));
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'REAUTH_REQUIRED', videoProviderPreference: 'GOOGLE_MEET' });
  mockFocused = true; view.rerender(<GoogleMeetInvitation />);
  await screen.findByText('Sigamos con Google Meet.');
  fireEvent.press(screen.getByText('Ahora no'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(renewalKey(), 'hidden');
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  mockFocused = true; view.rerender(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Renovar conexión')).toBeNull();
});

test('renewal is acknowledged once per disclosure version', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'REAUTH_REQUIRED', videoProviderPreference: 'GOOGLE_MEET' });
  const view = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Ahora no'));
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'REAUTH_REQUIRED', videoProviderPreference: 'GOOGLE_MEET', meetDisclosureVersion: 'next-disclosure' });
  mockFocused = true; view.rerender(<GoogleMeetInvitation />);
  await screen.findByText('Renovar conexión');
  fireEvent.press(screen.getByText('Ahora no'));
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(renewalKey('next-disclosure'), 'hidden');
});

test.each(['delayed', 'failed'])('a %s storage write cannot repeat the notice after a quick remount', async outcome => {
  let finishWrite: (() => void) | undefined;
  jest.mocked(AsyncStorage.setItem).mockImplementation(() => outcome === 'failed'
    ? Promise.reject(new Error('device storage unavailable'))
    : new Promise<void>(resolve => { finishWrite = resolve; }));
  const view = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Configurar Google Meet'));
  view.unmount();
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Ahora no')).toBeNull();
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  await act(async () => { finishWrite?.(); });
});

test('refocusing after activation checks current status and suppresses both notices', async () => {
  const view = render(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...status, status: 'CONNECTED', meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  mockFocused = true; view.rerender(<GoogleMeetInvitation />);
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test('a delayed status response after leaving home cannot reopen the notice', async () => {
  let resolve!: (value: GoogleCalendarStatus) => void;
  jest.mocked(getGoogleCalendarStatus).mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<GoogleMeetInvitation />);
  await waitFor(() => expect(getGoogleCalendarStatus).toHaveBeenCalled());
  mockFocused = false; view.rerender(<GoogleMeetInvitation />);
  await act(async () => { resolve(status); });
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test.each(['client', 'clinic'])('never looks up or invites a %s account', async type => {
  mockUser = { id: 'non-professional', type };
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(getGoogleCalendarStatus).not.toHaveBeenCalled();
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test('a storage read failure does not interrupt the home screen', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('device storage unavailable'));
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test('switching accounts and returning preserves each specialist dismissal independently', async () => {
  const firstUser = mockUser;
  const view = render(<GoogleMeetInvitation />);
  fireEvent.press(await screen.findByText('Ahora no'));
  mockUser = { id: `${firstUser.id}-other`, type: 'professional' };
  view.rerender(<GoogleMeetInvitation />);
  await screen.findByText('Configurar Google Meet');
  mockUser = firstUser; view.rerender(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(screen.queryByText('Ahora no')).toBeNull();
});

test('an unfocused home does not request status or display a notice', async () => {
  mockFocused = false;
  render(<GoogleMeetInvitation />);
  await act(async () => {});
  expect(getGoogleCalendarStatus).not.toHaveBeenCalled();
  expect(screen.queryByText('Ahora no')).toBeNull();
});
