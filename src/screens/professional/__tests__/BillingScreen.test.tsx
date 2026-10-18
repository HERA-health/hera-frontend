import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { BillingScreen } from '../BillingScreen';
import { useBillingInvoiceList } from '../useBillingInvoiceList';
import { billingService, type Invoice, type PaginatedInvoices } from '../../../services/billingService';

let mockIsFocused = true;
const mockListeners = new Set<() => void>();

jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }),
    useRoute: () => ({ params: undefined }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(() => {
      if (mockIsFocused) return effect();
    }, [effect, mockIsFocused]),
  };
});
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, isDark: false }),
}));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Profesional QA', email: 'qa@example.invalid' } }) }));
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ refresh: jest.fn() }) }));
jest.mock('../../../components/common/alert', () => ({
  useAppAlert: () => ({}), useAppAlertState: () => ({ isVisible: false }), showAppAlert: jest.fn(),
}));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({
  useProfessionalTourAutoStart: jest.fn(), useProfessionalTourStepPreparation: jest.fn(),
}));
jest.mock('../../../components/onboarding/TourTarget', () => ({
  TourTarget: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../components/onboarding/useProfessionalTourScrollPreparation', () => ({
  useProfessionalTourScrollPreparation: () => ({ scrollRef: { current: null }, scrollProps: {}, prepareTarget: jest.fn() }),
}));
jest.mock('../../../hooks/useGeneralRateLimit', () => ({ useFocusedRateLimitRecovery: jest.fn() }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn() }));
jest.mock('../../../services/dashboardService', () => ({
  subscribeProfessionalHomeChanges: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
}));
jest.mock('../../../services/billingService', () => ({
  billingService: { getInvoices: jest.fn(), getSummary: jest.fn(), getConfig: jest.fn(), updateBillingConfig: jest.fn() },
}));

const invoice: Invoice = {
  id: 'invoice-qa', specialistId: 'specialist-qa', clientId: 'client-qa', sessionId: 'session-qa',
  invoiceNumber: 'FS-2026-001', invoiceKind: 'SIMPLIFIED', subtotal: 70, vatRate: 0, vatAmount: 0,
  total: 70, ivaIncluded: true, baseImponible: 70, concept: 'Sesión sintética', sessionDate: '2026-10-01T10:00:00Z',
  durationMinutes: 60, status: 'DRAFT', sentAt: null, paidAt: null, internalNotes: null,
  createdAt: '2026-10-01T11:00:00Z', updatedAt: '2026-10-01T11:00:00Z',
  client: { id: 'client-qa', firstName: 'Ana', lastName: 'Garcia', user: null }, recipientFiscalName: 'Ana Garcia',
};
const page = (rows: Invoice[] = [invoice], current = 1): PaginatedInvoices => ({ invoices: rows, total: rows.length, page: current, totalPages: 1 });

beforeEach(() => {
  mockIsFocused = true;
  mockListeners.clear();
  jest.mocked(billingService.getInvoices).mockReset().mockResolvedValue(page());
  jest.mocked(billingService.getConfig).mockReset().mockResolvedValue({ id: 'specialist-qa', pricePerSession: 70,
    firstVisitFree: false, slotDuration: 60, tariffs: [], invoicePrefix: 'F', invoiceNextNumber: 1,
    simplifiedInvoicePrefix: 'FS', simplifiedInvoiceNextNumber: 1, fullInvoicePrefix: 'F', fullInvoiceNextNumber: 1,
    vatRate: 0, applyVat: false, vatExemptReason: null, invoiceLogoUrl: null, invoiceAccentColor: null,
    bankIban: null, paymentConditions: null, fiscalName: 'QA', fiscalAddress: 'Dirección sintética', fiscalNif: '00000000T',
    autoGenerateInvoice: true, autoSendToClient: false, sendInvoiceCopyTo: null });
  jest.mocked(billingService.updateBillingConfig).mockReset().mockImplementation(async config => ({
    ...await billingService.getConfig(), ...config,
  }));
  jest.mocked(billingService.getSummary).mockReset().mockResolvedValue({
    period: { year: 2026, month: 10 }, collectedPreviousMonth: 100, invoicedThisMonth: 230,
    invoicedPreviousMonth: 200, pendingCollectionAmount: 60, pendingCollectionCount: 2,
    grossThisMonth: 0, grossThisYear: 0,
    refundedThisMonth: 0, refundedThisYear: 0, refundsAwaitingBankDate: 0, totalThisMonth: 0, totalThisYear: 0,
    invoiceCountThisMonth: 0, paidInvoiceCountThisMonth: 0, pendingCount: 1 });
});

