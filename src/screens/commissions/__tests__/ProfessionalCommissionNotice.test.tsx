import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as service from '../../../services/heraCommissionService';
import { notifyCommissionAcceptance } from '../../../services/commissionAcceptanceEvents';
import { pendingLiveCommissionTerms, ProfessionalCommissionNotice } from '../ProfessionalCommissionNotice';

jest.mock('../../../services/heraCommissionService', () => ({ configuration: jest.fn(), accept: jest.fn() }));
const terms: service.Terms = {
  id: 'live-v1', mode: 'LIVE', operatorKey: 'fixture', operatorName: 'Titular de prueba',
  operatorTaxId: 'fixture', operatorAddress: 'Dirección de prueba', beneficiary: 'Titular de prueba', iban: 'fixture',
  contractText: 'Condiciones exactas de prueba: escala 20 %, 10 %, 10 % y 5 %.',
  fiscalTreatment: 'Tratamiento fiscal de prueba', effectiveAt: '2026-09-13T00:00:00Z',
};
const config = (overrides: Partial<service.Configuration> = {}): service.Configuration => ({
  mode: 'LIVE', canAccept: true, terms, accounts: [], scale: [2000, 1000, 1000, 500], ...overrides,
});
const acceptedConfig = (terminatedAt: string | null = null) => config({ accounts: [{
  id: 'account', mode: 'LIVE', operatorKey: 'fixture',
  acceptances: [{ id: 'acceptance', termsId: terms.id, terms, acceptedAt: '2026-09-13T10:00:00Z', terminatedAt }],
}] });
const title = 'Una actualización para seguir conectando contigo';
const checkbox = 'He leído y acepto esta versión de las condiciones y su tratamiento fiscal';
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(service.configuration).mockResolvedValue(config());
  jest.mocked(service.accept).mockResolvedValue({ accountId: 'account' });
});

it.each([
  ['OFF', config({ mode: 'OFF', terms: null })],
  ['simulation', config({ mode: 'SIMULATION', terms: { ...terms, mode: 'SIMULATION' } })],
  ['missing terms', config({ terms: null })],
  ['ineligible specialist', config({ canAccept: false })],
  ['accepted version', acceptedConfig()],
  ['terminated version', acceptedConfig('2026-09-14T00:00:00Z')],
] as const)('does not prompt for %s', async (_name, configuration) => {
  jest.mocked(service.configuration).mockResolvedValue(configuration);
  const view = render(<ProfessionalCommissionNotice />);
  await act(async () => {});
  expect(service.configuration).toHaveBeenCalledTimes(1);
  expect(view.queryByText(title)).toBeNull();
  expect(service.accept).not.toHaveBeenCalled();
});

it('offers a new version even when an older version was accepted', () => {
  expect(pendingLiveCommissionTerms({ ...acceptedConfig(), terms: { ...terms, id: 'live-v2' } })?.id).toBe('live-v2');
});

