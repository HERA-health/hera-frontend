import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SpecializationsGrid } from '../SpecializationsGrid';

const mockUseWindowDimensions = jest.fn();

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  Object.defineProperty(actual, 'useWindowDimensions', {
    value: () => mockUseWindowDimensions(),
  });
  return actual;
});

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('SpecializationsGrid', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockUseWindowDimensions.mockReturnValue({
      fontScale: 1,
      height: 844,
      scale: 1,
      width: 390,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts collapsed on mobile and expands areas on press', () => {
    render(<SpecializationsGrid specializations={['anxiety', 'depression']} />);

    expect(screen.getByText('Áreas de especialización')).toBeTruthy();
    expect(screen.queryByText('Ansiedad')).toBeNull();

    fireEvent.press(screen.getByTestId('specializations-disclosure-header'));

    expect(screen.getByText('Ansiedad')).toBeTruthy();
    expect(screen.getByText('Depresión')).toBeTruthy();
  });

  it('starts expanded on desktop when the profile has four or fewer areas', () => {
    mockUseWindowDimensions.mockReturnValue({
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1024,
    });

    render(<SpecializationsGrid specializations={['anxiety', 'depression', 'trauma']} />);

    expect(screen.getByText('Ansiedad')).toBeTruthy();
    expect(screen.getByText('Trauma')).toBeTruthy();
  });

  it('uses specialization detail labels and descriptions when provided', () => {
    mockUseWindowDimensions.mockReturnValue({
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1024,
    });

    render(
      <SpecializationsGrid
        specializations={['anxiety']}
        specializationsDetail={[{
          name: 'Ansiedad perinatal',
          icon: 'leaf-outline',
          description: 'Acompañamiento especializado en embarazo y posparto.',
        }]}
      />
    );

    expect(screen.getByText('Ansiedad perinatal')).toBeTruthy();
    expect(screen.getByText('Acompañamiento especializado en embarazo y posparto.')).toBeTruthy();
    expect(screen.queryByText('Manejo del estrés y ataques de pánico.')).toBeNull();
  });

  it('starts collapsed on desktop when the profile has more than four areas', () => {
    mockUseWindowDimensions.mockReturnValue({
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1024,
    });

    render(
      <SpecializationsGrid
        specializations={['anxiety', 'depression', 'trauma', 'couples', 'self-esteem']}
      />
    );

    expect(screen.getByText('5 áreas')).toBeTruthy();
    expect(screen.queryByText('Ansiedad')).toBeNull();
  });
});
