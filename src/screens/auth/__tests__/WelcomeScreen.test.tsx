import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { WelcomeScreen } from '../WelcomeScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../components/common/AmbientBackground', () => ({
  AmbientBackground: () => null,
}));

jest.mock('../../../components/common/MotionView', () => {
  const ReactModule = require('react') as typeof React;
  const { View } = require('react-native') as typeof import('react-native');

  return {
    MotionView: ({
      children,
      style,
    }: {
      children: React.ReactNode;
      style?: React.ComponentProps<typeof View>['style'];
    }) => ReactModule.createElement(View, { style }, children),
  };
});

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseTheme = jest.mocked(useTheme);

describe('WelcomeScreen', () => {
  const navigate = jest.fn();
  const goBack = jest.fn();
  const canGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });

    mockedUseNavigation.mockReturnValue({
      navigate,
      goBack,
      canGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('presents only capabilities that are currently available', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Perfiles verificados')).toBeTruthy();
    expect(screen.getByText('Videollamadas seguras')).toBeTruthy();
    expect(screen.getByText('Gestión conectada')).toBeTruthy();
    expect(screen.getByText('Privacidad por diseño')).toBeTruthy();
    expect(screen.getByText('Busco terapia')).toBeTruthy();
    expect(screen.getByText('Conoce profesionales y elige con calma')).toBeTruthy();
    expect(screen.getByText('Acceder a mi espacio')).toBeTruthy();

    expect(screen.queryByText('Matching con IA')).toBeNull();
    expect(screen.queryByText('LIA - Asistente 24/7')).toBeNull();
    expect(screen.queryByText('Busco ayuda')).toBeNull();
    expect(screen.queryByText(/resúmenes automáticos/i)).toBeNull();
    expect(screen.queryByText(/chat de crisis/i)).toBeNull();
    expect(screen.queryByText(/próximas fases/i)).toBeNull();
  });

  it('returns to the previous screen when navigation history exists', () => {
    canGoBack.mockReturnValue(true);
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByLabelText('Volver a la página de inicio'));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns to the landing when the screen was opened directly', () => {
    canGoBack.mockReturnValue(false);
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByLabelText('Volver a la página de inicio'));

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Landing');
  });
});
