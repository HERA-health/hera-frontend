import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { VideoCallSetupPrompt } from '../VideoCallSetupPrompt';
import { getGoogleCalendarStatus, type GoogleCalendarStatus } from '../../../services/googleCalendarService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/googleCalendarService', () => ({ getGoogleCalendarStatus: jest.fn() }));
const disconnected: GoogleCalendarStatus = {
  enabled: true, meetAssignmentsEnabled: true, status: 'DISCONNECTED', email: null,
  pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false,
  videoProviderPreference: 'DAILY', meetEnabled: false, videoSetupCompleted: false,
};
beforeEach(() => { jest.clearAllMocks(); });

test('offers first-time Meet setup without a provider selector', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue(disconnected);
  const onSetup = jest.fn();
  render(<VideoCallSetupPrompt hasUnsavedChanges busy={false} onSetup={onSetup} />);
  const action = await screen.findByText('Guardar y configurar Google Meet');
  expect(screen.getByText('RECOMENDADO · GOOGLE MEET')).toBeTruthy();
  expect(screen.queryByText(/sin conectar Google/)).toBeNull();
  expect(onSetup).not.toHaveBeenCalled();
  fireEvent.press(action);
  expect(onSetup).toHaveBeenCalledTimes(1);
});

test('an active Meet account has no initial setup prompt even with a stale completion flag', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, status: 'CONNECTED', meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  const view = render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await act(async () => {});
  expect(view.toJSON()).toBeNull();
});

test.each(['GOOGLE_MEET', 'DAILY'] as const)('completed setup stays absent after remount for %s, including reconnection', async provider => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, videoProviderPreference: provider, videoSetupCompleted: true, status: 'REAUTH_REQUIRED' });
  const first = render(<VideoCallSetupPrompt hasUnsavedChanges busy={false} onSetup={jest.fn()} />);
  await act(async () => {});
  expect(first.toJSON()).toBeNull();
  first.unmount();
  const second = render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await act(async () => {});
  expect(second.toJSON()).toBeNull();
});

test('connected Calendar points to Meet activation without asking to reconnect', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, status: 'CONNECTED' });
  render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await screen.findByText('Solo falta activar Google Meet');
  expect(screen.getByText(/Google Calendar ya está conectado/)).toBeTruthy();
});

test.each([
  { status: 'REAUTH_REQUIRED' as const },
  { status: 'CONNECTED' as const, privacyUpdateRequired: true },
])('offers recovery for invalid Google authorization: %j', async overrides => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, ...overrides, meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await screen.findByText('Recupera tus videollamadas con Google Meet');
  expect(screen.queryByText('GOOGLE MEET ACTIVO')).toBeNull();
});

test.each([
  { enabled: false },
  { meetAssignmentsEnabled: false },
  { meetAssignmentsEnabled: undefined },
])('does not promise Meet setup when unavailable: %j', async overrides => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, ...overrides });
  const view = render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await act(async () => {});
  expect(view.toJSON()).toBeNull();
});

test('does not flash onboarding while account status is loading or unknown to an older backend', async () => {
  jest.mocked(getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, videoSetupCompleted: undefined });
  const view = render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  expect(view.toJSON()).toBeNull();
  await act(async () => {});
  expect(view.toJSON()).toBeNull();
});

test('unknown account status does not interrupt the profile with initial setup', async () => {
  jest.mocked(getGoogleCalendarStatus).mockRejectedValueOnce(new Error('unavailable'));
  const view = render(<VideoCallSetupPrompt hasUnsavedChanges={false} busy={false} onSetup={jest.fn()} />);
  await act(async () => {});
  expect(view.toJSON()).toBeNull();
});
