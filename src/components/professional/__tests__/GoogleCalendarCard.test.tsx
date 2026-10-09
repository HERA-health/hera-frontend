jest.mock('../../../services/legalService', () => ({ getLegalCatalog: jest.fn(async () => [{ key: 'PRIVACY_POLICY', version: '2026-10-09' }]) }));
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { GoogleCalendarCard } from '../GoogleCalendarCard';
import * as service from '../../../services/googleCalendarService';
const mockNavigate = jest.fn();

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', type: 'professional' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../services/googleCalendarService', () => ({
  setVideoPreference: jest.fn(), getGoogleCalendarStatus: jest.fn(), connectGoogleCalendar: jest.fn(), disconnectGoogleCalendar: jest.fn(), resyncGoogleCalendar: jest.fn(),
}));
const disconnected: service.GoogleCalendarStatus = { enabled: true, status: 'DISCONNECTED', videoSetupCompleted: false, email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false };
const connected: service.GoogleCalendarStatus = { ...disconnected, status: 'CONNECTED', email: 'professional@example.invalid', activationConnection: { id: 'connection-a', generation: 1 } };
beforeEach(() => { jest.clearAllMocks(); });

test('guided setup leads from Calendar to a separate Meet activation after OAuth', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, meetAssignmentsEnabled: true, videoProviderPreference: 'DAILY' });
  const first = render(<GoogleCalendarCard videoSetup />);
  await screen.findByText('Paso 1 de 2 · Conecta tu cuenta de Google');
  fireEvent.press(screen.getByText('Conectar Google y continuar'));
  expect(screen.getByText(/Activar Meet será un paso adicional/)).toBeTruthy();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  first.unmount();

  // Returning from OAuth mounts the account settings with the saved online modality.
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-10-09', videoProviderPreference: 'DAILY' });
  jest.mocked(service.setVideoPreference).mockResolvedValue({ ...connected, meetAssignmentsEnabled: true, meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleCalendarCard videoSetup />);
  await screen.findByText('Paso 2 de 2 · Activa Google Meet');
  fireEvent.press(screen.getByText('Activar Google Meet'));
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Aceptar y activar Google Meet'));
  await screen.findByText('Google Meet activo');
  expect(screen.queryByText('Paso 2 de 2 · Activa Google Meet')).toBeNull();
});

test('profile edits finish saving before OAuth starts', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(disconnected);
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  let finishSave: (value: boolean) => void = () => { throw new Error('Save not started'); };
  const onBeforeConnect = jest.fn(() => new Promise<boolean>(resolve => { finishSave = resolve; }));
  render(<GoogleCalendarCard hasUnsavedChanges onBeforeConnect={onBeforeConnect} />);
  fireEvent.press(await screen.findByText('Conectar Google Calendar'));
  expect(screen.getByText(/guardaremos los cambios pendientes de tu perfil/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continuar con Google'));
  expect(onBeforeConnect).toHaveBeenCalledTimes(1);
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
  await act(async () => { finishSave(true); });
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledTimes(1));
});

test('a failed profile save leaves OAuth untouched', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(disconnected);
  const onBeforeConnect = jest.fn(async () => false);
  render(<GoogleCalendarCard onBeforeConnect={onBeforeConnect} />);
  fireEvent.press(await screen.findByText('Conectar Google Calendar'));
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(screen.queryByText('Continuar con Google')).toBeNull());
  expect(onBeforeConnect).toHaveBeenCalledTimes(1);
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
});

test.each(['CONNECTED', 'REAUTH_REQUIRED'] as const)('outdated privacy offers immediate renewal from %s and hides the obsolete meeting count', async status => {
  const oldStatus = { ...connected, status, privacyUpdateRequired: true, pendingMeetings: 10,
    meetAssignmentsEnabled: true, videoProviderPreference: 'DAILY' as const };
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(oldStatus);
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Reconectar Google Calendar'));
  expect(screen.queryByText('Sincronización automática activa')).toBeNull();
  expect(screen.queryByText('Activar Google Meet')).toBeNull();
  expect(screen.queryByText(/Videollamadas pendientes/)).toBeNull();
  expect(screen.getByText('Renueva la autorización de Calendar')).toBeTruthy();
  expect(screen.getByText('Renueva la autorización de Google')).toBeTruthy();
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional', '2026-10-09'));
  expect(service.disconnectGoogleCalendar).not.toHaveBeenCalled();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
});

