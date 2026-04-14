import React from 'react';
import { render, screen } from '@testing-library/react-native';

import LoadingScreen from '../screens/LoadingScreen';
import LoadingState from '../components/common/LoadingState';
import { darkTheme, lightTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const buildThemeContext = (isDark: boolean) =>
  ({
    theme: isDark ? darkTheme : lightTheme,
    mode: isDark ? 'dark' : 'light',
    isDark,
    setMode: jest.fn(),
  }) as unknown as ReturnType<typeof useTheme>;

describe('loading surfaces', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main loading screen in light mode', () => {
    mockedUseTheme.mockReturnValue(buildThemeContext(false));

    render(<LoadingScreen />);

    expect(screen.getByText('Preparando tu espacio')).toBeTruthy();
    expect(screen.getByText('HERA')).toBeTruthy();
    expect(screen.getByText(/Cargando tu espacio seguro/i)).toBeTruthy();
  });

  it('renders the shared loading state in dark mode', () => {
    mockedUseTheme.mockReturnValue(buildThemeContext(true));

    render(<LoadingState message="Cargando sesiones" fullScreen />);

    expect(screen.getByText('Cargando sesiones')).toBeTruthy();
  });
});
