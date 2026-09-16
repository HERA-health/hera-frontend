import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommissionPayments, CommissionPaymentInstructions } from '../CommissionPayments';
import type { AccountDetail, Terms } from '../../../services/heraCommissionService';

const terms: Terms = { id: 'terms', mode: 'LIVE', operatorKey: 'operator', contractText: 'Condiciones de prueba', fiscalTreatment: 'Fiscalidad de prueba', operatorName: 'HERA prueba', operatorTaxId: 'prueba', operatorAddress: 'prueba', beneficiary: 'Titular de prueba', iban: 'ES00 CUENTA DE PRUEBA', effectiveAt: '2026-01-01T00:00:00Z' };
const data: AccountDetail = {
 summary: { id: 'account', specialistId: 'specialist', specialistName: 'Profesional de prueba', operatorKey: 'operator', mode: 'LIVE', revision: 1, estimatedCents: 900, accruedCents: 500, undocumentedCents: 0, documentedCents: 2600, pendingCents: 2600, overdueCents: 0, receivedCents: 1000, creditCents: 0, issueCount: 0 },
 acceptances: [{ id: 'acceptance', termsId: 'terms', terms, acceptedAt: '2026-01-01T00:00:00Z', terminatedAt: null }],
 specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], issues: [], hasMore: true,
 documents: [{ id: 'doc', invoiceNumber: 'HERA-001', dueAt: '2026-09-30T00:00:00Z', totalCents: 3600, appliedCents: 1000, remainingCents: 2600, claimableCents: 2600, correctionPending: false, status: 'PARTIALLY_RECEIVED', documents: [] }],
 cash: [{ id: 'cash', kind: 'RECEIPT', originalId: null, amountCents: 1000, availableCents: 0, occurredAt: '2026-09-01T10:00:00Z', recordedAt: '2026-09-02T10:00:00Z', reference: 'Transferencia de prueba', applications: [{ id: 'application', documentId: 'doc', invoiceNumber: 'HERA-001', amountCents: 1000, reversalOfId: null, reason: 'Aplicación' }] }],
};


it('shows confirmed payments once, with applications available in the detail', () => {
 const view = render(<CommissionPayments data={data} />);
 expect(view.getByText('Abono recibido por HERA')).toBeTruthy();
 expect(view.queryByText('Pendiente de cubrir')).toBeNull();
 expect(view.queryByText(/Aplicado: 10,00/)).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Aplicaciones y detalle del pago' }));
 expect(view.getByText(/Aplicado: 10,00 € · Factura HERA-001/)).toBeTruthy();
 expect(view.getByText(/Registrado por HERA el/)).toBeTruthy();
 expect(view.getByText(/Los movimientos están paginados/)).toBeTruthy();
});
it('preserves payment instructions and distinguishes base, received credit and estimates', () => {
 const view = render(<CommissionPaymentInstructions data={{ ...data, summary: { ...data.summary, creditCents: 1000 } }} />);
 expect(view.getByText('IBAN: ES00 CUENTA DE PRUEBA')).toBeTruthy();
 expect(view.getByText(/no lo repitas solo porque siga apareciendo pendiente/)).toBeTruthy();
 expect(view.getByText(/no es un total fiscal definitivo/)).toBeTruthy();
 expect(view.getByText(/Tienes saldo a tu favor pendiente de aplicar/)).toBeTruthy();
});
it('does not ask for real transfers in simulation', () => {
 const view = render(<CommissionPaymentInstructions data={{ ...data, summary: { ...data.summary, mode: 'SIMULATION' } }} />);
 expect(view.getByText(/No hagas transferencias reales/)).toBeTruthy();
 expect(view.queryByText('IBAN: ES00 CUENTA DE PRUEBA')).toBeNull();
});
it('shows missing destination and voided receipt without pretending it is a refund', () => {
 const view = render(<><CommissionPaymentInstructions data={{ ...data, acceptances: [] }} /><CommissionPayments data={{ ...data, cash: [{ ...data.cash[0], isVoided: true }] }} /></>);
 expect(view.getByText(/Los datos para realizar el abono están pendientes/)).toBeTruthy();
 expect(view.getByText('Registro de recepción anulado')).toBeTruthy();
 fireEvent.press(view.getByRole('button', { name: 'Aplicaciones y detalle del pago' }));
 expect(view.getByText(/no acredita una devolución bancaria/)).toBeTruthy();
});
it('keeps the complete published Bizum instructions', () => {
 const paymentInstructions = 'Pago por Bizum. HERA y el especialista acordarán directamente el destinatario.';
 const view = render(<CommissionPaymentInstructions data={{ ...data, acceptances: [{ ...data.acceptances[0], terms: { ...terms, beneficiary: '', iban: '', paymentInstructions } }] }} />);
 expect(view.getByText(paymentInstructions)).toBeTruthy();
 expect(view.queryByText(/IBAN:/)).toBeNull();
});
