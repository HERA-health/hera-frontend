import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import LoadingScreen from '../screens/LoadingScreen';
import LoadingState from '../components/common/LoadingState';
import SessionsLoadingState from '../screens/sessions/components/LoadingState';
import { darkTheme, lightTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const buildThemeContext = (isDark: boolean): ReturnType<typeof useTheme> => ({
  theme: isDark ? darkTheme : lightTheme,
  mode: isDark ? 'dark' : 'light',
  isDark,
  setMode: jest.fn(),
});

describe('loading surfaces', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedUseTheme.mockReturnValue(buildThemeContext(false));
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.each([false, true])('renders a single branded global loading state (dark: %s)', async isDark => {
    mockedUseTheme.mockReturnValue(buildThemeContext(isDark));
    render(<LoadingScreen />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    await act(async () => {});
    act(() => jest.advanceTimersByTime(200));

    expect(screen.getByRole('progressbar', { name: 'Preparando tu espacio…' })).toBeTruthy();
    expect(screen.getByText('StyledLogo-48', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/configuración más reciente/i)).toBeNull();
    expect(screen.queryByText(/Cargando tu espacio seguro/i)).toBeNull();
  });

  it('keeps the shared dark loading state unbranded by default', async () => {
    mockedUseTheme.mockReturnValue(buildThemeContext(true));
    render(<LoadingState message="Cargando sesiones" fullScreen />);
    await act(async () => {});
    act(() => jest.advanceTimersByTime(200));

    expect(screen.getByRole('progressbar', { name: 'Cargando sesiones' })).toBeTruthy();
    expect(screen.queryByText(/StyledLogo/, { includeHiddenElements: true })).toBeNull();
  });

  it('preserves the patient session message without a second loading message', async () => {
    render(<SessionsLoadingState message="Cargando tus sesiones..." />);
    await act(async () => {});
    act(() => jest.advanceTimersByTime(200));

    expect(screen.getByRole('progressbar', { name: 'Cargando tus sesiones...' })).toBeTruthy();
    expect(screen.queryByText('Preparando tu agenda con calma…')).toBeNull();
  });
});
