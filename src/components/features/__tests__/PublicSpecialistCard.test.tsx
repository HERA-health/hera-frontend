jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options: null})}));
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PublicSpecialistCard } from '../PublicSpecialistCard';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';
import type { PublicSpecialistDirectoryCard } from '../../../services/specialistsService';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const directorySpecialist: PublicSpecialistDirectoryCard = {
  id: 'directory-specialist', name: 'Elena Martín', avatar: 'https://example.com/elena.jpg',
  specialization: 'Psicología sanitaria', professionalType: 'PSYCHOLOGIST_HEALTH',
  professionalTypeLabel: 'Psicóloga sanitaria', pricePerSession: 70,
  offersOnline: true, offersInPerson: true, yearsInPractice: 8, gradientId: null,
  rating: 4.8, reviewCount: 12, collegiateNumber: 'M-123',
  specialties: ['anxiety', 'depression', 'trauma', 'sleep'], languages: ['Español', 'Inglés'],
  officeCity: 'Madrid', descriptionExcerpt: 'Te acompaño a comprender tus emociones.',
};

describe('PublicSpecialistCard', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it.each([false, true])('shows comparison facts once and recovers from a failed portrait (compact: %s)', (compactDirectory) => {
    render(<PublicSpecialistCard specialist={directorySpecialist} variant="directory" compactDirectory={compactDirectory} onPress={jest.fn()} />);
    expect(screen.getByText('Online · Presencial · Madrid')).toBeTruthy();
    expect(screen.getByText(directorySpecialist.descriptionExcerpt!)).toBeTruthy();
    expect(screen.getByText('Español, Inglés')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByText('4,8 · 12 reseñas')).toBeTruthy();
    expect(screen.getByText('8 años de experiencia')).toBeTruthy();
    const portrait = screen.getByLabelText('Retrato de Elena Martín');
    fireEvent(portrait, 'error', { nativeEvent: { error: 'Unavailable' } });
    expect(screen.queryByLabelText('Retrato de Elena Martín')).toBeNull();
    expect(screen.getByText('EM')).toBeTruthy();
  });

  it('keeps private reviews and unavailable location out of the card', () => {
    render(<PublicSpecialistCard specialist={{ ...directorySpecialist, offersInPerson: false, reviewCount: null, rating: null, descriptionExcerpt: null }} variant="directory" onPress={jest.fn()} />);
    expect(screen.getByText('Valoraciones no públicas')).toBeTruthy();
    expect(screen.queryByText(/Madrid/)).toBeNull();
    expect(screen.queryByText(/4,8/)).toBeNull();
    expect(screen.queryByText(directorySpecialist.descriptionExcerpt!)).toBeNull();
  });

  it('uses the matched price and duration, including free and telephone sessions', () => {
    const specialist: PublicSpecialistDirectoryCard = {
      ...directorySpecialist, offersOnline: false, offersInPerson: false, offersPhone: true, pricePerSession: 0,
      matchedOptionId: 'free',
      publicOptions: [
        { specialistId: 'directory-specialist', optionId: 'free', priceCents: 0, durationMinutes: 20, modality: 'PHONE_CALL' },
        { specialistId: 'directory-specialist', optionId: 'paid', priceCents: 7000, durationMinutes: 60, modality: 'PHONE_CALL' },
      ],
    };
    const { rerender } = render(<PublicSpecialistCard specialist={specialist} variant="directory" onPress={jest.fn()} />);
    expect(screen.getByText('Llamada')).toBeTruthy();
    expect(screen.getByText(/Sin coste/)).toBeTruthy();
    expect(screen.getByText('por sesión · 20 min')).toBeTruthy();
    rerender(<PublicSpecialistCard specialist={{ ...specialist, pricePerSession: 70, matchedOptionId: 'paid' }} variant="directory" onPress={jest.fn()} />);
    expect(screen.getByText('70 €')).toBeTruthy();
    expect(screen.queryByText(/Desde/)).toBeNull();
    expect(screen.getByText('por sesión · 60 min')).toBeTruthy();
  });

  it('does not invent a duration for ambiguous prices', () => {
    render(<PublicSpecialistCard specialist={{
      ...directorySpecialist, publicOptions: [
        { specialistId: 'directory-specialist', optionId: 'a', priceCents: 7000, durationMinutes: 45, modality: 'VIDEO_CALL' },
        { specialistId: 'directory-specialist', optionId: 'b', priceCents: 7000, durationMinutes: 60, modality: 'IN_PERSON' },
      ],
    }} variant="directory" onPress={jest.fn()} />);
    expect(screen.getByText('por sesión')).toBeTruthy();
    expect(screen.queryByText(/min$/)).toBeNull();
  });

  it('renders a crawlable profile link and keeps ordinary clicks in SPA navigation', () => {
    const onPress = jest.fn();
    const preventDefault = jest.fn();

    render(
      <PublicSpecialistCard
        specialist={{
          id: 'specialist-1',
          name: 'Elena Martín',
          avatar: 'https://example.com/elena.jpg',
          specialization: 'Psicología sanitaria',
          professionalType: 'PSYCHOLOGIST_HEALTH',
          professionalTypeLabel: 'Psicóloga sanitaria',
          pricePerSession: 70,
          offersOnline: true,
          offersInPerson: false,
          yearsInPractice: 8,
          gradientId: 'salvia-lavanda',
          rating: 4.8,
          reviewCount: 12,
        }}
        variant="featured"
        href="/especialista/specialist-1"
        onPress={onPress}
      />
    );

    const link = screen.getByRole('link');
    expect(link.props.href).toBe('/especialista/specialist-1');

    fireEvent.press(link, {
      nativeEvent: { button: 0 },
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['featured', 'directory'] as const)('renders initials and an accessible profile without a photo in %s', (variant) => {
    const onPress = jest.fn();
    render(
      <PublicSpecialistCard
        specialist={{
          id: 'specialist-no-photo',
          name: 'Elena Martín',
          avatar: null,
          specialization: 'Psicología sanitaria',
          professionalType: 'PSYCHOLOGIST_HEALTH',
          professionalTypeLabel: 'Psicóloga sanitaria',
          pricePerSession: 70,
          offersOnline: true,
          offersInPerson: false,
          yearsInPractice: null,
          gradientId: 'salvia-lavanda',
          rating: null,
          reviewCount: 0,
        }}
        variant={variant}
        onPress={onPress}
      />
    );

    expect(screen.getByText('EM')).toBeTruthy();
    expect(screen.queryByLabelText('Retrato de Elena Martín')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Abrir el perfil de Elena Martín' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('preserves the browser behavior for modified link clicks', () => {
    const onPress = jest.fn();
    const preventDefault = jest.fn();

    render(
      <PublicSpecialistCard
        specialist={{
          id: 'specialist-2',
          name: 'Lucía Pérez',
          avatar: 'https://example.com/lucia.jpg',
          specialization: 'Psicología sanitaria',
          professionalType: 'PSYCHOLOGIST_HEALTH',
          professionalTypeLabel: 'Psicóloga sanitaria',
          pricePerSession: 65,
          offersOnline: true,
          offersInPerson: false,
          yearsInPractice: 6,
          gradientId: 'salvia-lavanda',
          rating: 4.9,
          reviewCount: 8,
        }}
        variant="featured"
        href="/especialista/specialist-2"
        onPress={onPress}
      />
    );

    fireEvent.press(screen.getByRole('link'), {
      nativeEvent: { button: 0, ctrlKey: true },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
