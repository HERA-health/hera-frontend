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

  it('prioritizes the three available access paths without redundant feature cards', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('¿Cómo quieres acceder?')).toBeTruthy();
    expect(screen.getByText('Busco terapia')).toBeTruthy();
    expect(screen.getByText('Soy profesional')).toBeTruthy();
    expect(screen.getByText('Gestiono una clínica')).toBeTruthy();
    expect(screen.getByText('Acceder como paciente')).toBeTruthy();
    expect(screen.getByText('Acceder como profesional')).toBeTruthy();
    expect(screen.getByText('Acceder como clínica')).toBeTruthy();

    expect(screen.queryByText('Perfiles verificados')).toBeNull();
    expect(screen.queryByText('Videollamadas seguras')).toBeNull();
    expect(screen.queryByText('Gestión conectada')).toBeNull();
    expect(screen.queryByText('Privacidad por diseño')).toBeNull();
    expect(screen.queryByText('Matching con IA')).toBeNull();
    expect(screen.queryByText('LIA - Asistente 24/7')).toBeNull();
    expect(screen.queryByText('Busco ayuda')).toBeNull();
    expect(screen.queryByText(/resúmenes automáticos/i)).toBeNull();
    expect(screen.queryByText(/chat de crisis/i)).toBeNull();
    expect(screen.queryByText(/próximas fases/i)).toBeNull();
  });

  it('keeps each access card connected to its existing login flow', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Acceder como paciente'));
    fireEvent.press(screen.getByText('Acceder como profesional'));
    fireEvent.press(screen.getByText('Acceder como clínica'));

    expect(navigate).toHaveBeenNthCalledWith(1, 'Login', { userType: 'CLIENT' });
    expect(navigate).toHaveBeenNthCalledWith(2, 'Login', { userType: 'PROFESSIONAL' });
    expect(navigate).toHaveBeenNthCalledWith(3, 'Login', { userType: 'CLINIC' });
  });

  it('returns to the previous screen when navigation history exists', () => {
    canGoBack.mockReturnValue(true);
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns to the landing when the screen was opened directly', () => {
    canGoBack.mockReturnValue(false);
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Landing');
  });
});
