import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalCommissionDocuments } from '../ProfessionalCommissionDocuments';
import * as service from '../../../services/heraCommissionService';
import { openPrivateDocument } from '../../../utils/openPrivateDocument';

jest.mock('../../../services/heraCommissionService', () => ({ period: jest.fn(), fiscal: jest.fn(), download: jest.fn() }));
jest.mock('../../../utils/openPrivateDocument', () => ({ openPrivateDocument: jest.fn() }));
const doc: service.Document = { id: 'doc', rootId: 'doc', originalId: null, invoiceNumber: 'HERA-001', storageStatus: 'READY', kind: 'ORDINARY', baseCents: 1000, taxCents: 210, withholdingCents: 0, totalCents: 1210, fileName: 'invoice.pdf', issuedAt: '2026-09-01' };
const period: service.Period = { id: 'period', month: '2026-09', revision: 1, status: 'CLOSED', baseCents: 1000, closedAt: '2026-10-01' };
const data: service.AccountDetail = { summary: { id: 'account', specialistId: 'specialist', specialistName: 'Prueba', operatorKey: 'operator', mode: 'LIVE', revision: 1, estimatedCents: 0, accruedCents: 1000, undocumentedCents: 0, documentedCents: 1210, pendingCents: 710, overdueCents: 0, receivedCents: 500, creditCents: 0, issueCount: 0 }, acceptances: [], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [period], documents: [{ id: 'doc', invoiceNumber: 'HERA-001', dueAt: '2026-10-01', totalCents: 1210, appliedCents: 500, remainingCents: 710, claimableCents: 710, correctionPending: false, status: 'PARTIAL', documents: [doc] }], cash: [], issues: [], hasMore: false };
const run = async (operation: () => Promise<unknown>) => { await operation(); return true; };
beforeEach(() => jest.clearAllMocks());

it('shows one document with independent payment status, fiscal detail and the private download', async () => {
 const fiscal: service.Fiscal = { issuerName: 'Emisor de prueba', issuerTaxId: 'NIF de prueba', issuerAddress: 'Dirección', recipientName: 'Destinatario de prueba', recipientTaxId: 'NIF', recipientAddress: 'Dirección', concept: 'Comisiones', taxDescription: 'IVA', withholdingDescription: 'Sin retención', externalReference: 'Referencia' };
 jest.mocked(service.fiscal).mockResolvedValue(fiscal);
 const bytes = new ArrayBuffer(1); jest.mocked(service.download).mockResolvedValue(bytes);
 const view = render(<ProfessionalCommissionDocuments data={data} run={run} busy={false} />);
 expect(view.getByText('Pago parcial · Factura disponible')).toBeTruthy();
 expect(view.queryByText('Recibido por HERA')).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Detalle de HERA-001' }));
 expect(view.getByText(/Emisión:/)).toBeTruthy();
 fireEvent.press(view.getByText('Datos fiscales'));
 await view.findByText('Emisor: Emisor de prueba');
 fireEvent.press(view.getByText('Descargar factura PDF'));
 await waitFor(() => expect(openPrivateDocument).toHaveBeenCalledWith(bytes, 'doc', 'invoice.pdf', 'application/pdf'));
 expect(service.download).toHaveBeenCalledWith('account', false, 'doc');
 expect(service.fiscal).toHaveBeenCalledWith('account', false, 'doc');
});

it('does not equate payment with PDF availability or allow a missing PDF download', () => {
 const view = render(<ProfessionalCommissionDocuments data={{ ...data, documents: [{ ...data.documents[0], remainingCents: 0, claimableCents: 0, correctionPending: true, documents: [{ ...doc, storageStatus: 'PENDING' }] }] }} run={run} busy={false} />);
 expect(view.getByText('Pagado · Factura pendiente')).toBeTruthy();
 expect(view.getByText(/Espera la documentación corregida/)).toBeTruthy();
 fireEvent.press(view.getByRole('button', { name: 'Detalle de HERA-001' }));
 expect(view.getByRole('button', { name: 'Descargar factura PDF' })).toBeDisabled();
});

it('loads period lines only on demand, retries errors and paginates them', async () => {
 jest.mocked(service.period).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ period, hasMore: true, items: [{ id: 'line', baseCents: 1000, economicAt: '2026-09-01', recognizedAt: '2026-09-02', reason: 'Ajuste de prueba', documentLine: { documentId: 'doc' }, snapshot: { sessionId: 'session', sessionDate: '2026-09-01', position: 2, rateBps: 1000 } }] }).mockResolvedValueOnce({ period, hasMore: false, items: [] });
 const view = render(<ProfessionalCommissionDocuments data={data} run={run} busy={false} />);
 expect(service.period).not.toHaveBeenCalled();
 fireEvent.press(view.getByRole('button', { name: 'Periodos y líneas de comisión' }));
 fireEvent.press(view.getByRole('button', { name: /septiembre de 2026/i }));
 await view.findByText('No se pudieron cargar las líneas.');
 fireEvent.press(view.getByText('Reintentar líneas'));
 await view.findByText(/Ajuste de prueba/);
 fireEvent.press(view.getByRole('button', { name: 'Página siguiente' }));
 await view.findByText('Este periodo no tiene líneas en esta página.');
 expect(service.period).toHaveBeenLastCalledWith('account', false, 'period', 1);
});
