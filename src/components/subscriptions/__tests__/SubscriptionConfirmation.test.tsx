import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SubscriptionConfirmation } from '../SubscriptionConfirmation';
import type { SubscriptionCommand, SubscriptionPreview } from '../../../services/subscriptionService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
const base = { operationKey: 'fixture', expectedRevision: 2, reason: 'Operación comprobada por administración' };
const period: SubscriptionPreview['before'][number] = { id: 'period', kind: 'PAID', plan: 'CALMA', startsAt: '2026-11-01T11:00:00.000Z', endsAt: '2026-12-01T11:00:00.000Z', voidedAt: null, offerVersion: 'fixture' };
const payment = { amountCents: 2999, currency: 'EUR' as const, paidAt: '2026-11-14T11:00:00.000Z', method: 'Transferencia', reference: 'LOCAL-123' };
const preview: SubscriptionPreview = { kind: 'PAY', effectiveAt: '2026-11-14T11:00:00.000Z', before: [period], after: [period], additions: [], nextPlan: null, cancelAtEnd: false, payment: null, notice: 'Sin cobros automáticos.' };
function show(command: SubscriptionCommand, changes: Partial<SubscriptionPreview> = {}) {
  return render(<SubscriptionConfirmation command={command} preview={{ ...preview, kind: command.kind, ...changes }} operationLabel="Operación revisada" specialistName="Especialista de prueba" busy={false} error="" onConfirm={jest.fn()} onClose={jest.fn()} />);
}
it('highlights the payment and new period without repeating unchanged history', () => {
  show({ ...base, kind: 'PAY', plan: 'CALMA', payment }, { payment, additions: [{ ...period, startsAt: period.endsAt, endsAt: '2027-01-01T11:00:00.000Z' }] });
  expect(screen.getByText('29,99 €')).toBeTruthy();
  expect(screen.getByText('Nuevo período · Calma')).toBeTruthy();
  expect(screen.getByText('1 ene 2027')).toBeTruthy();
  expect(screen.queryByText('1 nov 2026')).toBeNull();
  expect(screen.queryByText('Cambio en el período')).toBeNull();
});
it('shows correction dates and hours before and after the change', () => {
  const updated = { ...period, endsAt: '2026-12-02T08:30:00.000Z' };
  show({ ...base, kind: 'CORRECT', plan: 'CALMA', periodId: period.id, startsAt: period.startsAt, endsAt: updated.endsAt, void: false }, { after: [updated] });
  expect(screen.getByText('Antes · Calma')).toBeTruthy();
  expect(screen.getByText('Después · Calma')).toBeTruthy();
  expect(screen.getByText(/2 dic 2026.*09:30/)).toBeTruthy();
});
it('makes voiding a period explicit', () => {
  show({ ...base, kind: 'CORRECT', plan: 'CALMA', periodId: period.id, startsAt: period.startsAt, endsAt: period.endsAt, void: true }, { after: [{ ...period, voidedAt: preview.effectiveAt }] });
  expect(screen.getByText('Se anula este período')).toBeTruthy();
  expect(screen.queryByText('Después · Calma')).toBeNull();
});
it('shows the actual last paid date when ending a subscription with future periods', () => {
  show({ ...base, kind: 'CANCEL' }, { after: [period, { ...period, id: 'future', startsAt: period.endsAt, endsAt: '2027-01-01T11:00:00.000Z' }], cancelAtEnd: true });
  expect(screen.getByText('Se mantiene hasta el 1 ene 2027')).toBeTruthy();
});
it('distinguishes refunds from incoming payments', () => {
  show({ ...base, kind: 'REFUND', payment }, { payment });
  expect(screen.getByText('Devolución realizada fuera de HERA')).toBeTruthy();
  expect(screen.getByText('Fecha de devolución')).toBeTruthy();
});
it('shows a scheduled downgrade at the end of the current period', () => {
  const current = { ...period, plan: 'CRECIMIENTO' as const };
  show({ ...base, kind: 'DOWNGRADE', plan: 'CALMA' }, { before: [current], after: [current], nextPlan: 'CALMA' });
  expect(screen.getByText('Crecimiento → Calma')).toBeTruthy();
  expect(screen.getByText('Cambio previsto al vencimiento')).toBeTruthy();
  expect(screen.getByText('1 dic 2026')).toBeTruthy();
});
it('identifies the trial and its server-calculated duration', () => {
  show({ ...base, kind: 'TRIAL', plan: 'CALMA' }, { before: [], after: [], additions: [{ ...period, kind: 'TRIAL' }] });
  expect(screen.getByText('Prueba gratuita · Calma')).toBeTruthy();
  expect(screen.getByText('1 nov 2026')).toBeTruthy();
  expect(screen.getByText('1 dic 2026')).toBeTruthy();
});
