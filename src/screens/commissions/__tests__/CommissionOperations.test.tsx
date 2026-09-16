import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReceiptForm, DocumentForm, CommissionPeriods, CashOperations } from '../CommissionOperations';
import * as DocumentPicker from 'expo-document-picker';
import * as service from '../../../services/heraCommissionService';
import type { Run } from '../CommissionElements';
jest.mock('../../../services/heraCommissionService', () => ({ decide: jest.fn(), upload: jest.fn(), period: jest.fn() }));
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
 fireEvent.changeText(view.getByLabelText('Aplicar a Factura HERA-001 (€)'), '10');
 fireEvent.changeText(view.getByLabelText('Referencia y nota del abono'), 'Transferencia parcial comprobada');
 fireEvent.press(view.getByRole('checkbox', { name: 'He revisado las comisiones y los importes que cubre este pago' }));
 fireEvent.press(view.getByRole('checkbox', { name: 'He comprobado la recepción de este abono fuera de HERA' }));
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
 const close = jest.fn(); const saved = jest.fn();
 const run: Run = async operation => { await operation(); return true; };
 const view = render(<DocumentForm data={data} entries={[]} original={original} run={run} busy={false} onSaved={saved} onClose={close} />);
 fireEvent.changeText(view.getByLabelText('Número y serie fiscal'), 'RECT-001');
 fireEvent.changeText(view.getByLabelText('Impuestos del documento (€)'), '-7,56');
 fireEvent.changeText(view.getByLabelText('Retenciones del documento (€)'), '0');
 fireEvent.changeText(view.getByLabelText('Total del documento (€)'), '-7,56');
 fireEvent.press(view.getByRole('button', { name: 'Seleccionar PDF privado' }));
 await waitFor(() => expect(view.getByRole('button', { name: 'Guardar documento' })).not.toBeDisabled());
 fireEvent.press(view.getByRole('button', { name: 'Guardar documento' }));
 await waitFor(() => expect(service.upload).toHaveBeenCalledWith('account', expect.objectContaining({ kind: 'DIFFERENCE', originalId: 'invoice', entryIds: [], baseCents: 0, taxCents: -756, totalCents: -756 }), expect.objectContaining({ name: 'fixture.pdf' })));
 expect(close).toHaveBeenCalledTimes(1); expect(saved).toHaveBeenCalledTimes(1);
});

it('requests confirmation for unapplied credit only when the receipt exceeds the document allocation', () => {
 const view = render(<ReceiptForm data={data} selectedDocument="invoice" run={async () => true} busy={false} onClose={jest.fn()} />);
 const label = 'Confirmo que el exceso quedará como saldo sin aplicar del mismo especialista';
 expect(view.queryByRole('checkbox', { name: label })).toBeNull();
 expect(view.queryByText('Proponer reparto por vencimiento')).toBeNull();
 fireEvent.changeText(view.getByLabelText('Importe realmente recibido (€)'), '40');
 expect(view.getByRole('checkbox', { name: label })).not.toBeChecked();
 expect(view.getByRole('checkbox', { name: 'He comprobado la recepción de este abono fuera de HERA' })).toBeTruthy();
 fireEvent.changeText(view.getByLabelText('Importe realmente recibido (€)'), '36');
 expect(view.queryByRole('checkbox', { name: label })).toBeNull();
});

it('clears previous period lines on a failed selection and retries the selected period', async () => {
 const entry: service.Entry = { id: 'entry', baseCents: 1600, economicAt: '2026-08-01T10:00:00Z', recognizedAt: '2026-08-01T10:00:00Z', reason: 'Línea del primer periodo', documentLine: null, snapshot: { sessionId: 'session', position: 1, rateBps: 2000 } };
 const periods: service.Period[] = ['2026-08', '2026-09'].map(month => ({ id: month, month, revision: 1, status: 'CLOSED', baseCents: 1600, closedAt: '2026-09-01T00:00:00Z' }));
 jest.mocked(service.period).mockResolvedValueOnce({ period: periods[0], items: [entry], hasMore: false }).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ period: periods[1], items: [{ ...entry, id: 'entry-2', reason: 'Línea del segundo periodo' }], hasMore: false });
 const view = render(<CommissionPeriods data={{ ...data, periods }} admin run={async () => true} busy={false} onReceipt={jest.fn()} />);
 fireEvent.press(view.getByText('Ver desglose de agosto de 2026')); await view.findByText(/Línea del primer periodo/);
 fireEvent.press(view.getByText('Ver desglose de septiembre de 2026')); await view.findByText('No se pudieron cargar las líneas de este periodo.');
 expect(view.queryByText(/Línea del primer periodo/)).toBeNull();
 fireEvent.press(view.getByText('Reintentar líneas')); await view.findByText(/Línea del segundo periodo/);
 expect(service.period).toHaveBeenLastCalledWith('account', true, '2026-09', 0);
});

