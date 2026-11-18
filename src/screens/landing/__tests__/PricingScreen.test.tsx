import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PricingScreen } from '../PricingScreen';
import { pricingAvailability, pricingPlansFromCatalog } from '../pricingContent';
import { subscriptionCatalogFixture } from '../__fixtures__/subscriptionCatalog';
const PRICING_PLANS = pricingPlansFromCatalog(subscriptionCatalogFixture);
const PRICING_AVAILABILITY = pricingAvailability(subscriptionCatalogFixture.trial);
import { publicApi } from '../../../services/api';
import { useWebPageMetadata } from '../../../hooks/useWebPageMetadata';

const mockNavigate = jest.fn();
const mockHeader = jest.fn();
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
  LandingHeader: (props: { onAccess: () => void; accessLabel: string; context: string; navigationItems?: { label: string; onPress: () => void }[] }) => {
    mockHeader(props);
    const { onAccess, accessLabel, navigationItems } = props;
    const { Pressable, Text } = require('react-native');
    return <><Pressable onPress={onAccess} accessibilityLabel={accessLabel}><Text>{accessLabel}</Text></Pressable>{navigationItems?.map(item => <Pressable key={item.label} accessibilityRole="link" onPress={item.onPress}><Text>{item.label}</Text></Pressable>)}</>;
  },
}));
jest.mock('../components/FooterSection', () => ({ FooterSection: () => null }));

