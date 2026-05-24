import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BookingSidebar } from '../BookingSidebar';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../components/location', () => ({
  LocationMapPreview: () => null,
}));

const mockedUseTheme = jest.mocked(useTheme);

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
});
