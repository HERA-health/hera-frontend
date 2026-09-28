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

test('alternative requires explicit confirmation and sends the displayed revision once', async () => {
  let finish: (() => void) | undefined;
  jest.mocked(service.commandSessionMeeting).mockImplementation(() => new Promise(resolve => { finish = () => resolve(pending); }));
  render(<SessionMeetingControls sessionId="session" />);
  fireEvent.press(await screen.findByText('Usar alternativa para esta sesión'));
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Conservar acceso actual'));
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Usar alternativa para esta sesión'));
  const confirm = screen.getByText('Confirmar cambio a Daily');
  fireEvent.press(confirm);
  fireEvent.press(confirm);
  expect(service.commandSessionMeeting).toHaveBeenCalledTimes(1);
  expect(service.commandSessionMeeting).toHaveBeenCalledWith('session', 'USE_DAILY', 2);
  await act(async () => { finish?.(); });
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
  await screen.findByText('Estamos preparando la videollamada.');
});

test('a stale status from another selected session is ignored', async () => {
  let finish: ((value: service.ProfessionalMeetingStatus) => void) | undefined;
  jest.mocked(service.getProfessionalMeetingStatus).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<SessionMeetingControls sessionId="old" />);
  view.rerender(<SessionMeetingControls sessionId="new" />);
  await screen.findByText('Estamos preparando la videollamada.');
  await act(async () => { finish?.({ ...pending, preparationStatus: 'READY' }); });
  expect(screen.queryByText('Videollamada preparada. Usa el botón habitual para entrar.')).toBeNull();
});

test('the creation notice leads to existing settings and does not create or switch a meeting', async () => {
  const close = jest.fn();
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ enabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'GOOGLE_MEET', meetEnabled: false });
  render(<VideoSetupNotice onClose={close} />);
  fireEvent.press(await screen.findByText('Configurar videollamadas'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'account' }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(service.commandSessionMeeting).not.toHaveBeenCalled();
});

test('closed rollout warns even when the specialist already authorized Meet', async () => {
  const close = jest.fn();
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ enabled: true, status: 'CONNECTED', email: 'organizer@example.invalid', pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'GOOGLE_MEET', meetEnabled: true, meetAssignmentsEnabled: false });
  render(<VideoSetupNotice onClose={close} />);
  await screen.findByText(/Google Meet no está disponible temporalmente/);
  expect(screen.queryByText(/Completa la configuración de Google/)).toBeNull();
  fireEvent.press(screen.getByText('Ver opciones de videollamada'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'account' });
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
