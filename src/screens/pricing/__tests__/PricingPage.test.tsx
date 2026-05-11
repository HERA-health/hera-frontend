import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as professionalSubscriptionService from '../../../services/professionalSubscriptionService';
import { PricingPage } from '../PricingPage';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
}));

jest.mock('../../../services/professionalSubscriptionService', () => ({
  savePendingProfessionalPlan: jest.fn(),
  createProfessionalCheckoutSession: jest.fn(),
  redirectToStripeUrl: jest.fn(),
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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../components/common/AnimatedPressable', () => ({
  AnimatedPressable: ({
    children,
    disabled,
    onPress,
    ...rest
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
  }) => {
    const { Pressable: MockPressable } = require('react-native');
    return (
      <MockPressable
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        {...rest}
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
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedShowAppAlert = jest.mocked(showAppAlert);
const mockedSavePendingProfessionalPlan = jest.mocked(
  professionalSubscriptionService.savePendingProfessionalPlan
);
const mockedCreateProfessionalCheckoutSession = jest.mocked(
  professionalSubscriptionService.createProfessionalCheckoutSession
);
const mockedRedirectToStripeUrl = jest.mocked(
  professionalSubscriptionService.redirectToStripeUrl
);

const buildAuthState = (
  overrides: Partial<ReturnType<typeof useAuth>> = {}
): ReturnType<typeof useAuth> => ({
  user: null,
  isAuthenticated: false,
  isInitialized: true,
  loading: false,
  error: null,
  verificationSubmitted: null,
  markVerificationSubmitted: jest.fn(),
  login: jest.fn(),
  authenticateWithGoogle: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  setUserType: jest.fn(),
  updateUser: jest.fn(),
  refreshCurrentUser: jest.fn(),
  clearError: jest.fn(),
  ...overrides,
} as unknown as ReturnType<typeof useAuth>);

describe('PricingPage', () => {
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

    mockedUseAuth.mockReturnValue(buildAuthState());
    mockedUseAppAlert.mockReturnValue({} as ReturnType<typeof useAppAlert>);
    mockedSavePendingProfessionalPlan.mockResolvedValue(undefined);
    mockedCreateProfessionalCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
    mockedRedirectToStripeUrl.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current monthly specialist plans with VAT copy', () => {
    render(<PricingPage />);

    expect(screen.getByText('Calma')).toBeTruthy();
    expect(screen.getByText('Crecimiento')).toBeTruthy();
    expect(screen.getByText('Horizonte')).toBeTruthy();
    expect(screen.getByText('Para digitalizar tu consulta con orden, sencillez y sin complicaciones.')).toBeTruthy();
    expect(screen.getByText('Para especialistas que quieren ampliar su actividad con más capacidad y mejor gestión.')).toBeTruthy();
    expect(screen.getByText('Para especialistas que miran lejos y quieren crecer sin límites.')).toBeTruthy();
    expect(screen.getByText('29,99')).toBeTruthy();
    expect(screen.getByText('49,99')).toBeTruthy();
    expect(screen.getByText('89,99')).toBeTruthy();
    expect(screen.getAllByText('+ IVA')).toHaveLength(3);
    expect(screen.getByText('20 pacientes activos')).toBeTruthy();
    expect(screen.getByText('60 pacientes activos')).toBeTruthy();
    expect(screen.getByText('Pacientes ilimitados')).toBeTruthy();
    expect(screen.getAllByText('Facturación personalizada')).toHaveLength(3);
    expect(screen.getByText('Soy especialista')).toBeTruthy();
  });

  it('uses specialist wording instead of professional wording', () => {
    render(<PricingPage />);

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

  it('stores the selected plan before sending logged-out users to professional login', async () => {
    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[1]);

    await waitFor(() => {
      expect(mockedSavePendingProfessionalPlan).toHaveBeenCalledWith('crecimiento');
      expect(navigate).toHaveBeenCalledWith('Login', { userType: 'PROFESSIONAL' });
    });
    expect(mockedCreateProfessionalCheckoutSession).not.toHaveBeenCalled();
  });

  it('blocks patient accounts from opening specialist checkout', async () => {
    mockedUseAuth.mockReturnValue(buildAuthState({
      isAuthenticated: true,
      user: {
        id: 'client-1',
        name: 'Paciente',
        email: 'paciente@hera.test',
        type: 'client',
      },
    }));

    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[0]);

    await waitFor(() => {
      expect(mockedShowAppAlert).toHaveBeenCalledWith(
        expect.anything(),
        'Plan para especialistas',
        'Este plan es para profesionales. Crea o accede con una cuenta de especialista para continuar.'
      );
    });
    expect(mockedSavePendingProfessionalPlan).not.toHaveBeenCalled();
    expect(mockedCreateProfessionalCheckoutSession).not.toHaveBeenCalled();
  });

  it('opens checkout directly for verified specialists', async () => {
    mockedUseAuth.mockReturnValue(buildAuthState({
      isAuthenticated: true,
      verificationSubmitted: true,
      user: {
        id: 'specialist-1',
        name: 'Especialista',
        email: 'especialista@hera.test',
        type: 'professional',
      },
    }));

    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[2]);

    await waitFor(() => {
      expect(mockedCreateProfessionalCheckoutSession).toHaveBeenCalledWith('horizonte');
      expect(mockedRedirectToStripeUrl).toHaveBeenCalledWith('https://checkout.stripe.test/session');
    });
  });

  it('sends specialists with unresolved verification state to verification before checkout', async () => {
    mockedUseAuth.mockReturnValue(buildAuthState({
      isAuthenticated: true,
      verificationSubmitted: null,
      user: {
        id: 'specialist-1',
        name: 'Especialista',
        email: 'especialista@hera.test',
        type: 'professional',
      },
    }));

    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[1]);

    await waitFor(() => {
      expect(mockedSavePendingProfessionalPlan).toHaveBeenCalledWith('crecimiento');
      expect(navigate).toHaveBeenCalledWith('ProfessionalVerification');
    });
    expect(mockedCreateProfessionalCheckoutSession).not.toHaveBeenCalled();
  });

  it('sends specialists with an existing subscription to the subscription screen', async () => {
    mockedUseAuth.mockReturnValue(buildAuthState({
      isAuthenticated: true,
      verificationSubmitted: true,
      user: {
        id: 'specialist-1',
        name: 'Especialista',
        email: 'especialista@hera.test',
        type: 'professional',
      },
    }));
    mockedCreateProfessionalCheckoutSession.mockRejectedValue({
      response: {
        data: {
          code: 'PROFESSIONAL_SUBSCRIPTION_ALREADY_EXISTS',
          message: 'Ya tienes una suscripción profesional activa o pendiente de regularizar.',
        },
      },
    });

    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[0]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('ProfessionalSubscription');
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalled();
  });

  it('sends specialists to verification when backend requires it', async () => {
    mockedUseAuth.mockReturnValue(buildAuthState({
      isAuthenticated: true,
      verificationSubmitted: true,
      user: {
        id: 'specialist-1',
        name: 'Especialista',
        email: 'especialista@hera.test',
        type: 'professional',
      },
    }));
    mockedCreateProfessionalCheckoutSession.mockRejectedValue({
      response: {
        data: {
          code: 'PROFESSIONAL_VERIFICATION_REQUIRED',
          message: 'Completa la verificacion profesional antes de elegir un plan.',
        },
      },
    });

    render(<PricingPage />);

    fireEvent.press(screen.getAllByText('Elegir plan')[0]);

    await waitFor(() => {
      expect(mockedSavePendingProfessionalPlan).toHaveBeenCalledWith('calma');
      expect(navigate).toHaveBeenCalledWith('ProfessionalVerification');
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalled();
  });
});