test('existing Calendar requires explicit Meet consent and keeps OAuth separate', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetEnabled: false, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-10-09', videoProviderPreference: 'DAILY' });
  jest.mocked(service.setVideoPreference).mockResolvedValue({ ...connected, meetEnabled: true, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Activar Google Meet'));
  expect(screen.getByText(/Daily se utilizará automáticamente solo como respaldo de emergencia/)).toBeTruthy();
  expect(screen.getByText('Leer condiciones del respaldo de emergencia')).toBeTruthy();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Ahora no'));
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Activar Google Meet'));
  fireEvent.press(screen.getByText('Aceptar y activar Google Meet'));
  await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('GOOGLE_MEET', '2026-10-09', { id: 'connection-a', generation: 1 }));
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
});

test('the emergency disclosure opens the exact privacy version shown before accepting', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetEnabled: false,
    meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-10-09', videoProviderPreference: 'DAILY' });
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Activar Google Meet'));
  fireEvent.press(screen.getByText('Leer condiciones del respaldo de emergencia'));
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', { documentKey: 'PRIVACY_POLICY', version: '2026-10-09' });
  expect(service.setVideoPreference).not.toHaveBeenCalled();
});

test('account refresh never substitutes an organizer in an open acceptance', async () => {
  jest.useFakeTimers();
  const previous = AppState.currentState; AppState.currentState = 'active';
  const activatable = { ...connected, meetEnabled: false, meetAssignmentsEnabled: true, meetDisclosureVersion: '2026-10-09', videoProviderPreference: 'DAILY' as const };
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
    await waitFor(() => expect(service.setVideoPreference).toHaveBeenCalledWith('GOOGLE_MEET', '2026-10-09', connected.activationConnection));
    await screen.findByText('La conexión de Google ha cambiado.');
    expect(screen.queryByText('Aceptar y activar Google Meet')).toBeNull();
    fireEvent.press(screen.getByText('Activar Google Meet'));
    expect(screen.getByText(/principal de second@example.invalid/)).toBeTruthy();
    expect(service.setVideoPreference).toHaveBeenCalledTimes(1);
  } finally { AppState.currentState = previous; jest.useRealTimers(); }
});

test.each(['GOOGLE_MEET', 'DAILY'] as const)('completed %s setup never reopens onboarding or offers provider choices', async provider => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, videoSetupCompleted: true, meetAssignmentsEnabled: true, videoProviderPreference: provider });
  render(<GoogleCalendarCard videoSetup />);
  await screen.findByText('professional@example.invalid');
  expect(screen.queryByText(/Paso [12] de 2/)).toBeNull();
  expect(screen.queryByText('Usar videollamadas sin Google')).toBeNull();
  expect(screen.queryByText('Videollamadas · Otras opciones')).toBeNull();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
});

test('closed Meet rollout explains the limitation without changing an existing preference', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, meetEnabled: true, meetAssignmentsEnabled: false, videoProviderPreference: 'GOOGLE_MEET' });
  render(<GoogleCalendarCard />);
  await screen.findByText(/Google Meet no está disponible temporalmente/);
  expect(screen.queryByText(/Google Meet activo/)).toBeNull();
  expect(screen.queryByText('Activar Google Meet')).toBeNull();
  expect(service.setVideoPreference).not.toHaveBeenCalled();
  expect(screen.getByText(/Revisa la integración para continuar con Meet/)).toBeTruthy();
  expect(screen.queryByText(/Daily/)).toBeNull();
});

test('closed Meet rollout still allows Calendar connection without promising video activation', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...disconnected, meetAssignmentsEnabled: false, videoProviderPreference: 'DAILY' });
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  render(<GoogleCalendarCard />);
  fireEvent.press(await screen.findByText('Conectar Google Calendar'));
  expect(screen.queryByText('Conectar Google para mis videollamadas')).toBeNull();
  expect(service.connectGoogleCalendar).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional', '2026-10-09'));
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
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional', '2026-10-09'));
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

test('slow synchronization remains refreshable after bounded automatic polling stops', async () => {
  jest.useFakeTimers();
  const previous = AppState.currentState; AppState.currentState = 'active';
  try {
    jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, pending: 1 });
    render(<GoogleCalendarCard />);
    await screen.findByText('Actualizando automáticamente…');
    for (let tick = 0; tick < 7; tick++) await act(async () => { jest.advanceTimersByTime(10_000); });
    expect(service.getGoogleCalendarStatus).toHaveBeenCalledTimes(7);
    jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
    fireEvent.press(screen.getByText('Actualizar estado'));
    await screen.findByText('Sincronización automática activa');
    expect(service.resyncGoogleCalendar).not.toHaveBeenCalled();
  } finally { AppState.currentState = previous; jest.useRealTimers(); }
});
