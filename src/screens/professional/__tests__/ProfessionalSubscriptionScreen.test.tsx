import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfessionalSubscriptionScreen } from '../ProfessionalSubscriptionScreen';
import { useSubscription } from '../../../hooks/useSubscription';
import { getSubscriptionCatalog, requestSubscription, type SubscriptionSummary } from '../../../services/subscriptionService';
import { subscriptionCatalogFixture } from '../../landing/__fixtures__/subscriptionCatalog';

const mockNavigate = jest.fn();
let mockSelectedPlan: 'CRECIMIENTO' | undefined;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useRoute: () => ({ params: { plan: mockSelectedPlan } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: jest.fn() }));
jest.mock('../../../services/api', () => ({ api: {}, publicApi: {} }));
jest.mock('../../../services/subscriptionService', () => ({
  ...jest.requireActual('../../../services/subscriptionService'), getSubscriptionCatalog: jest.fn(), requestSubscription: jest.fn(),
}));
const refresh = jest.fn();
const summary = (): SubscriptionSummary => ({
  plan: 'DIRECTORIO', name: 'Directorio', period: null, revision: 0, trialEligible: true, trialGrantedAt: null,
  trialPolicy: { unit: 'month', count: 1 }, nextPlan: null, cancelAtEnd: false, invitationDismissed: false, enforced: true,
  limits: { ownPatients: 0, storageBytes: '5000000000' },
  usage: { patients: { active: 0, additionalCommitted: 0, total: 0, protectedCount: 0, unresolvedCount: 0, activityDays: 60 }, storage: { usedBytes: '0', unknownFiles: 0 } },
  features: ['Estadísticas completas'], periods: [], requests: [], computedAt: new Date().toISOString(), timeZone: 'Europe/Madrid', directoryCommissionsIndependent: true,
});
const setup = (data: SubscriptionSummary) => {
  jest.mocked(useSubscription).mockReturnValue({ data, loading: false, error: '', refresh });
  render(<ProfessionalSubscriptionScreen />);
};
beforeEach(() => {
  jest.clearAllMocks(); mockSelectedPlan = undefined; jest.mocked(getSubscriptionCatalog).mockResolvedValue(subscriptionCatalogFixture);
});
it('uses the plan chosen in comparison and requests a change without offering another trial', async () => {
  mockSelectedPlan = 'CRECIMIENTO';
  const data = summary(); data.plan = 'CALMA'; data.name = 'Calma'; data.trialEligible = false;
  data.period = { id: 'paid', kind: 'PAID', plan: 'CALMA', startsAt: data.computedAt, endsAt: new Date(Date.now() + 86400000).toISOString(), voidedAt: null, offerVersion: 'fixture' };
  setup(data);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar cambio de plan' })).not.toBeDisabled());
  expect(screen.getByText('Suscripción activa')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Solicitar prueba gratuita' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Solicitar cambio de plan' }));
  await waitFor(() => expect(requestSubscription).toHaveBeenCalledWith(expect.objectContaining({ kind: 'CHANGE', plan: 'CRECIMIENTO' })));
});
it('opens plan comparison from the top action without duplicating the shell title', async () => {
  setup(summary());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar prueba gratuita' })).not.toBeDisabled());
  fireEvent.press(screen.getByRole('button', { name: 'Cambiar plan' }));
  expect(mockNavigate).toHaveBeenCalledWith('Pricing');
  expect(screen.queryByRole('header', { name: 'Mi suscripción' })).toBeNull();
});

it('uses the current trial policy and keeps the same operation key when retrying a failed request', async () => {
  const data = summary(); data.trialPolicy = { unit: 'day', count: 14 }; setup(data);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar prueba gratuita' })).not.toBeDisabled());
  expect(screen.getByText(/Puedes solicitar 14 días de prueba/)).toBeTruthy();
  jest.mocked(requestSubscription).mockRejectedValue(new Error('No se pudo registrar la solicitud.'));
  fireEvent.press(screen.getByRole('button', { name: 'Solicitar prueba gratuita' }));
  await screen.findByText('No se pudo registrar la solicitud.');
  fireEvent.press(screen.getByRole('button', { name: 'Solicitar prueba gratuita' }));
  await waitFor(() => expect(requestSubscription).toHaveBeenCalledTimes(2));
  expect(jest.mocked(requestSubscription).mock.calls[0][0]).toEqual(jest.mocked(requestSubscription).mock.calls[1][0]);
  expect(refresh).not.toHaveBeenCalled();
});

