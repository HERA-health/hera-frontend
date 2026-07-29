import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { Specialist } from '../../types';
import { BookingSidebarEditorial } from '../BookingSidebarEditorial';

jest.mock('../../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../components/location', () => ({
  LocationMapPreview: () => null,
}));
jest.mock('../SelectableAvailabilityPreview', () => ({
  SelectableAvailabilityPreview: () => null,
}));

const mockedUseTheme = jest.mocked(useTheme);

const specialist: Specialist = {
  id: 'specialist-1',
  name: 'María Lansac',
  title: 'Psicóloga sanitaria',
  bio: 'Bio',
  rating: 5,
  reviewCount: 1,
  pricePerSession: 60,
  specializations: ['anxiety'],
  sessionTypes: ['VIDEO_CALL'],
  offersOnline: true,
  offersInPerson: false,
  firstVisitFree: true,
  slotDuration: 60,
};

describe('BookingSidebarEditorial', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => jest.clearAllMocks());

  it('shows the honest first-session-free explanation', () => {
    render(
      <BookingSidebarEditorial
        specialist={specialist}
        onBookPress={jest.fn()}
        selectedSlot={null}
        onSlotChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Primera sesión gratuita con este especialista')).toBeTruthy();
    expect(screen.getByText(
      'Se aplicará si aún no has tenido sesiones con este profesional.',
    )).toBeTruthy();
    expect(screen.getByText('Reservar sesión')).toBeTruthy();
  });

  it('uses the selected slot in the CTA and continues only when pressed', () => {
    const onBookPress = jest.fn();
    render(
      <BookingSidebarEditorial
        specialist={specialist}
        onBookPress={onBookPress}
        selectedSlot={{
          date: '2026-07-29',
          slot: { startTime: '11:05', endTime: '12:05', available: true },
        }}
        onSlotChange={jest.fn()}
      />,
    );

    expect(onBookPress).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Continuar · mié 29 jul, 11:05'));
    expect(onBookPress).toHaveBeenCalledTimes(1);
  });

  it('preserves the unavailable booking state', () => {
    render(
      <BookingSidebarEditorial
        specialist={{ ...specialist, offersOnline: false }}
        onBookPress={jest.fn()}
        onSlotChange={jest.fn()}
        canBook={false}
      />,
    );

    expect(screen.getByText('No acepta reservas ahora')).toBeTruthy();
    expect(screen.getByText(
      'Este perfil no tiene modalidades de reserva pública activas.',
    )).toBeTruthy();
  });

  it('formats ISO availability using the Europe/Madrid calendar date', () => {
    render(
      <BookingSidebarEditorial
        specialist={{
          ...specialist,
          nextAvailable: '2099-07-28T22:30:00.000Z',
        }}
        onBookPress={jest.fn()}
        selectedSlot={null}
        onSlotChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Próxima cita: miércoles, 29 jul')).toBeTruthy();
  });
});
