import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReceiptForm, DocumentForm } from '../CommissionOperations';
import * as DocumentPicker from 'expo-document-picker';
import * as service from '../../../services/heraCommissionService';
import type { Run } from '../CommissionElements';
jest.mock('../../../services/heraCommissionService', () => ({ decide: jest.fn(), upload: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
const data: service.AccountDetail = {
 summary: { id: 'account', specialistId: 'specialist', specialistName: 'Profesional sintético', operatorKey: 'fixture', mode: 'LIVE', revision: 4, estimatedCents: 0, accruedCents: 0, undocumentedCents: 0, documentedCents: 3600, pendingCents: 3600, overdueCents: 0, receivedCents: 0, creditCents: 0, issueCount: 0 },
 acceptances: [], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], cash: [], issues: [], hasMore: false,
 documents: [{ id: 'invoice', invoiceNumber: 'HERA-001', dueAt: '2026-09-10T12:00:00Z', totalCents: 3600, appliedCents: 0, remainingCents: 3600, claimableCents: 3600, correctionPending: false, status: 'PENDING', documents: [] }],
};
it('requires manual confirmation, submits a partial receipt and preserves the form on failure', async () => {
 const decide = jest.mocked(service.decide); decide.mockRejectedValueOnce(new Error('conflict')).mockResolvedValue({ id: 'receipt' });
 const run: Run = async operation => { try { await operation(); return true; } catch { return false; } };
 const close = jest.fn();const view = render(<ReceiptForm data={data} selectedDocument="invoice" run={run} busy={false} onClose={close} />);
 expect(view.getByRole('button', { name: 'Guardar recepción manual' })).toBeDisabled();
 fireEvent.changeText(view.getByLabelText('Importe realmente recibido (€)'), '10');
 fireEvent.changeText(view.getByLabelText('Aplicar a HERA-001 (€)'), '10');
 fireEvent.changeText(view.getByLabelText('Referencia y nota de la transferencia'), 'Transferencia parcial comprobada');
 fireEvent.press(view.getByRole('checkbox', { name: 'He comprobado la recepción de esta transferencia fuera de HERA' }));
 fireEvent.press(view.getByRole('button', { name: 'Guardar recepción manual' }));
 await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
 expect(close).not.toHaveBeenCalled();expect(view.getByDisplayValue('Transferencia parcial comprobada')).toBeTruthy();
 expect(decide).toHaveBeenLastCalledWith('account', true, expect.objectContaining({ amountCents: 1000, revision: 4, applications: [{ documentId: 'invoice', amountCents: 1000 }], allowUnapplied: false, confirmed: true }));
 fireEvent.press(view.getByRole('button', { name: 'Guardar recepción manual' }));await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});

it('submits a fiscal-only correction without requiring new commission entries', async () => {
 jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///fixture.pdf', name: 'fixture.pdf', mimeType: 'application/pdf', lastModified: 0 }] });
 jest.mocked(service.upload).mockResolvedValue({ id: 'correction' });
 const original: service.DocumentBalance = { ...data.documents[0], documents: [{ id: 'invoice', rootId: 'invoice', originalId: null, kind: 'ORDINARY', invoiceNumber: 'HERA-001', storageStatus: 'READY', baseCents: 3600, taxCents: 756, withholdingCents: 0, totalCents: 4356, fileName: 'fixture.pdf' }] };
 const close = jest.fn();
 const run: Run = async operation => { await operation(); return true; };
 const view = render(<DocumentForm data={data} entries={[]} original={original} run={run} busy={false} onClose={close} />);
 fireEvent.changeText(view.getByLabelText('Número y serie fiscal'), 'RECT-001');
 fireEvent.changeText(view.getByLabelText('Impuestos del documento (€)'), '-7,56');
 fireEvent.changeText(view.getByLabelText('Retenciones del documento (€)'), '0');
 fireEvent.changeText(view.getByLabelText('Total del documento (€)'), '-7,56');
 fireEvent.press(view.getByRole('button', { name: 'Seleccionar PDF privado' }));
 await waitFor(() => expect(view.getByRole('button', { name: 'Guardar documento' })).not.toBeDisabled());
 fireEvent.press(view.getByRole('button', { name: 'Guardar documento' }));
 await waitFor(() => expect(service.upload).toHaveBeenCalledWith('account', expect.objectContaining({ kind: 'DIFFERENCE', originalId: 'invoice', entryIds: [], baseCents: 0, taxCents: -756, totalCents: -756 }), expect.objectContaining({ name: 'fixture.pdf' })));
 expect(close).toHaveBeenCalledTimes(1);
});
