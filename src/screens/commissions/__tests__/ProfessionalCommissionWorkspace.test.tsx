import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalCommissionWorkspace, initialCommissionAccount } from '../ProfessionalCommissionWorkspace';
import { CommissionSelect, CommissionDateField } from '../CommissionFields';
import * as service from '../../../services/heraCommissionService';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: (effect: React.EffectCallback) => require('react').useEffect(() => mockFocused ? effect() : undefined, [effect, mockFocused]) }));
jest.mock('../../../services/heraCommissionService', () => ({ configuration: jest.fn(), detail: jest.fn(), sessions: jest.fn(), accept: jest.fn(), decide: jest.fn(), period: jest.fn(), fiscal: jest.fn(), download: jest.fn() }));
const terms: service.Terms = { id: 'terms', operatorKey: 'operator', operatorName: 'Titular de prueba', mode: 'LIVE', contractText: 'Acuerdo completo de prueba', fiscalTreatment: 'Texto fiscal de prueba', operatorTaxId: '', operatorAddress: '', beneficiary: '', iban: '', effectiveAt: '2026-01-01' };
const acceptance: service.Acceptance = { id: 'acceptance', termsId: terms.id, terms, acceptedAt: '2026-01-01', terminatedAt: null };
const account: service.Configuration['accounts'][number] = { id: 'account', mode: 'LIVE', operatorKey: terms.operatorKey, acceptances: [acceptance] };
const config: service.Configuration = { mode: 'LIVE', terms, canAccept: true, accounts: [account], scale: [2000, 1000, 1000, 500] };
const detail: service.AccountDetail = { summary: { id: 'account', specialistId: 'specialist', specialistName: 'No repetir nombre', operatorKey: 'operator', mode: 'LIVE', revision: 1, estimatedCents: 900, accruedCents: 1600, undocumentedCents: 1600, documentedCents: 0, pendingCents: 1600, paymentPendingCents: 1000, receivedCents: 600, creditCents: 300, overdueCents: 0, issueCount: 0 }, acceptances: [acceptance], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], documents: [], cash: [], issues: [], hasMore: false };
const row: service.CommissionSession = { id: 'snapshot', sessionId: 'session', accountId: 'account', relationId: 'relation', position: 1, rateBps: 2000, bookedGrossCents: 8000, baseCents: 8000, serviceTaxCents: 0, potentialCents: 1600, entitledCents: 1600, exclusion: null, revision: 1, session: { date: '2026-09-01T12:00:00Z', clientId: 'patient', patientName: 'Paciente de prueba', attendanceOutcome: 'ATTENDED', status: 'COMPLETED' }, relation: { id: 'relation', origin: 'HERA_DIRECTORY', status: 'CONFIRMED', initialCount: 0 }, movements: [], revisions: [], settlement: { state: 'PAID', paymentState: 'PAID', documentState: 'PENDING', undocumentedCents: 1600, documentCount: 0 } };
const props = () => ({ onOpen: jest.fn(), onBack: jest.fn() });
beforeEach(() => {
 mockFocused = true;
 jest.clearAllMocks();
 jest.mocked(service.configuration).mockResolvedValue(config);
 jest.mocked(service.detail).mockResolvedValue(detail);
 jest.mocked(service.sessions).mockResolvedValue({ items: [row], hasMore: false });
});

it('opens sessions directly without a redirect, duplicate summary or specialist title', async () => {
 const callbacks = props(); const view = render(<ProfessionalCommissionWorkspace {...callbacks} clientId="patient" />);
 await view.findByText('Paciente de prueba');
 expect(callbacks.onOpen).not.toHaveBeenCalled();
 expect(service.detail).toHaveBeenCalledWith('account', false, 0);
 expect(service.sessions).toHaveBeenCalledWith('account', false, expect.objectContaining({ clientId: 'patient' }));
 expect(view.queryByText('Ver mis comisiones')).toBeNull();
 expect(view.queryByText('No repetir nombre')).toBeNull();
 expect(view.getByText('Pagado · Factura pendiente')).toBeTruthy();
 fireEvent.press(view.getByText('Pagos y facturas'));
 expect(view.getAllByText('Pendiente de cubrir')).toHaveLength(1);
 expect(view.getAllByText('Recibido por HERA')).toHaveLength(1);
 fireEvent.press(view.getByText('Facturas y periodos'));
 expect(view.getAllByText('Saldo a favor')).toHaveLength(1);
 fireEvent.press(view.getByText('Volver')); expect(callbacks.onBack).toHaveBeenCalledTimes(1);
});

