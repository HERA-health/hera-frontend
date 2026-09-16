import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommissionPayments } from '../CommissionPayments';
import type { AccountDetail, Terms } from '../../../services/heraCommissionService';

const terms: Terms = { id: 'terms', mode: 'LIVE', operatorKey: 'operator', contractText: 'Condiciones de prueba', fiscalTreatment: 'Fiscalidad de prueba', operatorName: 'HERA prueba', operatorTaxId: 'prueba', operatorAddress: 'prueba', beneficiary: 'Titular de prueba', iban: 'ES00 CUENTA DE PRUEBA', effectiveAt: '2026-01-01T00:00:00Z' };
const data: AccountDetail = {
 summary: { id: 'account', specialistId: 'specialist', specialistName: 'Profesional de prueba', operatorKey: 'operator', mode: 'LIVE', revision: 1, estimatedCents: 900, accruedCents: 500, undocumentedCents: 0, documentedCents: 2600, pendingCents: 2600, overdueCents: 0, receivedCents: 1000, creditCents: 0, issueCount: 0 },
 acceptances: [{ id: 'acceptance', termsId: 'terms', terms, acceptedAt: '2026-01-01T00:00:00Z', terminatedAt: null }],
 specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], issues: [], hasMore: true,
 documents: [{ id: 'doc', invoiceNumber: 'HERA-001', dueAt: '2026-09-30T00:00:00Z', totalCents: 3600, appliedCents: 1000, remainingCents: 2600, claimableCents: 2600, correctionPending: false, status: 'PARTIALLY_RECEIVED', documents: [] }],
 cash: [{ id: 'cash', kind: 'RECEIPT', originalId: null, amountCents: 1000, availableCents: 0, occurredAt: '2026-09-01T10:00:00Z', recordedAt: '2026-09-02T10:00:00Z', reference: 'Transferencia de prueba', applications: [{ id: 'application', documentId: 'doc', invoiceNumber: 'HERA-001', amountCents: 1000, reversalOfId: null, reason: 'Aplicación' }] }],
};

it('shows document balances, deadlines, destination and receipt confirmation together', () => {
 const open = jest.fn(); const view = render(<CommissionPayments data={data} onDocuments={open} />);
 expect(view.getByText('Vencimiento: 30/9/2026')).toBeTruthy();
 expect(view.getByText('IBAN: ES00 CUENTA DE PRUEBA')).toBeTruthy();
 expect(view.getByText(/Abono parcial confirmado/)).toBeTruthy();
 expect(view.getByText(/no lo repitas solo porque siga apareciendo pendiente/)).toBeTruthy();
 expect(view.getByText(/Aplicado: 10,00 € · Factura HERA-001/)).toBeTruthy();
 expect(view.getByText(/Registrado por HERA el/)).toBeTruthy();
 expect(view.getByText(/El resumen incluye toda la cuenta/)).toBeTruthy();
 expect(view.queryByText('9,00 €')).toBeNull();
 fireEvent.press(view.getByText('Ver documentos y descargar facturas')); expect(open).toHaveBeenCalledTimes(1);
});

it('does not ask for bank transfers in simulation', () => {
 const view = render(<CommissionPayments data={{ ...data, summary: { ...data.summary, mode: 'SIMULATION' } }} onDocuments={jest.fn()} />);
 expect(view.getByText(/No hagas transferencias reales/)).toBeTruthy();
 expect(view.queryByText('IBAN: ES00 CUENTA DE PRUEBA')).toBeNull();
});

it('explains unavailable banking details, unapplied credit, blocked documents and voided receipts', () => {
 const view = render(<CommissionPayments data={{ ...data, acceptances: [], summary: { ...data.summary, creditCents: 1000 }, documents: [{ ...data.documents[0], correctionPending: true, claimableCents: 0 }], cash: [{ ...data.cash[0], isVoided: true }] }} onDocuments={jest.fn()} />);
 expect(view.getByText(/Los datos para realizar el abono están pendientes/)).toBeTruthy();
 expect(view.getByText(/Tienes saldo a tu favor pendiente de aplicar/)).toBeTruthy();
 expect(view.getByText(/Espera la documentación corregida/)).toBeTruthy();
 expect(view.getByText('Registro de recepción anulado')).toBeTruthy();
 expect(view.queryByText('Abono recibido por HERA')).toBeNull();
});


it('shows the agreed Bizum instructions without asking for an IBAN', () => {
 const paymentInstructions='Pago por Bizum. HERA y el especialista acordarán directamente el destinatario.';
 const view=render(<CommissionPayments data={{...data,acceptances:[{...data.acceptances[0],terms:{...terms,beneficiary:'',iban:'',paymentInstructions}}]}} onDocuments={jest.fn()} />);
 expect(view.getByText(paymentInstructions)).toBeTruthy();
 expect(view.queryByText(/IBAN:/)).toBeNull();
 expect(view.queryByText(/Los datos para realizar el abono están pendientes/)).toBeNull();
});
