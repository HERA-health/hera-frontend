import React from 'react';
import { getMadridDateKey } from '../../../utils/madridTime';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AdminCommissionSummary } from '../CommissionLinks';
import { CommissionSessions } from '../CommissionSessions';
import * as service from '../../../services/heraCommissionService';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('../../../services/heraCommissionService', () => ({ adminSpecialistSummary: jest.fn(), sessions: jest.fn(), sessionDocuments: jest.fn(), documentApplications: jest.fn(), decide: jest.fn() }));
const summary: service.Balance = { id: 'account', specialistId: 'specialist', specialistName: 'Fixture', operatorKey: 'internal-operator-key', mode: 'LIVE', revision: 4, estimatedCents: 0, accruedCents: 2400, undocumentedCents: 0, documentedCents: 1400, pendingCents: 1400, overdueCents: 0, receivedCents: 1000, creditCents: 0, issueCount: 0 };
const account: service.AccountDetail = { summary, acceptances: [], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], documents: [], cash: [], issues: [], hasMore: false };
const row: service.CommissionSession = { id: 'snapshot', sessionId: 'session', accountId: 'account', relationId: 'relation', position: 1, rateBps: 2000, bookedGrossCents: 8000, baseCents: 8000, serviceTaxCents: 0, potentialCents: 1600, entitledCents: 1600, exclusion: null, revision: 1, session: { date: '2026-09-01T12:00:00Z', clientId: 'patient-reference', patientName: 'Ana de prueba', attendanceOutcome: 'ATTENDED', status: 'COMPLETED' }, relation: { id: 'relation', origin: 'HERA_DIRECTORY', status: 'CONFIRMED', initialCount: 0 }, movements: [], revisions: [], settlement: { state: 'PARTIAL_DOCUMENT', undocumentedCents: 0, documentCount: 1 } };
beforeEach(() => jest.clearAllMocks());

it('summary separates errors, OFF empty, historical balances and refresh; ignores a stale specialist response', async () => {
 const request = jest.mocked(service.adminSpecialistSummary);
 let resolveFirst: (value: service.AdminSpecialistSummary) => void = () => {};
 request.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; })).mockRejectedValueOnce(new Error('No disponible'));
 const view = render(<AdminCommissionSummary specialistId="first" />);
 expect(view.getByText('Consultando comisiones…')).toBeTruthy();
 view.rerender(<AdminCommissionSummary specialistId="second" />);
 await view.findByText('No disponible');
 await act(async () => resolveFirst({ mode: 'LIVE', accounts: [{ ...summary, operatorName: 'Stale specialist', hasHistory: true }] }));
 expect(view.queryByText(/Stale specialist/)).toBeNull(); expect(view.queryByText('Aún no hay comisiones registradas.')).toBeNull();
 request.mockResolvedValueOnce({ mode: 'OFF', accounts: [] });
 fireEvent.press(view.getByText('Reintentar comisiones'));
 await view.findByText('Aún no hay comisiones registradas.'); expect(view.queryByText('No disponible')).toBeNull();
 expect(view.getByText('Las nuevas comisiones están desactivadas.')).toBeTruthy();
 request.mockResolvedValueOnce({ mode: 'OFF', accounts: [{ ...summary, operatorName: 'Titular fiscal', hasHistory: true }] });
 view.rerender(<AdminCommissionSummary specialistId="second" refresh={1} />);
 await view.findByText('Titular fiscal · Real');
 expect(view.getByText(/gestionar las obligaciones anteriores/)).toBeTruthy();
 expect(view.queryByText(/internal-operator-key/)).toBeNull();
 fireEvent.press(view.getByText('Ver comisiones del Directorio'));
 expect(mockNavigate).toHaveBeenCalledWith('AdminPanel', { initialTab: 'commissions', commissionSpecialistId: 'second', commissionAccountId: 'account' });
});

