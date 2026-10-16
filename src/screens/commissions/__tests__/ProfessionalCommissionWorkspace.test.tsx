import React from 'react';
import { CommissionMonthWorkspace } from '../CommissionMonthWorkspace';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalCommissionWorkspace, initialCommissionAccount } from '../ProfessionalCommissionWorkspace';
import { CommissionSelect, CommissionDateField } from '../CommissionFields';
import * as service from '../../../services/heraCommissionService';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: (effect: React.EffectCallback) => require('react').useEffect(() => mockFocused ? effect() : undefined, [effect, mockFocused]) }));
jest.mock('../../../services/heraCommissionService', () => ({ configuration: jest.fn(), detail: jest.fn(), sessions: jest.fn(), accept: jest.fn(), decide: jest.fn(), period: jest.fn(), fiscal: jest.fn(), download: jest.fn(), month: jest.fn(), statement: jest.fn(), decisionPreview: jest.fn() }));
jest.mock('../../../services/professionalService', () => ({ getProfessionalSessionDetail: jest.fn() }));
const terms: service.Terms = { id: 'terms', operatorKey: 'operator', operatorName: 'Titular de prueba', mode: 'LIVE', contractText: 'Acuerdo completo de prueba', fiscalTreatment: 'Texto fiscal de prueba', operatorTaxId: '', operatorAddress: '', beneficiary: '', iban: '', effectiveAt: '2026-01-01' };
const acceptance: service.Acceptance = { id: 'acceptance', termsId: terms.id, terms, acceptedAt: '2026-01-01', terminatedAt: null };
const account: service.Configuration['accounts'][number] = { id: 'account', mode: 'LIVE', operatorKey: terms.operatorKey, acceptances: [acceptance] };
const config: service.Configuration = { mode: 'LIVE', terms, canAccept: true, accounts: [account], scale: [2000, 1000, 1000, 500] };
const detail: service.AccountDetail = { summary: { id: 'account', specialistId: 'specialist', specialistName: 'No repetir nombre', operatorKey: 'operator', mode: 'LIVE', revision: 1, estimatedCents: 900, accruedCents: 1600, undocumentedCents: 1600, documentedCents: 0, pendingCents: 1600, paymentPendingCents: 1000, receivedCents: 600, creditCents: 300, overdueCents: 0, issueCount: 0 }, acceptances: [acceptance], specialistFiscal: { fiscalName: null, fiscalNif: null, fiscalAddress: null }, periods: [], documents: [], cash: [], issues: [], hasMore: false };
const row: service.CommissionSession = { id: 'snapshot', sessionId: 'session', accountId: 'account', relationId: 'relation', position: 1, rateBps: 2000, bookedGrossCents: 8000, baseCents: 8000, serviceTaxCents: 0, potentialCents: 1600, entitledCents: 1600, exclusion: null, revision: 1, session: { date: '2026-09-01T12:00:00Z', clientId: 'patient', patientName: 'Paciente de prueba', attendanceOutcome: 'ATTENDED', status: 'COMPLETED' }, relation: { id: 'relation', origin: 'HERA_DIRECTORY', status: 'CONFIRMED', initialCount: 0 }, movements: [], revisions: [], settlement: { state: 'PAID', paymentState: 'PAID', documentState: 'PENDING', undocumentedCents: 1600, documentCount: 0 } };
const monthSummary: service.MonthSummary = {accountId:'account',month:'2026-09',revision:1,period:{id:'period',month:'2026-09',status:'OPEN',revision:1,closedAt:null,baseCents:1600},originalCents:1600,cancellationCents:0,adjustmentCents:0,netCents:1600,payableCents:1600,appliedCents:1500,pendingCents:100,paymentState:'PARTIAL',creditCents:0,creditScope:'ACCOUNT',countedSessions:1,excludedSessions:0,unknownSessions:0,patientCount:1,tiers:[{rateBps:2000,count:1}],issues:[],issuesHasMore:false,documents:[]};
const props = () => ({ onOpen: jest.fn(), onBack: jest.fn() });
it('separates invoices, payments and read-only history in the administrator account', async () => {
 const period: service.Period = { id: 'august', month: '2026-08', revision: 1, status: 'CLOSED', closedAt: '2026-09-01', baseCents: 1600 };
 jest.mocked(service.period).mockResolvedValue({ period, items: [], hasMore: false });
 const view = render(<CommissionMonthWorkspace data={{ ...detail, periods: [period] }} admin refresh={0} onChanged={jest.fn()} initialMonth="2026-09"/>);
 await view.findByText('Paciente · relation');
 fireEvent.press(view.getByRole('button', { name: 'Facturas' }));
 expect(view.getByText('Facturas y rectificaciones de toda la cuenta.')).toBeTruthy();
 expect(view.queryByText('Gestionar saldo a favor')).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Cerrar formulario' }));
 fireEvent.press(view.getByRole('button', { name: 'Pagos y saldo a favor' }));
 expect(view.getByText('Registrar ingreso')).toBeTruthy();
 expect(view.getByText('Gestionar saldo a favor')).toBeTruthy();
 expect(view.queryByLabelText('Importe de crédito (€)')).toBeNull();
 expect(view.queryByText('Añadir factura o ajuste')).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Cerrar formulario' }));
 fireEvent.press(view.getByRole('button', { name: 'Histórico' }));
 expect(view.getByText('Meses y revisiones de esta cuenta.')).toBeTruthy();
 expect(view.queryByText('Registrar ingreso')).toBeNull();
 expect(view.queryByLabelText('Motivo de la corrección')).toBeNull();
 fireEvent.press(view.getByLabelText('Desglose de agosto de 2026'));
 await view.findByText('Este periodo no tiene líneas en esta página.');
 expect(service.period).toHaveBeenCalledWith('account', true, 'august', 0);
 await act(async () => { fireEvent.press(view.getByRole('button', { name: 'Ver mes' })); });
 expect(service.month).toHaveBeenLastCalledWith('account', true, '2026-08');
 expect(view.queryByText('Historial de la cuenta')).toBeNull();
});
beforeEach(() => {
 mockFocused = true;
 jest.resetAllMocks();
 jest.mocked(service.configuration).mockResolvedValue(config);
 jest.mocked(service.detail).mockResolvedValue(detail);
 jest.mocked(service.month).mockResolvedValue(monthSummary);
 jest.mocked(service.decide).mockResolvedValue({id:'saved'});
 jest.mocked(service.sessions).mockResolvedValue({ items: [row], hasMore: false });
});

