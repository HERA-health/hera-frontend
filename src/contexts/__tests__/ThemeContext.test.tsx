import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeToggleButton } from '../../components/common/ThemeToggleButton';
import { ThemeProvider, useTheme } from '../ThemeContext';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

function ThemeProbe() {
  const { isDark } = useTheme();
  return <ThemeToggleButton showLabel size="sm" key={isDark ? 'dark' : 'light'} />;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates and persists dark mode when the toggle is pressed', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Modo noche')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Modo noche'));

    await waitFor(() => {
      expect(screen.getByLabelText('Modo día')).toBeTruthy();
    });

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('hera_theme_mode', 'dark');
  });
});