it('filters open reviews through the state selector and clears review filtering when another state is selected', async () => {
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByRole('button', { name: 'Filtrar sesiones' }));
 const selector = () => view.UNSAFE_getAllByType(CommissionSelect).find(item => item.props.accessibilityLabel === 'Estado de comisión')!;
 expect(selector().props.options).toContainEqual({ value: 'REVIEW', label: 'Con revisión abierta' });
 expect(view.queryByText('Solo con revisión abierta')).toBeNull();
 act(() => selector().props.onSelect('REVIEW'));
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ state: undefined, review: true, page: 0 })));
 act(() => selector().props.onSelect('ELIGIBLE'));
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ state: 'ELIGIBLE', review: false, page: 0 })));
 fireEvent.press(view.getByText('Limpiar filtros'));
 await waitFor(() => expect(service.sessions).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ state: undefined, review: false, page: 0 })));
});

it('explains automatic attribution review without suggesting a debt or a confirmed rate', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [{ ...row, position: null, baseCents: null, entitledCents: 0, potentialCents: null, exclusion: 'ATTRIBUTION_PENDING', relation: { ...row.relation, origin: 'UNKNOWN', status: 'PENDING', initialCount: null }, settlement: { state: 'REVIEW_PENDING', paymentState: 'PENDING', documentState: 'PENDING', undocumentedCents: 0, documentCount: 0 } }], hasMore: false });
 jest.mocked(service.detail).mockResolvedValue({ ...detail, summary: { ...detail.summary, issueCount: 1 }, issues: [{ id: 'issue', relationId: 'relation', snapshotId: null, status: 'OPEN', resolution: null, openedAutomatically: true, reason: 'Procedencia o equivalencia de identidad pendiente de acreditar. No generar deuda automática.', context: { origin: 'UNKNOWN', status: 'PENDING', initialCount: null, history: { totalSessions: 3, attendedPaidSessions: 0, countedSessions: 0 } } }] });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 expect(view.getByText('Pendiente de revisión por HERA')).toBeTruthy();
 expect(view.getByText('Porcentaje pendiente de confirmar')).toBeTruthy();
 expect(view.queryByText(/Pago pendiente · Factura pendiente/)).toBeNull();
 expect(view.queryByText('20% de base por confirmar')).toBeNull();
 expect(view.getByText('Revisiones · 1 abierta')).toBeTruthy();
 fireEvent.press(view.getByRole('button', { name: 'Ver revisiones' }));
 expect(view.getByText('Abierta automáticamente por HERA')).toBeTruthy();
 expect(view.getByText(/Historial con este especialista: 3 citas registradas · 0 sesiones/)).toBeTruthy();
 expect(view.getByText(/Falta confirmar cómo llegó este paciente/)).toBeTruthy();
 expect(view.getByText(/registrar un cobro o la asistencia no cierra la revisión/)).toBeTruthy();
});

it('does not describe a manually requested review as automatic', async () => {
 jest.mocked(service.detail).mockResolvedValue({ ...detail, issues: [{ id: 'issue', relationId: 'relation', snapshotId: 'snapshot', status: 'RESOLVED', resolution: 'Procedencia confirmada', openedAutomatically: false, reason: 'Revisar mi comisión' }] });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByRole('tab', { name: 'Revisiones y respuestas' }));
 expect(view.getByText('Revisión solicitada manualmente')).toBeTruthy();
 expect(view.getByText('Revisar mi comisión')).toBeTruthy();
 expect(view.getByText('Resolución: Procedencia confirmada')).toBeTruthy();
 expect(view.queryByText('Abierta automáticamente por HERA')).toBeNull();
});