it('shows a persisted pending request without offering another activation', async () => {
  const data = summary(); data.requests = [{ id: 'pending', kind: 'TRIAL', plan: 'CALMA', status: 'PENDING', createdAt: data.computedAt, resolvedAt: null, resolution: null }];
  setup(data); await screen.findByText('Solicitud en curso');
  expect(screen.queryByRole('button', { name: 'Solicitar prueba gratuita' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Ver mi solicitud' })).toBeTruthy();
  expect(requestSubscription).not.toHaveBeenCalled();
});

it('does not offer a second trial and preserves the explanation of protected patients', async () => {
  const data = summary(); data.trialEligible = false; data.trialGrantedAt = data.computedAt;
  data.usage.patients = { ...data.usage.patients, active: 2, additionalCommitted: 1, total: 3, protectedCount: 4 };
  setup(data); await screen.findByRole('button', { name: 'Solicitar continuidad' });
  expect(screen.queryByRole('button', { name: 'Solicitar prueba gratuita' })).toBeNull();
  expect(screen.getByText('Tu cartera anterior sigue contigo')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Cómo se calcula el uso' }));
  expect(screen.getByText('Adicionales con plaza comprometida')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar detalle de uso' }));
  expect(screen.getByText(/4 pacientes tienen protección/)).toBeTruthy();
});

it.each([['4000000000', 'Has utilizado al menos el 80 % de tu espacio.'], ['5000000000', 'Has alcanzado el límite. Conservas el acceso y las descargas; las nuevas cargas computables están bloqueadas.']])('explains storage usage %s without hiding downloads', async (bytes, notice) => {
  const data = summary(); data.usage.storage.usedBytes = bytes; setup(data);
  await screen.findByText(notice);
});

it.each(['DIRECTORIO', 'CALMA'] as const)('shows usage without restrictions for %s when enforcement is off', async plan => {
  const data = summary(); data.enforced = false; data.plan = plan;
  data.name = plan === 'CALMA' ? 'Calma' : 'Directorio';
  data.limits.ownPatients = plan === 'CALMA' ? 15 : 0;
  if (plan === 'CALMA') {
    data.trialEligible = false;
    data.period = { id: 'paid', kind: 'PAID', plan, startsAt: data.computedAt, endsAt: new Date(Date.now() + 30 * 86400000).toISOString(), voidedAt: null, offerVersion: 'fixture' };
  }
  data.usage.patients = { ...data.usage.patients, active: 18, additionalCommitted: 2, total: 20 };
  data.usage.storage = { usedBytes: '6100000000', unknownFiles: 1 };
  setup(data);
  await screen.findByRole('button', { name: plan === 'CALMA' ? 'Solicitar continuidad' : 'Solicitar prueba gratuita' });
  expect(screen.getByText('Límites aún no activos')).toBeTruthy();
  expect(screen.getByLabelText('20 pacientes propios con actividad o compromisos')).toBeTruthy();
  expect(screen.getByText('6.1 GB / 5 GB')).toBeTruthy();
  expect(screen.queryByText('Adicionales con citas o bonos pendientes')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cómo se calcula el uso' }));
  expect(screen.getByText('Adicionales con citas o bonos pendientes')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar detalle de uso' }));
  expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  expect(screen.getByRole('progressbar', { name: 'Almacenamiento utilizado' })).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 100 });
  expect(screen.queryAllByRole('alert')).toHaveLength(0);
  expect(screen.queryByText(/requiere suscripción/)).toBeNull();
  expect(screen.queryByText(/supera tu límite|cargas computables están bloqueadas/)).toBeNull();
  expect(screen.getByRole('header', { name: plan === 'DIRECTORIO' ? 'Incluido en Directorio' : 'Prestaciones previstas del plan' })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Cambiar plan' }));
  expect(mockNavigate).toHaveBeenCalledWith('Pricing');
});

it('identifies Directory as current and shows confirmed directory usage and planned capacity without activating a trial', async () => {
  const data = summary(); data.enforced = false; data.usage.patients.directoryCount = 7;
  data.features = ['Pacientes del directorio', 'Estadísticas completas', 'Cartera anterior protegida'];
  setup(data); await screen.findByRole('button', { name: 'Solicitar prueba gratuita' });
  expect(screen.getByText('TU PLAN ACTUAL')).toBeTruthy();
  expect(screen.getByText('Sin cuota fija')).toBeTruthy();
  expect(screen.getByText('Solo pagas comisiones por pacientes del directorio.')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ver comisiones' }));
  expect(mockNavigate).toHaveBeenCalledWith('HeraCommissions');
  expect(screen.getByLabelText('7 pacientes del directorio')).toBeTruthy();
  expect(screen.getByText('Pacientes del directorio sin límite')).toBeTruthy();
  expect(screen.getByText('5 GB de almacenamiento previstos')).toBeTruthy();
  expect(screen.queryByText('Cartera anterior protegida')).toBeNull();
  expect(screen.queryByText('Suscripción activa')).toBeNull();
  expect(requestSubscription).not.toHaveBeenCalled();
});

it('does not invent a zero count when the server has not supplied directory usage', async () => {
  setup(summary()); await screen.findByText('Recuento no disponible');
  expect(screen.queryByLabelText('0 pacientes del directorio')).toBeNull();
});

it.each([true, false])('keeps period dates without suggesting loss of access when enforcement is off (current: %s)', async current => {
  const data = summary(); data.enforced = false; data.trialEligible = false;
  const period: NonNullable<SubscriptionSummary['period']> = {
    id: 'period', kind: 'PAID', plan: 'CALMA', startsAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + (current ? 1 : -1) * 86400000).toISOString(), voidedAt: null, offerVersion: 'fixture',
  };
  data.periods = [period];
  if (current) { data.period = period; data.plan = 'CALMA'; data.name = 'Calma'; data.cancelAtEnd = true; }
  setup(data);
  await screen.findByRole('button', { name: 'Solicitar continuidad' });
  expect(screen.getByText(current ? /Período confirmado hasta el/ : /Tu último período terminó el/)).toBeTruthy();
  expect(screen.queryAllByRole('alert')).toHaveLength(0);
  expect(screen.queryByText(/Para asumir nueva atención propia/)).toBeNull();
  expect(screen.queryByText(/Tu período termina en los próximos siete días/)).toBeNull();
});

it('offers finalization only while a period is current and no finalization is registered', async () => {
  const data = summary(); data.plan = 'CALMA'; data.name = 'Calma'; data.trialEligible = false;
  data.period = { id: 'period', kind: 'PAID', plan: 'CALMA', startsAt: data.computedAt, endsAt: new Date(Date.now() + 86400000).toISOString(), voidedAt: null, offerVersion: 'fixture' };
  data.limits.ownPatients = 15; setup(data);
  await screen.findByRole('button', { name: 'Solicitar finalización al vencimiento' });
  jest.mocked(requestSubscription).mockResolvedValue({ id: 'cancel', kind: 'CANCEL', plan: null, status: 'PENDING', createdAt: data.computedAt, resolvedAt: null, resolution: null });
  fireEvent.press(screen.getByRole('button', { name: 'Solicitar finalización al vencimiento' }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(requestSubscription).toHaveBeenCalledWith(expect.objectContaining({ kind: 'CANCEL', plan: undefined }));
  expect(screen.getByText(/Solicitud registrada/)).toBeTruthy();
});

it('does not ask for another renewal when the following period is already paid', async () => {
  const data = summary(); data.plan = 'CALMA'; data.name = 'Calma'; data.trialEligible = false;
  data.period = { id: 'current', kind: 'PAID', plan: 'CALMA', startsAt: data.computedAt,
    endsAt: new Date(Date.now() + 86400000).toISOString(), voidedAt: null, offerVersion: 'fixture' };
  data.periods = [{ ...data.period, id: 'renewed', startsAt: data.period.endsAt, endsAt: new Date(Date.now() + 32 * 86400000).toISOString() }, data.period];
  setup(data); await screen.findByText('Próximos períodos');
  expect(screen.queryByText(/Tu período termina en los próximos siete días/)).toBeNull();
});
