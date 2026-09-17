import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GoogleCalendarCard } from '../GoogleCalendarCard';
import * as service from '../../../services/googleCalendarService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', type: 'professional' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../services/googleCalendarService', () => ({
  getGoogleCalendarStatus: jest.fn(), connectGoogleCalendar: jest.fn(), disconnectGoogleCalendar: jest.fn(), resyncGoogleCalendar: jest.fn(),
}));
const disconnected: service.GoogleCalendarStatus = { enabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: false };
const connected: service.GoogleCalendarStatus = { ...disconnected, status: 'CONNECTED', email: 'professional@example.invalid' };
beforeEach(() => { jest.clearAllMocks(); });
test('explains the data exported and starts a real connection action', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(disconnected);
  jest.mocked(service.connectGoogleCalendar).mockResolvedValue(null);
  render(<GoogleCalendarCard />);
  await screen.findByText('Sin conectar');
  expect(screen.getByText(/No se enviarán datos del paciente/)).toBeTruthy();
  expect(screen.getByText(/no se importan ni bloquean/)).toBeTruthy();
  fireEvent.press(screen.getByText('Conectar Google Calendar'));
  await waitFor(() => expect(service.connectGoogleCalendar).toHaveBeenCalledWith('professional'));
});
test('disconnect explicitly conserves copies and shows asynchronous disconnect state', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
  jest.mocked(service.disconnectGoogleCalendar).mockResolvedValue({ ...connected, status: 'DISCONNECTING' });
  render(<GoogleCalendarCard />);
  await screen.findByText('professional@example.invalid');
  fireEvent.press(screen.getByText('Desconectar'));
  expect(screen.getByText('Las citas ya copiadas permanecerán en Google y dejarán de actualizarse.')).toBeTruthy();
  fireEvent.press(screen.getByText('Desconectar y conservar eventos'));
  await screen.findByText('Desconectando…');
  expect(service.disconnectGoogleCalendar).toHaveBeenCalledTimes(1);
});
test('revoked credentials offer reconnection and pending jobs remain visible', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue({ ...connected, status: 'REAUTH_REQUIRED', errorCode: 'REAUTH_REQUIRED' });
  render(<GoogleCalendarCard />);
  await screen.findByText('Vuelve a autorizar el acceso');
  expect(screen.getByText('Reconectar Google Calendar')).toBeTruthy();
});
test('sync error is visible and can be retried without claiming success', async () => {
  jest.mocked(service.getGoogleCalendarStatus).mockResolvedValue(connected);
  jest.mocked(service.resyncGoogleCalendar).mockRejectedValue(new Error('No se pudo sincronizar.'));
  render(<GoogleCalendarCard />);
  await screen.findByText('Calendario actualizado');
  fireEvent.press(screen.getByText('Sincronizar ahora'));
  await waitFor(() => expect(service.resyncGoogleCalendar).toHaveBeenCalledTimes(1));
  await screen.findByRole('alert');
  expect(screen.getByText('Actualizar estado')).toBeTruthy();
});
