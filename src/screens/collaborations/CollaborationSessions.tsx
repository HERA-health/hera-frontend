import { ReferralPagination } from '../referrals/ReferralControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHeading, WorkflowColumns, WorkflowEmpty, WorkflowNotice, WorkflowBadge, WorkflowDate, WorkflowSelect } from '../referrals/WorkflowUI';
import type { AppNavigationProp } from '../../constants/types';
import { getErrorMessage } from '../../constants/errors';
import * as service from '../../services/collaborationService';
import { getMadridDateKey, formatMadridInstant, parseMadridDateTime } from '../../utils/madridTime';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, dateTime, money, styles } from '../referrals/ReferralElements';
import { type CollaborationRun, toCents } from './CollaborationAgreement';

export const exclusionLabel = (reason: string | null) => reason ? ({
  NO_CURRENT_AGREEMENT_AT_BOOKING: 'No había un acuerdo vigente al reservar', BOOKING_AFTER_TERMINATION: 'Reserva posterior al fin del acuerdo',
  ORIGIN_UNAVAILABLE_AT_BOOKING: 'Origen no habilitado al reservar', ECONOMY_DISABLED_AT_BOOKING: 'Reparto no habilitado al reservar',
  CLINIC_SESSION: 'Cita de clínica excluida', SERVICE_OUTSIDE_SCOPE: 'Servicio fuera del alcance', SERVICE_OUTSIDE_VALIDITY: 'Prestación fuera de vigencia',
  SERVICE_AFTER_TERMINATION: 'Prestación posterior al corte', CANCELLED: 'Cita cancelada', PATIENT_NO_SHOW: 'Ausencia del paciente', FREE_SESSION: 'Sesión gratuita',
  ATTENDANCE_NOT_CONFIRMED: 'Pendiente de confirmar la atención realizada', SERVICE_BASE_NOT_CONFIRMED: 'Pendiente de confirmar la base del servicio',
} as Record<string, string>)[reason] ?? 'Sesión excluida; revisa sus condiciones' : 'Asistencia elegible';

