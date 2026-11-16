import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AdminSubscriptionWorkspace, AdminSubscriptionsScreen } from '../AdminSubscriptionsScreen';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAuth } from '../../../contexts/AuthContext';
import { subscriptionCatalogFixture } from '../../landing/__fixtures__/subscriptionCatalog';
import * as service from '../../../services/subscriptionService';

const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ dispatch: mockDispatch }), useRoute: () => ({ params: { specialistId: 'specialist' } }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn(() => ({ user: { isAdmin: true } })) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: jest.fn() }));
jest.mock('../../../services/api', () => ({ api: {}, publicApi: {} }));
jest.mock('../../../services/subscriptionService', () => ({ ...jest.requireActual('../../../services/subscriptionService'), getSubscriptionCatalog: jest.fn(), previewSubscriptionCommand: jest.fn(), executeSubscriptionCommand: jest.fn(), listSubscriptionRequests: jest.fn(), listSubscriptionAccounts: jest.fn(), resolveSubscriptionRequest: jest.fn() }));
jest.mock('react-native-calendars', () => {
  const React = require('react'); const { Text } = require('react-native');
  return { LocaleConfig: { locales: {}, defaultLocale: 'es' }, Calendar: ({ onDayPress }: { onDayPress: (day: { dateString: string }) => void }) =>
    <Text testID="calendar-day" onPress={() => onDayPress({ dateString: '2026-06-16' })}>16</Text> };
});
const refresh = jest.fn();
const summary: service.SubscriptionSummary = {
  plan: 'DIRECTORIO', name: 'Directorio', period: null, revision: 7, trialEligible: true, trialGrantedAt: null,
  trialPolicy: { unit: 'month', count: 1 }, nextPlan: null, cancelAtEnd: false, invitationDismissed: false, enforced: true,
  limits: { ownPatients: 0, storageBytes: '5000000000' },
  usage: { patients: { active: 0, additionalCommitted: 0, total: 0, protectedCount: 0, unresolvedCount: 0, activityDays: 60 }, storage: { usedBytes: '0', unknownFiles: 0 } },
  features: [], periods: [], requests: [], computedAt: new Date().toISOString(), timeZone: 'Europe/Madrid', directoryCommissionsIndependent: true,
};
const preview: service.SubscriptionPreview = { kind: 'PAY', effectiveAt: summary.computedAt, before: [], after: [], additions: [],
  nextPlan: null, cancelAtEnd: false, payment: null, notice: 'Período confirmado tras comprobar el pago externo.' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(service.getSubscriptionCatalog).mockResolvedValue({ ...subscriptionCatalogFixture, plans: subscriptionCatalogFixture.plans.map(p => ({ ...p, monthlyPayment: { baseCents: p.monthlyCents, vatPercent: 21, vatCents: Math.round(p.monthlyCents * .21), totalCents: p.monthlyCents + Math.round(p.monthlyCents * .21) } })) });
  jest.mocked(useSubscription).mockReturnValue({ data: summary, loading: false, error: '', refresh });
  jest.mocked(service.previewSubscriptionCommand).mockResolvedValue(preview);
  jest.mocked(service.executeSubscriptionCommand).mockResolvedValue();
});
async function fillPayment() {
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  await screen.findByLabelText(/Importe total: 36,29/);
  fireEvent.changeText(screen.getByLabelText('Referencia del pago externo'), 'transferencia-fixture');
  fireEvent.changeText(screen.getByLabelText('Motivo de la operación'), 'Pago comprobado por administración');
}
async function reviewPayment() {
  await fillPayment();
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Confirmar operación' });
}
it('opens a pending request with its plan and resolves it through the same confirmation', async () => {
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, requests: [{ id: 'pending-request', kind: 'RENEW', plan: 'CRECIMIENTO', status: 'PENDING', createdAt: summary.computedAt, resolvedAt: null, resolution: null }] }, loading: false, error: '', refresh });
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  await screen.findByLabelText(/Importe total: 60,49/);
  expect(screen.queryByText('TU PLAN ACTUAL')).toBeNull();
  expect(screen.queryByText('El uso de tu consulta')).toBeNull();
  expect(screen.queryByLabelText('Plan')).toBeNull();
  expect(screen.queryByLabelText('Importe en euros')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Referencia del pago externo'), 'payment-request');
  fireEvent.changeText(screen.getByLabelText('Motivo de la operación'), 'Pago de Crecimiento verificado');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Aceptar solicitud' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ requestId: 'pending-request', kind: 'PAY', plan: 'CRECIMIENTO', payment: expect.objectContaining({ amountCents: 6049 }) }));
  expect(screen.getByText('La solicitud quedará resuelta al confirmar esta operación.')).toBeTruthy();
  expect(service.executeSubscriptionCommand).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Aceptar solicitud' }));
  await screen.findByText('Solicitud atendida. La suscripción y su estado se han actualizado.');
  expect(service.resolveSubscriptionRequest).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalled();
});
it('preselects a requested trial without a payment form', async () => {
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, requests: [{ id: 'trial-request', kind: 'TRIAL', plan: 'HORIZONTE', status: 'PENDING', createdAt: summary.computedAt, resolvedAt: null, resolution: null }] }, loading: false, error: '', refresh });
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  await act(async () => {});
  expect(screen.queryByLabelText('Referencia del pago externo')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Motivo de la operación'), 'Prueba acordada con el especialista');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Aceptar solicitud' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ requestId: 'trial-request', kind: 'TRIAL', plan: 'HORIZONTE' }));
});
it('does not add another month for a change request whose plan was already granted', async () => {
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, plan: 'CRECIMIENTO', name: 'Crecimiento', requests: [{ id: 'old-request', kind: 'CHANGE', plan: 'CRECIMIENTO', status: 'PENDING', createdAt: summary.computedAt, resolvedAt: null, resolution: null }] }, loading: false, error: '', refresh });
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  await screen.findByLabelText(/Importe total: 60,49/);
  expect(screen.getByText(/El plan solicitado ya está vigente/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
});
it('updates the fixed monthly price when selecting another plan', async () => {
  await fillPayment();
  fireEvent(screen.getByLabelText('Plan'), 'select', 'HORIZONTE');
  expect(screen.getByLabelText(/Importe total: 84,69/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Confirmar operación' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ plan: 'HORIZONTE', payment: expect.objectContaining({ amountCents: 8469 }) }));
});
it('blocks a monthly payment when catalog prices cannot be loaded and permits retry', async () => {
  jest.mocked(service.getSubscriptionCatalog).mockRejectedValueOnce(new Error('No se pudo obtener el catálogo'));
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  await screen.findByText('No se pudo obtener el catálogo');
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Actualizar importe' }));
  await screen.findByLabelText(/Importe total: 36,29/);
  expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled();
});
it('shows readable history without exposing actor IDs or repeating technical notices', async () => {
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, history: [{ id: 'event', kind: 'PAY', actorId: 'internal-actor-id', reason: 'Pago mensual comprobado', createdAt: summary.computedAt, details: { ...preview, payment: { amountCents: 6049, currency: 'EUR', paidAt: summary.computedAt, method: 'Transferencia', reference: 'payment-history' } } }] }, loading: false, error: '', refresh });
  await fillPayment();
  expect(screen.getByText('Pago confirmado')).toBeTruthy();
  expect(screen.getByText('Referencia: payment-history')).toBeTruthy();
  expect(screen.queryByText(/internal-actor-id/)).toBeNull();
  expect(screen.queryByText(preview.notice)).toBeNull();
});
it('previews the exact external payment and only persists after confirmation', async () => {
  await reviewPayment();
  expect(service.executeSubscriptionCommand).not.toHaveBeenCalled();
  const command = jest.mocked(service.previewSubscriptionCommand).mock.calls[0][1];
  expect(command).toEqual(expect.objectContaining({ expectedRevision: 7, expectedCurrentPeriodId: null, kind: 'PAY', plan: 'CALMA', payment: expect.objectContaining({ amountCents: 3629, reference: 'transferencia-fixture' }) }));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar operación' }));
  await screen.findByText('Operación registrada. La suscripción se ha actualizado.');
  expect(service.executeSubscriptionCommand).toHaveBeenCalledWith('specialist', command);
  expect(refresh).toHaveBeenCalledTimes(1);
});
it.each(['1e3', '0x10', '-1', 'NaN', 'Infinity', '29.999', '1,234.56', '0', '1000000.01'])('rejects an invalid monetary value without rounding or sending it: %s', async value => {
  await fillPayment();
  fireEvent(screen.getByLabelText('Operación'), 'select', 'REFUND');
  fireEvent.changeText(screen.getByLabelText('Importe en euros'), value);
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText(/Introduce un importe mayor que 0/)).toBeTruthy();
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
  expect(service.executeSubscriptionCommand).not.toHaveBeenCalled();
});
it('binds the administrative review to the currently displayed period', async () => {
  const period: service.SubscriptionSummary['periods'][number] = { id: 'current-period', plan: 'CALMA', kind: 'PAID', startsAt: '2026-11-01T11:00:00.000Z', endsAt: '2026-12-01T11:00:00.000Z', offerVersion: 'fixture', voidedAt: null };
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, plan: 'CALMA', period, periods: [period] }, loading: false, error: '', refresh });
  await reviewPayment();
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ expectedCurrentPeriodId: 'current-period' }));
});
it.each(['Medio', 'Referencia del pago externo', 'Motivo de la operación'])('rejects whitespace-only text: %s', async label => {
  await fillPayment();
  fireEvent.changeText(screen.getByLabelText(label), '   ');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
});
it('selects the payment day from the shared calendar and converts Madrid time to UTC', async () => {
  await fillPayment();
  fireEvent.press(screen.getByRole('button', { name: 'Fecha del pago' }));
  fireEvent.press(screen.getByTestId('calendar-day'));
  expect(screen.queryByTestId('calendar-day')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Confirmar operación' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ payment: expect.objectContaining({ amountCents: 3629, paidAt: '2026-06-16T10:00:00.000Z' }) }));
});
it('opens a modal and returns to the original form without losing values or recording a payment', async () => {
  await reviewPayment();
  expect(screen.UNSAFE_getAllByType(Modal).filter(modal => modal.props.visible)).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', { name: 'Volver a editar' }));
  expect(screen.queryByRole('button', { name: 'Confirmar operación' })).toBeNull();
  expect(screen.queryByLabelText('Importe en euros')).toBeNull();
  expect(screen.getByLabelText(/Importe total: 36,29/)).toBeTruthy();
  expect(screen.getByLabelText('Referencia del pago externo').props.value).toBe('transferencia-fixture');
  expect(service.executeSubscriptionCommand).not.toHaveBeenCalled();
});
it('blocks dismissal and duplicate confirmation while the operation is being saved', async () => {
  let finish: () => void = () => {};
  jest.mocked(service.executeSubscriptionCommand).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  await reviewPayment();
  const confirm = screen.getByRole('button', { name: 'Confirmar operación' });
  fireEvent.press(confirm); fireEvent.press(confirm);
  expect(service.executeSubscriptionCommand).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Volver a editar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cerrar formulario' })).toBeDisabled();
  const modal = screen.UNSAFE_getAllByType(Modal).find(item => item.props.visible);
  act(() => modal?.props.onRequestClose());
  expect(screen.getByRole('header', { name: 'Revisa antes de confirmar' })).toBeTruthy();
  await act(async () => finish());
  await screen.findByText('Operación registrada. La suscripción se ha actualizado.');
});
it('keeps correction dates in calendar fields and rejects a reversed period or invalid Madrid time', async () => {
  const period: service.SubscriptionSummary['periods'][number] = { id: 'period', plan: 'CALMA', kind: 'PAID', startsAt: '2026-05-16T10:00:24.125Z', endsAt: '2026-06-16T10:00:55.250Z', offerVersion: 'fixture', voidedAt: null };
  jest.mocked(useSubscription).mockReturnValue({ data: { ...summary, periods: [period] }, loading: false, error: '', refresh });
  render(<AdminSubscriptionWorkspace specialistId="specialist" onOpen={jest.fn()} onBack={jest.fn()} />);
  // Portal positioning needs native measurements; exercise its selection callback here.
  fireEvent(screen.getByLabelText('Operación'), 'select', 'CORRECT');
  fireEvent(screen.getByLabelText('Período que corregir'), 'select', 'period');
  fireEvent.changeText(screen.getByLabelText('Motivo de la operación'), 'Corrección de la fecha acordada');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Confirmar operación' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ startsAt: period.startsAt, endsAt: period.endsAt }));
  fireEvent.press(screen.getByRole('button', { name: 'Volver a editar' }));
  jest.mocked(service.previewSubscriptionCommand).mockClear();
  fireEvent.press(screen.getByRole('button', { name: 'Fecha de inicio' }));
  fireEvent.press(screen.getByTestId('calendar-day'));
  fireEvent.changeText(screen.getByLabelText('Hora de inicio (Madrid)'), '13:00');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText('El vencimiento debe ser posterior al inicio.')).toBeTruthy();
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Hora de inicio (Madrid)'), '25:00');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText('Selecciona una fecha y una hora válidas de Madrid.')).toBeTruthy();
  expect(service.previewSubscriptionCommand).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Hora de inicio (Madrid)'), '9:30');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('button', { name: 'Confirmar operación' });
  expect(service.previewSubscriptionCommand).toHaveBeenCalledWith('specialist', expect.objectContaining({ kind: 'CORRECT', periodId: 'period', startsAt: '2026-06-16T07:30:00.000Z', endsAt: period.endsAt }));
});
it('keeps existing subscription links inside the administration panel', () => {
  render(<AdminSubscriptionsScreen />);
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'REPLACE', payload: { name: 'AdminPanel', params: { initialTab: 'subscriptions', subscriptionSpecialistId: 'specialist' } } });
});
it('opens specialist management from a compact request and preserves explicit resolution', async () => {
  jest.mocked(service.listSubscriptionRequests).mockResolvedValue({ page: 1, total: 1, items: [{
    id: 'request', specialistId: 'specialist', specialist: { name: 'Nombre sintético', email: 'fixture@example.invalid' },
    kind: 'TRIAL', plan: 'CALMA', status: 'PENDING', createdAt: summary.computedAt, resolvedAt: null, resolution: null,
    contact: null, acceptance: null, deliveryStatus: 'SENT', deliveryAttempts: 1,
  }] });
  jest.mocked(service.listSubscriptionAccounts).mockResolvedValue({ page: 1, total: 0, items: [], metrics: { pending: 1, firstPayments: 0, renewals: 0 } });
  jest.mocked(service.resolveSubscriptionRequest).mockResolvedValue();
  const open = jest.fn();
  render(<AdminSubscriptionWorkspace onOpen={open} onBack={jest.fn()} />);
  await screen.findByText('Nombre sintético');
  expect(screen.getByLabelText('Filtrar plan')).toBeTruthy();
  expect(screen.getByLabelText('Estado de solicitud')).toBeTruthy();
  expect(screen.queryByLabelText('Resolución / motivo')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Gestionar suscripción' }));
  expect(open).toHaveBeenCalledWith('specialist');
  fireEvent.press(screen.getByRole('button', { name: 'Revisar solicitud' }));
  expect(screen.getByRole('button', { name: 'Cerrar sin cambiar el plan' })).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Resolución / motivo'), 'Activación comprobada por HERA');
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Cerrar sin cambiar el plan' })); });
  await waitFor(() => expect(service.resolveSubscriptionRequest).toHaveBeenCalledWith('request', { status: 'RESOLVED', reason: 'Activación comprobada por HERA' }));
  expect(service.executeSubscriptionCommand).not.toHaveBeenCalled();
});
it('does not load subscription management for a non-admin', () => {
  jest.mocked(useAuth).mockReturnValueOnce({ ...useAuth(), user: null });
  render(<AdminSubscriptionWorkspace onOpen={jest.fn()} onBack={jest.fn()} />);
  expect(screen.getByText('Acceso reservado a administración.')).toBeTruthy();
  expect(service.listSubscriptionRequests).not.toHaveBeenCalled();
  expect(useSubscription).not.toHaveBeenCalled();
});
it('retries an uncertain result with the same idempotency key', async () => {
  await reviewPayment();
  jest.mocked(service.executeSubscriptionCommand).mockRejectedValueOnce(new Error('Conexión interrumpida'));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar operación' }));
  await screen.findByText('Conexión interrumpida');
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar operación' }));
  await screen.findByText('Operación registrada. La suscripción se ha actualizado.');
  expect(jest.mocked(service.executeSubscriptionCommand).mock.calls[1]).toEqual(jest.mocked(service.executeSubscriptionCommand).mock.calls[0]);
});
it('refreshes and requires a new preview after a rejected stale revision', async () => {
  await reviewPayment();
  jest.mocked(service.executeSubscriptionCommand).mockRejectedValue(Object.assign(new Error('La suscripción ha cambiado.'), { code: 'SUBSCRIPTION_CHANGED' }));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar operación' }));
  await screen.findByText('La suscripción ha cambiado.');
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Confirmar operación' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
  jest.mocked(service.previewSubscriptionCommand).mockRejectedValueOnce(Object.assign(new Error('La revisión ha cambiado otra vez.'), { code: 'SUBSCRIPTION_CHANGED' }));
  fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText('La revisión ha cambiado otra vez.');
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('button', { name: 'Confirmar operación' })).toBeNull();
});
