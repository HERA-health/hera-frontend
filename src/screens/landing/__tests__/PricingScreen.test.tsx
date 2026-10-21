import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PricingScreen } from '../PricingScreen';
import { PRICING_AVAILABILITY } from '../pricingContent';
import { useWebPageMetadata } from '../../../hooks/useWebPageMetadata';

const mockNavigate = jest.fn();
let mockRouteNames = ['Landing', 'Pricing', 'PublicSpecialists', 'Welcome'];
let mockAuth = {
  isAuthenticated: false,
  user: null as { type: 'professional' | 'client' | 'clinic' } | null,
  legalStatusSnapshot: { requiresAcceptance: false },
  verificationSubmitted: true,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getState: () => ({ routeNames: mockRouteNames }) }),
}));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }),
}));
jest.mock('../../../hooks/useWebPageMetadata', () => ({ useWebPageMetadata: jest.fn() }));
jest.mock('../components/LandingHeader', () => ({
  LandingHeader: ({ onAccess, accessLabel }: { onAccess: () => void; accessLabel: string }) => {
    const { Pressable, Text } = require('react-native');
    return <Pressable onPress={onAccess} accessibilityLabel={accessLabel}><Text>{accessLabel}</Text></Pressable>;
  },
}));
jest.mock('../components/FooterSection', () => ({ FooterSection: () => null }));

describe('public pricing catalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteNames = ['Landing', 'Pricing', 'PublicSpecialists', 'Welcome'];
    mockAuth = { isAuthenticated: false, user: null, legalStatusSnapshot: { requiresAcceptance: false }, verificationSubmitted: true };
  });

  it('shows availability and essential conditions before any detail is opened', () => {
    render(<PricingScreen />);
    expect(screen.getByText(PRICING_AVAILABILITY)).toBeTruthy();
    expect(screen.getByText('2 GB de almacenamiento total')).toBeTruthy();
    for (const size of [5, 15, 30]) expect(screen.getByLabelText(`${size} GB de almacenamiento`)).toBeTruthy();
    expect(screen.getByText(/Las comisiones se aplican a los pacientes captados por HERA/)).toBeTruthy();
    expect(screen.getByText(/No se suma entre modalidades ni se renueva cada mes/)).toBeTruthy();
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(useWebPageMetadata).toHaveBeenCalledWith(expect.objectContaining({ canonicalPath: '/planes', indexable: true }));
  });

  it('opens and switches the complete plan details without starting registration or purchase', () => {
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Ver detalles de Calma'));
    let details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Calma · 29,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('1 al mes')).toBeTruthy();
    expect(details.getByText('3 estándar')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Crecimiento'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByText('15 GB por especialista')).toBeTruthy();
    expect(details.getByText('3 al mes')).toBeTruthy();
    expect(details.getByText('5 personalizadas')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Horizonte'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Horizonte · 89,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('30 GB por especialista')).toBeTruthy();
    expect(details.getByText('Destacado')).toBeTruthy();
    expect(screen.getByLabelText('Ver detalles de Horizonte').props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText('Cerrar detalles del plan'));
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens and closes FAQ answers accessibly', () => {
    render(<PricingScreen />);
    const question = '¿Puedo contratar un plan desde esta página?';
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.getByText(/Ver los detalles no activa un plan ni cambia las condiciones/)).toBeTruthy();
    expect(screen.getByLabelText(question).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.queryByText(/Ver los detalles no activa un plan ni cambia las condiciones/)).toBeNull();
  });

  it('keeps guest access separate from the catalogue actions', () => {
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Acceder'));
    expect(mockNavigate).toHaveBeenCalledWith('Welcome');
  });

  it.each([
    [true, 'ProfessionalHome'],
    [false, 'RequiredLegalAcceptance'],
  ] as const)('uses the mounted legal gate when the login snapshot is stale (%s)', (snapshotRequiresAcceptance, destination) => {
    mockAuth = { isAuthenticated: true, user: { type: 'professional' }, legalStatusSnapshot: { requiresAcceptance: snapshotRequiresAcceptance }, verificationSubmitted: true };
    mockRouteNames = ['Pricing', 'PublicSpecialists', destination];
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Mi espacio'));
    expect(mockNavigate).toHaveBeenCalledWith(destination);
  });

  it.each([
    ['professional', true, false, 'ProfessionalHome'],
    ['professional', false, false, 'ProfessionalVerification'],
    ['client', true, false, 'Home'],
    ['clinic', true, false, 'ClinicDashboard'],
    ['professional', true, true, 'RequiredLegalAcceptance'],
  ] as const)('returns %s to the available workspace without bypassing required steps', (type, verified, requiresAcceptance, destination) => {
    mockAuth = { isAuthenticated: true, user: { type }, verificationSubmitted: verified, legalStatusSnapshot: { requiresAcceptance } };
    mockRouteNames = ['Pricing', 'PublicSpecialists', destination];
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Mi espacio'));
    expect(mockNavigate).toHaveBeenCalledWith(destination);
  });
});
