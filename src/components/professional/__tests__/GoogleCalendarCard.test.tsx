jest.mock('../../../services/legalService', () => ({ getLegalCatalog: jest.fn(async () => [{ key: 'PRIVACY_POLICY', version: '2026-09-27' }]) }));
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { GoogleCalendarCard } from '../GoogleCalendarCard';
import * as service from '../../../services/googleCalendarService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', type: 'professional' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../services/googleCalendarService', () => ({
  setVideoPreference: jest.fn(), getGoogleCalendarStatus: jest.fn(), connectGoogleCalendar: jest.fn(), disconnectGoogleCalendar: jest.fn(), resyncGoogleCalendar: jest.fn(),
}));
const disconnected: service.GoogleCalendarStatus = { enabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false };
const connected: service.GoogleCalendarStatus = { ...disconnected, status: 'CONNECTED', email: 'professional@example.invalid', activationConnection: { id: 'connection-a', generation: 1 } };
beforeEach(() => { jest.clearAllMocks(); });

test('existing Calendar requires explicit Meet consent and keeps OAuth separate', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetEnabled: false, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-09-27', videoProviderPreference: 'DAILY' });
  jest.mocked(service.setVideoPreference).mockResolvedValue({ ...connected, meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Activar Google Meet'));
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Ahora no'));
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Activar Google Meet'));
  fireEvent.press(screen.getByText('Aceptar y activar Google Meet'));
  await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('GOOGLE_MEET', '2026-09-27', { id: 'connection-a', generation: 1 }));
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
});

test('account refresh never substitutes an organizer in an open acceptance', async () => {
  jest.useFakeTimers();
  const previous = AppState.currentState; AppState.currentState = 'active';
  const activatable = { ...connected, meetEnabled: false, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-09-27', videoProviderPreference: 'DAILY' as const };
  try {
    jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(activatable);
    jest.mocked(service.setVideoPreference).mockRejectedValueOnce(new Error('La conexión de Google ha cambiado.'));
    render(<GoogleCalendarCard />);
    fireEvent.press(await screen.findByText('Activar Google Meet'));
    const changed = { ...activatable, email: 'second@example.invalid', activationConnection: { id: 'connection-b', generation: 2 } };
    jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(changed);
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(screen.getByText(/principal de professional@example.invalid/)).toBeTruthy();
    fireEvent.press(screen.getByText('Aceptar y activar Google Meet'));
    await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('GOOGLE_MEET', '2026-09-27', connected.activationConnection));
    await screen.findByText('La conexión de Google ha cambiado.');
    expect(screen.queryByText('Aceptar y activar Google Meet')).toBeNull();
    fireEvent.press(screen.getByText('Activar Google Meet'));
    expect(screen.getByText(/principal de second@example.invalid/)).toBeTruthy();
    expect(service.setVideoPreference).toHaveBeenCalledTimes(1);
  } finally { AppState.currentState = previous; jest.useRealTimers(); }
});

test('Daily remains an explicit persistent secondary preference', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
  jest.mocked(service.setVideoPreference).mockResolvedValue({ ...connected, videoProviderPreference: 'DAILY' });
  render(<GoogleCalendarCard />);
  await screen.findByText('professional@example.invalid');
  expect(screen.queryByText('Usar videollamadas sin Google')).toBeNull();
  fireEvent.press(screen.getByText('Videollamadas · Otras opciones'));
  fireEvent.press(screen.getByText('Usar videollamadas sin Google'));
  await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('DAILY'));
});

test('closed Meet rollout explains the limitation without changing an existing preference', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetEnabled: true, meetAssignmentsEnabled: false, videoProviderPreference: 'GOOGLE_MEET' });
  jest.mocked(service.setVideoPreference).mockResolvedValue({ ...connected, videoProviderPreference: 'DAILY' });
  render(<GoogleCalendarCard />);
  await screen.findByText(/Google Meet no está disponible temporalmente/);
  expect(screen.queryByText(/Google Meet activo/)).toBeNull();
  expect(screen.queryByText('Activar Google Meet')).toBeNull();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Videollamadas · Otras opciones'));
  fireEvent.press(screen.getByText('Usar videollamadas sin Google'));
  await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('DAILY'));
});

