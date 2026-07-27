import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  canUseStickyBookingSummary,
  ProfessionalInfoColumn,
} from '../ProfessionalInfoColumn';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../components/location', () => {
  const { Text } = require('react-native');

  return {
    LocationMapPreview: ({ address, city }: { address: string; city: string }) => (
      <Text>{`Mapa: ${address}, ${city}`}</Text>
    ),
  };
});

const mockedUseTheme = jest.mocked(useTheme);

const baseSpecialist = {
  id: 'specialist-1',
  name: 'Dra. Prueba',
  title: 'Psicóloga sanitaria',
  pricePerSession: 80,
  specializations: ['Ansiedad'],
  sessionDuration: 60,
};

const baseBooking = {
  selectedDate: '2026-05-20',
  selectedTime: '10:00',
  sessionType: 'VIDEO_CALL' as const,
};

describe('ProfessionalInfoColumn', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not show a fallback price when booking quote failed', () => {
    render(
      <ProfessionalInfoColumn
        specialist={baseSpecialist}
        booking={baseBooking}
        availableSessionTypes={['VIDEO_CALL']}
        onPrimaryAction={jest.fn()}
        actionLabel="Confirmar cita"
        bookingQuote={null}
        quoteLoading={false}
        quoteError="No se pudo calcular el precio de la reserva."
      />
    );

    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No se pudo calcular el precio de la reserva.').length).toBeGreaterThan(0);
    expect(screen.queryByText('80€ / sesión')).toBeNull();
  });

  it('labels anonymous pre-email quotes as the specialist price without blocking price display', () => {
    render(
      <ProfessionalInfoColumn
        specialist={baseSpecialist}
        booking={baseBooking}
        availableSessionTypes={['VIDEO_CALL']}
        onPrimaryAction={jest.fn()}
        actionLabel="Confirmar cita"
        bookingQuote={{
          specialistId: 'specialist-1',
          duration: 60,
          currency: 'EUR',
          price: 80,
          basePrice: 80,
          tariffId: null,
          tariffName: null,
          baseTariffName: null,
          firstVisitFreeApplied: false,
        }}
        quoteIsEstimated
      />
    );

    expect(screen.getAllByText('80€ / sesión').length).toBeGreaterThan(0);
    expect(screen.getByText('Precio del profesional')).toBeTruthy();
    expect(screen.getByText('Precio publicado por el profesional.')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByText('Precio del profesional').props.style).color,
    ).toBe(lightTheme.textSecondary);
  });

  it('only enables sticky positioning when the full summary fits in the viewport', () => {
    expect(
      canUseStickyBookingSummary({
        contentHeight: 648,
        requested: true,
        viewportHeight: 768,
      }),
    ).toBe(true);
    expect(
      canUseStickyBookingSummary({
        contentHeight: 649,
        requested: true,
        viewportHeight: 768,
      }),
    ).toBe(false);
    expect(
      canUseStickyBookingSummary({
        contentHeight: 600,
        requested: false,
        viewportHeight: 900,
      }),
    ).toBe(false);
    expect(
      canUseStickyBookingSummary({
        contentHeight: 0,
        requested: true,
        viewportHeight: 900,
      }),
    ).toBe(false);
  });

  it('exposes each summary value as a single accessible row', () => {
    render(
      <ProfessionalInfoColumn
        specialist={baseSpecialist}
        booking={baseBooking}
        availableSessionTypes={['VIDEO_CALL']}
        onPrimaryAction={jest.fn()}
        actionLabel="Confirmar cita"
      />,
    );

    expect(screen.getByLabelText(/Fecha:/)).toBeTruthy();
    expect(screen.getByLabelText('Hora: 10:00')).toBeTruthy();
    expect(screen.getByLabelText(/60 min/)).toBeTruthy();
  });

  it('includes the consultation address in the summary for in-person bookings', () => {
    render(
      <ProfessionalInfoColumn
        specialist={{
          ...baseSpecialist,
          officeLocation: {
            street: 'Calle de Alcalá, 42',
            city: 'Madrid',
            postalCode: '28014',
            latitude: 40.418,
            longitude: -3.696,
          },
        }}
        booking={{
          ...baseBooking,
          sessionType: 'IN_PERSON',
        }}
        availableSessionTypes={['IN_PERSON']}
        onPrimaryAction={jest.fn()}
        actionLabel="Confirmar cita"
      />
    );

    expect(screen.getByText('Consulta')).toBeTruthy();
    expect(screen.getByText('Calle de Alcalá, 42, 28014 Madrid')).toBeTruthy();
    expect(screen.getByText('UBICACIÓN DE LA CONSULTA')).toBeTruthy();
    expect(screen.getByText('Mapa: Calle de Alcalá, 42, 28014 Madrid')).toBeTruthy();
  });

  it('does not render the consultation map for a video appointment', () => {
    render(
      <ProfessionalInfoColumn
        specialist={{
          ...baseSpecialist,
          officeLocation: {
            street: 'Calle de Alcalá, 42',
            city: 'Madrid',
            postalCode: '28014',
            latitude: 40.418,
            longitude: -3.696,
          },
        }}
        booking={baseBooking}
        availableSessionTypes={['VIDEO_CALL', 'IN_PERSON']}
        onPrimaryAction={jest.fn()}
        actionLabel="Confirmar cita"
      />
    );

    expect(screen.queryByText('Mapa: Calle de Alcalá, 42, 28014 Madrid')).toBeNull();
  });
});
