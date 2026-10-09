import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SessionMeetingControls } from '../SessionMeetingControls';
import { VideoSetupNotice } from '../VideoSetupNotice';
import * as service from '../../../services/googleCalendarService';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/googleCalendarService', () => ({ getProfessionalMeetingStatus: jest.fn(), commandSessionMeeting: jest.fn(), getGoogleCalendarStatus: jest.fn() }));
const pending: service.ProfessionalMeetingStatus = {
  provider: 'GOOGLE_MEET', preparationStatus: 'PENDING', canJoin: false, meetingLink: null, reasonCode: 'PENDING',
  meetingRevision: 2, organizerEmail: 'organizer@example.invalid', organizerConnected: true, canChangeProvider: true, canRetryPreparation: true, deliveryErrorCode: null,
};
beforeEach(() => { jest.resetAllMocks(); jest.mocked(service.getProfessionalMeetingStatus).mockResolvedValue(pending); });

test('an ongoing failed session can retry without offering a provider change', async () => {
  jest.mocked(service.getProfessionalMeetingStatus).mockResolvedValue({ ...pending, preparationStatus: 'ERROR', canChangeProvider: false });
  jest.mocked(service.commandSessionMeeting).mockResolvedValue(pending);
  render(<SessionMeetingControls sessionId="ongoing" />);
  const retry = await screen.findByText('Reintentar preparación');
  await act(async () => { fireEvent.press(retry); });
  await waitFor(() => expect(service.commandSessionMeeting).toHaveBeenCalledWith('ongoing', 'RETRY', 2));
  expect(screen.queryByText('Usar alternativa para esta sesión')).toBeNull();
});

test('provider changes are never offered, even if an older backend permits them', async () => {
  render(<SessionMeetingControls sessionId="session" />);
  await screen.findByText('Estamos preparando Google Meet. Puede tardar unos minutos.');
  expect(screen.queryByText('Usar alternativa para esta sesión')).toBeNull();
  expect(screen.queryByText(/Daily/)).toBeNull();
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
});

test('an internal fallback failure offers recovery without sending the user to Google setup', async () => {
  jest.mocked(service.getProfessionalMeetingStatus).mockResolvedValue({ ...pending, provider: 'DAILY', preparationStatus: 'ERROR', organizerEmail: null });
  render(<SessionMeetingControls sessionId="fallback" />);
  await screen.findByText('Reintentar preparación');
  expect(screen.queryByText('Configurar videollamadas')).toBeNull();
  expect(screen.queryByText('Revisar conexión de Google')).toBeNull();
  expect(screen.queryByText(/Daily/)).toBeNull();
  expect(screen.getByText(/Si el problema persiste, contacta con soporte/)).toBeTruthy();
});

test('pending polling is bounded and stops when unmounted', async () => {
  jest.useFakeTimers(); const previous = AppState.currentState; AppState.currentState = 'active';
  try {
    const view = render(<SessionMeetingControls sessionId="session" />);
    await act(async () => {});
    for (let i = 0; i < 8; i++) await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(service.getProfessionalMeetingStatus).toHaveBeenCalledTimes(5);
    view.unmount();
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(service.getProfessionalMeetingStatus).toHaveBeenCalledTimes(5);
  } finally { AppState.currentState = previous; jest.useRealTimers(); }
});

test('errors offer explicit refresh without a permanent loading label', async () => {
  jest.mocked(service.getProfessionalMeetingStatus).mockRejectedValueOnce(new Error('Conexión no disponible'));
  render(<SessionMeetingControls sessionId="session" />);
  await screen.findByText('Conexión no disponible');
  expect(screen.queryByText('Consultando videollamada…')).toBeNull();
  fireEvent.press(screen.getByText('Actualizar estado'));
  await screen.findByText('Estamos preparando Google Meet. Puede tardar unos minutos.');
});