it('selects the current real operator, keeps simulation separate and requires selection for ambiguity', () => {
 const other = { ...account, id: 'other', operatorKey: 'other', acceptances: [] };
 const simulation = { ...account, id: 'simulation', mode: 'SIMULATION' as const };
 expect(initialCommissionAccount({ ...config, accounts: [other, simulation, account] })).toBe('account');
 expect(initialCommissionAccount({ ...config, terms: null, accounts: [other, account] })).toBeUndefined();
 expect(initialCommissionAccount({ ...config, accounts: [simulation, account] })).toBe('account');
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


it('real commissions link to general terms without a second acceptance', async () => {
 jest.mocked(service.configuration).mockResolvedValue({ ...config, mode: 'LIVE', accounts: [] });
 const view = render(<ProfessionalCommissionWorkspace {...props()} />);
 await view.findByText('Consultar términos generales');
 expect(view.queryByText('Aceptar condiciones')).toBeNull();
 expect(view.queryByRole('checkbox')).toBeNull();
});

it('loads the same month for summary and rows, preserving the patient scope',async()=>{
 const view=render(<ProfessionalCommissionWorkspace {...props()} clientId="patient"/>);await view.findByText('Paciente de prueba');
 expect(service.sessions).toHaveBeenCalledWith('account',false,expect.objectContaining({month:expect.any(String),clientId:'patient'}));
 expect(service.month).toHaveBeenCalledWith('account',false,jest.mocked(service.sessions).mock.calls[0][2].month);
 expect(view.getByText('Pago parcial')).toBeTruthy();expect(view.queryByText('Registrar cobro o asistencia')).toBeNull();
});
it('requires a reason, retains a failed request and sends the professional cancellation command',async()=>{
 jest.mocked(service.decide).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({id:'saved'});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Ver detalle'));fireEvent.press(view.getByText('Solicitar anulación'));
 expect(view.getByText('Enviar solicitud de anulación')).toBeDisabled();
 fireEvent.changeText(view.getByLabelText('Motivo de la solicitud'),'Impago de la sesión');
 fireEvent.press(view.getByText('Enviar solicitud de anulación'));await view.findByText('Sin conexión');
 expect(view.getByLabelText('Motivo de la solicitud').props.value).toBe('Impago de la sesión');
 fireEvent.press(view.getByText('Enviar solicitud de anulación'));
 await waitFor(()=>expect(service.decide).toHaveBeenLastCalledWith('account',false,{action:'REQUEST_CANCELLATION',snapshotId:'snapshot',reason:'Impago de la sesión'}));
 await waitFor(()=>expect(view.queryByLabelText('Motivo de la solicitud')).toBeNull());
});
it('shows pending and rejected decisions separately and permits a new request after rejection',async()=>{
 const issue:service.MonthlyIssue={id:'issue',kind:'COMMISSION_CANCELLATION',snapshotId:'snapshot',reason:'Solicitud de prueba',status:'OPEN',decision:null,resolution:null,createdAt:'2026-09-02',resolvedAt:null};
 jest.mocked(service.month).mockResolvedValue({...monthSummary,issues:[issue]});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');fireEvent.press(view.getByText('Ver detalle'));
 expect(view.queryByText('Solicitar anulación')).toBeNull();view.unmount();
 jest.mocked(service.month).mockResolvedValue({...monthSummary,issues:[{...issue,status:'RESOLVED',decision:'REJECTED',resolution:'La obligación se mantiene'}]});
 const second=render(<ProfessionalCommissionWorkspace {...props()}/>);await second.findByText('Paciente de prueba');fireEvent.press(second.getByText('Ver detalle'));
 expect(second.getByText('Solicitar anulación')).toBeTruthy();expect(second.getByText('Respuesta de HERA: La obligación se mantiene')).toBeTruthy();
});
it('unknown economics never display a confirmed rate or a fabricated zero payment',async()=>{
 jest.mocked(service.month).mockResolvedValue({...monthSummary,payableCents:null,pendingCents:null,paymentState:'REVIEW',unknownSessions:1});
 jest.mocked(service.sessions).mockResolvedValue({items:[{...row,baseCents:null,potentialCents:null,position:null,exclusion:'ATTRIBUTION_PENDING'}],hasMore:false});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 expect(view.getByText(/Base y porcentaje pendientes de confirmar/)).toBeTruthy();expect(view.queryByText(/80,00.*20%/)).toBeNull();expect(view.getAllByText('Por calcular').length).toBeGreaterThan(0);
});
it('clears stale monthly amounts on failure and allows reload',async()=>{
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 jest.mocked(service.month).mockRejectedValueOnce(new Error('Mes no disponible'));fireEvent.press(view.getByText('Actualizar'));
 await view.findByText('Mes no disponible');expect(view.queryByText('Paciente de prueba')).toBeNull();
 fireEvent.press(view.getByText('Recargar mes'));await view.findByText('Paciente de prueba');
});
it('keeps an invalid explicit account scoped instead of replacing it',async()=>{
 jest.mocked(service.detail).mockRejectedValue(new Error('Cuenta no accesible'));
 const view=render(<ProfessionalCommissionWorkspace {...props()} accountId="invalid"/>);await view.findByText('Cuenta no accesible');
 expect(service.detail).toHaveBeenCalledWith('invalid',false,0);expect(service.month).not.toHaveBeenCalled();
});
it.each(['OFF','SIMULATION'] as const)('preserves history in %s',async mode=>{
 jest.mocked(service.configuration).mockResolvedValue({...config,mode});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');expect(service.month).toHaveBeenCalled();
});

it('admin must preview and submit the reviewed revisions and an explicit decision',async()=>{
 const issue:service.MonthlyIssue={id:'issue',kind:'COMMISSION_CANCELLATION',snapshotId:'snapshot',reason:'Impago de prueba',status:'OPEN',decision:null,resolution:null,createdAt:'2026-09-02',resolvedAt:null};
 jest.mocked(service.month).mockResolvedValue({...monthSummary,issues:[issue]});
 jest.mocked(service.decisionPreview).mockResolvedValue({issueId:'issue',kind:'COMMISSION_CANCELLATION',status:'OPEN',revision:7,snapshotRevision:3,snapshotId:'snapshot',patientReference:'opaque',sessionDate:row.session.date,position:1,baseCents:8000,rateBps:2000,commissionCents:1600,reason:issue.reason,creditReleasedCents:1500,totalAdjustmentCents:-1600,adjustments:[{snapshotId:'snapshot',period:'2026-09',deltaCents:-1600}],periodEffect:'REDUCE_OPEN_PERIOD',rectificationRequired:false,message:'Se conserva la posición.'});
 const changed=jest.fn();const view=render(<CommissionMonthWorkspace data={detail} admin refresh={0} onChanged={changed} initialMonth="2026-09"/>);
 await view.findByText('Revisar incidencias del mes');fireEvent.press(view.getByText('Revisar incidencias del mes'));fireEvent.press(view.getByText('Revisar efecto y decidir'));
 await view.findByText('Aprobar solicitud');expect(view.getByText('Aprobar solicitud')).toBeDisabled();
 fireEvent.changeText(view.getByLabelText('Motivo de la decisión'),'Renuncia aprobada');fireEvent.press(view.getByText('Aprobar solicitud'));
 await waitFor(()=>expect(service.decide).toHaveBeenCalledWith('account',true,{action:'DECIDE_CANCELLATION',issueId:'issue',decision:'APPROVED',reason:'Renuncia aprobada',revision:7,snapshotRevision:3}));
 await waitFor(()=>expect(changed).toHaveBeenCalled());expect(service.month).toHaveBeenCalledWith('account',true,'2026-09');
});

it('loads the next history page and returns to the first without leaving a loading panel',async()=>{
 const view=render(<CommissionMonthWorkspace data={{...detail,hasMore:true}} admin={false} refresh={0} onChanged={jest.fn()}/>);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Histórico'));
 fireEvent.press(view.getAllByLabelText('Página siguiente').at(-1)!);
 await view.findByText('Página 2');
 expect(view.queryByLabelText('Cargando histórico')).toBeNull();
 expect(service.detail).toHaveBeenCalledWith('account',false,1);
 fireEvent.press(view.getAllByLabelText('Página anterior').at(-1)!);
 await waitFor(()=>expect(view.queryByText('Página 2')).toBeNull());
 expect(view.queryByLabelText('Cargando histórico')).toBeNull();
});

it('shows the factual before/after and explanation before an admin rejects a correction',async()=>{
 const issue:service.MonthlyIssue={id:'correction',kind:'SESSION_CORRECTION',snapshotId:'snapshot',reason:'Asistencia registrada por error',status:'OPEN',decision:null,resolution:null,createdAt:'2026-09-02',resolvedAt:null};
 jest.mocked(service.month).mockResolvedValue({...monthSummary,issues:[issue]});
 jest.mocked(service.decisionPreview).mockResolvedValue({issueId:issue.id,kind:issue.kind,status:'OPEN',revision:8,snapshotRevision:4,snapshotId:'snapshot',patientReference:'opaque',sessionDate:row.session.date,position:1,baseCents:8000,rateBps:2000,commissionCents:1600,reason:issue.reason,recognized:{attendance:'ATTENDED',baseCents:8000,taxCents:0},proposal:{attendance:'NOT_ATTENDED',baseCents:6000,taxCents:1260},creditReleasedCents:0,totalAdjustmentCents:-1600,adjustments:[],periodEffect:'REDUCE_OPEN_PERIOD',rectificationRequired:false,message:'Se recalculará la secuencia.'});
 const view=render(<CommissionMonthWorkspace data={detail} admin refresh={0} onChanged={jest.fn()} initialMonth="2026-09"/>);
 await view.findByText('Revisar incidencias del mes');fireEvent.press(view.getByText('Revisar incidencias del mes'));fireEvent.press(view.getByText('Revisar efecto y decidir'));
 await view.findByText('Cambio solicitado');
 expect(view.getByText('Motivo: Asistencia registrada por error')).toBeTruthy();
 expect(view.getByText('Asistencia: Realizada → No realizada')).toBeTruthy();
 expect(view.getByText(/Base del servicio: 80,00.*→ 60,00/)).toBeTruthy();
 expect(view.getByText(/Impuestos del servicio: 0,00.*→ 12,60/)).toBeTruthy();
 fireEvent.changeText(view.getByLabelText('Motivo de la decisión'),'Se mantiene la información confirmada');fireEvent.press(view.getByText('Rechazar solicitud'));
 await waitFor(()=>expect(service.decide).toHaveBeenCalledWith('account',true,{action:'DECIDE_SESSION_CORRECTION',issueId:'correction',decision:'REJECTED',reason:'Se mantiene la información confirmada',revision:8,snapshotRevision:4}));
});

it('shows future appointments without hiding accrued amounts or inventing a review',async()=>{
 jest.mocked(service.month).mockResolvedValue({...monthSummary,pendingSessions:1,unknownSessions:0});
 jest.mocked(service.sessions).mockResolvedValue({items:[{...row,position:null,potentialCents:null,entitledCents:0,session:{...row.session,status:'CONFIRMED'},exclusion:'ATTENDANCE_NOT_CONFIRMED'}],hasMore:false});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 expect(view.getByText('Sin devengar')).toBeTruthy();expect(view.getByText(/Todavía no genera comisión/)).toBeTruthy();
 expect(view.queryByText('Pendiente de revisión por HERA')).toBeNull();expect(view.queryByText('Por calcular')).toBeNull();
});

it('keeps paid status visible with a cancellation request and labels resolved attribution correctly',async()=>{
 const issue:service.MonthlyIssue={id:'issue',kind:'COMMISSION_CANCELLATION',snapshotId:'snapshot',reason:'Solicitud',status:'OPEN',decision:null,resolution:null,createdAt:'2026-09-02',resolvedAt:null};
 jest.mocked(service.month).mockResolvedValue({...monthSummary,issues:[issue,{...issue,id:'origin',kind:'ATTRIBUTION',status:'RESOLVED',resolution:'Procedencia confirmada'}]});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 expect(view.getByText(/Pagado · Sin factura de comisión/)).toBeTruthy();
 expect(view.getByText(/Solicitud pendiente · El importe se mantiene/)).toBeTruthy();
 fireEvent.press(view.getByText('Ver detalle'));expect(view.getByText(/Revisión · Resuelta/)).toBeTruthy();
});

it('opens activity for the selected session directly and explains its original accrual policy',async()=>{
 jest.mocked(service.sessions).mockResolvedValue({items:[{...row,accrualPolicy:'COMPLETION_V1'}],hasMore:false});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Ver detalle'));fireEvent.press(view.getByText('Corregir actividad registrada'));
 expect(service.sessions).toHaveBeenCalledTimes(1);
 const selector=view.UNSAFE_getAllByType(CommissionSelect).find(s=>s.props.accessibilityLabel==='Tipo de actividad');
 act(()=>selector!.props.onSelect('COLLECT'));
 expect(view.getByText(/El cobro del paciente no cambia la comisión/)).toBeTruthy();
 expect(view.queryByText(/se genera la parte proporcional/)).toBeNull();
});

it('explains who resolves an attribution review without presenting it as an attendance correction', async () => {
 jest.mocked(service.sessions).mockResolvedValue({items:[{...row,potentialCents:null,entitledCents:0,position:null,exclusion:'ATTRIBUTION_PENDING'}],hasMore:false});
 const view=render(<ProfessionalCommissionWorkspace {...props()}/>);
 await view.findByText('Paciente de prueba');
 fireEvent.press(view.getByText('Ver detalle'));
 expect(view.getByText('HERA debe comprobar las sesiones anteriores de este paciente para confirmar el porcentaje.')).toBeTruthy();
 expect(view.getByText('La revisión la resuelve el equipo de HERA. Corregir la asistencia o registrar un cobro no la cierra.')).toBeTruthy();
 expect(view.getByText('Importe pendiente de calcular')).toBeTruthy();
 expect(view.queryByText('Cómo se calcula')).toBeNull();
 expect(view.queryByText('Solicitar anulación')).toBeNull();
});

it('shows one loading structure while refreshing the account and month together', async () => {
 const view = render(<ProfessionalCommissionWorkspace {...props()}/>);
 await view.findByText('Paciente de prueba');
 let finishDetail!: (value: service.AccountDetail) => void;
 let finishMonth!: (value: service.MonthSummary) => void;
 jest.mocked(service.detail).mockImplementationOnce(() => new Promise(resolve => { finishDetail = resolve; }));
 jest.mocked(service.month).mockImplementationOnce(() => new Promise(resolve => { finishMonth = resolve; }));
 fireEvent.press(view.getByText('Actualizar'));
 await view.findByLabelText('Cargando mes de comisiones');
 expect(view.getAllByRole('progressbar')).toHaveLength(1);
 expect(view.queryByText('Paciente de prueba')).toBeNull();
 await act(async () => { finishDetail(detail); finishMonth(monthSummary); });
 await view.findByText('Paciente de prueba');
 expect(view.queryByRole('progressbar')).toBeNull();
});
