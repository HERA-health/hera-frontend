import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ProfessionalInfoColumn } from '../ProfessionalInfoColumn';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

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
        onConfirm={jest.fn()}
        onSessionTypeChange={jest.fn()}
        availableSessionTypes={['VIDEO_CALL']}
        bookingQuote={null}
        quoteLoading={false}
        quoteError="No se pudo calcular el precio de la reserva."
        canConfirm={false}
      />
    );

    expect(screen.getAllByText('Precio no disponible').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No se pudo calcular el precio de la reserva.').length).toBeGreaterThan(0);
    expect(screen.queryByText('80€ / sesión')).toBeNull();
  });
});
