import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as payments from '../../../services/packagePaymentService';
import { openCheckout } from '../../../services/sessionPaymentService';
import { PackagePaymentScreen } from '../PackagePaymentScreen';
const mockNavigate = jest.fn();
let mockId = 'bono';
let mockUser: { id: string; type: 'client' | 'professional' } | null;
let mockRefresh: (reconcile?: boolean) => Promise<void>;
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('@react-navigation/native', () => ({ useRoute: () => ({ params: { patientPackageId: mockId } }), useNavigation: () => ({ canGoBack: () => false, navigate: mockNavigate }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../components/payments/usePaymentPolling', () => ({ usePaymentPolling: (_pending: boolean, refresh: (reconcile?: boolean) => Promise<void>, report: (e: unknown) => void) => {
  mockRefresh = refresh;
  require('react').useEffect(() => { void refresh(true).catch(report); }, [refresh]);
} }));
jest.mock('../../../services/sessionPaymentService', () => ({ openCheckout: jest.fn(), paymentAmount: () => '250,00 €' }));
jest.mock('../../../services/packagePaymentService', () => ({ getPackagePayment: jest.fn(), startPackagePayment: jest.fn(), requestPackagePaymentAccess: jest.fn(), verifyPackagePaymentAccess: jest.fn(), downloadPackagePaymentInvoice: jest.fn(), packagePaymentStatus: (p: { status: string }) => p.status }));
const payment: payments.PackagePayment = { id: 'bono', name: 'Bono de cinco', sessions: 5, specialistId: 'specialist', mode: 'ONLINE', available: true, termsVersion: 'package-payments-2026-10-06', status: 'CHECKOUT', issueCode: null, required: true, canReserve: false, canPay: true, checkoutUrl: 'https://checkout.stripe.com/example', paidAt: null, totalCents: 25000 };
beforeEach(() => { jest.clearAllMocks(); mockId = 'bono'; mockUser = { id: 'patient', type: 'client' }; jest.mocked(payments.getPackagePayment).mockResolvedValue(payment); });

test('pending acquisition uses the shared country selector and specific package acceptance before checkout', async () => {
  jest.mocked(payments.getPackagePayment).mockResolvedValue({ ...payment, status: 'UNPAID', checkoutUrl: null });
  jest.mocked(payments.startPackagePayment).mockResolvedValue(payment);
  render(<PackagePaymentScreen />);
  await screen.findByText('Pagar bono');
  fireEvent.press(screen.getByText('Pagar bono'));
  expect(payments.startPackagePayment).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Condiciones de pago del bono'));
  expect(screen.getByText(/no inicia una devolución bancaria/)).toBeTruthy();
  expect(screen.queryByText(/24 horas/)).toBeNull();
  fireEvent.press(screen.getByText('Seleccionar país ▾'));
  fireEvent.press(screen.getByText('España'));
  fireEvent.press(screen.getByLabelText('Acepto las condiciones de pago del bono'));
  fireEvent.press(screen.getByText('Pagar bono'));
  await waitFor(() => expect(payments.startPackagePayment).toHaveBeenCalledWith('bono', false, { termsVersion: payment.termsVersion, country: 'ES' }));
  await waitFor(() => expect(openCheckout).toHaveBeenCalledWith(payment.checkoutUrl));
});

test('returning from checkout only shows payment confirmed by the backend', async () => {
  render(<PackagePaymentScreen />);
  await screen.findByText('CHECKOUT');
  expect(screen.queryByText('Reservar con mi bono')).toBeNull();
  fireEvent.press(screen.getByText('Continuar pago en Stripe'));
  await waitFor(() => expect(openCheckout).toHaveBeenCalledTimes(1));
  expect(payments.startPackagePayment).not.toHaveBeenCalled();
  expect(screen.queryByText('Reservar con mi bono')).toBeNull();
});

test('paid packages offer booking without another checkout', async () => {
  jest.mocked(payments.getPackagePayment).mockResolvedValue({ ...payment, status: 'PAID', required: false, canPay: false, checkoutUrl: null, canReserve: true });
  render(<PackagePaymentScreen />);
  fireEvent.press(await screen.findByText('Reservar con mi bono'));
  expect(mockNavigate).toHaveBeenCalledWith('Booking', { specialistId: 'specialist', patientPackageId: 'bono' });
  expect(screen.queryByText('Pagar bono')).toBeNull();
});

