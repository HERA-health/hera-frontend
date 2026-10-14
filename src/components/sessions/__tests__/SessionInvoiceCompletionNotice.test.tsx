import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { getProfessionalSessionDetail, type ProfessionalSessionDetail } from '../../../services/professionalService';
import { SessionInvoiceCompletionNotice } from '../SessionInvoiceCompletionNotice';

const mockNavigate = jest.fn();
let mockFocused = true;
jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return { useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(() => {
      if (mockFocused) return effect();
    }, [effect, mockFocused]) };
});
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }),
}));
jest.mock('../../../services/professionalService', () => ({ getProfessionalSessionDetail: jest.fn() }));
const detail: ProfessionalSessionDetail = { id: 'session', clientId: 'patient', specialistId: 'owner',
  date: '2026-10-11T10:00:00Z', duration: 60, type: 'IN_PERSON', status: 'CONFIRMED',
  client: { id: 'patient', userId: null, user: null }, bookedServiceName: null, clinicalTarget: null,
  price: { amount: 500, currency: 'EUR', tariffName: null },
  professional: { id: 'owner', displayName: 'Profesional', professionalTitle: null }, invoiceCompletionIssue: null };
beforeEach(() => { mockFocused = true; mockNavigate.mockReset(); jest.mocked(getProfessionalSessionDetail).mockReset().mockResolvedValue(detail); });

it('blocks attendance while checking and allows it when no fiscal data is missing', async () => {
  const blocked = jest.fn();
  render(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  expect(blocked).toHaveBeenCalledWith(true);
  await waitFor(() => expect(blocked).toHaveBeenLastCalledWith(false));
});

it('shows the missing fields, opens the patient editor and rechecks after correction', async () => {
  const blocked = jest.fn();
  const message = 'Faltan datos fiscales del paciente: NIF y Dirección fiscal.';
  jest.mocked(getProfessionalSessionDetail).mockResolvedValueOnce({ ...detail, invoiceCompletionIssue: message });
  const view = render(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  await waitFor(() => expect(view.getByText(message)).toBeTruthy());
  expect(blocked).toHaveBeenLastCalledWith(true);
  fireEvent.press(view.getByText('Completar datos'));
  expect(mockNavigate).toHaveBeenCalledWith('ClientProfile', { clientId: 'patient', initialTab: 'summary', focusBillingEditor: true, returnAfterBillingSave: true });
  mockFocused = false; view.rerender(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  mockFocused = true; view.rerender(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  await waitFor(() => expect(blocked).toHaveBeenLastCalledWith(false));
  expect(view.queryByText(message)).toBeNull();
});

it('keeps attendance blocked on a failed check and supports retry', async () => {
  const blocked = jest.fn();
  jest.mocked(getProfessionalSessionDetail).mockRejectedValueOnce(new Error('Temporal'));
  const view = render(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  await waitFor(() => expect(view.getByText('Reintentar comprobación fiscal')).toBeTruthy());
  expect(blocked).toHaveBeenLastCalledWith(true);
  fireEvent.press(view.getByText('Reintentar comprobación fiscal'));
  await waitFor(() => expect(blocked).toHaveBeenLastCalledWith(false));
});

it('ignores a previous session response after changing the selected session', async () => {
  const blocked = jest.fn();
  let resolveOld: ((value: ProfessionalSessionDetail) => void) | undefined;
  jest.mocked(getProfessionalSessionDetail).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const view = render(<SessionInvoiceCompletionNotice sessionId="old" onBlockedChange={blocked} />);
  view.rerender(<SessionInvoiceCompletionNotice sessionId="new" onBlockedChange={blocked} />);
  await waitFor(() => expect(blocked).toHaveBeenLastCalledWith(false));
  await act(async () => { resolveOld?.({ ...detail, invoiceCompletionIssue: 'Respuesta antigua' }); });
  expect(blocked).toHaveBeenLastCalledWith(false);
  expect(view.queryByText('Respuesta antigua')).toBeNull();
});

it('allows a valid simplified invoice without email and offers correction for delivery', async () => {
  jest.mocked(getProfessionalSessionDetail).mockResolvedValue({ ...detail,
    invoiceCompletionIssue: 'La factura se conservará. Completa el correo para entregarla.',
    billingReadiness: { invoiceKind: 'SIMPLIFIED', canGenerate: true, canSend: false, canBook: false,
      missingFields: [{ field: 'email', label: 'Correo electrónico', purpose: 'DELIVERY' }], correctionTarget: 'CLIENT_PROFILE' } });
  const blocked = jest.fn();
  const view = render(<SessionInvoiceCompletionNotice sessionId="session" onBlockedChange={blocked} />);
  await waitFor(() => expect(blocked).toHaveBeenLastCalledWith(false));
  expect(view.getByText('Completar datos')).toBeTruthy();
});
