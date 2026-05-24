import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeToggleButton } from '../ThemeToggleButton';
import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('ThemeToggleButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('switches from light mode to dark mode', () => {
    const setMode = jest.fn();
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode,
    });

    render(<ThemeToggleButton showLabel />);

    fireEvent.press(screen.getByLabelText('Modo noche'));

    expect(setMode).toHaveBeenCalledWith('dark');
  });

  it('switches from dark mode to light mode', () => {
    const setMode = jest.fn();
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode,
    });

    render(<ThemeToggleButton showLabel />);

    fireEvent.press(screen.getByLabelText('Modo día'));

    expect(setMode).toHaveBeenCalledWith('light');
  });
});