it('selects the current real operator, keeps simulation separate and requires selection for ambiguity', () => {
 const other = { ...account, id: 'other', operatorKey: 'other', acceptances: [] };
 const simulation = { ...account, id: 'simulation', mode: 'SIMULATION' as const };
 expect(initialCommissionAccount({ ...config, accounts: [other, simulation, account] })).toBe('account');
 expect(initialCommissionAccount({ ...config, terms: null, accounts: [other, account] })).toBeUndefined();
 expect(initialCommissionAccount({ ...config, accounts: [simulation, account] })).toBe('account');
});

it('does not replace an invalid explicit account with a valid one; allows recovery', async () => {
 jest.mocked(service.detail).mockRejectedValueOnce(new Error('Cuenta no accesible'));
 const view = render(<ProfessionalCommissionWorkspace {...props()} accountId="invalid" />);
 await view.findByText('Cuenta no accesible');
 expect(service.detail).toHaveBeenCalledWith('invalid', false, 0);
 expect(view.queryByText('Pendiente de cubrir')).toBeNull();
 jest.mocked(service.detail).mockResolvedValue({ ...detail, summary: { ...detail.summary, id: 'invalid' } });
 fireEvent.press(view.getByText('Reintentar cuenta'));
 await view.findByText('Pendiente de cubrir');
});

it('waits for a choice when accounts are ambiguous and opens only the chosen account', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, terms: null, accounts: [account, { ...account, id: 'other', operatorKey: 'other', acceptances: [{ ...acceptance, terms: { ...terms, operatorName: 'Otro titular' } }] }] });
 const callbacks = props(); const view = render(<ProfessionalCommissionWorkspace {...callbacks} />);
 await view.findByText('Elige la cuenta que quieres consultar');
 expect(service.detail).not.toHaveBeenCalled();
 act(() => view.UNSAFE_getByType(CommissionSelect).props.onSelect('other'));
 await waitFor(() => expect(callbacks.onOpen).toHaveBeenCalledWith('other'));
});

it('simulation retains explicit acceptance, errors and account opening', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, mode: 'SIMULATION', accounts: [] });
 jest.mocked(service.accept).mockRejectedValueOnce(new Error('No se pudo aceptar')).mockResolvedValueOnce({ accountId: 'account' });
 const callbacks = props(); const view = render(<ProfessionalCommissionWorkspace {...callbacks} />);
 await view.findByText('Acuerdo completo de prueba');
 expect(view.getByRole('button', { name: 'Aceptar condiciones' })).toBeDisabled();
 fireEvent.press(view.getByRole('checkbox'));
 fireEvent.press(view.getByText('Aceptar condiciones'));
 await view.findByText('No se pudo aceptar');
 fireEvent.press(view.getByText('Aceptar condiciones'));
 await waitFor(() => expect(callbacks.onOpen).toHaveBeenCalledWith('account'));
 await view.findByText('Paciente de prueba');
});

it('keeps previous history accessible with a new agreement, and includes historical reviews', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, terms: { ...terms, id: 'new' } });
 jest.mocked(service.detail).mockResolvedValue({ ...detail, issues: [{ id: 'issue', relationId: null, snapshotId: null, reason: 'Revisión histórica', status: 'RESOLVED', resolution: 'Respuesta de HERA' }] });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 expect(view.getByText('Revisar condiciones')).toBeTruthy();
 fireEvent.press(view.getByRole('tab', { name: 'Revisiones y respuestas' }));
 expect(view.getByText('Revisión histórica')).toBeTruthy();
 expect(view.getByText('Resolución: Respuesta de HERA')).toBeTruthy();
});

it('preserves an activity draft across sections, prevents account changes, and submits to the professional endpoint', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, accounts: [account, { ...account, id: 'simulation', mode: 'SIMULATION' }] });
 jest.mocked(service.decide).mockRejectedValueOnce(new Error('Error de guardado')).mockResolvedValueOnce({ id: 'saved' });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Registrar cobro o asistencia'));
 fireEvent.changeText(view.getByLabelText('Importe recibido del paciente (€)'), '40');
 fireEvent.changeText(view.getByLabelText('Referencia del pago o de la devolución'), 'Referencia sintética');
 fireEvent.press(view.getByText('Pagos y facturas'));
 expect(view.queryByRole('button', { name: 'Cuenta de comisiones' })).toBeNull();
 fireEvent.press(view.getByText('Sesiones y comisiones'));
 expect(view.getByLabelText('Importe recibido del paciente (€)').props.value).toBe('40');
 fireEvent.press(view.getByText('Guardar actividad'));
 await view.findByText('Error de guardado');
 expect(view.getByLabelText('Importe recibido del paciente (€)').props.value).toBe('40');
 fireEvent.press(view.getByText('Guardar actividad'));
 await act(async () => {});
 await waitFor(() => expect(view.queryByText('Guardar actividad')).toBeNull());
 expect(service.decide).toHaveBeenLastCalledWith('account', false, expect.objectContaining({ action: 'COLLECT', grossCents: 4000, reference: 'Referencia sintética' }));
});