test('closed Meet rollout still allows Calendar connection without promising video activation', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, meetAssignmentsEnabled: false, videoProviderPreference: 'DAILY' });
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Conectar Google Calendar'));
  expect(screen.queryByText('Conectar Google para mis videollamadas')).toBeNull();
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional', '2026-09-27'));
});
test('explains the data exported and starts a real connection action', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(disconnected);
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  render(<GoogleCalendarCard />);
  await screen.findByText('Sin conectar');
  fireEvent.press(screen.getByText('Conectar Google Calendar'));
  expect(screen.getByText(/No se enviarán datos del paciente/)).toBeTruthy();
  expect(screen.getByText(/no se importan ni bloquean/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional', '2026-09-27'));
});
test('disconnect explicitly conserves copies and shows asynchronous disconnect state', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
  jest.mocked(service.disconnectGoogleCalendar).mockResolvedValue({ ...connected, status: 'DISCONNECTING' });
  render(<GoogleCalendarCard />);
  await screen.findByText('professional@example.invalid');
  fireEvent.press(screen.getByText('Opciones de sincronización'));
  fireEvent.press(screen.getByText('Desconectar'));
  expect(screen.getByText(/Los enlaces Meet preparados pueden seguir funcionando/)).toBeTruthy();
  fireEvent.press(screen.getByText('Desconectar y conservar eventos'));
  await screen.findByText('Desconectando…');
  expect(service.disconnectGoogleCalendar).toHaveBeenCalledTimes(1);
});
test('revoked credentials offer reconnection and pending jobs remain visible', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, status: 'REAUTH_REQUIRED', errorCode: 'REAUTH_REQUIRED', meetAssignmentsEnabled: true, meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleCalendarCard />);
  await screen.findByText('Vuelve a autorizar el acceso');
  expect(screen.getByText('Reconectar Google Calendar')).toBeTruthy();
  expect(screen.queryByText(/Google Meet activo/)).toBeNull();
});

test('connected Daily keeps privacy available without repeating the full disclosure', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetAssignmentsEnabled: true, videoProviderPreference: 'DAILY' });
  render(<GoogleCalendarCard />);
  await screen.findByText(/Un enlace de Meet para cada cita/);
  expect(screen.queryByText(/No se enviarán datos del paciente/)).toBeNull();
  fireEvent.press(screen.getByText('Datos compartidos y privacidad'));
  expect(screen.getByText(/No se enviarán datos del paciente/)).toBeTruthy();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
});

test('Daily with a closed rollout has no irrelevant Meet outage warning', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, meetAssignmentsEnabled: false, videoProviderPreference: 'DAILY' });
  render(<GoogleCalendarCard />);
  await screen.findByText('Conectar Google Calendar');
  expect(screen.queryByText(/Google Meet no está disponible temporalmente/)).toBeNull();
});
test('sync error is visible and can be retried without claiming success', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
  jest.mocked(service.resyncGoogleCalendar).mockRejectedValue(new Error('No se pudo sincronizar.'));
  render(<GoogleCalendarCard />);
  await screen.findByText('Sincronización automática activa');
  expect(screen.queryByText('Revisar sincronización')).toBeNull();
  fireEvent.press(screen.getByText('Opciones de sincronización'));
  fireEvent.press(screen.getByText('Revisar sincronización'));
  await waitFor(() => expect(service.resyncGoogleCalendar).toHaveBeenCalledTimes(1));
  await screen.findByRole('alert');
  expect(screen.getByText('Actualizar estado')).toBeTruthy();
});

test('pending synchronization updates itself without a manual resync', async () => {
  jest.useFakeTimers();
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  try {
    jest.mocked(service.getGoogleCalendarStatus)
      .mockResolvedValueOnce({ ...connected, pending: 1, reconciling: true })
      .mockResolvedValue(connected);
    render(<GoogleCalendarCard />);
    await screen.findByText('Actualizando automáticamente…');
    fireEvent.press(screen.getByText('Opciones de sincronización'));
    expect(screen.getByText(/No necesitas pulsar ningún botón/)).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(10_000); });
    expect(screen.getByText('Sincronización automática activa')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(service.getGoogleCalendarStatus).toHaveBeenCalledTimes(3);
    expect(service.resyncGoogleCalendar).not.toHaveBeenCalled();
  } finally { AppState.currentState = originalState; jest.useRealTimers(); }
});