it('preserves a failed refund and clears amount and confirmation after success', async () => {
 jest.mocked(service.decide).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ id: 'refund' });
 const run: Run = async operation => { try { await operation(); return true; } catch { return false; } };
 const view = render(<CashOperations data={{ ...data, summary: { ...data.summary, creditCents: 4000 } }} run={run} busy={false} />);
 act(() => view.UNSAFE_getAllByType(SimpleDropdown)[0].props.onSelect('RETURN_CREDIT'));
 fireEvent.changeText(view.getByLabelText('Importe de crédito (€)'), '10');
 fireEvent.changeText(view.getByLabelText('Referencia de la devolución externa'), 'Bizum devuelto y comprobado');
 fireEvent.press(view.getByRole('checkbox', { name: 'He comprobado la devolución realizada fuera de HERA' }));
 fireEvent.press(view.getByText('Guardar operación de crédito'));
 await waitFor(() => expect(service.decide).toHaveBeenLastCalledWith('account', true, expect.objectContaining({ action: 'RETURN_CREDIT', amountCents: 1000 })));
 expect(view.getByLabelText('Importe de crédito (€)').props.value).toBe('10');
 fireEvent.press(view.getByText('Guardar operación de crédito'));
 await view.findByText('Operación de crédito guardada.');
 expect(view.getByLabelText('Importe de crédito (€)').props.value).toBe('');
 expect(view.getByRole('checkbox', { name: 'He comprobado la devolución realizada fuera de HERA' }).props.accessibilityState.checked).toBe(false);
 expect(view.getByRole('button', { name: 'Guardar operación de crédito' })).toBeDisabled();
});

it('explains a server fiscal block before opening an unusable invoice form', () => {
 const reason = 'HERA debe completar sus datos fiscales.';
 const view = render(<DocumentForm data={{ ...data, documentImportBlock: reason }} entries={[]} run={async () => true} busy={false} onClose={jest.fn()} />);
 expect(view.getByText(reason)).toBeTruthy();
 expect(view.queryByLabelText('Número y serie fiscal')).toBeNull();
});

it.each([15,40,50])('proposes %s euros against accrued entries without an invoice and requires review', async received => {
 jest.mocked(service.decide).mockReset().mockResolvedValue({ id: 'receipt' });
 const entries = [1600,800,800,400,400].map((baseCents,i) => ({ id: `entry-${i}`, snapshotId: `snapshot-${i}`, sessionDate: `2026-09-0${i+1}T10:00:00Z`, economicAt: '2026-09-10T10:00:00Z', baseCents, appliedCents: 0, remainingCents: baseCents, groupRemainingCents: baseCents }));
 const props = { data: { ...data, documents: [], payableEntries: entries, documentImportBlock: 'NIF pendiente' }, run: async (operation: Parameters<Run>[0]) => { await operation(); return true; }, busy: false, onClose: jest.fn() };
 const view=render(<ReceiptForm {...props} />);
 fireEvent.changeText(view.getByLabelText('Importe realmente recibido (€)'), String(received));
 fireEvent.changeText(view.getByLabelText('Referencia y nota del abono'), 'Bizum recibido y comprobado');
 fireEvent.press(view.getByText('Proponer aplicación del pago'));
 await waitFor(()=>expect(view.getByText(new RegExp(`Aplicado: ${Math.min(received,40)},00`))).toBeTruthy());
 expect(view.getByText('Guardar recepción manual')).toBeDisabled();
 fireEvent.press(view.getByRole('checkbox',{name:'He revisado las comisiones y los importes que cubre este pago'}));
 fireEvent.press(view.getByRole('checkbox',{name:'He comprobado la recepción de este abono fuera de HERA'}));
 if(received>40) fireEvent.press(view.getByRole('checkbox',{name:'Confirmo que el exceso quedará como saldo sin aplicar del mismo especialista'}));
 fireEvent.press(view.getByText('Guardar recepción manual'));
 await waitFor(()=>expect(service.decide).toHaveBeenCalledTimes(1));
 const input=jest.mocked(service.decide).mock.calls[0][2];
 expect(input).toEqual(expect.objectContaining({action:'RECEIVE',method:'BIZUM',amountCents:received*100}));
 if(input.action!=='RECEIVE') throw Error('Expected receipt');
 expect(input.applications.reduce((n,a)=>n+a.amountCents,0)).toBe(Math.min(received,40)*100);
 expect(input.applications.every(a=>a.entryId && !a.documentId)).toBe(true);
});

it('a balance revision invalidates payment review; multiple accruals of the same session share a net limit', async () => {
 const entries=[0,1].map(i=>({id:`entry-${i}`,snapshotId:'same-session',sessionDate:`2026-09-0${i+1}T10:00:00Z`,economicAt:'2026-09-10T10:00:00Z',baseCents:800,appliedCents:0,remainingCents:800,groupRemainingCents:1200}));
 const account={...data,documents:[],payableEntries:entries};
 const props={data:account,run:async(operation:Parameters<Run>[0])=>{await operation();return true;},busy:false,onClose:jest.fn()};
 const view=render(<ReceiptForm {...props}/>);
 fireEvent.changeText(view.getByLabelText('Importe realmente recibido (€)'),'16');
 fireEvent.press(view.getByText('Proponer aplicación del pago'));
 await view.findByText(/Aplicado: 12,00 € · Saldo a favor: 4,00 €/);
 fireEvent.press(view.getByRole('checkbox',{name:'He revisado las comisiones y los importes que cubre este pago'}));
 view.rerender(<ReceiptForm {...props} data={{...account,summary:{...account.summary,revision:5}}}/>);
 expect(view.getByRole('checkbox',{name:'He revisado las comisiones y los importes que cubre este pago'})).not.toBeChecked();
 expect(view.getByText('Guardar recepción manual')).toBeDisabled();
});