it('lets professionals continue with existing patients and return to the notice', async () => {
  const view = render(<ProfessionalCommissionNotice />);
  await view.findByText(title);
  expect(view.queryByText('Tus pacientes actuales siguen contigo')).toBeNull();
  expect(view.getByRole('button', { name: 'Qué cambia para ti' })).toHaveAccessibilityState({ expanded: false });
  fireEvent.press(view.getByRole('button', { name: 'Qué cambia para ti' }));
  expect(view.getByText('Tus pacientes actuales siguen contigo')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Qué cambia para ti' })).toHaveAccessibilityState({ expanded: true });
  fireEvent.press(view.getByRole('button', { name: 'Qué cambia para ti' }));
  expect(view.queryByText('Tus pacientes actuales siguen contigo')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Ahora no' }));
  expect(view.queryByText(title)).toBeNull();
  expect(service.accept).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole('button', { name: 'Revisar condiciones' }));
  expect(view.getByText(title)).toBeTruthy();
  expect(view.getByRole('button', { name: 'Qué cambia para ti' })).toHaveAccessibilityState({ expanded: false });
});

it('requires reading and checking the exact terms, saves once and stays hidden after remount', async () => {
  let finish: ((value: { accountId: string }) => void) | undefined;
  jest.mocked(service.accept).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Leer las condiciones' }));
  expect(view.getByText(terms.contractText)).toBeTruthy();
  expect(view.queryByText(new RegExp(terms.id))).toBeNull();
  expect(view.getByText(/Condiciones vigentes desde el/)).toBeTruthy();
  expect(view.getByText(`Fiscalidad de HERA: ${terms.fiscalTreatment}`)).toBeTruthy();
  const button = view.getByRole('button', { name: 'Aceptar condiciones y continuar' });
  expect(button).toBeDisabled();
  fireEvent.press(view.getByRole('checkbox', { name: checkbox }));
  fireEvent.press(button);
  fireEvent.press(button);
  expect(view.getByRole('button', { name: 'Ahora no' })).toBeDisabled();
  expect(service.accept).toHaveBeenCalledTimes(1);
  expect(service.accept).toHaveBeenCalledWith('live-v1');
  await act(async () => { finish?.({ accountId: 'account' }); });
  expect(view.queryByText(title)).toBeNull();
  view.unmount();
  jest.mocked(service.configuration).mockResolvedValue(acceptedConfig());
  const nextSession = render(<ProfessionalCommissionNotice />);
  await act(async () => {});
  expect(nextSession.queryByText(title)).toBeNull();
});

it('retains a recoverable acceptance error instead of treating it as success', async () => {
  jest.mocked(service.accept).mockRejectedValueOnce(new Error('No se pudo guardar'));
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Leer las condiciones' }));
  fireEvent.press(view.getByRole('checkbox', { name: checkbox }));
  fireEvent.press(view.getByRole('button', { name: 'Aceptar condiciones y continuar' }));
  await view.findByText('No se pudo guardar');
  expect(view.getByText(title)).toBeTruthy();
  await waitFor(() => expect(view.getByRole('button', { name: 'Aceptar condiciones y continuar' })).toBeEnabled());
  fireEvent.press(view.getByRole('button', { name: 'Aceptar condiciones y continuar' }));
  await waitFor(() => expect(service.accept).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(view.queryByText(title)).toBeNull());
});

it('clears a deferred notice when acceptance is saved from the commissions page', async () => {
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Ahora no' }));
  jest.mocked(service.configuration).mockResolvedValue(acceptedConfig());
  await act(async () => { notifyCommissionAcceptance(terms.id); });
  expect(view.queryByRole('button', { name: 'Revisar condiciones' })).toBeNull();
});

it('checks persisted state after a lost acceptance response', async () => {
  jest.mocked(service.accept).mockImplementationOnce(async () => {
    jest.mocked(service.configuration).mockResolvedValue(acceptedConfig());
    throw new Error('Lost response');
  });
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Leer las condiciones' }));
  fireEvent.press(view.getByRole('checkbox', { name: checkbox }));
  await act(async () => { fireEvent.press(view.getByRole('button', { name: 'Aceptar condiciones y continuar' })); });
  expect(service.accept).toHaveBeenCalledTimes(1);
  expect(service.configuration).toHaveBeenCalledTimes(2);
  expect(view.queryByText(title)).toBeNull();
});

it('requires a fresh reading and checkbox when the offered version changes', async () => {
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Leer las condiciones' }));
  fireEvent.press(view.getByRole('checkbox', { name: checkbox }));
  jest.mocked(service.configuration).mockResolvedValue(config({ terms: { ...terms, id: 'live-v2' } }));
  await act(async () => { notifyCommissionAcceptance('another-version'); });
  expect(view.queryByRole('checkbox', { name: checkbox })).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Leer las condiciones' }));
  expect(view.getByRole('button', { name: 'Aceptar condiciones y continuar' })).toBeDisabled();
});

it('uses current account server state instead of trusting another account acceptance event', async () => {
  const view = render(<ProfessionalCommissionNotice />);
  await view.findByText(title);
  await act(async () => { notifyCommissionAcceptance(terms.id); });
  expect(view.getByText(title)).toBeTruthy();
});

it('allows retrying a configuration failure without blocking the workspace', async () => {
  jest.mocked(service.configuration).mockRejectedValueOnce(new Error('Offline'));
  const view = render(<ProfessionalCommissionNotice />);
  fireEvent.press(await view.findByRole('button', { name: 'Reintentar' }));
  expect(await view.findByText(title)).toBeTruthy();
});
