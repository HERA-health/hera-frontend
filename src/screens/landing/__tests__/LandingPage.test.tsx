let mockWindowDimensions = {
  fontScale: 1,
  height: 900,
  scale: 1,
  width: 1440,
};
const mockUseWindowDimensions = jest.fn(() => mockWindowDimensions);
const mockScrollTo = jest.fn();
let mockAuthState = {
  isAuthenticated: false,
  user: null as { type: 'client' | 'professional' | 'clinic' } | null,
  legalStatusSnapshot: null as { requiresAcceptance: boolean } | null,
  verificationSubmitted: null as boolean | null,
};

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');

  return new Proxy(actual, {
    get(target, property, receiver) {
      if (property === 'useWindowDimensions') {
        return mockUseWindowDimensions;
      }

      if (property === 'ScrollView') {
        const ReactModule = require('react');
        const MockScrollView = ReactModule.forwardRef(
          ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
            ReactModule.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
            return ReactModule.createElement(actual.View, props, children);
          }
        );
        MockScrollView.displayName = 'MockScrollView';
        return MockScrollView;
      }

      return Reflect.get(target, property, receiver);
    },
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { LandingPage } from '../LandingPage';
import { LandingHeader } from '../components/LandingHeader';
import { PROFESSIONAL_PREVIEW_IMAGES } from '../professionalPreviewAssets';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(effect, [effect]);
  },
}));