it('opens session documents outside the account page, shows document amounts, applications and the existing receipt form', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [row], hasMore: true });
 jest.mocked(service.sessionDocuments).mockRejectedValueOnce(new Error('Fallo de documentos')).mockResolvedValue({ items: [{ id: 'outside-account-page', invoiceNumber: 'HERA-002', dueAt: '2026-09-01T12:00:00Z', totalCents: 2400, appliedCents: 1000, remainingCents: 1400, claimableCents: 1400, correctionPending: false, status: 'PARTIALLY_RECEIVED', documents: [], sessionCount: 2 }], hasMore: false });
 jest.mocked(service.documentApplications).mockResolvedValue({ items: [{ id: 'application', amountCents: 1000, reason: 'Aplicación', reversalOfId: null, createdAt: '2026-09-01T12:00:00Z', actorId: 'admin-fixture', cash: { id: 'cash', occurredAt: '2026-09-01T12:00:00Z', reference: 'Transferencia comprobada', actorId: 'admin-fixture' } }], hasMore: false });
 const run = async (operation: () => Promise<unknown>) => { await operation(); return true; };
 const view = render(<CommissionSessions accountId="account" admin account={account} onPeriods={jest.fn()} run={run} busy={false} refresh={0} />);
 await view.findByText('Documento parcialmente abonado');
 expect(view.queryByText('Abonada a HERA')).toBeNull();
 fireEvent.press(view.getByText('Ver documentos y abonos')); await view.findByText('Fallo de documentos');
 fireEvent.press(view.getByText('Reintentar documentos')); await view.findByText('Documento HERA-002');
 expect(view.getByText(/incluye 2 sesiones.*No hay reparto individual/)).toBeTruthy();
 expect(view.getByText('Saldo del documento completo')).toBeTruthy();
 fireEvent.press(view.getByText('Ver abonos aplicados')); await view.findByText(/Transferencia comprobada/);
 fireEvent.press(view.getByText('Registrar abono de la comisión'));
 expect(view.getByLabelText('Importe realmente recibido (€)').props.value).toBe('14');
 expect(view.getByLabelText('Aplicar a Factura HERA-002 (€)').props.value).toBe('14');
 expect(view.getByRole('button', { name: 'Guardar recepción manual' })).toBeDisabled();
 await act(async () => { fireEvent.press(view.getByText('Cerrar')); });
 fireEvent.press(view.getByRole('button', { name: 'Filtrar sesiones' }));
 fireEvent.changeText(view.getByLabelText('Referencia del paciente (opcional)'), 'another-patient');
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', true, expect.objectContaining({ clientId: 'another-patient', page: 0 })));
});

it('session failures clear stale rows and professional readers have no administrative receipt action', async () => {
 jest.mocked(service.sessions).mockResolvedValueOnce({ items: [row], hasMore: false }).mockRejectedValueOnce(new Error('Desglose no disponible'));
 const props = { accountId: 'account', admin: false, run: async () => true, busy: false, refresh: 0 };
 const view = render(<CommissionSessions {...props} />); await view.findByText('Ana de prueba');
 expect(view.queryByText('Registrar abono de la comisión')).toBeNull();expect(view.queryByText('Ver documentos y abonos')).toBeNull();
 view.rerender(<CommissionSessions {...props} refresh={1} />);
 await view.findByText('Desglose no disponible'); expect(view.queryByText('Ana de prueba')).toBeNull();
});

it('keeps calculations and filters collapsed, reveals the evidence on demand and clears active filters', async () => {
 const detailedRow = { ...row,
  movements: [{ id: 'collection', kind: 'COLLECTION', grossCents: 8000, baseCents: 8000, originalId: null, occurredAt: row.session.date, reference: 'Cobro comprobado de prueba' }],
  revisions: [{ id: 'revision', beforePosition: 2, position: 1, beforeBps: 1000, rateBps: 2000, deltaCents: 800, reason: 'Orden corregido' }],
 };
 jest.mocked(service.sessions).mockResolvedValue({ items: [detailedRow], hasMore: false });
 const view = render(<CommissionSessions accountId="account" admin account={account} onPeriods={jest.fn()} run={async () => true} busy={false} refresh={0} />);
 await view.findByText('Comisión generada');
 expect(view.getByText('Documento parcialmente abonado')).toBeTruthy();
 expect(view.queryByText(/Cobro comprobado de prueba/)).toBeNull();
 expect(view.queryByText(/Orden corregido/)).toBeNull();
 expect(service.sessionDocuments).not.toHaveBeenCalled();
 expect(view.queryByLabelText('Referencia del paciente (opcional)')).toBeNull();
 fireEvent.press(view.getByText('Ver cálculo y cobros'));
 expect(view.getByText(/Cobro comprobado de prueba/)).toBeTruthy();
 expect(view.getByText(/Orden corregido/)).toBeTruthy();
 fireEvent.press(view.getByText('Ocultar cálculo y cobros'));
 expect(view.queryByText(/Orden corregido/)).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Filtrar sesiones' }));
 fireEvent.changeText(view.getByLabelText('Referencia del paciente (opcional)'), 'patient-2');
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', true, expect.objectContaining({ clientId: 'patient-2' })));
 fireEvent.press(view.getByRole('button', { name: 'Filtrar sesiones' }));
 expect(view.queryByLabelText('Referencia del paciente (opcional)')).toBeNull();
 expect(view.getByText(/Filtrar sesiones · 1 activo/)).toBeTruthy();
 fireEvent.press(view.getByText('Limpiar filtros'));
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', true, expect.objectContaining({ clientId: undefined, page: 0 })));
 expect(view.queryByText('Limpiar filtros')).toBeNull();
});

