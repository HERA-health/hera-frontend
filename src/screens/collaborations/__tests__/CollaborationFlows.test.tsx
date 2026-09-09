import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { CollaborationAgreement, CollaborationTermsForm } from '../CollaborationAgreement';
import { CollaborationPeriods } from '../CollaborationPeriods';
import { CollaborationInvoiceForm } from '../CollaborationInvoiceForm';
import * as service from '../../../services/collaborationService';
import { openPrivateDocument } from '../../../utils/openPrivateDocument';
jest.mock('../../../utils/openPrivateDocument', () => ({ openPrivateDocument: jest.fn() }));

jest.mock('../../../services/collaborationService', () => ({ decideCollaboration: jest.fn(), decideFinance: jest.fn(), listPeriods: jest.fn(), getPeriod: jest.fn(), getConfiguration: jest.fn(), getInvoice: jest.fn(), downloadSettlement: jest.fn(), getInvoiceDefaults: jest.fn(), issueInvoice: jest.fn(), retryIssuedInvoice: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
const collaboration: service.Collaboration = { id: 'agreement', revision: 1, origin: { id: 'a', name: 'Profesional A' }, recipient: { id: 'b', name: 'Profesional B' }, role: 'RECIPIENT', terminatedAt: null, terminationReason: null, deliveries: [], versions: [{ id: 'v1', number: 1, status: 'PROPOSED', templateId: 'fixture', contractText: 'Texto contractual exacto de la versión propuesta', territory: 'ES', object: 'Objeto fixture', scope: 'Servicios fixture', terminationClause: 'Fin prospectivo', sessionTypes: ['VIDEO_CALL'], originShareBps: 2000, validFrom: '2026-09-01T00:00:00Z', validUntil: '2027-09-01T00:00:00Z', originAcceptedAt: '2026-09-01T00:00:00Z', recipientAcceptedAt: null, responseReason: null, originIdentity: { name: 'A fixture', taxId: 'FA', address: 'A' }, recipientIdentity: null }] };
const run = jest.fn(async (_values: unknown, operation: (key: string) => Promise<unknown>) => { await operation('command-fixture'); return true; });

beforeEach(() => { jest.clearAllMocks(); });

it('shows scheduled termination and lets its initiator cancel with the current cutoff', async () => {
  const cutoff = '2099-10-01T00:00:00Z';
  const view = render(<CollaborationAgreement collaboration={{ ...collaboration, role: 'ORIGIN', terminatedAt: cutoff, terminatedBy: 'a' }} busy={false} run={run} />);
  expect(view.getByText('Finalización programada')).toBeTruthy();
  expect(view.queryByText('Colaboración finalizada')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Cambiar o cancelar finalización' }));
  fireEvent.changeText(view.getByLabelText('Motivo del cambio'), 'Continuamos con el acuerdo');
  fireEvent.press(view.getByRole('button', { name: 'Cancelar finalización programada' }));
  await waitFor(() => expect(service.decideCollaboration).toHaveBeenCalledWith('agreement', { action: 'CANCEL_TERMINATION', expectedCutOff: cutoff, reason: 'Continuamos con el acuerdo' }, 'command-fixture'));
});

it('does not offer changing the other professional’s cutoff', () => {
  const view = render(<CollaborationAgreement collaboration={{ ...collaboration, terminatedAt: '2099-10-01T00:00:00Z', terminatedBy: 'a' }} busy={false} run={run} />);
  expect(view.queryByRole('button', { name: 'Cambiar o cancelar finalización' })).toBeNull();
  expect(view.getByText(/fue comunicada por tu colaborador/)).toBeTruthy();
});

it('updates a scheduled termination to finalized when the cutoff arrives', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-09T10:00:00Z'));
  const view = render(<CollaborationAgreement collaboration={{ ...collaboration, terminatedAt: '2026-09-09T10:00:01Z', terminatedBy: 'a' }} busy={false} run={run} />);
  expect(view.getByText('Finalización programada')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(1100); });
  expect(view.getByText('Colaboración finalizada')).toBeTruthy();
  view.unmount();
  jest.useRealTimers();
});

it('offers a new agreement after termination and reopens an existing successor', () => {
  const onOpen = jest.fn();
  const ended = { ...collaboration, role: 'ORIGIN' as const, terminatedAt: '2020-10-01T00:00:00Z', terminatedBy: 'a' };
  const view = render(<CollaborationAgreement collaboration={ended} busy={false} run={run} onOpen={onOpen} />);
  expect(view.getByRole('button', { name: 'Volver a colaborar' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Cambiar o cancelar finalización' })).toBeNull();
  view.rerender(<CollaborationAgreement collaboration={{ ...ended, successorId: 'new-agreement' }} busy={false} run={run} onOpen={onOpen} />);
  fireEvent.press(view.getByRole('button', { name: 'Abrir nuevo acuerdo' }));
  expect(onOpen).toHaveBeenCalledWith('new-agreement');
});

it('generates an invoice without uploading a PDF after fiscal review', async () => {
  jest.mocked(service.getInvoiceDefaults).mockResolvedValue({ issuerName: 'A fiscal', issuerTaxId: 'A', issuerAddress: 'Dirección A', recipientName: 'B fiscal', recipientTaxId: 'B', recipientAddress: 'Dirección B', vatRate: 21 });
  const onDone = jest.fn();
  const view = render(<CollaborationInvoiceForm generate collaboration={{ ...collaboration, role: 'ORIGIN' }} period={periodWithInvoice(null)} busy={false} run={run} onDone={onDone} onCancel={jest.fn()} />);
  await view.findByDisplayValue('A fiscal');
  expect(view.queryByLabelText('Número de factura')).toBeNull();
  expect(view.queryByRole('button', { name: 'Seleccionar PDF privado' })).toBeNull();
  const button = () => view.getByRole('button', { name: 'Emitir factura y generar PDF' });
  expect(button().props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(view.getByLabelText('Retención según la factura, o motivo por el que no procede'), 'Sin retención para este ejemplo');
  fireEvent.press(view.getByRole('checkbox', { name: 'He revisado los datos, impuestos y retenciones y quiero emitir esta factura' }));
  fireEvent.press(button());
  await waitFor(() => expect(service.issueInvoice).toHaveBeenCalledWith('agreement', expect.objectContaining({ baseCents: 800, taxCents: 168, payableCents: 968, issuerName: 'A fiscal', recipientName: 'B fiscal' }), 'command-fixture'));
  expect(onDone).toHaveBeenCalled();
});

it('allows A to record a manual receipt and shows the paid state after refresh', async () => {
  const detail = periodWithInvoice(null);
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [detail], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(detail);
  const view = render(<CollaborationPeriods collaboration={{ ...collaboration, role: 'ORIGIN' }} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  await view.findByRole('button', { name: 'Registrar cobro recibido' });
  fireEvent.changeText(view.getByLabelText('Importe cobrado (€)'), '16');
  fireEvent.changeText(view.getByLabelText('Referencia de la transferencia'), 'Cobro recibido por transferencia');
  jest.mocked(service.getPeriod).mockResolvedValue({ ...detail, invoices: [{ ...detail.invoices[0], transfers: [{ id: 'transfer', amountCents: 1600, status: 'CONFIRMED', reference: 'Cobro recibido por transferencia', transferredAt: '2026-09-09T00:00:00Z', confirmedAt: '2026-09-09T00:00:00Z', responseReason: null }] }], transferBalance: { ...detail.transferBalance!, availableToDeclareCents: 0 } });
  fireEvent.press(view.getByRole('button', { name: 'Registrar cobro recibido' }));
  await waitFor(() => expect(service.decideFinance).toHaveBeenCalledWith('agreement', expect.objectContaining({ action: 'RECORD_RECEIPT', amountCents: 1600 }), 'command-fixture'));
  expect(await view.findByText('Pagada')).toBeTruthy();
});

it('recovers a failed generated PDF from the period after reloading', async () => {
  const detail = periodWithInvoice(null);
  const failed = { ...detail, invoices: [{ ...detail.invoices[0], generatedInHera: true, status: 'FAILED' as const }] };
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [failed], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(failed);
  const view = render(<CollaborationPeriods collaboration={{ ...collaboration, role: 'ORIGIN' }} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  fireEvent.press(await view.findByRole('button', { name: 'Reintentar generación del PDF' }));
  await waitFor(() => expect(service.retryIssuedInvoice).toHaveBeenCalledWith('agreement', 'invoice'));
});

it.each(['ORIGIN', 'RECIPIENT'] as const)('downloads the generated settlement for %s', async role => {
  const detail = periodWithInvoice(null);
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [detail], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(detail);
  const bytes = new ArrayBuffer(8);
  jest.mocked(service.downloadSettlement).mockResolvedValue(bytes);
  const view = render(<CollaborationPeriods collaboration={{ ...collaboration, role }} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  fireEvent.press(await view.findByRole('button', { name: 'Descargar liquidación PDF' }));
  await waitFor(() => expect(service.downloadSettlement).toHaveBeenCalledWith('agreement', 'period'));
  await waitFor(() => expect(openPrivateDocument).toHaveBeenCalledWith(bytes, 'settlement-period', 'liquidacion-2026-09.pdf', 'application/pdf'));
});

it('uses Spain and the current exact contract, and requires renewed acceptance after changing the percentage', async () => {
  const template = { territory: 'ES', professions: ['PSYCHOLOGIST_HEALTH'], templateId: 'ES-V1', contractText: 'Contrato completo vigente de la colaboración en España para esta prueba.' };
  jest.mocked(service.getConfiguration).mockResolvedValue([template]);
  const submit = jest.fn().mockResolvedValue(undefined);
  const view = render(<CollaborationTermsForm busy={false} onSubmit={submit} onCancel={jest.fn()} />);
  await view.findByText('Acuerdo entre profesionales');
  expect(view.queryByLabelText('Territorio (código de país)')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Leer contrato completo' }));
  expect(view.getByText(template.contractText)).toBeTruthy();
  fireEvent.changeText(view.getByLabelText('Objeto real de la colaboración'), 'Continuidad de la atención');
  fireEvent.changeText(view.getByLabelText('Alcance de los servicios'), 'Consultas individuales online');
  fireEvent.changeText(view.getByLabelText('Último día de vigencia (AAAA-MM-DD)'), '2099-01-01');
  const accept = () => fireEvent.press(view.getByRole('checkbox', { name: 'Actúo como profesional autónomo habilitado en el territorio indicado y acepto el texto contractual y estas condiciones como origen' }));
  accept();
  fireEvent.changeText(view.getByLabelText('Porcentaje para A (%)'), '15');
  expect(view.getByRole('button', { name: 'Proponer estas condiciones' }).props.accessibilityState.disabled).toBe(true);
  accept();
  fireEvent.press(view.getByRole('button', { name: 'Proponer estas condiciones' }));
  await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ territory: 'ES', templateId: template.templateId, contractText: template.contractText, originShareBps: 1500, autonomousAndAuthorized: true })));
});

it('keeps submission unavailable after contract loading fails and recovers on retry', async () => {
  jest.mocked(service.getConfiguration).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ territory: 'ES', professions: ['PSYCHOLOGIST_HEALTH'], templateId: 'recovered', contractText: 'Contrato recuperado' }]);
  const view = render(<CollaborationTermsForm busy={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
  await view.findByText('No se pudo cargar el texto contractual vigente. Reintenta la consulta.');
  expect(view.getByRole('button', { name: 'Proponer estas condiciones' }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByRole('button', { name: 'Reintentar consulta del texto' }));
  await view.findByRole('button', { name: 'Leer contrato completo' });
  expect(view.queryByText('No se pudo cargar el texto contractual vigente. Reintenta la consulta.')).toBeNull();
});

const periodWithInvoice = (blockedReason: service.CollaborationTransferBalance['blockedReason']): service.CollaborationPeriodDetail => ({
  id: 'period', month: '2026-09', status: 'CLOSED', revision: 7, amountCents: 1600, discrepancy: null,
  entries: [], hasMore: false, documentable: { baseCents: 800, offsetCents: 800, totalClosedCents: 800, documentedElsewhereCents: 0 },
  invoices: [{ id: 'invoice', number: 1, status: 'ACCEPTED', originalId: null, invoiceNumber: 'Fixture-1', issuedAt: '2026-09-01T00:00:00Z', baseCents: 1600, taxCents: 0, withholdingCents: 0, payableCents: 1600, fileName: 'fixture.pdf', responseReason: null, transfers: [] }],
  transferBalance: { closedBaseCents: 800, documentedBaseCents: 1600, pendingNegativeBaseCents: 0, documentedPayableCents: 1600, confirmedReceivedCents: 0, pendingDeclaredCents: 0, balanceCents: 1600, availableToDeclareCents: blockedReason ? 0 : 1600, blockedReason, reviewPeriods: [{ id: 'adjustment', month: '2026-10' }] },
});

it.each(['PENDING_ADJUSTMENTS', 'INVOICE_CORRECTION_REQUIRED', 'INVOICE_REVIEW_PENDING'] as const)('explains %s and prevents transfer entry without hiding historical invoice totals', async blockedReason => {
  const detail = periodWithInvoice(blockedReason);
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [detail], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(detail);
  const view = render(<CollaborationPeriods collaboration={collaboration} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  expect(await view.findByText('Revisa los ajustes antes de registrar otro pago')).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Declarar transferencia realizada' })).toBeNull();
  expect(view.getByText(/Total del documento/)).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Revisar periodo 2026-10' }));
  await waitFor(() => expect(service.getPeriod).toHaveBeenCalledWith('agreement', 'adjustment', 0));
});

it('offers the existing correction upload to A and restores B transfer entry after refresh', async () => {
  const detail = periodWithInvoice('INVOICE_CORRECTION_REQUIRED');
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [detail], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(detail);
  const origin = render(<CollaborationPeriods collaboration={{ ...collaboration, role: 'ORIGIN' }} busy={false} run={run} />);
  fireEvent.press(await origin.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  expect(await origin.findByRole('button', { name: 'Adjuntar factura externa o nueva versión' })).toBeTruthy();
  origin.unmount();
  const view = render(<CollaborationPeriods collaboration={collaboration} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  await view.findByText('Revisa los ajustes antes de registrar otro pago');
  jest.mocked(service.getPeriod).mockResolvedValue(periodWithInvoice(null));
  fireEvent.press(view.getByRole('button', { name: 'Actualizar' }));
  expect(await view.findByRole('button', { name: 'Declarar transferencia realizada' })).toBeTruthy();
  expect(view.queryByText('Revisa los ajustes antes de registrar otro pago')).toBeNull();
});

it('refreshes a concurrent transfer rejection and retains the entered reference and amount for recovery', async () => {
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [periodWithInvoice(null)], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue(periodWithInvoice(null));
  const view = render(<CollaborationPeriods collaboration={collaboration} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  await view.findByRole('button', { name: 'Declarar transferencia realizada' });
  fireEvent.changeText(view.getByLabelText('Importe de la transferencia externa (€)'), '8');
  fireEvent.changeText(view.getByLabelText('Referencia de la transferencia'), 'Referencia conservada');
  jest.mocked(service.decideFinance).mockRejectedValueOnce(new Error('TRANSFER_DOCUMENTS_OUTDATED'));
  run.mockImplementationOnce(async (_values, operation) => { try { await operation('command-fixture'); return true; } catch { return false; } });
  jest.mocked(service.getPeriod).mockResolvedValue(periodWithInvoice('INVOICE_CORRECTION_REQUIRED'));
  fireEvent.press(view.getByRole('button', { name: 'Declarar transferencia realizada' }));
  await view.findByText('Revisa los ajustes antes de registrar otro pago');
  expect(service.decideFinance).toHaveBeenCalledWith('agreement', expect.objectContaining({ action: 'DECLARE_TRANSFER', amountCents: 800, reference: 'Referencia conservada' }), 'command-fixture');
  jest.mocked(service.getPeriod).mockResolvedValue(periodWithInvoice(null));
  fireEvent.press(view.getByRole('button', { name: 'Actualizar' }));
  await view.findByRole('button', { name: 'Declarar transferencia realizada' });
  expect(view.getByDisplayValue('Referencia conservada')).toBeTruthy();
  expect(view.getByDisplayValue('8')).toBeTruthy();
});
it('requires B to accept the exact visible contract version explicitly', async () => {
  const view = render(<CollaborationAgreement collaboration={collaboration} busy={false} run={run} />);
  expect(view.getByText('Texto contractual exacto de la versión propuesta')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Aceptar versión 1' }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByRole('checkbox', { name: 'Soy autónomo habilitado en este territorio y acepto el texto y las condiciones de esta versión' }));
  fireEvent.press(view.getByRole('button', { name: 'Aceptar versión 1' }));
  await waitFor(() => expect(service.decideCollaboration).toHaveBeenCalledWith('agreement', { action: 'ACCEPT_VERSION', versionId: 'v1', autonomousAndAuthorized: true }, 'command-fixture'));
});
it('sends the exact amount and revision shown to A when closing a presented period', async () => {
  jest.mocked(service.listPeriods).mockResolvedValue({ items: [{ id: 'period', month: '2026-09', status: 'SUBMITTED', revision: 7, amountCents: 1600, discrepancy: null }], hasMore: false });
  jest.mocked(service.getPeriod).mockResolvedValue({ id: 'period', month: '2026-09', status: 'SUBMITTED', revision: 7, amountCents: 1600, discrepancy: null, entries: [], invoices: [], documentable: null, hasMore: false });
  const view = render(<CollaborationPeriods collaboration={{ ...collaboration, role: 'ORIGIN' }} busy={false} run={run} />);
  fireEvent.press(await view.findByRole('button', { name: 'Revisar liquidación y documentos' }));
  fireEvent.press(await view.findByRole('button', { name: /Aceptar y cerrar/ }));
  await waitFor(() => expect(service.decideFinance).toHaveBeenCalledWith('agreement', { action: 'ACCEPT_PERIOD', periodId: 'period', revision: 7, amountCents: 1600 }, 'command-fixture'));
});