it('renders the saved invoice even when the summary fails', async () => {
  jest.mocked(billingService.getSummary).mockRejectedValue(new Error('Resumen no disponible'));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  expect(view.getByText('Resumen de facturación no disponible.')).toBeTruthy();
  expect(view.queryByText('Aún no has emitido ninguna factura')).toBeNull();
  expect(billingService.getInvoices).toHaveBeenCalledTimes(1);
});

it('shows four monetary metrics and comparisons without substituting delivery counts or net collections', async () => {
  const summary = await billingService.getSummary();
  jest.mocked(billingService.getSummary).mockResolvedValue({ ...summary, grossThisMonth: 170,
    totalThisMonth: 150, refundsAwaitingBankDate: 1, pendingCount: 99 });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('Cobrado este mes')).toBeTruthy());
  for (const text of ['€170,00','€60,00','€230,00','2','↗ +70%','↗ +15%']) expect(view.getByText(text)).toBeTruthy();
  expect(view.queryByText('€150,00')).toBeNull();
  expect(view.queryByText('99')).toBeNull();
  expect(view.queryByText('Pendientes de envío')).toBeNull();
});

it('pending shortcut clears search and pagination and requests the collection filter', async () => {
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('Cobrado este mes')).toBeTruthy());
  fireEvent.changeText(view.getByLabelText('Buscar paciente'), 'Ana');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  await waitFor(() => expect(billingService.getInvoices).toHaveBeenLastCalledWith({page:1,limit:10,clientName:'Ana'}));
  fireEvent.press(view.getByLabelText('Ver pendiente de cobro'));
  await waitFor(() => expect(billingService.getInvoices).toHaveBeenLastCalledWith({page:1,limit:10,collectionStatus:'pending'}));
  expect(view.getByLabelText('Buscar paciente').props.value).toBe('');
});

it('pending hook resets to requested page without passing the delivery status', async () => {
  const { result } = renderHook(useBillingInvoiceList);
  await act(async () => { await result.current.loadInvoices(3, 'all', ''); });
  await act(async () => { await result.current.loadInvoices(1, 'pending', ''); });
  expect(billingService.getInvoices).toHaveBeenLastCalledWith({page:1,limit:10,collectionStatus:'pending'});
});

it('refreshes existing rows silently and preserves them if the background request fails', async () => {
  const { result } = renderHook(useBillingInvoiceList);
  await act(async () => { await result.current.loadInvoices(1, 'all', ''); });
  let reject: ((reason: Error) => void) | undefined;
  jest.mocked(billingService.getInvoices).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  let refresh: Promise<void> | undefined;
  await act(async () => { refresh = result.current.loadInvoices(1, 'all', '', true); });
  expect(result.current.invoicesLoading).toBe(false);
  expect(result.current.invoices).toEqual([invoice]);
  await act(async () => { reject?.(new Error('Sin conexión')); await refresh; });
  expect(result.current.invoices).toEqual([invoice]);
  expect(result.current.invoiceListError).toBeNull();
  expect(result.current.invoiceRefreshError).toBe('Sin conexión');
  await act(async () => { await result.current.loadInvoices(1, 'all', '', true); });
  expect(result.current.invoiceRefreshError).toBeNull();
});

it('does not poll before the first load or compete with a filter change', async () => {
  const { result } = renderHook(useBillingInvoiceList);
  await act(async () => { await result.current.loadInvoices(1, 'all', '', true); });
  expect(billingService.getInvoices).not.toHaveBeenCalled();
  await act(async () => { await result.current.loadInvoices(1, 'all', ''); });
  let resolve: ((value: PaginatedInvoices) => void) | undefined;
  jest.mocked(billingService.getInvoices).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  let filtered: Promise<void> | undefined;
  await act(async () => { filtered = result.current.loadInvoices(1, 'pending', ''); });
  await act(async () => { await result.current.loadInvoices(1, 'all', '', true); });
  expect(billingService.getInvoices).toHaveBeenCalledTimes(2);
  await act(async () => { resolve?.(page([])); await filtered; });
  expect(result.current.invoices).toEqual([]);
});

