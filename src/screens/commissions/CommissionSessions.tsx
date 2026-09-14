import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { ReferralPagination } from '../referrals/ReferralControls';
import * as service from '../../services/heraCommissionService';
import { Card, Text, Field, Button, WorkflowDate, WorkflowHint, cents, day, getMadridDateKey, dateTime, money, styles, Run, exclusionLabels } from './CommissionElements';
import { getErrorMessage } from '../../constants/errors';

function SessionForm({ row, run, admin, onDone, busy }: { row: service.CommissionSession; run: Run; admin: boolean; onDone: () => void; busy: boolean }) {
 const [action, setAction] = useState('COLLECT'); const [gross, setGross] = useState('');
 const [serviceBase, setServiceBase] = useState(row.baseCents === null ? '' : String(row.baseCents / 100)); const [tax, setTax] = useState(row.serviceTaxCents === null ? '' : String(row.serviceTaxCents / 100));
 const [reference, setReference] = useState(''); const [date, setDate] = useState(getMadridDateKey()); const [original, setOriginal] = useState(''); const [outcome, setOutcome] = useState<'ATTENDED' | 'PATIENT_NO_SHOW' | 'UNCONFIRMED'>('ATTENDED');
 const save = async () => {
  if (await run(async () => {
   let input: service.Action;
   if (action === 'ATTENDANCE') input = { action, snapshotId: row.id, outcome, reason: reference };
   else if (action === 'REVIEW') input = { action, relationId: row.relationId, snapshotId: row.id, reason: reference };
   else if (action === 'REFUND') input = { action, snapshotId: row.id, originalId: original, grossCents: cents(gross), reference, occurredAt: day(date) };
   else if (action === 'CORRECT_BASE') input = { action, snapshotId: row.id, baseCents: cents(serviceBase), taxCents: cents(tax), reason: reference };
   else input = { action: 'COLLECT', snapshotId: row.id, grossCents: cents(gross), serviceBaseCents: cents(serviceBase), serviceTaxCents: cents(tax), reference, occurredAt: day(date) };
   await service.decide(row.accountId, false, input);
  })) onDone();
 };
 return <Card><Text title>Registrar actividad</Text><SimpleDropdown accessibilityLabel="Tipo de actividad" options={admin ? [] : [{ value: 'COLLECT', label: 'Registrar cobro externo' }, { value: 'ATTENDANCE', label: 'Confirmar o corregir asistencia' }, { value: 'REFUND', label: 'Registrar devolución al paciente' }, { value: 'CORRECT_BASE', label: 'Corregir base e impuestos' }, { value: 'REVIEW', label: 'Solicitar revisión' }]} value={action} onSelect={setAction} />
 {action === 'ATTENDANCE' ? <SimpleDropdown accessibilityLabel="Asistencia" options={[{ value: 'ATTENDED', label: 'Atendida' }, { value: 'PATIENT_NO_SHOW', label: 'El paciente no asistió' }, { value: 'UNCONFIRMED', label: 'Anular confirmación incorrecta' }]} value={outcome} onSelect={v => { if (v === 'ATTENDED' || v === 'PATIENT_NO_SHOW' || v === 'UNCONFIRMED') setOutcome(v); }} /> : null}
 {action === 'COLLECT' || action === 'CORRECT_BASE' ? <><Field label="Base del servicio después de descuentos (€)" value={serviceBase} onChangeText={setServiceBase} keyboardType="decimal-pad" /><Field label="Impuestos del servicio (€)" value={tax} onChangeText={setTax} keyboardType="decimal-pad" /></> : null}
 {action === 'COLLECT' || action === 'REFUND' ? <><Field label={action === 'COLLECT' ? 'Importe bruto recibido (€)' : 'Importe devuelto (€)'} value={gross} onChangeText={setGross} keyboardType="decimal-pad" />{action === 'COLLECT' ? <WorkflowHint>La base elegible se calcula proporcionalmente a partir del importe recibido y del desglose del servicio, con redondeo acumulativo.</WorkflowHint> : <SimpleDropdown accessibilityLabel="Cobro original" options={row.movements.filter(m => m.kind === 'COLLECTION').map(m => ({ value: m.id, label: `${dateTime(m.occurredAt)} · ${money(m.grossCents)}` }))} value={original} onSelect={setOriginal} />}<WorkflowDate label="Fecha del movimiento (AAAA-MM-DD)" value={date} onChangeText={setDate} /></> : null}
 <Field label={action === 'COLLECT' || action === 'REFUND' ? 'Referencia del cobro externo' : 'Motivo administrativo (sin información clínica)'} value={reference} onChangeText={setReference} multiline />
 <WorkflowHint>El registro de un cobro externo por el profesional no implica verificación bancaria de HERA.</WorkflowHint><View style={styles.row}><Button disabled={busy} onPress={() => void save()}>Guardar actividad</Button><Button variant="ghost" disabled={busy} onPress={onDone}>Cerrar</Button></View></Card>;
}
export function CommissionSessions({ accountId, admin, clientId, run, busy, refresh }: { accountId: string; admin: boolean; clientId?: string; run: Run; busy: boolean; refresh: number }) {
 const [page, setPage] = useState(0); const [month, setMonth] = useState(''); const [patientId, setPatientId] = useState(clientId ?? ''); const [state, setState] = useState('ALL'); const [review, setReview] = useState(false);
 const [data, setData] = useState<service.Page<service.CommissionSession>>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [selected, setSelected] = useState<string>(); const generation = useRef(0);
 const load = useCallback(async () => { const g = ++generation.current; setLoading(true); setError(''); try { const result = await service.sessions(accountId, admin, { page, month: month || undefined, clientId: patientId || undefined, state: state === 'ALL' ? undefined : state, review }); if (g === generation.current) setData(result); } catch(e) { if (g === generation.current) setError(getErrorMessage(e, 'No se pudo cargar el desglose.')); } finally { if (g === generation.current) setLoading(false); } }, [accountId, admin, page, month, patientId, state, review, refresh]);
 useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
 return <><Card><Text title>Sesiones y cobros externos</Text><Field label="Periodo de reconocimiento (AAAA-MM, opcional)" value={month} onChangeText={v => { setMonth(v); setPage(0); }} /><Field label="Referencia del paciente (opcional)" value={patientId} onChangeText={v => { setPatientId(v); setPage(0); }} /><SimpleDropdown accessibilityLabel="Estado de comisión" options={[{ value: 'ALL', label: 'Todas las sesiones' }, { value: 'ELIGIBLE', label: 'Elegibles' }, { value: 'PENDING', label: 'Pendientes o excluidas' }]} value={state} onSelect={v => { setState(v); setPage(0); }} /><Button variant="ghost" onPress={() => { setReview(v => !v); setPage(0); }}>{review ? 'Mostrar todas' : 'Solo con revisión abierta'}</Button></Card>
 {loading ? <ActivityIndicator accessibilityLabel="Cargando sesiones" /> : null}{error ? <><Text error>{error}</Text><Button onPress={() => void load()}>Reintentar desglose</Button></> : null}
 {data?.items.map(row => <Card key={row.id}><Text title>{dateTime(row.session.date)}</Text><Text>Paciente · {row.session.clientId}</Text><Text>{row.position ? `${row.position}.ª sesión` : 'Posición estimada'} · {row.rateBps / 100}% sobre la base</Text><Text>Base: {row.baseCents === null ? 'Pendiente de confirmar' : money(row.baseCents)} · Potencial: {row.potentialCents === null ? 'Pendiente de base' : money(row.potentialCents)} · Devengado: {money(row.entitledCents)}</Text>
 <WorkflowHint>{row.exclusion ? exclusionLabels[row.exclusion] ?? row.exclusion : 'Asistencia y cobro externo respaldan este importe.'} Las confirmaciones de sesiones anteriores pueden modificar el orden.</WorkflowHint>
 {row.movements.map(m => <Text key={m.id}>{m.kind === 'REFUND' ? 'Devolución' : 'Cobro externo registrado por el profesional'} · {money(m.grossCents)} · {dateTime(m.occurredAt)} · {m.reference}</Text>)}
 {row.revisions.map(r => <WorkflowHint key={r.id}>{r.reason}: {r.beforePosition ?? 'estimada'} → {r.position ?? 'sin posición'} · {r.beforeBps / 100}% → {r.rateBps / 100}% · Diferencia {money(r.deltaCents)}</WorkflowHint>)}
 {!admin ? selected === row.id ? <SessionForm row={row} run={run} admin={admin} busy={busy} onDone={() => setSelected(undefined)} /> : <Button variant="outline" disabled={busy} onPress={() => setSelected(row.id)}>Registrar actividad o solicitar revisión</Button> : null}</Card>)}
 {data && !data.items.length && !loading ? <Text>No hay sesiones con estos filtros.</Text> : null}<ReferralPagination page={page} hasMore={data?.hasMore ?? false} loading={loading || busy} onChange={setPage} /></>;
}
