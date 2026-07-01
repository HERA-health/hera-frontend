import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import * as sessionsService from '../../../../services/sessionsService';
import { BookingSidebar } from '../BookingSidebar';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../components/location', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    LocationMapPreview: ({ address }: { address: string }) => (
      React.createElement(Text, null, `Mapa de ${address}`)
    ),
  };
});

jest.mock('../../../../services/sessionsService', () => ({
  getAvailableSlots: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedSessionsService = jest.mocked(sessionsService);

const specialist = {
  id: 'specialist-1',
  name: 'Dra. Prueba',
  title: 'Psicóloga sanitaria',
  professionalType: 'PSYCHOLOGIST',
  professionalTypeLabel: 'Psicóloga',
  avatar: undefined,
  bio: '',
  rating: 5,
  reviewCount: 0,
  pricePerSession: 80,
  specializations: [],
  experienceYears: 0,
  therapeuticApproach: undefined,
  languages: ['Español'],
  sessionTypes: [],
  education: [],
  experience: [],
  certifications: [],
  nextAvailable: null,
  slotDuration: 60,
  offersOnline: false,
  offersInPerson: false,
};

describe('BookingSidebar', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows an unavailable CTA when public booking is disabled', () => {
    render(
      <BookingSidebar
        specialist={specialist as never}
        onBookPress={jest.fn()}
        gradientColors={['#006884', '#006884']}
        canBook={false}
      />
    );

    expect(screen.getByText('No acepta reservas ahora')).toBeTruthy();
    expect(screen.getByText('Este perfil no tiene modalidades de reserva pública activas.')).toBeTruthy();
    expect(screen.queryByText('Reservar sesión')).toBeNull();
  });

  it('shows specialist photo context and the availability preview when booking is enabled', async () => {
    render(
      <BookingSidebar
        specialist={{
          ...specialist,
          offersOnline: true,
          nextAvailable: '2026-06-25T10:00:00.000Z',
        } as never}
        onBookPress={jest.fn()}
        onSlotSelect={jest.fn()}
        gradientColors={['#006884', '#006884']}
        canBook
      />
    );

    expect(screen.getByText('Dra. Prueba')).toBeTruthy();
    expect(screen.getByText('Psicóloga sanitaria')).toBeTruthy();
    expect(screen.getByText('Elige tu horario')).toBeTruthy();
    expect(screen.getByText('Reservar sesión')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('No hay horas libres este día.')).toBeTruthy();
    });
  });

  it('keeps booking actions visible while the public map is shown for mixed modalities', async () => {
    render(
      <BookingSidebar
        specialist={{
          ...specialist,
          offersOnline: true,
          offersInPerson: true,
          address: {
            street: 'Calle Prádena del Rincón',
            city: 'Madrid',
            postalCode: '28002',
            latitude: 40.438,
            longitude: -3.676,
          },
        } as never}
        onBookPress={jest.fn()}
        onSlotSelect={jest.fn()}
        gradientColors={['#006884', '#006884']}
        canBook
        showLargePhoto={false}
      />
    );

    expect(screen.getByText('Reservar sesión')).toBeTruthy();
    expect(screen.getByText('Elige tu horario')).toBeTruthy();
    expect(screen.getByText('Calle Prádena del Rincón')).toBeTruthy();
    expect(screen.getByText('Madrid')).toBeTruthy();
    expect(screen.getByText('Mapa de Calle Prádena del Rincón')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('No hay horas libres este día.')).toBeTruthy();
    });
  });

  it('shows the map when the specialist only offers in-person sessions', () => {
    render(
      <BookingSidebar
        specialist={{
          ...specialist,
          offersOnline: false,
          offersInPerson: true,
          address: {
            street: 'Calle Prádena del Rincón',
            city: 'Madrid',
            postalCode: '28002',
            latitude: 40.438,
            longitude: -3.676,
          },
        } as never}
        onBookPress={jest.fn()}
        gradientColors={['#006884', '#006884']}
        canBook={false}
        showLargePhoto={false}
      />
    );

    expect(screen.getByText('Mapa de Calle Prádena del Rincón')).toBeTruthy();
  });
});
