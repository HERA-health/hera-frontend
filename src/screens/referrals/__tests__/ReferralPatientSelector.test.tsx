import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReferralPatientSelector } from '../ReferralPatientSelector';
import { getProfessionalClients, type Client } from '../../../services/professionalService';

jest.mock('../../../services/professionalService', () => ({ getProfessionalClients: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }),
}));

const loadClients = jest.mocked(getProfessionalClients);
const clients: Client[] = Array.from({ length: 60 }, (_, index) => ({
  id: `client-${index}`, userId: null, source: 'MANAGED',
  user: { id: null, name: `Paciente ${index}`, email: `persona${index}@example.invalid`, userType: 'CLIENT' },
}));

beforeEach(() => jest.resetAllMocks());

it('shows patients without typing and searches the whole list by name or email before selecting the ID', async () => {
  loadClients.mockResolvedValue(clients);
  const onSelect = jest.fn();
  render(<ReferralPatientSelector onSelect={onSelect} />);
  fireEvent.press(await screen.findByTestId('managed-session-client-selector'));
  expect(screen.getByText('Paciente 0')).toBeTruthy();
  expect(screen.queryByText('Paciente 59')).toBeNull();
  const search = screen.getByPlaceholderText('Buscar por nombre o email');
  fireEvent.changeText(search, 'Paciente 59');
  expect(screen.getByText('Paciente 59')).toBeTruthy();
  fireEvent.changeText(search, 'PERSONA59@EXAMPLE.INVALID');
  fireEvent.press(screen.getByLabelText('Paciente 59, persona59@example.invalid'));
  expect(onSelect).toHaveBeenCalledWith('client-59');
  expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();
  expect(loadClients).toHaveBeenCalledTimes(1);
  expect(loadClients).toHaveBeenCalledWith({ source: 'ALL', lifecycle: 'ACTIVE' });
});

it('distinguishes no search results from an empty patient list', async () => {
  loadClients.mockResolvedValue(clients);
  render(<ReferralPatientSelector onSelect={jest.fn()} />);
  fireEvent.press(await screen.findByTestId('managed-session-client-selector'));
  fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o email'), 'inexistente');
  expect(screen.getByText('No hay pacientes activos de tu consulta con esa búsqueda.')).toBeTruthy();
});

it('allows retrying a failed load', async () => {
  loadClients.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(clients);
  render(<ReferralPatientSelector onSelect={jest.fn()} />);
  fireEvent.press(await screen.findByText('Reintentar'));
  expect(await screen.findByText('Selecciona un paciente')).toBeTruthy();
  expect(loadClients).toHaveBeenCalledTimes(2);
});

it('disables the selector when there are no active patients', async () => {
  loadClients.mockResolvedValue([]);
  render(<ReferralPatientSelector onSelect={jest.fn()} />);
  expect(await screen.findByText('No hay pacientes disponibles')).toBeTruthy();
  expect(screen.getByTestId('managed-session-client-selector')).toBeDisabled();
  expect(screen.getByText('Tus pacientes activos aparecerán aquí')).toBeTruthy();
});
