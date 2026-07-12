let mockWindowDimensions = {
  fontScale: 1,
  height: 900,
  scale: 1,
  width: 1440,
};
const mockUseWindowDimensions = jest.fn(() => mockWindowDimensions);

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');

  return new Proxy(actual, {
    get(target, property, receiver) {
      if (property === 'useWindowDimensions') {
        return mockUseWindowDimensions;
      }

      return Reflect.get(target, property, receiver);
    },
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { LandingPage } from '../LandingPage';
import { LandingHeader } from '../components/LandingHeader';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../../services/specialistsService', () => ({
  getFeaturedSpecialists: jest.fn().mockResolvedValue([]),
}));

jest.mock('../components/FeaturedSpecialistsSection', () => ({
  FeaturedSpecialistsSection: () => null,
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
const mockedUseRoute = jest.mocked(useRoute);

describe('LandingPage', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1440,
    };

    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseNavigation.mockReturnValue({
      navigate,
    } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({ params: undefined } as ReturnType<typeof useRoute>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes the professional workspace while keeping patient access available', () => {
    render(<LandingPage />);

    expect(screen.getByText('Aplicación de gestión para especialistas en salud mental')).toBeTruthy();
    expect(screen.getAllByText('Acceder como profesional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Busco terapia').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acceso cl.nicas/).length).toBeGreaterThan(0);
    expect(screen.getByText('Paso 1')).toBeTruthy();
    expect(screen.getByText('Paso 2')).toBeTruthy();
    expect(screen.getByText('Paso 3')).toBeTruthy();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Organiza tu agenda de manera sencilla.')).toBeTruthy();
    expect(screen.getByText('Pacientes y sesiones')).toBeTruthy();
    expect(screen.getByText('Historial, citas y seguimiento en un solo lugar.')).toBeTruthy();
    expect(screen.getByText('Gestión clínica segura')).toBeTruthy();
    expect(screen.getByText('Documentos y consentimientos cifrados para trabajar con seguridad.')).toBeTruthy();
    expect(screen.getByText('Crea, gestiona y envía tus facturas.')).toBeTruthy();
    expect(screen.getByText('Privacidad y cumplimiento alineados con la normativa.')).toBeTruthy();
    expect(screen.getByText('QUIÉNES SOMOS')).toBeTruthy();
    expect(screen.queryByText('Texto provisional')).toBeNull();
    expect(screen.queryByText(/placeholder/)).toBeNull();
    expect(screen.getByText('Sobre HERA')).toBeTruthy();
    expect(screen.getByText('Construimos una forma más clara de trabajar en salud mental')).toBeTruthy();
    expect(screen.getByText('Un espacio de trabajo para llevar mejor tu consulta')).toBeTruthy();
    expect(screen.getByText('Verificación profesional')).toBeTruthy();
    expect(screen.getByText('Área clínica segura')).toBeTruthy();
    expect(screen.getByText('Consentimientos claros')).toBeTruthy();
    expect(screen.getByText('Especialidades que encuentran una base ordenada en HERA')).toBeTruthy();
    expect(screen.getByText('Flujos reales que HERA ayuda a ordenar')).toBeTruthy();
    expect(screen.getAllByText('Preguntas frecuentes').length).toBeGreaterThan(0);
    expect(screen.getByText('¿Qué puede gestionar un profesional dentro de HERA?')).toBeTruthy();
    expect(screen.getByText('¿Hay funciones en demo o beta?')).toBeTruthy();
    expect(screen.getByText(/centraliza la gestión de la consulta/)).toBeTruthy();
    expect(screen.getAllByText(/Facturación/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('RGPD y LOPDGDD').length).toBeGreaterThan(0);
  });

  it('expands FAQ answers on press', () => {
    render(<LandingPage />);

    expect(
      screen.queryByText(/Desde su espacio profesional puede organizar disponibilidad/)
    ).toBeNull();

    fireEvent.press(screen.getByText('¿Qué puede gestionar un profesional dentro de HERA?'));

    expect(
      screen.getByText(/Desde su espacio profesional puede organizar disponibilidad/)
    ).toBeTruthy();
  });

  it('wires desktop navigation items to landing section scroll targets', () => {
    const onScrollToSection = jest.fn();
    mockWindowDimensions = {
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1720,
    };

    render(
      <LandingHeader
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onJoinAsProfessional={jest.fn()}
        onJoinAsClinic={jest.fn()}
        onScrollToSection={onScrollToSection}
      />
    );

    const navTargets = [
      ['Cómo funciona', 'howItWorks'],
      ['Especialistas', 'featuredSpecialists'],
      ['Herramientas', 'forSpecialists'],
      ['Especialidades', 'specializations'],
      ['Quiénes somos', 'about'],
      ['FAQ', 'faq'],
    ] as const;

    navTargets.forEach(([label]) => {
      fireEvent.press(screen.getByText(label));
    });

    navTargets.forEach(([, target], index) => {
      expect(onScrollToSection).toHaveBeenNthCalledWith(index + 1, target);
    });
  });

  it('scrolls to the public specialist section without changing the therapy login action', () => {
    const onScrollToSection = jest.fn();
    mockWindowDimensions = {
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1720,
    };

    render(
      <LandingHeader
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onJoinAsProfessional={jest.fn()}
        onJoinAsClinic={jest.fn()}
        onScrollToSection={onScrollToSection}
      />
    );

    fireEvent.press(screen.getByText('Especialistas'));

    expect(onScrollToSection).toHaveBeenCalledWith('featuredSpecialists');
  });

  it('hides the full landing navigation on compact desktop widths', () => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 768,
      scale: 1,
      width: 1024,
    };

    render(
      <LandingHeader
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onJoinAsProfessional={jest.fn()}
        onJoinAsClinic={jest.fn()}
        onScrollToSection={jest.fn()}
      />
    );

    expect(screen.queryByText('Cómo funciona')).toBeNull();
    expect(screen.queryByText('Especialistas')).toBeNull();
    expect(screen.getByText('Busco terapia')).toBeTruthy();
    expect(screen.getByText('Soy profesional')).toBeTruthy();
  });

  it('keeps landing navigation available at intermediate desktop widths', () => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 768,
      scale: 1,
      width: 1280,
    };

    render(
      <LandingHeader
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onJoinAsProfessional={jest.fn()}
        onJoinAsClinic={jest.fn()}
        onScrollToSection={jest.fn()}
      />
    );

    expect(screen.getByText('Cómo funciona')).toBeTruthy();
    expect(screen.getByText('Especialistas')).toBeTruthy();
    expect(screen.getByText('Busco terapia')).toBeTruthy();
    expect(screen.queryByText('Clínicas')).toBeNull();
  });

  it('routes both primary and secondary hero actions to the right login flows', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getAllByText('Acceder como profesional')[0]);
    fireEvent.press(screen.getAllByText('Busco terapia')[0]);
    fireEvent.press(screen.getAllByText(/Acceso cl.nicas/)[0]);

    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'PROFESSIONAL' });
    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'CLIENT' });
    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'CLINIC' });
  });
});