it('ignores stale responses after changing accounts and clears data on a failed refresh', async () => {
 let resolveOld: (value: service.AccountDetail) => void = () => {};
 jest.mocked(service.detail).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce({ ...detail, summary: { ...detail.summary, id: 'second', creditCents: 7890 } });
 const callbacks = props(); const view = render(<ProfessionalCommissionWorkspace {...callbacks} accountId="account" />);
 view.rerender(<ProfessionalCommissionWorkspace {...callbacks} accountId="second" />);
 await view.findByText('78,90 €');
 await act(async () => resolveOld(detail));
 expect(view.getByText('78,90 €')).toBeTruthy();
 jest.mocked(service.detail).mockRejectedValueOnce(new Error('Sin conexión'));
 fireEvent.press(view.getByText('Actualizar'));
 await view.findByText('Sin conexión');
 expect(view.queryByText('78,90 €')).toBeNull();
});

it.each(['OFF', 'SIMULATION'] as const)('preserves historical access in %s', async mode => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, mode });
 jest.mocked(service.detail).mockResolvedValue({ ...detail, summary: { ...detail.summary, mode: mode === 'OFF' ? 'LIVE' : mode } });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 expect(view.getByText(mode === 'OFF' ? /nuevas comisiones están desactivadas/ : /Importes de prueba sin deuda/)).toBeTruthy();
});

it('keeps occasional information behind its button and reviews directly accessible', async () => {
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 expect(view.queryByText('Cómo se calculan las comisiones')).toBeNull();
 expect(view.queryByText('Condiciones e historial')).toBeNull();
 fireEvent.press(view.getByText('Información'));
 expect(view.getByRole('button', { name: 'Cómo se calculan las comisiones' })).toBeTruthy();
 fireEvent.press(view.getByText('Condiciones e historial'));
 expect(view.getByText('Acuerdo completo de prueba')).toBeTruthy();
 fireEvent.press(view.getByRole('button', { name: 'Cerrar formulario' }));
 fireEvent.press(view.getByRole('tab', { name: 'Revisiones y respuestas' }));
 expect(view.getByText('Revisiones y respuestas')).toBeTruthy();
});