it('keeps delivery failure separate from the collection badge', async () => {
  jest.mocked(billingService.getInvoices).mockResolvedValue(page([{ ...invoice,
    emailNotifications: [{ recipientKind: 'PATIENT', status: 'FAILED', attemptCount: 1, lastError: 'DELIVERY_FAILED' }],
  }]));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('Entrega pendiente. Revisa o reintenta el envío.')).toBeTruthy());
  expect(view.getByText('Pendiente')).toBeTruthy();
  expect(view.getByText('Reintentar entrega')).toBeTruthy();
});

it('does not wait for a slow summary to display invoices', async () => {
  jest.mocked(billingService.getSummary).mockReturnValue(new Promise(() => undefined));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
});

it('keeps invoices visible but does not expose default settings while configuration is pending', async () => {
  const config = await billingService.getConfig();
  let resolveConfig: ((value: typeof config) => void) | undefined;
  jest.mocked(billingService.getConfig).mockReturnValueOnce(new Promise(resolve => { resolveConfig = resolve; }));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  expect(view.queryByText('Generar facturas automáticamente')).toBeNull();
  await act(async () => { resolveConfig?.(config); });
  await waitFor(() => expect(view.getByText('Generar facturas automáticamente')).toBeTruthy());
});

it('shows a configuration failure and retries without hiding invoices or editing unknown settings', async () => {
  jest.mocked(billingService.getConfig).mockRejectedValueOnce(new Error('Configuración no disponible'));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('No se pudo cargar la configuración de facturación')).toBeTruthy());
  expect(view.getByText(invoice.invoiceNumber)).toBeTruthy();
  expect(view.queryByText('Generar facturas automáticamente')).toBeNull();
  fireEvent.press(view.getByText('Reintentar configuración'));
  await waitFor(() => expect(view.getByText('Generar facturas automáticamente')).toBeTruthy());
  expect(billingService.getConfig).toHaveBeenCalledTimes(2);
});

it('displays a loading error instead of an empty history, then retries successfully', async () => {
  jest.mocked(billingService.getInvoices).mockRejectedValueOnce(new Error('Demasiadas solicitudes'));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('No se pudieron cargar las facturas')).toBeTruthy());
  expect(view.queryByText('Aún no has emitido ninguna factura')).toBeNull();
  fireEvent.press(view.getByText('Reintentar'));
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  expect(view.queryByText('No se pudieron cargar las facturas')).toBeNull();
  expect(billingService.getInvoices).toHaveBeenCalledTimes(2);
});

it.each(['fiscalName', 'fiscalNif', 'fiscalAddress'] as const)('blocks activation without saved %s and explains how to complete it', async field => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, autoGenerateInvoice: false, [field]: '   ' });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeTruthy());
  expect(view.getByLabelText('Generar facturas automáticamente')).toBeDisabled();
  expect(view.getByText(/Para utilizar la facturación automática, completa y guarda/)).toBeTruthy();
  fireEvent(view.getByLabelText('Generar facturas automáticamente'), 'valueChange', true);
  expect(billingService.updateBillingConfig).not.toHaveBeenCalled();
});

it('allows activation with saved fiscal data and keeps switches disabled until the save finishes', async () => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, autoGenerateInvoice: false });
  let resolveSave: ((value: Awaited<ReturnType<typeof billingService.updateBillingConfig>>) => void) | undefined;
  jest.mocked(billingService.updateBillingConfig).mockReturnValueOnce(new Promise(resolve => { resolveSave = resolve; }));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeTruthy());
  expect(view.getByLabelText('Generar facturas automáticamente')).not.toBeDisabled();
  fireEvent(view.getByLabelText('Generar facturas automáticamente'), 'valueChange', true);
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith({ autoGenerateInvoice: true }));
  expect(view.getByLabelText('Generar facturas automáticamente')).toBeDisabled();
  await act(async () => { resolveSave?.({ ...config, autoGenerateInvoice: true }); });
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).not.toBeDisabled());
});

it('allows disabling legacy automatic generation even when fiscal data is missing', async () => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, fiscalNif: null, autoSendToClient: true });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeTruthy());
  expect(view.getByLabelText('Generar facturas automáticamente')).not.toBeDisabled();
  fireEvent(view.getByLabelText('Generar facturas automáticamente'), 'valueChange', false);
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith({ autoGenerateInvoice: false, autoSendToClient: false }));
});