test('an incident never offers another payment or patient reservation', async () => {
  jest.mocked(payments.getPackagePayment).mockResolvedValue({ ...payment, status: 'REVIEW', issueCode: 'PACKAGE_DUPLICATE_PAYMENT', checkoutUrl: null, canPay: false });
  render(<PackagePaymentScreen />);
  await screen.findByText('REVIEW');
  expect(screen.queryByText('Pagar bono')).toBeNull(); expect(screen.queryByText('Reservar con mi bono')).toBeNull();
  expect(screen.getByText(/Contacta con tu especialista antes de hacer otro pago/)).toBeTruthy();
});

test('provider failure retains the invoice and explicit refresh action', async () => {
  jest.mocked(payments.getPackagePayment).mockImplementation(async (_id, _guest, reconcile) => { if (reconcile) throw new Error('offline'); return payment; });
  render(<PackagePaymentScreen />);
  await screen.findByText('Bono de cinco');
  await screen.findByText('offline');
  expect(screen.getByText('Actualizar estado')).toBeTruthy(); expect(screen.getByText('Ver factura')).toBeTruthy();
});

test('guest without a credential can recover by email code', async () => {
  mockUser = null;
  jest.mocked(payments.getPackagePayment).mockRejectedValue({ response: { status: 404, data: { code: 'PACKAGE_PAYMENT_NOT_FOUND', message: 'Verifica tu acceso' } } });
  render(<PackagePaymentScreen />);
  fireEvent.press(await screen.findByText('Recibir código por correo'));
  fireEvent.changeText(await screen.findByLabelText('Código de acceso al bono'), '123456');
  jest.mocked(payments.getPackagePayment).mockResolvedValue(payment);
  fireEvent.press(screen.getByText('Verificar acceso'));
  await screen.findByText('Bono de cinco');
  expect(payments.verifyPackagePaymentAccess).toHaveBeenCalledWith('bono', '123456');
});

test('a delayed response from another package does not replace the current payment', async () => {
  let finish: (value: payments.PackagePayment) => void = () => undefined;
  jest.mocked(payments.getPackagePayment).mockImplementation(id => id === 'bono' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ ...payment, id, name: 'Segundo bono' }));
  const result = render(<PackagePaymentScreen />);
  mockId = 'second'; result.rerender(<PackagePaymentScreen />);
  await screen.findByText('Segundo bono');
  await act(async () => finish(payment));
  expect(screen.queryByText('Bono de cinco')).toBeNull();
});

test('return reconciliation is not swallowed by an ordinary read already in flight', async () => {
  render(<PackagePaymentScreen />); await screen.findByText('CHECKOUT');
  let finish: (value: payments.PackagePayment) => void = () => undefined;
  jest.mocked(payments.getPackagePayment).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, status: 'PAID', canPay: false, canReserve: true, checkoutUrl: null, required: false });
  await act(async () => {
    const ordinary = mockRefresh(); const returning = mockRefresh(true);
    finish(payment); await Promise.all([ordinary, returning]);
  });
  expect(payments.getPackagePayment).toHaveBeenLastCalledWith('bono', false, true);
  expect(screen.getByText('PAID')).toBeTruthy();
});

test('double click continues checkout only once', async () => {
  render(<PackagePaymentScreen />); await screen.findByText('CHECKOUT');
  await act(async () => {
    fireEvent.press(screen.getByText('Continuar pago en Stripe'));
    fireEvent.press(screen.getByText('Continuar pago en Stripe'));
  });
  await waitFor(() => expect(openCheckout).toHaveBeenCalledTimes(1));
});

test('an old payment action cannot open checkout after changing package', async () => {
  const view = render(<PackagePaymentScreen />); await screen.findByText('CHECKOUT');
  let finish: (value: payments.PackagePayment) => void = () => undefined;
  jest.mocked(payments.getPackagePayment).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.press(screen.getByText('Continuar pago en Stripe'));
  mockId = 'second'; view.rerender(<PackagePaymentScreen />);
  await act(async () => finish(payment));
  expect(openCheckout).not.toHaveBeenCalled();
});

test('a signed-in patient can recover a guest package without losing the code field', async () => {
  jest.mocked(payments.getPackagePayment).mockRejectedValue({ response: { status: 404, data: { code: 'PACKAGE_PAYMENT_NOT_FOUND' } } });
  render(<PackagePaymentScreen />);
  fireEvent.press(await screen.findByText('Recibir código por correo'));
  await screen.findByLabelText('Código de acceso al bono');
});