it('resets pagination when changing sections and uses only the active section continuation flag', async () => {
 jest.mocked(service.detail).mockResolvedValue({ ...detail, hasMore: true, pagination: { payments: true, documents: false, issues: false } });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Pagos y facturas'));
 fireEvent.press(view.getByRole('button', { name: 'Página siguiente' }));
 await waitFor(() => expect(service.detail).toHaveBeenLastCalledWith('account', false, 1));
 fireEvent.press(view.getByRole('tab', { name: 'Revisiones y respuestas' }));
 await waitFor(() => expect(service.detail).toHaveBeenLastCalledWith('account', false, 0));
 expect(view.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
 fireEvent.press(view.getByText('Pagos y facturas'));
 fireEvent.press(view.getByRole('button', { name: 'Página siguiente' }));
 await waitFor(() => expect(service.detail).toHaveBeenLastCalledWith('account', false, 1));
 fireEvent.press(view.getByText('Facturas y periodos'));
 await waitFor(() => expect(service.detail).toHaveBeenLastCalledWith('account', false, 0));
 expect(view.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
});

it('sends the chosen Madrid time for a same-day refund and keeps invalid times out of the API', async () => {
 jest.mocked(service.sessions).mockResolvedValue({ items: [{ ...row, movements: [{ id: 'collection', kind: 'COLLECTION', grossCents: 8000, baseCents: 8000, originalId: null, occurredAt: '2026-09-01T10:15:00Z', reference: 'Cobro de prueba' }] }], hasMore: false });
 jest.mocked(service.decide).mockResolvedValue({ id: 'saved' });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Actualizar sesión'));
 const select = (label: string, value: string) => act(() => view.UNSAFE_getAllByType(CommissionSelect).find(item => item.props.accessibilityLabel === label)!.props.onSelect(value));
 select('Tipo de actividad', 'REFUND');
 select('Cobro original', 'collection');
 act(() => view.UNSAFE_getAllByType(CommissionDateField).find(item => item.props.label === 'Fecha del movimiento')!.props.onChangeText('2026-09-01'));
 fireEvent.changeText(view.getByLabelText('Importe devuelto (€)'), '20');
 fireEvent.changeText(view.getByLabelText('Referencia del pago o de la devolución'), 'Devolución de prueba');
 fireEvent.changeText(view.getByLabelText('Hora del movimiento (Madrid, HH:mm)'), '25:00');
 fireEvent.press(view.getByText('Guardar actividad'));
 await view.findByText('Introduce una fecha y una hora válidas (HH:mm, horario de Madrid).');
 expect(service.decide).not.toHaveBeenCalled();
 fireEvent.changeText(view.getByLabelText('Hora del movimiento (Madrid, HH:mm)'), '13:00');
 fireEvent.press(view.getByText('Guardar actividad'));
 await waitFor(() => expect(service.decide).toHaveBeenCalledWith('account', false, {
  action: 'REFUND', snapshotId: 'snapshot', originalId: 'collection', grossCents: 2000, reference: 'Devolución de prueba', occurredAt: '2026-09-01T11:00:00.000Z',
 }));
 await waitFor(() => expect(view.queryByText('Guardar actividad')).toBeNull());
});

it('offers a prospective termination date and does not submit a past date', async () => {
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Información'));
 fireEvent.press(view.getByText('Condiciones e historial'));
 fireEvent.press(view.getByLabelText(/Aceptadas el/));
 fireEvent.press(view.getByLabelText('Finalizar nuevas comisiones'));
 fireEvent.changeText(view.getByLabelText('Motivo de terminación'), 'Fin del acuerdo');
 const field = view.UNSAFE_getAllByType(CommissionDateField).find(item => item.props.label === 'Dejar de generar nuevas comisiones desde')!;
 expect(new Date(`${field.props.value}T12:00:00Z`).getTime()).toBeGreaterThan(Date.now());
 act(() => field.props.onChangeText('2000-01-01'));
 expect(view.getByText('Terminar nuevas comisiones desde esta fecha')).toBeDisabled();
 expect(service.decide).not.toHaveBeenCalled();
});

it('refreshes sessions after returning from another screen without discarding an open activity', async () => {
 const callbacks = props();
 const view = render(<ProfessionalCommissionWorkspace {...callbacks} />);
 await view.findByText('Paciente de prueba');
 mockFocused = false;
 view.rerender(<ProfessionalCommissionWorkspace {...callbacks} />);
 jest.mocked(service.sessions).mockResolvedValue({ items: [{ ...row, session: { ...row.session, patientName: 'Sesión actualizada' } }], hasMore: false });
 mockFocused = true;
 view.rerender(<ProfessionalCommissionWorkspace {...callbacks} />);
 await view.findByText('Sesión actualizada');
 fireEvent.press(view.getByText('Registrar cobro o asistencia'));
 fireEvent.changeText(view.getByLabelText('Importe recibido del paciente (€)'), '25');
 const reads = jest.mocked(service.sessions).mock.calls.length;
 mockFocused = false;
 view.rerender(<ProfessionalCommissionWorkspace {...callbacks} />);
 mockFocused = true;
 view.rerender(<ProfessionalCommissionWorkspace {...callbacks} />);
 await act(async () => {});
 expect(view.getByLabelText('Importe recibido del paciente (€)').props.value).toBe('25');
 expect(service.sessions).toHaveBeenCalledTimes(reads);
});

it('real commissions link to general terms without a second acceptance', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, mode: 'LIVE', accounts: [] });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Consultar términos generales');
 expect(view.queryByText('Aceptar condiciones')).toBeNull();
 expect(view.queryByRole('checkbox')).toBeNull();
});