it('saving the fiscal form unlocks activation and does not overwrite automation or numbering', async () => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, fiscalNif: null, autoGenerateInvoice: false });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeDisabled());
  fireEvent.press(view.getByLabelText('Editar datos fiscales'));
  fireEvent.changeText(view.getByLabelText('NIF'), '00000000T');
  fireEvent.press(view.getByLabelText('Guardar datos fiscales'));
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).not.toBeDisabled());
  expect(billingService.updateBillingConfig).toHaveBeenCalledWith({ fiscalName: 'QA', fiscalNif: '00000000T',
    vatRate: 0, applyVat: false, bankIban: '', paymentConditions: '', paymentInstructions: '' });
});

it('keeps legacy addresses as a reference and saves structured fields without a competing full address', async () => {
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Editar datos fiscales')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Editar datos fiscales'));
  expect(view.getByText('Dirección guardada')).toBeTruthy();
  expect(view.getByText('Dirección sintética')).toBeTruthy();
  for (const label of ['Calle y número', 'Código postal', 'Ciudad', 'País']) expect(view.getByLabelText(label).props.value).toBe('');
  fireEvent.changeText(view.getByLabelText('Calle y número'), 'C/ Ejemplo 12');
  fireEvent.changeText(view.getByLabelText('Código postal'), '08008');
  fireEvent.changeText(view.getByLabelText('Ciudad'), 'Barcelona');
  fireEvent.changeText(view.getByLabelText('País'), 'España');
  fireEvent.press(view.getByLabelText('Guardar datos fiscales'));
  await waitFor(() => expect(view.getByText('08008 Barcelona')).toBeTruthy());
  const payload = jest.mocked(billingService.updateBillingConfig).mock.calls.at(-1)?.[0];
  expect(payload).toEqual(expect.objectContaining({ fiscalStreetAddress: 'C/ Ejemplo 12', fiscalPostalCode: '08008', fiscalCity: 'Barcelona', fiscalCountry: 'España' }));
  expect(payload).not.toHaveProperty('fiscalAddress');
  fireEvent.press(view.getByLabelText('Editar datos fiscales'));
  expect(view.queryByText('Dirección guardada')).toBeNull();
  expect(view.getByLabelText('Código postal').props.value).toBe('08008');
  expect(view.getByLabelText('País').props.value).toBe('España');
});

it('restores the disabled automation setting when the backend rejects activation', async () => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, autoGenerateInvoice: false });
  jest.mocked(billingService.updateBillingConfig).mockRejectedValueOnce(new Error('Completa los datos fiscales guardados'));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeTruthy());
  fireEvent(view.getByLabelText('Generar facturas automáticamente'), 'valueChange', true);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente').props.value).toBe(false));
  expect(view.getByLabelText('Generar facturas automáticamente')).not.toBeDisabled();
  expect(billingService.updateBillingConfig).toHaveBeenCalledTimes(1);
});

it('refreshes when a session changes while Facturación remains mounted', async () => {
  jest.mocked(billingService.getInvoices).mockResolvedValueOnce(page([]));
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText('Aún no has emitido ninguna factura')).toBeTruthy());
  await act(async () => { mockListeners.forEach(listener => listener()); });
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  expect(billingService.getInvoices).toHaveBeenCalledTimes(2);
});

it('ignores an older summary response after a newer billing refresh', async () => {
  const oldSummary = await billingService.getSummary();
  let resolveOld: ((value: typeof oldSummary) => void) | undefined;
  jest.mocked(billingService.getSummary)
    .mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValue({ ...oldSummary, totalThisMonth: 123.45, grossThisMonth: 123.45, invoiceCountThisMonth: 2 });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  await act(async () => { mockListeners.forEach(listener => listener()); });
  await waitFor(() => expect(view.getByText('€123,45')).toBeTruthy());
  await act(async () => { resolveOld?.(oldSummary); });
  expect(view.getByText('€123,45')).toBeTruthy();
});

