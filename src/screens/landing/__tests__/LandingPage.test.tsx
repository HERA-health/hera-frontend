import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { LandingPage } from '../LandingPage';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../components/common/MotionView', () => ({
  MotionView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../components/common/GlassCard', () => ({
  GlassCard: ({ children }: { children?: React.ReactNode }) => {
    const { View: MockView } = require('react-native');
    return <MockView>{children}</MockView>;
  },
}));

jest.mock('../../../components/common/AmbientBackground', () => ({
  AmbientBackground: () => null,
}));

jest.mock('../../../components/common/AnimatedPressable', () => ({
  AnimatedPressable: ({
    children,
    onPress,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
  }) => {
    const { Pressable: MockPressable } = require('react-native');
    return <MockPressable onPress={onPress}>{children}</MockPressable>;
  },
}));

jest.mock('../../../components/common/ThemeToggleButton', () => ({
  ThemeToggleButton: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>toggle-theme</MockText>;
  },
}));

jest.mock('../../../components/common/StyledLogo', () => ({
  StyledLogo: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>HERA</MockText>;
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseNavigation = jest.mocked(useNavigation);

describe('LandingPage', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseNavigation.mockReturnValue({
      navigate,
    } as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes the professional workspace while keeping patient access available', () => {
    render(<LandingPage />);

    expect(screen.getByText('Aplicación de gestión para especialistas en salud mental')).toBeTruthy();
    expect(screen.getAllByText('Acceder como profesional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Busco terapia').length).toBeGreaterThan(0);
    expect(screen.getByText('Agenda y sesiones')).toBeTruthy();
    expect(screen.getByText('Gestión de pacientes')).toBeTruthy();
    expect(screen.getByText('Facturación')).toBeTruthy();
    expect(screen.getByText('RGPD y LOPDGDD')).toBeTruthy();
  });

  it('routes both primary and secondary hero actions to the right login flows', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getAllByText('Acceder como profesional')[0]);
    fireEvent.press(screen.getAllByText('Busco terapia')[0]);

    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'PROFESSIONAL' });
    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'CLIENT' });
  });
});