test('a stale status from another selected session is ignored', async () => {
  let finish: ((value: service.ProfessionalMeetingStatus) => void) | undefined;
  jest.mocked(service.getProfessionalMeetingStatus).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<SessionMeetingControls sessionId="old" />);
  view.rerender(<SessionMeetingControls sessionId="new" />);
  await screen.findByText('Estamos preparando Google Meet. Puede tardar unos minutos.');
  await act(async () => { finish?.({ ...pending, preparationStatus: 'READY' }); });
  expect(screen.queryByText('Videollamada preparada. Usa el botón habitual para entrar.')).toBeNull();
});

test('the creation notice leads to existing settings and does not create or switch a meeting', async () => {
  const close = jest.fn();
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ enabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'GOOGLE_MEET', meetEnabled: false });
  render(<VideoSetupNotice onClose={close} />);
  fireEvent.press(await screen.findByText('Revisar conexión de Google'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'google' }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
});

test('closed rollout warns even when the specialist already authorized Meet', async () => {
  const close = jest.fn();
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ enabled: true, status: 'CONNECTED', email: 'organizer@example.invalid', pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'GOOGLE_MEET', meetEnabled: true, meetAssignmentsEnabled: false });
  render(<VideoSetupNotice onClose={close} />);
  await screen.findByText(/Google Meet no está disponible temporalmente/);
  expect(screen.queryByText(/Completa la configuración de Google/)).toBeNull();
  expect(screen.queryByText(/Daily/)).toBeNull();
  fireEvent.press(screen.getByText('Revisar conexión de Google'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'google' });
  expect(close).toHaveBeenCalledTimes(1);
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
});

test('Daily specialists do not receive a Google configuration warning while rollout is closed', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ enabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'DAILY', meetEnabled: false, meetAssignmentsEnabled: false });
  render(<VideoSetupNotice onClose={jest.fn()} />);
  await act(async () => {});
  expect(screen.queryByText('Ver opciones de videollamada')).toBeNull();
  expect(screen.queryByText('Configurar videollamadas')).toBeNull();
});

test('an unknown configuration can be checked again without directing the user to reconnect Google', async () => {
  const close = jest.fn();
  jest.mocked(service.getGoogleCalendarStatus).mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ enabled: true, status: 'CONNECTED', email: 'organizer@example.invalid', pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'GOOGLE_MEET', meetEnabled: true, meetAssignmentsEnabled: true });
  render(<VideoSetupNotice onClose={close} />);
  fireEvent.press(await screen.findByText('Reintentar comprobación'));
  await waitFor(() => expect(service.getGoogleCalendarStatus).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('No se pudo comprobar la configuración de videollamadas.')).toBeNull());
  expect(mockNavigate).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});


test.each([
  ['REAUTH_REQUIRED', /Google necesita una nueva autorización/],
  ['PERMISSION_DENIED', /Google ha rechazado los permisos/],
  ['MEET_CREATION_FAILED', /dos intentos/],
  ['MEET_PREPARATION_TIMEOUT', /tras diez minutos/],
  ['MEET_TEMPORARY_ERROR', /tras varios intentos/],
])('emergency Daily explains its reason: %s', async (fallbackReasonCode, explanation) => {
  jest.mocked(service.getProfessionalMeetingStatus).mockResolvedValue({ ...pending, provider: 'DAILY', preparationStatus: 'READY',
    fallbackReasonCode, fallbackAt: '2026-10-09T10:00:00Z', organizerEmail: null });
  render(<SessionMeetingControls sessionId="fallback" />);
  await screen.findByText(explanation);
  expect(screen.queryByText(/Google Meet preparado/)).toBeNull();
});

test('prepared Daily from an older backend has no invented emergency warning', async () => {
  jest.mocked(service.getProfessionalMeetingStatus).mockResolvedValue({ ...pending, provider: 'DAILY', preparationStatus: 'READY', organizerEmail: null });
  render(<SessionMeetingControls sessionId="legacy" />);
  await screen.findByText('Videollamada preparada. Usa el botón habitual para entrar.');
  expect(screen.queryByText(/Daily de emergencia/)).toBeNull();
});
