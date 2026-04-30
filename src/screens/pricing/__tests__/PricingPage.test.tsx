import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { PricingPage } from '../PricingPage';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const MockIonicon = ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{name}</MockText>;
  };
  return MockIonicon;
});

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  Object.defineProperty(ReactNative, 'useWindowDimensions', {
    value: () => ({
      width: 1280,
      height: 900,
      scale: 1,
      fontScale: 1,
    }),
    configurable: true,
  });
  return ReactNative;
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

describe('PricingPage', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current monthly specialist plans', () => {
    render(<PricingPage />);

    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByText('Diamond')).toBeTruthy();
    expect(screen.getByText('29,99')).toBeTruthy();
    expect(screen.getByText('49,99')).toBeTruthy();
    expect(screen.getByText('89,99')).toBeTruthy();
    expect(screen.getByText('20 pacientes activos')).toBeTruthy();
    expect(screen.getByText('60 pacientes activos')).toBeTruthy();
    expect(screen.getByText('Pacientes ilimitados')).toBeTruthy();
    expect(screen.getAllByText('Facturación personalizada')).toHaveLength(3);
    expect(screen.getByText('Soy especialista')).toBeTruthy();
  });

  it('uses specialist wording instead of consultation or professional wording', () => {
    render(<PricingPage />);

    expect(screen.queryByText(/consultas?/i)).toBeNull();
    expect(screen.queryByText(/profesionales?/i)).toBeNull();
    expect(screen.getAllByText(/especialistas?/i).length).toBeGreaterThan(0);
  });

  it('does not expose future red-table capabilities', () => {
    render(<PricingPage />);

    expect(screen.queryByText(/whatsapp/i)).toBeNull();
    expect(screen.queryByText(/sms/i)).toBeNull();
    expect(screen.queryByText(/\bIA\b/i)).toBeNull();
    expect(screen.queryByText(/transcripción/i)).toBeNull();
    expect(screen.queryByText(/informes/i)).toBeNull();
  });
});