it('reloads all invoices on reentry after selecting an empty status filter', async () => {
  const getInvoices = jest.mocked(billingService.getInvoices);
  getInvoices.mockResolvedValueOnce(page()).mockResolvedValueOnce(page([])).mockResolvedValue(page());
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  fireEvent.press(view.getByText('Pendientes'));
  await waitFor(() => expect(view.getByText('No hay facturas que coincidan con estos filtros')).toBeTruthy());
  mockIsFocused = false;
  view.rerender(<BillingScreen />);
  mockIsFocused = true;
  view.rerender(<BillingScreen />);
  await waitFor(() => expect(view.getByText(invoice.invoiceNumber)).toBeTruthy());
  expect(getInvoices.mock.calls.at(-1)?.[0]).toEqual({ page: 1, limit: 10 });
});

it('ignores an older successful response after a newer filtered request', async () => {
  let resolveOld: ((value: PaginatedInvoices) => void) | undefined;
  jest.mocked(billingService.getInvoices).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const { result } = renderHook(useBillingInvoiceList);
  let old: Promise<void> | undefined;
  await act(async () => { old = result.current.loadInvoices(1, 'all', ''); });
  await act(async () => { await result.current.loadInvoices(1, 'DRAFT', ' Ana Garcia '); });
  await act(async () => { resolveOld?.(page([])); await old; });
  expect(result.current.invoices).toEqual([invoice]);
  expect(result.current.invoiceListError).toBeNull();
  expect(billingService.getInvoices).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: 'DRAFT', clientName: 'Ana Garcia' });
});

it('ignores an older failed request after a successful retry', async () => {
  let rejectOld: ((reason: Error) => void) | undefined;
  jest.mocked(billingService.getInvoices).mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject; }));
  const { result } = renderHook(useBillingInvoiceList);
  let old: Promise<void> | undefined;
  await act(async () => { old = result.current.loadInvoices(1, 'all', ''); });
  await act(async () => { await result.current.loadInvoices(1, 'all', ''); });
  await act(async () => { rejectOld?.(new Error('Respuesta antigua')); await old; });
  expect(result.current.invoices).toEqual([invoice]);
  expect(result.current.invoiceListError).toBeNull();
  expect(result.current.invoicesLoading).toBe(false);
});

it('keeps generation, sending and email copy as independent choices', async () => {
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Generar facturas automáticamente')).toBeTruthy());
  expect(view.getByLabelText('Generar facturas automáticamente').props.value).toBe(true);
  expect(view.getByLabelText('Enviar al paciente automáticamente').props.value).toBe(false);
  expect(view.getByLabelText('Copia de factura por email').props.value).toBe(false);
  fireEvent(view.getByLabelText('Copia de factura por email'), 'valueChange', true);
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith({ sendInvoiceCopyTo: 'qa@example.invalid' }));
  await waitFor(() => expect(view.getByLabelText('Copia de factura por email')).not.toBeDisabled());
  expect(view.getByLabelText('Enviar al paciente automáticamente').props.value).toBe(false);
  fireEvent(view.getByLabelText('Enviar al paciente automáticamente'), 'valueChange', true);
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith({ autoSendToClient: true }));
});


it('saves the selected payment method and patient-facing instructions', async () => {
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Editar datos fiscales')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Editar datos fiscales'));
  const paymentDropdown = view.UNSAFE_getAllByType(SimpleDropdown).find(node => node.props.accessibilityLabel === 'Métodos de pago');
  if (!paymentDropdown) throw new Error('Payment dropdown missing');
  fireEvent(paymentDropdown, 'select', 'Bizum');
  fireEvent.changeText(view.getByLabelText('Instrucciones de pago'), '600000000');
  fireEvent.press(view.getByLabelText('Guardar datos fiscales'));
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith(expect.objectContaining({ paymentConditions: 'Bizum', paymentInstructions: '600000000' })));
});


it('preserves legacy payment text when saving unrelated fiscal fields', async () => {
  const config = await billingService.getConfig();
  jest.mocked(billingService.getConfig).mockResolvedValue({ ...config, paymentConditions: 'Transferencia a 30 días', bankIban: 'LEGACY-IBAN' });
  const view = render(<BillingScreen />);
  await waitFor(() => expect(view.getByLabelText('Editar datos fiscales')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Editar datos fiscales'));
  expect(view.getByText('Transferencia a 30 días')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Guardar datos fiscales'));
  await waitFor(() => expect(billingService.updateBillingConfig).toHaveBeenCalledWith(expect.objectContaining({ paymentConditions: 'Transferencia a 30 días', bankIban: 'LEGACY-IBAN', paymentInstructions: '' })));
});
