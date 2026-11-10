import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PricingScreen } from '../PricingScreen';
import { PRICING_AVAILABILITY, PRICING_PLANS } from '../pricingContent';
import { publicApi } from '../../../services/api';
import { useWebPageMetadata } from '../../../hooks/useWebPageMetadata';

const mockNavigate = jest.fn();
jest.mock('../../../services/api', () => ({ publicApi: { get: jest.fn(), post: jest.fn() } }));
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
    jest.mocked(publicApi.get).mockResolvedValue({ data: {
      title: 'Condiciones', version: 'fixture', contentHash: 'a'.repeat(64), paragraphs: ['Condiciones de la solicitud.'],
      privacy: { title: 'Privacidad', version: 'fixture', contentHash: 'b'.repeat(64), publicPath: '/legal/privacidad/fixture' },
    } });
    mockRouteNames = ['Landing', 'Pricing', 'PublicSpecialists', 'Welcome'];
    mockAuth = { isAuthenticated: false, user: null, legalStatusSnapshot: { requiresAcceptance: false }, verificationSubmitted: true };
  });

  it.each([false, true])('opens the selected trial directly from every card (authenticated: %s)', async authenticated => {
    if (authenticated) mockAuth = { ...mockAuth, isAuthenticated: true, user: { type: 'professional' } };
    render(<PricingScreen />);
    for (const plan of PRICING_PLANS) {
      fireEvent.press(screen.getByLabelText(`Solicitar prueba gratuita de ${plan.name}`));
      await screen.findByRole('checkbox');
      expect(screen.getByText(`Plan ${plan.name}`)).toBeTruthy();
      expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
      fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
      expect(screen.queryByText('Solicita tu prueba gratuita')).toBeNull();
    }
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the currently selected plan from both detail actions', async () => {
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Ver todas las prestaciones de Calma'));
    fireEvent.press(screen.getByLabelText('Consultar Horizonte'));
    const details = within(screen.getByTestId('pricing-plan-details'));
    const actions = details.getAllByLabelText('Solicitar prueba gratuita de Horizonte');
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      fireEvent.press(action);
      await screen.findByRole('checkbox');
      expect(screen.getByText('Plan Horizonte')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    }
    expect(details.getByText('2 TB por especialista')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows availability and essential conditions before any detail is opened', () => {
    render(<PricingScreen />);
    expect(screen.getByText(PRICING_AVAILABILITY)).toBeTruthy();
    expect(screen.getByText('5 GB de almacenamiento total')).toBeTruthy();
    for (const size of ['20 GB', '50 GB', '2 TB']) expect(screen.getByLabelText(`${size} de almacenamiento`)).toBeTruthy();
    for (const limit of ['Hasta 15', 'Hasta 30', 'Ilimitados']) expect(screen.getByLabelText(`${limit} pacientes propios activos`)).toBeTruthy();
    expect(screen.getAllByText('Videollamadas con Google Meet')).toHaveLength(4);
    expect(screen.getAllByText('Recordatorios por email')).toHaveLength(4);
    for (const templates of ['básicas; avanzadas aparte', 'ampliadas', 'todas']) expect(screen.getByText(`Plantillas clínicas: ${templates}`)).toBeTruthy();
    expect(screen.queryByText(/^Estadísticas (básicas|completas)$/)).toBeNull();
    expect(screen.getByText(/Las comisiones se aplican a los pacientes captados por HERA/)).toBeTruthy();
    expect(screen.getByText(/No se suma entre modalidades ni se renueva cada mes/)).toBeTruthy();
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(useWebPageMetadata).toHaveBeenCalledWith(expect.objectContaining({ canonicalPath: '/planes', indexable: true }));
  });

  it('opens and switches the complete plan details without starting registration or purchase', () => {
    render(<PricingScreen />);
    fireEvent.press(screen.getByLabelText('Ver todas las prestaciones de Calma'));
    let details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Calma · 29,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('20 GB por especialista')).toBeTruthy();
    expect(details.getByText('Hasta 15')).toBeTruthy();
    expect(details.getByText('Básicas; avanzadas aparte')).toBeTruthy();
    expect(details.getByText('Básicas')).toBeTruthy();
    expect(details.getByText('1 al mes')).toBeTruthy();
    expect(details.getByText('3 estándar')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Crecimiento'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByText('50 GB por especialista')).toBeTruthy();
    expect(details.getByText('Hasta 30')).toBeTruthy();
    expect(details.getByText('Ampliadas')).toBeTruthy();
    expect(details.getByText('Completas')).toBeTruthy();
    expect(details.getByText('3 al mes')).toBeTruthy();
    expect(details.getByText('5 personalizadas')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Horizonte'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Horizonte · 69,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('2 TB por especialista')).toBeTruthy();
    expect(details.getByText('Destacado')).toBeTruthy();
    expect(screen.getByLabelText('Ver todas las prestaciones de Horizonte').props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText('Cerrar detalles del plan'));
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens and closes FAQ answers accessibly', () => {
    render(<PricingScreen />);
    const question = '¿Puedo contratar un plan desde esta página?';
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.getByText(/Ver los detalles o enviar una solicitud no activa un plan/)).toBeTruthy();
    expect(screen.getByLabelText(question).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.queryByText(/Ver los detalles o enviar una solicitud no activa un plan/)).toBeNull();
    fireEvent.press(screen.getByLabelText('¿Qué significa el almacenamiento de cada modalidad?'));
    expect(screen.getByText(/Directorio incluye 5 GB; Calma, 20 GB; Crecimiento, 50 GB; Horizonte, 2 TB/)).toBeTruthy();
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