describe('public pricing catalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(publicApi.get).mockImplementation(async url => ({ data: url === '/subscriptions/plans' ? subscriptionCatalogFixture : {
      trial: { unit: 'month', count: 1 }, title: 'Condiciones', version: 'fixture', contentHash: 'a'.repeat(64), paragraphs: ['Condiciones de la solicitud.'],
      privacy: { title: 'Privacidad', version: 'fixture', contentHash: 'b'.repeat(64), publicPath: '/legal/privacidad/fixture' },
    } }));
    mockRouteNames = ['Landing', 'Pricing', 'PublicSpecialists', 'Welcome'];
    mockAuth = { isAuthenticated: false, user: null, legalStatusSnapshot: { requiresAcceptance: false }, verificationSubmitted: true };
  });

  it('keeps pricing inside the professional navigation', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    expect(mockHeader).toHaveBeenLastCalledWith(expect.objectContaining({ context: 'professional' }));
    expect(mockHeader.mock.lastCall?.[0].onScrollToSection).toBeUndefined();
    expect(screen.queryByRole('link', { name: 'Especialidades' })).toBeNull();
    for (const [label, route] of [
      ['Funcionalidades', 'ProfessionalSoftware'],
      ['Agenda', 'ProfessionalAgenda'],
      ['Pacientes e historia clínica', 'ProfessionalPatients'],
      ['Facturación', 'ProfessionalBillingInfo'],
      ['HERA por dentro', 'ProfessionalShowcase'],
    ]) {
      fireEvent.press(screen.getByRole('link', { name: label }));
      expect(mockNavigate).toHaveBeenLastCalledWith(route);
    }
  });

  it('opens professional registration from the directory offer', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    fireEvent.press(screen.getByRole('button', { name: 'Crear mi cuenta profesional' }));
    expect(mockNavigate).toHaveBeenCalledWith('Register', { userType: 'PROFESSIONAL' });
  });

  it('opens the selected trial directly from every guest card', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
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
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
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

  it('shows availability and essential conditions before any detail is opened', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    expect(screen.getByText(PRICING_AVAILABILITY)).toBeTruthy();
    expect(screen.getByText(/Para incorporar nuevos pacientes propios necesitas una suscripción/)).toBeTruthy();
    expect(screen.getByText('5 GB de almacenamiento total')).toBeTruthy();
    for (const size of ['20 GB', '50 GB', '2 TB']) expect(screen.getByLabelText(`${size} de almacenamiento`)).toBeTruthy();
    for (const limit of ['Hasta 15', 'Hasta 30', 'Ilimitados']) expect(screen.getByLabelText(`${limit} pacientes propios activos o con plaza comprometida`)).toBeTruthy();
    expect(screen.getAllByText('Videollamadas con Google Meet')).toHaveLength(4);
    expect(screen.getAllByText('Recordatorios por email')).toHaveLength(4);
    for (const templates of ['calma', 'calma y crecimiento', 'todos los niveles']) expect(screen.getByText(`Plantillas clínicas: ${templates}`)).toBeTruthy();
    expect(screen.queryByText(/^Estadísticas (básicas|completas)$/)).toBeNull();
    expect(screen.getByText(/Las comisiones se aplican a los pacientes captados por HERA/)).toBeTruthy();
    expect(screen.getByText(/No se suma entre modalidades ni se renueva cada mes/)).toBeTruthy();
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(useWebPageMetadata).toHaveBeenCalledWith(expect.objectContaining({ canonicalPath: '/planes', indexable: true }));
  });

  it('explains optional subscriptions and future quotas when enforcement is off', async () => {
    jest.mocked(publicApi.get).mockResolvedValue({ data: { ...subscriptionCatalogFixture, enforced: false } });
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    expect(screen.getByText(/La suscripción es opcional en esta etapa/)).toBeTruthy();
    expect(screen.getByText('5 GB de almacenamiento previsto en el plan')).toBeTruthy();
    expect(screen.queryByText(/Para incorporar nuevos pacientes propios necesitas una suscripción/)).toBeNull();
    fireEvent.press(screen.getByLabelText('¿Qué diferencia hay entre directorio y suscripción?'));
    expect(screen.getByText(/también puedes gestionar pacientes propios sin suscripción/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('¿Qué pacientes cuentan para el límite del plan?'));
    expect(screen.getByText(/Estos límites todavía no se aplican/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('¿Qué significa el almacenamiento de cada modalidad?'));
    expect(screen.getByText(/Estas son las capacidades previstas de cada plan/)).toBeTruthy();
    expect(screen.getByLabelText('Solicitar prueba gratuita de Calma')).toBeTruthy();
  });

  it('does not assume enforcement is off when the catalogue cannot be loaded', async () => {
    jest.mocked(publicApi.get).mockRejectedValue(new Error('No se pudieron cargar los planes.'));
    render(<PricingScreen />);
    await screen.findByRole('button', { name: 'Volver a cargar planes' });
    expect(screen.queryByText(/La suscripción es opcional en esta etapa/)).toBeNull();
    expect(screen.queryByText(/Para incorporar nuevos pacientes propios necesitas una suscripción/)).toBeNull();
    expect(screen.queryByLabelText('Solicitar prueba gratuita de Calma')).toBeNull();
  });

  it('opens and switches the complete plan details without starting registration or purchase', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    fireEvent.press(screen.getByLabelText('Ver todas las prestaciones de Calma'));
    let details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Calma · 29,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('20 GB por especialista')).toBeTruthy();
    expect(details.getByText('Hasta 15')).toBeTruthy();
    expect(details.getByText('Completas')).toBeTruthy();
    expect(details.getByText('1 al mes')).toBeTruthy();
    expect(details.getByText('3 estándar')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Crecimiento'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByText('50 GB por especialista')).toBeTruthy();
    expect(details.getByText('Hasta 30')).toBeTruthy();
    expect(details.getAllByText('Calma y Crecimiento').length).toBeGreaterThan(0);
    expect(details.getByText('Completas')).toBeTruthy();
    expect(details.getByText('3 al mes')).toBeTruthy();
    expect(details.getByText('5 personalizadas')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consultar Horizonte'));
    details = within(screen.getByTestId('pricing-plan-details'));
    expect(details.getByLabelText('Horizonte · 69,99 €/mes + IVA')).toBeTruthy();
    expect(details.getByText('2 TB por especialista')).toBeTruthy();
    expect(details.getByText('Distintivo y rotación destacada')).toBeTruthy();
    expect(screen.getByLabelText('Ver todas las prestaciones de Horizonte').props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText('Cerrar detalles del plan'));
    expect(screen.queryByTestId('pricing-plan-details')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens and closes FAQ answers accessibly', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    const question = '¿Puedo contratar un plan desde esta página?';
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.getByText(/Ver los detalles o enviar una solicitud no activa un plan/)).toBeTruthy();
    expect(screen.getByLabelText(question).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByLabelText(question));
    expect(screen.queryByText(/Ver los detalles o enviar una solicitud no activa un plan/)).toBeNull();
    fireEvent.press(screen.getByLabelText('¿Qué significa el almacenamiento de cada modalidad?'));
    expect(screen.getByText(/Directorio incluye 5 GB; Calma, 20 GB; Crecimiento, 50 GB; Horizonte, 2 TB/)).toBeTruthy();
  });

  it('keeps guest access separate from the catalogue actions', async () => {
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    fireEvent.press(screen.getByLabelText('Acceder'));
    expect(mockNavigate).toHaveBeenCalledWith('Welcome');
  });
  it('takes an existing professional to the chosen plan without promising another trial', async () => {
    mockAuth = { isAuthenticated: true, user: { type: 'professional' }, verificationSubmitted: true, legalStatusSnapshot: { requiresAcceptance: false } };
    mockRouteNames = ['Pricing', 'ProfessionalSubscription'];
    render(<PricingScreen />);
    await screen.findByLabelText('Elegir este plan de Crecimiento');
    fireEvent.press(screen.getByLabelText('Elegir este plan de Crecimiento'));
    expect(mockNavigate).toHaveBeenCalledWith('ProfessionalSubscription', { plan: 'CRECIMIENTO' });
    expect(screen.queryByLabelText('Solicitar prueba gratuita de Crecimiento')).toBeNull();
  });
  it('keeps plan selection behind the existing professional access gates', async () => {
    mockAuth = { isAuthenticated: true, user: { type: 'professional' }, verificationSubmitted: true, legalStatusSnapshot: { requiresAcceptance: true } };
    mockRouteNames = ['Pricing', 'RequiredLegalAcceptance'];
    render(<PricingScreen />);
    fireEvent.press(await screen.findByLabelText('Elegir este plan de Calma'));
    expect(mockNavigate).toHaveBeenCalledWith('RequiredLegalAcceptance');
    expect(screen.queryByLabelText('Cerrar solicitud')).toBeNull();
  });

  it.each([
    [true, 'ProfessionalHome'],
    [false, 'RequiredLegalAcceptance'],
  ] as const)('uses the mounted legal gate when the login snapshot is stale (%s)', async (snapshotRequiresAcceptance, destination) => {
    mockAuth = { isAuthenticated: true, user: { type: 'professional' }, legalStatusSnapshot: { requiresAcceptance: snapshotRequiresAcceptance }, verificationSubmitted: true };
    mockRouteNames = ['Pricing', 'PublicSpecialists', destination];
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    fireEvent.press(screen.getByLabelText('Mi espacio'));
    expect(mockNavigate).toHaveBeenCalledWith(destination);
  });

  it.each([
    ['professional', true, false, 'ProfessionalHome'],
    ['professional', false, false, 'ProfessionalVerification'],
    ['client', true, false, 'Home'],
    ['clinic', true, false, 'ClinicDashboard'],
    ['professional', true, true, 'RequiredLegalAcceptance'],
  ] as const)('returns %s to the available workspace without bypassing required steps', async (type, verified, requiresAcceptance, destination) => {
    mockAuth = { isAuthenticated: true, user: { type }, verificationSubmitted: verified, legalStatusSnapshot: { requiresAcceptance } };
    mockRouteNames = ['Pricing', 'PublicSpecialists', destination];
    render(<PricingScreen />);
    await screen.findByLabelText('Ver todas las prestaciones de Calma');
    fireEvent.press(screen.getByLabelText('Mi espacio'));
    expect(mockNavigate).toHaveBeenCalledWith(destination);
  });
});
