import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { Specialist } from '../../types';
import { ProfileHeroEditorial } from '../ProfileHeroEditorial';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const specialist: Specialist = {
  id: 'specialist-1',
  publicSlug: 'maria-lansac',
  name: 'María del Carmen Lansac Fernández',
  title: 'Psicóloga sanitaria',
  avatar: 'https://res.cloudinary.com/hera/image/upload/v1/avatar.jpg',
  bio: 'Acompaño procesos de ansiedad y trauma desde un espacio seguro y cercano. '.repeat(8),
  rating: 4.9,
  reviewCount: 12,
  pricePerSession: 70,
  specializations: ['anxiety', 'trauma'],
  sessionTypes: ['VIDEO_CALL'],
  offersOnline: true,
  offersInPerson: true,
  yearsInPractice: 8,
  languagesSpoken: ['Español', 'English'],
  languages: ['español', 'Francés'],
  verificationStatus: 'VERIFIED',
  collegiateNumber: '33996',
};

const renderHero = (overrides: Partial<Specialist> = {}) => render(
  <ProfileHeroEditorial
    specialist={{ ...specialist, ...overrides }}
    onBookPress={jest.fn()}
    onRatingPress={jest.fn()}
    gradientColors={['#123456', '#654321']}
    onSharePress={jest.fn()}
    bio={{ ...specialist, ...overrides }.bio}
    isFavorite={false}
    onFavoritePress={jest.fn()}
    showFavoriteAction
  />,
);

describe('ProfileHeroEditorial', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => jest.clearAllMocks());

  it('renders a contained face-aware portrait, long name and Spanish language list', () => {
    renderHero();

    expect(screen.getByText(specialist.name)).toBeTruthy();
    expect(screen.queryByText('ACOMPAÑAMIENTO PROFESIONAL')).toBeNull();
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText('Inglés')).toBeTruthy();
    expect(screen.getByText('Francés')).toBeTruthy();
    expect(screen.getByLabelText('Bandera asociada a Español')).toBeTruthy();
    expect(screen.getByLabelText('Bandera asociada a Inglés')).toBeTruthy();
    expect(screen.getByText('Videollamada')).toBeTruthy();
    expect(screen.getByText('Presencial')).toBeTruthy();
    expect(screen.getByLabelText(`Fotografía de ${specialist.name}`).props.source.uri).toContain(
      'c_fill,g_auto:faces,w_900,h_675,q_auto:good,f_auto',
    );
  });

  it('explains HERA verification and exposes the collegiate number', () => {
    renderHero();
    expect(screen.getByText('Col. 33996')).toBeTruthy();
    fireEvent.press(screen.getByText('Col. 33996'));

    expect(screen.getByText('Colegiación revisada por HERA')).toBeTruthy();
    expect(screen.getByText('Hemos comprobado el número y el carnet profesional aportado.')).toBeTruthy();
    expect(screen.getByText('N.º de colegiado: 33996')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('verification-popover').props.style).position).toBe('absolute');
  });

  it('uses initials when no avatar is available', () => {
    renderHero({ avatar: undefined, name: 'Ana' });

    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Especialista HERA')).toBeTruthy();
  });

  it('expands and collapses a long biography', () => {
    renderHero();
    expect(screen.getByText('Leer más')).toBeTruthy();
    fireEvent.press(screen.getByText('Leer más'));
    expect(screen.getByText('Leer menos')).toBeTruthy();
  });
  it('shows every language and primary area without hidden overflow counters', () => {
    renderHero({
      languagesSpoken: ['Español', 'English', 'Catalán', 'Francés'],
      languages: ['Alemán', 'Portugués'],
      specializations: ['anxiety', 'depression', 'trauma', 'couples', 'grief', 'sleep'],
    });

    ['Español', 'Inglés', 'Catalán', 'Francés', 'Alemán', 'Portugués'].forEach((language) => {
      expect(screen.getByText(language)).toBeTruthy();
    });
    ['Ansiedad', 'Depresión', 'Trauma', 'Terapia de pareja', 'Duelo', 'Problemas de sueño'].forEach((area) => {
      expect(screen.getByText(area)).toBeTruthy();
    });
    expect(screen.queryByText(/\+\d+ áreas/)).toBeNull();
  });

  it('does not reserve desktop flex-basis heights when facts are stacked on mobile', () => {
    renderHero();

    [
      'profile-facts-languages',
      'profile-facts-modality',
      'profile-facts-specializations',
    ].forEach((testId) => {
      const style = StyleSheet.flatten(screen.getByTestId(testId).props.style);
      expect(style.flexGrow).toBe(0);
      expect(style.flexBasis).toBe('auto');
    });
  });
});