it('keeps account selection when the specialist has more than one historical account', async () => {
 jest.mocked(service.adminSpecialistSummary).mockResolvedValue({ mode: 'OFF', accounts: [
  { ...summary, operatorName: 'Titular real', hasHistory: true },
  { ...summary, id: 'simulation', mode: 'SIMULATION', operatorName: 'Titular de prueba', hasHistory: true },
 ] });
 const view = render(<AdminCommissionSummary specialistId="specialist" />);
 await view.findByText('Titular real · Real');
 fireEvent.press(view.getByText('Ver comisiones del Directorio'));
 expect(mockNavigate).toHaveBeenCalledWith('AdminPanel', { initialTab: 'commissions', commissionSpecialistId: 'specialist', commissionAccountId: undefined });
});


it('professional sessions show names and a concise summary, with details and activity available on demand', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [{ ...row, movements: [{ id: 'collection', kind: 'COLLECTION', grossCents: 8000, baseCents: 8000, originalId: null, occurredAt: row.session.date, reference: 'Transferencia del paciente' }] }], hasMore: false });
 const view = render(<CommissionSessions accountId="account" admin={false} run={async () => true} busy={false} refresh={0} />);
 await view.findByText('Ana de prueba');
 expect(view.queryByText(/patient-reference/)).toBeNull();
 expect(view.queryByText(/Transferencia del paciente/)).toBeNull();
 expect(view.queryByLabelText('Mes de liquidación')).toBeNull();
 fireEvent.press(view.getByText('Ver detalle'));
 expect(view.getByText(/Transferencia del paciente/)).toBeTruthy();
 fireEvent.press(view.getByText('Actualizar sesión'));
 expect(view.getByText('Guardar actividad')).toBeTruthy();
 fireEvent.press(view.getByText('Cerrar'));
 expect(view.queryByText('Guardar actividad')).toBeNull();
 fireEvent.press(view.getByText('Filtrar sesiones'));
 expect(view.queryByLabelText('Referencia del paciente (opcional)')).toBeNull();
});

it('does not substitute an internal ID when the patient name is unavailable', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [{ ...row, session: { ...row.session, patientName: null } }], hasMore: false });
 const view = render(<CommissionSessions accountId="account" admin={false} run={async () => true} busy={false} refresh={0} />);
 await view.findByText('Paciente sin nombre disponible');
 expect(view.queryByText(/patient-reference/)).toBeNull();
});

it('selects a month without typing a date format and lets the specialist open a review directly', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [row], hasMore: false });
 jest.mocked(service.decide).mockResolvedValue({ id: 'review' });
 const view = render(<CommissionSessions accountId="account" admin={false} run={async operation => { await operation(); return true; }} busy={false} refresh={0} />);
 await view.findByText('Ana de prueba');
 fireEvent.press(view.getByRole('button', { name: 'Filtrar sesiones' }));
 const calls = jest.mocked(service.sessions).mock.calls.length;
 fireEvent.press(view.getByRole('button', { name: 'Mes' }));
 expect(service.sessions).toHaveBeenCalledTimes(calls);
 const year = getMadridDateKey().slice(0, 4);
 fireEvent.press(view.getByRole('button', { name: 'Septiembre de ' + year }));
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ month: year + '-09', page: 0 })));
 await view.findByText('Ana de prueba');
 fireEvent.press(view.getByText('Ver detalle'));
 fireEvent.press(view.getByText('Solicitar revisión'));
 fireEvent.changeText(view.getByLabelText('Explicación (sin información clínica)'), 'La procedencia necesita revisión');
 await act(async () => { fireEvent.press(view.getByText('Enviar solicitud de revisión')); });
 await waitFor(() => expect(service.decide).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ action: 'REVIEW', snapshotId: row.id, reason: 'La procedencia necesita revisión' })));
});