function SessionActions({ session, collaborationId, busy, run, refresh }: { session: service.CollaborationSession; collaborationId: string; busy: boolean; run: CollaborationRun; refresh: () => Promise<void> }) {
  const [mode, setMode] = useState<'COLLECT' | 'REFUND' | 'CORRECT_BASE' | 'ATTENDANCE' | null>(null);
  const [gross, setGross] = useState(''); const [base, setBase] = useState(''); const [serviceBase, setServiceBase] = useState(String((session.baseCents ?? session.bookedPriceCents) / 100)); const [reference, setReference] = useState('');
  const [original, setOriginal] = useState(''); const [outcome, setOutcome] = useState<'ATTENDED' | 'PATIENT_NO_SHOW'>('ATTENDED');
  const [day, setDay] = useState(getMadridDateKey()); const [time, setTime] = useState(formatMadridInstant(new Date(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  const save = async () => {
    const values = { mode, snapshotId: session.id, gross, base, serviceBase, reference, original, outcome, day, time };
    if (await run(values, key => {
      if (!mode || !reference.trim()) throw new Error('Añade una referencia o un motivo.');
      let action: service.FinanceAction;
      if (mode === 'ATTENDANCE') action = { action: mode, snapshotId: session.id, outcome, reason: reference };
      else if (mode === 'CORRECT_BASE') action = { action: mode, snapshotId: session.id, serviceBaseCents: toCents(serviceBase), reason: reference };
      else {
        const instant = parseMadridDateTime(day, time); if (!instant) throw new Error('Revisa la fecha y hora de Madrid.');
        action = mode === 'COLLECT' ? { action: mode, snapshotId: session.id, grossCents: toCents(gross), eligibleBaseCents: toCents(base), serviceBaseCents: toCents(serviceBase), reference, occurredAt: instant.iso }
          : { action: mode, snapshotId: session.id, originalId: original, grossCents: toCents(gross), reference, occurredAt: instant.iso };
      }
      return service.decideFinance(collaborationId, action, key);
    })) { setMode(null); setGross(''); setBase(''); setReference(''); await refresh(); }
  };
  return <><View style={styles.row}>{([['COLLECT', 'Registrar cobro'], ['REFUND', 'Registrar devolución'], ['CORRECT_BASE', 'Corregir base'], ['ATTENDANCE', 'Confirmar asistencia']] as const).map(([value, label]) => <Button key={value} size="small" variant={mode === value ? 'secondary' : 'outline'} disabled={busy} onPress={() => setMode(value)}>{label}</Button>)}</View>
    {mode ? <Card><Text title>{mode === 'COLLECT' ? 'Cobro externo del paciente' : mode === 'REFUND' ? 'Devolución vinculada al cobro original' : mode === 'CORRECT_BASE' ? 'Corrección de la base del servicio' : 'Resultado de la atención'}</Text>
      {mode === 'COLLECT' || mode === 'REFUND' ? <><Field label="Importe recibido o devuelto, incluidos impuestos (€)" keyboardType="decimal-pad" value={gross} onChangeText={setGross} /><WorkflowDate label="Fecha del movimiento (AAAA-MM-DD)" value={day} onChangeText={setDay} disabled={busy} /><Field required label="Hora de Madrid (HH:MM)" placeholder="Ej. 16:30" maxLength={5} value={time} onChangeText={setTime} editable={!busy} /></> : null}
      {mode === 'COLLECT' ? <><Field label="Parte del cobro que corresponde a base, sin impuestos (€)" keyboardType="decimal-pad" value={base} onChangeText={setBase} /><Text>El anticipo queda registrado. Solo libera reparto cuando se confirme la atención realizada.</Text></> : null}
      {mode === 'COLLECT' || mode === 'CORRECT_BASE' ? <Field label="Base total del servicio tras descuentos, excluidos impuestos (€)" keyboardType="decimal-pad" value={serviceBase} onChangeText={setServiceBase} /> : null}
      {mode === 'REFUND' ? <WorkflowSelect label="Cobro original *" value={original} options={[{ value: '', label: 'Selecciona el cobro que devuelves' }, ...session.movements.filter(m => m.kind === 'COLLECTION').map(m => ({ value: m.id, label: `${dateTime(m.occurredAt)} · ${money(m.grossCents)} · ${m.reference}` }))]} onSelect={value => { if (!busy) setOriginal(value); }} /> : null}
      {mode === 'ATTENDANCE' ? <WorkflowSelect label="Resultado de la atención *" value={outcome} options={[{ value: 'ATTENDED', label: 'Atención realizada' }, { value: 'PATIENT_NO_SHOW', label: 'Paciente ausente' }]} onSelect={value => { if (!busy) setOutcome(value); }} /> : null}
      <Field label="Referencia externa o motivo de la corrección" value={reference} onChangeText={setReference} maxLength={2000} multiline /><View style={styles.row}><Button loading={busy} disabled={!reference.trim() || (mode === 'REFUND' && !original)} onPress={() => void save()}>Guardar registro</Button><Button variant="ghost" disabled={busy} onPress={() => setMode(null)}>Cancelar</Button></View>
    </Card> : null}</>;
}

export function CollaborationSessions({ collaboration, busy, run }: { collaboration: service.Collaboration; busy: boolean; run: CollaborationRun }) {
  const navigation = useNavigation<AppNavigationProp>();
  const [page, setPage] = useState(0); const [data, setData] = useState<service.Page<service.CollaborationSession>>({ items: [], hasMore: false }); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const generation = useRef(0);
  const load = useCallback(async () => { const current = ++generation.current; setLoading(true); setError(''); try { const next = await service.listSessions(collaboration.id, page); if (current === generation.current) setData(next); } catch (err) { if (current === generation.current) setError(getErrorMessage(err, 'No se pudieron consultar las sesiones.')); } finally { if (current === generation.current) setLoading(false); } }, [collaboration.id, page]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  return <><WorkflowHeader title="Sesiones y cobros" subtitle="Nuevas reservas de pacientes incorporados al acuerdo." /><WorkflowNotice>Los importes reflejan registros manuales de cobros externos y no una conciliación bancaria.</WorkflowNotice>
    {loading ? <ActivityIndicator accessibilityLabel="Cargando sesiones" /> : null}{error ? <><Text error>{error}</Text><Button onPress={() => void load()}>Reintentar</Button></> : null}
    {!loading && !error && !data.items.length ? <WorkflowEmpty icon="calendar-outline" title="Aún no hay sesiones" description="Las nuevas reservas de pacientes incorporados aparecerán aquí. Podrás consultar su elegibilidad y los importes declarados." /> : null}
    {data.items.map(session => <Card key={session.id}><WorkflowColumns><View style={{ gap: 16 }}><Text title>{dateTime(session.date)} · {session.type === 'VIDEO_CALL' ? 'Online' : 'Presencial'}</Text><Text>Versión {session.versionNumber} · {session.originShareBps / 100}% para A · Precio al reservar: {money(session.bookedPriceCents)}</Text><WorkflowBadge label={exclusionLabel(session.exclusionReason)} /><Text>Base del servicio: {session.baseCents === null ? 'pendiente de confirmar' : money(session.baseCents)} · Cobro neto registrado: {money(session.netCollectedCents)} · Parte de A: {money(session.originAmountCents)}</Text><Button variant="ghost" onPress={() => navigation.navigate('Referrals', { id: session.referralId })}>Ver incorporación autorizada</Button>
      {session.movements.map(m => <Text key={m.id}>{dateTime(m.occurredAt)} · {m.kind === 'COLLECTION' ? 'Cobro' : m.kind === 'REFUND' ? 'Devolución' : 'Corrección de base'} · {money(m.grossCents)} · Base {money(m.baseCents)} · {m.reference}</Text>)}
      </View><View style={{ gap: 16 }}><WorkflowHeading icon="receipt-outline" title="Registros de la sesión" subtitle={collaboration.role === 'RECIPIENT' ? 'Declara solo operaciones ya realizadas. Todos los campos del registro son obligatorios.' : 'El receptor registra los cobros y confirma la atención.'} />{collaboration.role === 'RECIPIENT' ? <SessionActions session={session} collaborationId={collaboration.id} busy={busy} run={run} refresh={load} /> : null}</View></WorkflowColumns>
    </Card>)}{!error && (data.items.length > 0 || page > 0) ? <ReferralPagination page={page} hasMore={data.hasMore} loading={loading || busy} onChange={setPage} /> : null}</>;
}
