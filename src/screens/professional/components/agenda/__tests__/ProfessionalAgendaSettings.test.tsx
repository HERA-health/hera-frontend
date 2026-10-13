import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalAgendaSettings } from '../ProfessionalAgendaSettings';
import { getAgendaPreferences, updateAgendaPreferences } from '../../../../../services/professionalService';

jest.mock('../../../../../services/professionalService', () => ({ getAgendaPreferences: jest.fn(), updateAgendaPreferences: jest.fn() }));
const preferences = { autoConfirmSessionRequests: true, emailSessionRequestsEnabled: true, emailSessionCancellationsEnabled: true, emailSessionReminder24hEnabled: false };
const props = () => ({ visible: true, anchor: { x: 900, y: 120 }, onClose: jest.fn(), onGoogleCalendar: jest.fn(), onAvailability: jest.fn() });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getAgendaPreferences).mockResolvedValue(preferences); });

it('saves only changed preferences and closes on confirmed success', async () => {
  const callbacks = props();
  jest.mocked(updateAgendaPreferences).mockResolvedValue({ ...preferences, emailSessionReminder24hEnabled: true });
  const screen = render(<ProfessionalAgendaSettings {...callbacks} />);
  await waitFor(() => expect(screen.getByLabelText('Recordatorio 24 h antes')).toBeTruthy());
  fireEvent(screen.getByLabelText('Recordatorio 24 h antes'), 'valueChange', true);
  fireEvent.press(screen.getByText('Guardar'));
  await waitFor(() => expect(updateAgendaPreferences).toHaveBeenCalledWith({ emailSessionReminder24hEnabled: true }));
  await waitFor(() => expect(callbacks.onClose).toHaveBeenCalled());
});

it('does not invent defaults on load failure and allows retry', async () => {
  jest.mocked(getAgendaPreferences).mockRejectedValueOnce(new Error('Sin conexión'));
  const screen = render(<ProfessionalAgendaSettings {...props()} />);
  await waitFor(() => expect(screen.getByText('Sin conexión')).toBeTruthy());
  expect(screen.queryByRole('switch')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  await waitFor(() => expect(screen.getByLabelText('Confirmación automática')).toBeTruthy());
  expect(updateAgendaPreferences).not.toHaveBeenCalled();
});

it('keeps the draft after failed save and blocks dismissing while saving', async () => {
  const callbacks = props();
  let rejectSave: (error: Error) => void = () => {};
  jest.mocked(updateAgendaPreferences).mockReturnValue(new Promise((_resolve, reject) => { rejectSave = reject; }));
  const screen = render(<ProfessionalAgendaSettings {...callbacks} />);
  await waitFor(() => expect(screen.getByLabelText('Confirmación automática')).toBeTruthy());
  fireEvent(screen.getByLabelText('Confirmación automática'), 'valueChange', false);
  fireEvent.press(screen.getByText('Guardar'));
  fireEvent.press(screen.getByLabelText('Cerrar ajustes'));
  expect(callbacks.onClose).not.toHaveBeenCalled();
  await act(async () => rejectSave(new Error('Error al guardar')));
  expect(screen.getByLabelText('Confirmación automática').props.value).toBe(false);
  expect(screen.getByText('Error al guardar')).toBeTruthy();
  fireEvent.press(screen.getByText('Cancelar'));
  expect(callbacks.onClose).toHaveBeenCalledTimes(1);
});
