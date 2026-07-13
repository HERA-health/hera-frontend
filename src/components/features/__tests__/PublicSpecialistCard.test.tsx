import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PublicSpecialistCard } from '../PublicSpecialistCard';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

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