jest.mock('../../../services/specialistsService', () => ({
  getFeaturedSpecialists: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../services/analyticsService', () => ({
  track: jest.fn(),
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

jest.mock('../../../components/common/AmbientBackground', () => ({
  AmbientBackground: () => null,
}));

jest.mock('../../../components/common/AnimatedPressable', () => ({
  AnimatedPressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }) => {
    const { Pressable: MockPressable } = require('react-native');
    return (
      <MockPressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </MockPressable>
    );
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
  const setParams = jest.fn();
  const getState = jest.fn();

  beforeEach(() => {
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      legalStatusSnapshot: null,
      verificationSubmitted: null,
    };
    mockWindowDimensions = {
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1440,
    };
    getState.mockReturnValue({
      routeNames: [
        'Home',
        'ClinicDashboard',
        'ProfessionalHome',
        'ProfessionalVerification',
        'RequiredLegalAcceptance',
      ],
    });
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedUseNavigation.mockReturnValue({
      navigate,
      setParams,
      getState,
    } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({ params: undefined } as ReturnType<typeof useRoute>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('presents the two journeys and only concrete trust claims', () => {
    render(<LandingPage />);

    expect(screen.getByText('PERSONAS Y PROFESIONALES, EN UN MISMO LUGAR')).toBeTruthy();
    expect(screen.getByText(/Encuentra apoyo para cuidar tu salud mental/)).toBeTruthy();
    expect(screen.getByText(/Gestiona tu consulta con sencillez/)).toBeTruthy();
    expect(screen.getByTestId('hero-journey-divider')).toBeTruthy();
    expect(screen.getByText('Salud mental')).toBeTruthy();
    expect(screen.getAllByText('Explorar profesionales').length).toBeGreaterThan(0);
    expect(screen.getByText('HERA para profesionales')).toBeTruthy();
    expect(
      screen.getByLabelText('Profesional de salud mental tomando notas durante una sesión')
    ).toBeTruthy();
    expect(screen.getByText('Explora perfiles verificados')).toBeTruthy();
    expect(screen.getByText('Conoce cómo trabaja cada profesional')).toBeTruthy();
    expect(screen.getByText('Reserva cuando lo tengas claro')).toBeTruthy();
    expect(screen.getByText('Hazte visible. Gestiona tu consulta.')).toBeTruthy();
    expect(screen.getByText('VISIBILIDAD')).toBeTruthy();
    expect(screen.getByText('GESTIÓN')).toBeTruthy();
    expect(screen.getByText('Ver HERA por dentro')).toBeTruthy();
    expect(screen.getByText('Privacidad por diseño')).toBeTruthy();
    expect(screen.getByText('Consentimientos y documentación')).toBeTruthy();
    expect(screen.getByText('Marco RGPD y LOPDGDD')).toBeTruthy();
    expect(screen.queryByText('Flujos reales que HERA ayuda a ordenar')).toBeNull();
    expect(screen.getByText('Empieza por lo que necesitas hoy')).toBeTruthy();
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

  it('maps every wide header label to its stable anchor', () => {
    const onScrollToSection = jest.fn();
    mockWindowDimensions = { fontScale: 1, height: 900, scale: 1, width: 1720 };

    render(
      <LandingHeader
        context="landing"
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onExploreProfessionals={jest.fn()}
        onAccess={jest.fn()}
        onScrollToSection={onScrollToSection}
      />
    );

    const targets = [
      ['Especialistas', 'featuredSpecialists'],
      ['Cómo funciona', 'howItWorks'],
      ['Para profesionales', 'forSpecialists'],
      ['Especialidades', 'specializations'],
      ['Quiénes somos', 'about'],
      ['FAQ', 'faq'],
    ] as const;

    targets.forEach(([label]) => fireEvent.press(screen.getByText(label)));
    targets.forEach(([, target], index) => {
      expect(onScrollToSection).toHaveBeenNthCalledWith(index + 1, target);
    });
  });

  it('uses the compact header without saturating it with anchors or clinics', () => {
    mockWindowDimensions = { fontScale: 1, height: 768, scale: 1, width: 1024 };

    render(
      <LandingHeader
        context="landing"
        isScrolled={false}
        onFindSpecialist={jest.fn()}
        onExploreProfessionals={jest.fn()}
        onAccess={jest.fn()}
        onScrollToSection={jest.fn()}
      />
    );

    expect(screen.queryByText('Cómo funciona')).toBeNull();
    expect(screen.getByText('Explorar profesionales')).toBeTruthy();
    expect(screen.getByText('Para profesionales')).toBeTruthy();
    expect(screen.queryByText('Salud mental')).toBeNull();
    expect(screen.queryByText('Clínicas')).toBeNull();
  });

  it('uses the minimal mobile header while preserving both hero doors', () => {
    mockWindowDimensions = { fontScale: 1, height: 844, scale: 1, width: 390 };

    render(<LandingPage />);

    expect(screen.getByText('Acceder')).toBeTruthy();
    expect(screen.getByText('toggle-theme')).toBeTruthy();
    expect(screen.getAllByText('Explorar profesionales').length).toBeGreaterThan(0);
    expect(screen.getByText('HERA para profesionales')).toBeTruthy();
  });

  it('opens the public directory for an unauthenticated patient without login', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getAllByText('Explorar profesionales')[0]);

    expect(navigate).toHaveBeenCalledWith('PublicSpecialists');
    expect(navigate).not.toHaveBeenCalledWith('Login', expect.anything());
  });

  it('scrolls the professional hero door to the professional anchor', () => {
    render(<LandingPage />);
    fireEvent(
      screen.UNSAFE_getByProps({ nativeID: 'landing-section-for-specialists' }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 1700, width: 1000, height: 500 } } }
    );

    fireEvent.press(screen.getByText('HERA para profesionales'));

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 1690, animated: true });
  });

  it('routes professional registration, login and clinic access explicitly', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getAllByText('Crear cuenta profesional')[0]);
    fireEvent.press(screen.getAllByText('Iniciar sesión')[0]);
    fireEvent.press(screen.getAllByText('Acceso para clínicas')[0]);

    expect(navigate).toHaveBeenCalledWith('Register', { userType: 'PROFESSIONAL' });
    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'PROFESSIONAL' });
    expect(navigate).toHaveBeenCalledWith('Login', { userType: 'CLINIC' });
  });

  it('opens the public professional product showcase without registration', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getByText('Ver HERA por dentro'));

    expect(navigate).toHaveBeenCalledWith('ProfessionalShowcase');
    expect(navigate).not.toHaveBeenCalledWith('Register', expect.anything());
  });

  it('matches the professional preview image to the landing theme', () => {
    const { rerender } = render(<LandingPage />);
    const imageLabel = 'Vista previa del inicio del espacio profesional de HERA';

    expect(screen.getByLabelText(imageLabel).props.source).toBe(
      PROFESSIONAL_PREVIEW_IMAGES.light,
    );

    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    rerender(<LandingPage />);

    expect(screen.getByLabelText(imageLabel).props.source).toBe(
      PROFESSIONAL_PREVIEW_IMAGES.dark,
    );
  });

  it('opens the generic welcome selector from the access action', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getByText('Acceder'));

    expect(navigate).toHaveBeenCalledWith('Welcome');
  });

  it('opens the directory with a canonical specialty preselected', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getByText('Ansiedad y estrés'));

    expect(navigate).toHaveBeenCalledWith('PublicSpecialists', { specialty: 'anxiety' });
  });

  it.each([
    ['clinic', null, 'ClinicDashboard'],
    ['professional', false, 'ProfessionalVerification'],
    ['professional', true, 'ProfessionalHome'],
  ] as const)(
    'returns an authenticated %s account to its valid workspace',
    (userType, verificationSubmitted, expectedRoute) => {
      mockAuthState = {
        isAuthenticated: true,
        user: { type: userType },
        legalStatusSnapshot: null,
        verificationSubmitted,
      };

      render(<LandingPage />);
      fireEvent.press(screen.getAllByText('Ir a mi espacio')[0]);

      expect(navigate).toHaveBeenCalledWith(expectedRoute);
    }
  );

  it('returns authenticated users with pending legal documents to acceptance', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { type: 'client' },
      legalStatusSnapshot: { requiresAcceptance: true },
      verificationSubmitted: null,
    };

    render(<LandingPage />);
    fireEvent.press(screen.getAllByText('Ir a mi espacio')[0]);

    expect(navigate).toHaveBeenCalledWith('RequiredLegalAcceptance');
  });

  it('keeps all six native IDs mounted on stable wrappers', () => {
    render(<LandingPage />);

    [
      'landing-section-how-it-works',
      'landing-section-featured-specialists',
      'landing-section-for-specialists',
      'landing-section-specializations',
      'landing-section-about',
      'landing-section-faq',
    ].forEach((nativeID) => {
      expect(screen.UNSAFE_getByProps({ nativeID })).toBeTruthy();
    });
  });

  it('consumes one pending routed scroll after deferred layout', () => {
    mockedUseRoute.mockReturnValue({
      params: { section: 'featuredSpecialists' },
    } as ReturnType<typeof useRoute>);

    render(<LandingPage />);
    fireEvent(
      screen.UNSAFE_getByProps({ nativeID: 'landing-section-featured-specialists' }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 1200, width: 1000, height: 500 } } }
    );

    expect(mockScrollTo).toHaveBeenCalledTimes(1);
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 1190, animated: true });
    expect(setParams).toHaveBeenCalledWith({ section: undefined });
  });

  it('keeps a routed scroll pending while the deferred wrapper has no layout', () => {
    mockedUseRoute.mockReturnValue({
      params: { section: 'faq' },
    } as ReturnType<typeof useRoute>);

    render(<LandingPage />);
    const faqSection = screen.UNSAFE_getByProps({ nativeID: 'landing-section-faq' });

    fireEvent(
      faqSection,
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width: 1000, height: 0 } } }
    );

    expect(mockScrollTo).not.toHaveBeenCalled();

    fireEvent(
      faqSection,
      'layout',
      { nativeEvent: { layout: { x: 0, y: 4800, width: 1000, height: 700 } } }
    );

    expect(mockScrollTo).toHaveBeenCalledTimes(1);
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 4790, animated: true });
  });

  it('repeats the same stable anchor scroll on every selection', () => {
    render(<LandingPage />);
    fireEvent(
      screen.UNSAFE_getByProps({ nativeID: 'landing-section-featured-specialists' }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 900, width: 1000, height: 500 } } }
    );

    fireEvent.press(screen.getByText('Especialistas'));
    fireEvent.press(screen.getByText('Especialistas'));

    expect(mockScrollTo).toHaveBeenCalledTimes(2);
    expect(mockScrollTo).toHaveBeenNthCalledWith(1, { y: 890, animated: true });
    expect(mockScrollTo).toHaveBeenNthCalledWith(2, { y: 890, animated: true });
  });
});
