let mockWindowDimensions = {
  fontScale: 1,
  height: 900,
  scale: 1,
  width: 1440,
};
const mockUseWindowDimensions = jest.fn(() => mockWindowDimensions);
const mockScrollTo = jest.fn();
const mockDiscoveryBlur = jest.fn();
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
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { LandingPage } from '../LandingPage';
import { LandingHeader } from '../components/LandingHeader';
import { HeroSection } from '../components/HeroSection';
import { PROFESSIONAL_PREVIEW_IMAGES } from '../professionalPreviewAssets';
import * as analyticsService from '../../../services/analyticsService';

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

jest.mock('../../../services/heraCommissionService', () => ({
  directoryIntent: jest.fn().mockResolvedValue({ token: 'fixture-directory-intent' }),
}));

jest.mock('../../../components/common/alert', () => ({
  useAppAlert: () => ({ show: jest.fn() }),
  showAppAlert: jest.fn(),
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
    focusRef,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    focusRef?: React.Ref<{ blur: () => void }>;
  }) => {
    const { Pressable: MockPressable } = require('react-native');
    const ReactModule = require('react');
    ReactModule.useImperativeHandle(focusRef, () => ({ blur: mockDiscoveryBlur }));
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

    expect(screen.getByText('PERSONAS, PROFESIONALES Y CLÍNICAS')).toBeTruthy();
    expect(screen.getByText('Tu espacio de confianza para cuidar la salud mental.')).toBeTruthy();
    expect(screen.getByText('Soy paciente')).toBeTruthy();
    expect(screen.getByText('Soy profesional')).toBeTruthy();
    expect(screen.getByText('Salud mental')).toBeTruthy();
    expect(screen.getAllByText('Explorar profesionales').length).toBeGreaterThan(0);
    expect(screen.getByText('Conocer las herramientas')).toBeTruthy();
    expect(screen.queryByText('Encuentra tu profesional')).toBeNull();
    expect(screen.queryByText('Tu consulta, organizada')).toBeNull();
    expect(
      screen.getByLabelText('Una mujer trabajando con su portátil en un espacio luminoso con plantas')
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

  it('labels the illustrative profile and sends booking discovery to the full directory', () => {
    render(<LandingPage />);
    expect(screen.getByText('Perfil de ejemplo')).toBeTruthy();
    expect(screen.getByText('Perfil ficticio, sin relación con la persona de la foto.')).toBeTruthy();
    expect(screen.getByText('Laura M.')).toBeTruthy();
    expect(screen.getByTestId('hero-specialist-preview')).toBeTruthy();
    expect(screen.queryByText(/Lansac/)).toBeNull();
    expect(screen.queryByLabelText(/^Ver perfil de /)).toBeNull();
    fireEvent.press(screen.getByLabelText('Encuentra tu sesión en el directorio'));
    expect(navigate).toHaveBeenCalledWith('PublicSpecialists');
    expect(navigate).not.toHaveBeenCalledWith('PublicSpecialistProfile', expect.anything());
    expect(analyticsService.track).toHaveBeenCalledWith('landing_patient_cta_clicked', { placement: 'hero', audience: 'patient' });
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
    expect(screen.getByText('Acceder')).toBeTruthy();
    expect(screen.queryByText('Salud mental')).toBeNull();
    expect(screen.queryByText('Clínicas')).toBeNull();
  });

  it('uses the minimal mobile header while preserving both hero doors', () => {
    mockWindowDimensions = { fontScale: 1, height: 844, scale: 1, width: 390 };
    render(<LandingPage />);

    expect(screen.getByText('Acceder')).toBeTruthy();
    expect(screen.getByText('toggle-theme')).toBeTruthy();
    expect(screen.getAllByText('Explorar profesionales').length).toBeGreaterThan(0);
    expect(screen.getByText('Conocer las herramientas')).toBeTruthy();
    expect(screen.getByText('Soy paciente')).toBeTruthy();
    expect(screen.getByText('Soy profesional')).toBeTruthy();
    expect(screen.queryByText('Encuentra tu profesional')).toBeNull();
    expect(screen.queryByText('Tu consulta, organizada')).toBeNull();
    expect(screen.queryByTestId('hero-specialist-preview')).toBeNull();
    expect(screen.queryByLabelText('Encuentra tu sesión en el directorio')).toBeNull();
    expect(screen.queryByText('Herramientas para profesionales')).toBeNull();
  });

  it('opens the public directory for an unauthenticated patient without login', () => {
    render(<LandingPage />);

    fireEvent.press(screen.getAllByText('Explorar profesionales')[0]);

    expect(navigate).toHaveBeenCalledWith('PublicSpecialists');
    expect(navigate).not.toHaveBeenCalledWith('Login', expect.anything());
  });

  it.each([1440, 820, 390])('keeps one tools action linked to the professional anchor at width %i', (width) => {
    mockWindowDimensions = { ...mockWindowDimensions, width };
    render(<LandingPage />);
    fireEvent(
      screen.UNSAFE_getByProps({ nativeID: 'landing-section-for-specialists' }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 1700, width: 1000, height: 500 } } }
    );

    fireEvent.press(screen.getByText('Conocer las herramientas'));

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 1690, animated: true });
  });

  it('opens professional registration directly from the hero and tracks its placement', () => {
    render(<LandingPage />);
    fireEvent.press(screen.getAllByLabelText('Crear cuenta profesional')[0]);
    expect(navigate).toHaveBeenCalledWith('Register', { userType: 'PROFESSIONAL' });
    expect(analyticsService.track).toHaveBeenCalledWith('landing_professional_register_clicked', {
      placement: 'hero', audience: 'professional',
    });
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('scrolls the discovery indicator to the measured section after layout', () => {
    render(<LandingPage />);
    fireEvent.press(screen.getByLabelText('Descubrir especialistas'));
    expect(mockScrollTo).not.toHaveBeenCalled();
    // A click before the deferred section is measured must not disable or hide
    // discovery: only a real scroll event should change its visibility.
    expect(screen.getByLabelText('Descubrir especialistas')).toBeTruthy();
    fireEvent(
      screen.UNSAFE_getByProps({ nativeID: 'landing-section-featured-specialists' }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 940, width: 1440, height: 500 } } }
    );
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 930, animated: true });
  });

  it('keeps the discovery content mounted without exposing it while scrolling', () => {
    const props = {
      onFindSpecialist: jest.fn(),
      onExploreProfessionals: jest.fn(),
      onProfessionalAction: jest.fn(),
      professionalActionLabel: 'Crear cuenta profesional',
    };
    const { rerender } = render(<HeroSection {...props} showScrollIndicator />);
    expect(screen.getByLabelText('Descubrir especialistas')).toBeTruthy();

    rerender(<HeroSection {...props} showScrollIndicator={false} />);
    // Unmounting this content used to shorten the hero by 81 px on web,
    // shifting every following section around the scroll threshold.
    expect(screen.getByText('Descubre HERA', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByLabelText('Descubrir especialistas')).toBeNull();
    const indicator = screen.getByTestId('hero-discovery-indicator', { includeHiddenElements: true });
    expect(indicator.props.pointerEvents).toBe('none');
    expect(indicator.props.style).toEqual({ opacity: 0 });

    rerender(<HeroSection {...props} showScrollIndicator />);
    expect(screen.getByLabelText('Descubrir especialistas')).toBeTruthy();
  });

  it('releases web discovery focus before starting the scroll so hiding it cannot cancel the animation', () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    const onScrollIndicatorPress = jest.fn(() => {
      expect(mockDiscoveryBlur).toHaveBeenCalledTimes(1);
    });
    try {
      render(<HeroSection
        onFindSpecialist={jest.fn()} onExploreProfessionals={jest.fn()}
        onProfessionalAction={jest.fn()} professionalActionLabel="Crear cuenta profesional"
        onScrollIndicatorPress={onScrollIndicatorPress}
      />);
      fireEvent.press(screen.getByLabelText('Descubrir especialistas'));
      expect(onScrollIndicatorPress).toHaveBeenCalledTimes(1);
    } finally {
      platform.restore();
    }
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
