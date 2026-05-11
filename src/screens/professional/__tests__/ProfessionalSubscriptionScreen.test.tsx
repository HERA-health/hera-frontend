import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as professionalSubscriptionService from '../../../services/professionalSubscriptionService';
import { ProfessionalSubscriptionScreen } from '../ProfessionalSubscriptionScreen';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
}));

jest.mock('../../../services/professionalSubscriptionService', () => ({
  PROFESSIONAL_PLAN_LABELS: {
    calma: 'Calma',
    crecimiento: 'Crecimiento',
    horizonte: 'Horizonte',
  },
  getProfessionalSubscriptionStatus: jest.fn(),
  createProfessionalPortalSession: jest.fn(),
  redirectToStripeUrl: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const MockIonicon = ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{name}</MockText>;
  };
  MockIonicon.glyphMap = {};
  return MockIonicon;
});

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  Object.defineProperty(ReactNative, 'useWindowDimensions', {
    value: () => ({
      width: 1200,
      height: 900,
      scale: 1,
      fontScale: 1,
    }),
    configurable: true,
  });
  return ReactNative;
});

jest.mock('../../../components/common/Button', () => ({
  Button: ({
    children,
    disabled,
    onPress,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onPress: () => void;
  }) => {
    const { Pressable: MockPressable, Text: MockText } = require('react-native');
    return (
      <MockPressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
      >
        <MockText>{children}</MockText>
      </MockPressable>
    );
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedGetProfessionalSubscriptionStatus = jest.mocked(
  professionalSubscriptionService.getProfessionalSubscriptionStatus
);
const mockedCreateProfessionalPortalSession = jest.mocked(
  professionalSubscriptionService.createProfessionalPortalSession
);
const mockedRedirectToStripeUrl = jest.mocked(
  professionalSubscriptionService.redirectToStripeUrl
);

describe('ProfessionalSubscriptionScreen', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseAppAlert.mockReturnValue({} as ReturnType<typeof useAppAlert>);
    mockedUseNavigation.mockReturnValue({
      navigate,
    } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({
      params: { checkout: 'success' },
    } as ReturnType<typeof useRoute>);

    mockedGetProfessionalSubscriptionStatus.mockResolvedValue({
      plan: 'crecimiento',
      status: 'trialing',
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      trialEndsAt: '2026-05-16T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      activePatientCount: 12,
      activePatientLimit: 60,
      canCreateActivePatient: true,
      enforcementEnabled: false,
      commercialGatingEnabled: true,
      subscriptionAccessAllowed: true,
      canPublishProfile: true,
      canReceiveBookings: true,
      canUseBilling: true,
      canCreateSession: true,
      gracePeriodEndsAt: null,
      subscriptionNeedsSync: false,
    });
    mockedCreateProfessionalPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.test/session',
    });
    mockedRedirectToStripeUrl.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a safe subscription status without exposing Stripe ids', async () => {
    render(<ProfessionalSubscriptionScreen />);

    await waitFor(() => expect(screen.getByText('Crecimiento')).toBeTruthy());

    expect(screen.getByText('Tu plan HERA')).toBeTruthy();
    expect(screen.getByText('Trial activo')).toBeTruthy();
    expect(screen.getByText('12 / 60')).toBeTruthy();
    expect(screen.getByText('Preparados')).toBeTruthy();
    expect(screen.getByText(/Checkout completado/)).toBeTruthy();
    expect(screen.queryByText(/sub_/i)).toBeNull();
    expect(screen.queryByText(/cus_/i)).toBeNull();
  });

  it('opens the Stripe customer portal from the professional screen', async () => {
    render(<ProfessionalSubscriptionScreen />);

    await waitFor(() => expect(screen.getByText('Abrir portal de Stripe')).toBeTruthy());
    fireEvent.press(screen.getByText('Abrir portal de Stripe'));

    await waitFor(() => {
      expect(mockedCreateProfessionalPortalSession).toHaveBeenCalledTimes(1);
      expect(mockedRedirectToStripeUrl).toHaveBeenCalledWith('https://billing.stripe.test/session');
    });
  });

  it('does not present an abandoned checkout customer as an active subscription', async () => {
    mockedGetProfessionalSubscriptionStatus.mockResolvedValue({
      plan: null,
      status: 'none',
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      hasStripeCustomer: true,
      hasStripeSubscription: false,
      activePatientCount: 4,
      activePatientLimit: 0,
      canCreateActivePatient: true,
      enforcementEnabled: false,
      commercialGatingEnabled: true,
      subscriptionAccessAllowed: false,
      canPublishProfile: false,
      canReceiveBookings: false,
      canUseBilling: false,
      canCreateSession: false,
      gracePeriodEndsAt: null,
      subscriptionNeedsSync: false,
    });

    render(<ProfessionalSubscriptionScreen />);

    await waitFor(() => expect(screen.getByText('Sin plan activo')).toBeTruthy());

    expect(screen.getByText('Suscripción no activa')).toBeTruthy();
    expect(screen.getByText('Sin suscripción')).toBeTruthy();
    expect(screen.getByText(/Empieza con 14 días gratis/)).toBeTruthy();

    fireEvent.press(screen.getByText('Empezar 14 días gratis'));
    expect(navigate).toHaveBeenCalledWith('Pricing');
    expect(mockedCreateProfessionalPortalSession).not.toHaveBeenCalled();
  });

  it('shows an alert when subscription status cannot be loaded', async () => {
    mockedGetProfessionalSubscriptionStatus.mockRejectedValue(new Error('Stripe no disponible'));

    render(<ProfessionalSubscriptionScreen />);

    await waitFor(() => {
      expect(showAppAlert).toHaveBeenCalledWith(
        expect.anything(),
        'Suscripción no disponible',
        'Stripe no disponible'
      );
    });
  });

  it('shows a sync notice when Stripe state is pending synchronization', async () => {
    mockedGetProfessionalSubscriptionStatus.mockResolvedValue({
      plan: 'crecimiento',
      status: 'trialing',
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
      trialEndsAt: '2026-05-16T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      activePatientCount: 12,
      activePatientLimit: 60,
      canCreateActivePatient: true,
      enforcementEnabled: false,
      commercialGatingEnabled: true,
      subscriptionAccessAllowed: true,
      canPublishProfile: true,
      canReceiveBookings: true,
      canUseBilling: true,
      canCreateSession: true,
      gracePeriodEndsAt: null,
      subscriptionNeedsSync: true,
    });

    render(<ProfessionalSubscriptionScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Stripe esta terminando de sincronizar/)).toBeTruthy();
    });
  });
});
