import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReferralPatientSelector } from '../ReferralPatientSelector';
import { getPatientDirectory, type DirectoryPatient } from '../../../services/patientDirectoryService';
jest.mock('../../../services/patientDirectoryService', () => ({ getPatientDirectory: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
const read = jest.mocked(getPatientDirectory);
const patient = (id: string): DirectoryPatient => ({ id, userId: null, source: 'MANAGED', firstName: null, lastName: null, createdAt: '2026-01-01', displayName: 'Paciente ' + id, primaryEmail: null, primaryPhone: null, initials: 'P', archivedAt: null, treatmentConsentStatus: 'PENDING', sessionCount: 0, nextSessionDate: null, lastValidSessionAt: null, activity: 'NO_SESSIONS', heraOrigin: { origin: 'UNKNOWN' }, user: { id: null, name: 'Paciente ' + id, email: '', phone: '', avatar: null, userType: 'CLIENT' } });
const page = (items: DirectoryPatient[], nextPage: number | null = null) => ({ items, pageInfo: { page: 1, limit: 50, hasMore: nextPage !== null, nextPage }, computedAt: '2026-01-01' });
beforeEach(() => jest.resetAllMocks());
it('searches beyond the first page on the server and selects a patient without sessions', async () => {
  read.mockResolvedValueOnce(page([patient('0')])).mockResolvedValueOnce(page([patient('59')]));
  const onSelect = jest.fn(); render(<ReferralPatientSelector onSelect={onSelect} />);
  fireEvent.press(screen.getByTestId('managed-session-client-selector'));
  expect(await screen.findByText('Paciente 0')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o email'), 'Paciente 59');
  expect(await screen.findByText('Paciente 59')).toBeTruthy();
  expect(read).toHaveBeenLastCalledWith({ q: 'Paciente 59', archive: 'OPEN', page: 1 }, expect.anything());
  fireEvent.press(screen.getByLabelText('Paciente 59, sin email'));
  expect(onSelect).toHaveBeenCalledWith('59');
});
it('loads another bounded page while preserving earlier results', async () => {
  read.mockResolvedValueOnce(page([patient('0')], 2)).mockResolvedValueOnce(page([patient('1')]));
  render(<ReferralPatientSelector onSelect={jest.fn()} />);
  fireEvent.press(screen.getByTestId('managed-session-client-selector'));
  fireEvent.press(await screen.findByText('Cargar más fichas'));
  expect(await screen.findByText('Paciente 1')).toBeTruthy();
  expect(screen.getByText('Paciente 0')).toBeTruthy();
  expect(read).toHaveBeenLastCalledWith({ q: '', archive: 'OPEN', page: 2 }, expect.anything());
});
it('keeps failures distinct from empty results and supports retry', async () => {
  read.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([]));
  render(<ReferralPatientSelector onSelect={jest.fn()} />);
  expect(screen.getByTestId('managed-session-client-selector')).not.toBeDisabled();
  fireEvent.press(screen.getByTestId('managed-session-client-selector'));
  fireEvent.press(await screen.findByText(/Reintentar/));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('No hay fichas disponibles de tu consulta con esa búsqueda.')).toBeTruthy();
});
