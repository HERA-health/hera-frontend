import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as service from '../../../services/heraCommissionService';
import { ProfessionalCommissionOverview } from '../ProfessionalCommissionOverview';
import { money } from '../CommissionElements';

jest.mock('../../../services/heraCommissionService', () => ({ detail: jest.fn() }));
const account: service.Configuration['accounts'][number] = { id: 'account', mode: 'LIVE', operatorKey: 'internal-operator', acceptances: [] };
const config: service.Configuration = { mode: 'OFF', terms: null, canAccept: false, scale: [2000, 1000, 1000, 500], accounts: [] };
const detail: service.AccountDetail = {
  summary: { id: account.id, specialistId: 'specialist', specialistName: 'Profesional', operatorKey: account.operatorKey, mode: 'LIVE', revision: 1, estimatedCents: 0, accruedCents: 1800, undocumentedCents: 2400, documentedCents: 3600, pendingCents: 3600, overdueCents: 600, receivedCents: 1000, creditCents: 400, issueCount: 0 },
  acceptances: [], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], documents: [], cash: [], issues: [], hasMore: false,
};
beforeEach(() => { jest.clearAllMocks(); jest.mocked(service.detail).mockResolvedValue(detail); });

it('shows Mis comisiones in OFF without inventing an account or zero balances', () => {
  const view = render(<ProfessionalCommissionOverview config={config} refresh={0} onOpen={jest.fn()} />);
  expect(view.getByText('Mis comisiones')).toBeTruthy();
  expect(view.getByText('Todavía no tienes comisiones registradas')).toBeTruthy();
  expect(view.queryByText('Pendiente documentado')).toBeNull();
  expect(view.queryByRole('button', { name: 'Ver mis comisiones' })).toBeNull();
  expect(service.detail).not.toHaveBeenCalled();
});

it('shows persisted balances even in OFF and opens the existing account', async () => {
  const open = jest.fn();
  const view = render(<ProfessionalCommissionOverview config={{ ...config, accounts: [account] }} refresh={0} onOpen={open} />);
  expect(await view.findByText(money(3600))).toBeTruthy();
  expect(view.getByText(money(1000))).toBeTruthy();
  expect(view.getByText(money(400))).toBeTruthy();
  expect(view.getByText(`Vencido: ${money(600)}`)).toBeTruthy();
  expect(view.queryByText('Devengado sin liquidar')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Ver desglose de saldos' }));
  expect(view.getByText('Devengado sin liquidar')).toBeTruthy();
  expect(view.getByText(money(1800))).toBeTruthy();
  expect(view.getByText(money(2400))).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Ver desglose de saldos' }));
  expect(view.queryByText('Devengado sin liquidar')).toBeNull();
  expect(view.queryByText(account.operatorKey)).toBeNull();
  expect(service.detail).toHaveBeenCalledWith(account.id, false);
  fireEvent.press(view.getByRole('button', { name: 'Ver mis comisiones' }));
  expect(open).toHaveBeenCalledWith(account.id);
});

it('reports unavailable balances and allows a retry instead of displaying zero', async () => {
  jest.mocked(service.detail).mockRejectedValueOnce(new Error('No se pudieron consultar los saldos'));
  const view = render(<ProfessionalCommissionOverview config={{ ...config, accounts: [account] }} refresh={0} onOpen={jest.fn()} />);
  await view.findByText('No se pudieron consultar los saldos');
  expect(view.queryByText('Pendiente documentado')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Reintentar saldos' }));
  expect(await view.findByText(money(3600))).toBeTruthy();
  expect(view.queryByText('No se pudieron consultar los saldos')).toBeNull();
});

it('refreshes actual amounts and marks simulation without mixing it with real balances', async () => {
  const simulation = { ...account, mode: 'SIMULATION' as const };
  const props = { config: { ...config, mode: 'SIMULATION' as const, accounts: [simulation] }, onOpen: jest.fn() };
  const view = render(<ProfessionalCommissionOverview {...props} refresh={0} />);
  await view.findByText(money(3600));
  expect(view.getByText(/estos importes son de prueba y no generan deuda/)).toBeTruthy();
  jest.mocked(service.detail).mockResolvedValue({ ...detail, summary: { ...detail.summary, pendingCents: 2600 } });
  view.rerender(<ProfessionalCommissionOverview {...props} refresh={1} />);
  await view.findByText(money(2600));
  await waitFor(() => expect(service.detail).toHaveBeenCalledTimes(2));
  expect(view.queryByText(money(3600))).toBeNull();
});
