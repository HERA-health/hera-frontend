import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import * as service from '../../services/heraCommissionService';
import { Button, Check, CommissionDisclosure, Field, Text, WorkflowDate, WorkflowHint, cents, day, dateTime, getMadridDateKey, money, exclusionLabels, type Run } from './CommissionElements';
import { CommissionSelect } from './CommissionFields';
import { CommissionMetrics, LedgerTitle } from './CommissionLedgerUI';

export const awaitingCompletion = (row: service.CommissionSession) => row.position === null && ['CONFIRMED', 'PENDING'].includes(row.session.status);
const amount = (value: number | null) => value === null ? 'Por calcular' : money(value);

export function CommissionMonthReceipt({ accountId, periodId, summary, busy, run }: {
  accountId: string;
  periodId: string;
  summary: service.MonthSummary;
  busy: boolean;
  run: Run;
}) {
  const [received, setReceived] = useState(summary.pendingCents ? String(summary.pendingCents / 100) : '');
  const [date, setDate] = useState(getMadridDateKey);
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'BIZUM'>('BANK_TRANSFER');
  const [confirmed, setConfirmed] = useState(false);
  const [allowCredit, setAllowCredit] = useState(false);
  return <View style={{ gap: 16 }}>
    <WorkflowHint>El ingreso se aplicará a las comisiones de este periodo. Pendiente: {amount(summary.pendingCents)}.</WorkflowHint>
    <Field label="Importe recibido (€)" keyboardType="decimal-pad" value={received} onChangeText={setReceived} />
    <WorkflowDate label="Fecha de recepción" value={date} onChangeText={setDate} />
    <Field label="Referencia del ingreso" value={reference} onChangeText={setReference} maxLength={2000} />
    <CommissionSelect accessibilityLabel="Medio" value={method} onSelect={setMethod} options={[
      { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
      { value: 'BIZUM', label: 'Bizum' },
    ]} />
    <Check checked={confirmed} onChange={setConfirmed} label="Confirmo que HERA ha recibido este dinero" />
    <Check checked={allowCredit} onChange={setAllowCredit} label="Conservar un posible exceso como crédito sin aplicar" />
    <Button disabled={busy || !confirmed || !received || reference.trim().length < 3}
      onPress={() => void run(() => service.decide(accountId, true, {
        action: 'RECEIVE_PERIOD', periodId, revision: summary.revision,
        amountCents: cents(received), occurredAt: day(date), method, reference,
        confirmed: true, allowUnapplied: allowCredit,
      }))}>Guardar ingreso y aplicación</Button>
  </View>;
}

export function CommissionSessionDetail({ row, admin, issues, busy, run, onActivity, children }: {
  row: service.CommissionSession;
  admin: boolean;
  issues: service.MonthlyIssue[];
  busy: boolean;
  run: Run;
  onActivity: () => void;
  children: React.ReactNode;
}) {
  const [requesting, setRequesting] = useState(false);
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const base = row.recognizedBaseCents ?? row.baseCents;
  const awaiting = awaitingCompletion(row);
  const attributionPending = !awaiting && row.exclusion === 'ATTRIBUTION_PENDING';
  const canRequest = !admin && !row.cancellationIssueId && row.entitledCents > 0
    && !issues.some(issue => issue.kind === 'COMMISSION_CANCELLATION' && issue.status === 'OPEN');
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 6 }}>
      <LedgerTitle>{admin ? `Referencia de paciente ${row.relation.patientReference ?? row.relationId}` : row.session.patientName ?? 'Paciente'}</LedgerTitle>
      <Text>{dateTime(row.session.date)}</Text>
    </View>
    <View style={{ backgroundColor: attributionPending ? theme.status.pending.bg : theme.bgMuted, borderWidth: 1, borderColor: attributionPending ? theme.status.pending.border : theme.border, borderRadius: 14, padding: 18, gap: 8 }}>
      <LedgerTitle>{awaiting ? 'Sesión pendiente de realizar' : attributionPending ? 'Pendiente de revisión por HERA' : row.potentialCents === null ? 'Comisión por calcular' : row.cancellationIssueId ? 'Comisión anulada' : row.position === null ? 'Sesión sin comisión' : 'Comisión de la sesión'}</LedgerTitle>
      {attributionPending ? <>
        <Text>{row.relation.origin === 'HERA_DIRECTORY' ? 'HERA debe comprobar las sesiones anteriores de este paciente para confirmar el porcentaje.' : 'HERA debe confirmar cómo llegó este paciente al especialista.'}</Text>
        <WorkflowHint>{admin ? 'Resuelve la revisión de procedencia desde las solicitudes de esta cuenta.' : 'La revisión la resuelve el equipo de HERA. Corregir la asistencia o registrar un cobro no la cierra.'}</WorkflowHint>
      </> : awaiting ? <WorkflowHint>La comisión se calculará cuando se complete la sesión, si corresponde.</WorkflowHint> : row.exclusion ? <WorkflowHint>{exclusionLabels[row.exclusion] ?? row.exclusion}</WorkflowHint> : row.potentialCents === null || base === null ? <WorkflowHint>Faltan datos para calcular el importe. HERA debe revisarlos.</WorkflowHint> : null}
      {awaiting || row.potentialCents === null ? <LedgerTitle>{awaiting ? 'Todavía no genera comisión' : 'Importe pendiente de calcular'}</LedgerTitle> : <CommissionMetrics items={[{ label: 'Comisión actual', value: money(row.entitledCents), emphasis: true }]}/>}
    </View>
    {!awaiting && row.potentialCents !== null && base !== null && row.position !== null ? <View style={{ gap: 6 }}><LedgerTitle>Cómo se calcula</LedgerTitle><Text>{money(base)} × {row.rateBps / 100}% = {amount(row.potentialCents)}</Text><WorkflowHint>{row.position}.ª sesión computable con este especialista</WorkflowHint></View> : null}
    {children}
    {canRequest ? requesting ? <View style={{ gap: 12 }}>
      <Field label="Motivo de la solicitud" value={reason} onChangeText={setReason} multiline maxLength={2000}
        hint="No incluyas información clínica. La comisión se mantiene hasta que HERA resuelva." />
      <Button disabled={busy || reason.trim().length < 3}
        onPress={() => void run(() => service.decide(row.accountId, false, {
          action: 'REQUEST_CANCELLATION', snapshotId: row.id, reason,
        }))}>Enviar solicitud de anulación</Button>
    </View> : <Button disabled={busy} onPress={() => setRequesting(true)}>Solicitar anulación</Button> : null}
    {!admin ? <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 16, gap: 6 }}><LedgerTitle>¿Hay un dato incorrecto?</LedgerTitle><WorkflowHint>Corrige la asistencia, el precio o un cobro de esta sesión.</WorkflowHint><Button size="small" variant="outline" disabled={busy} onPress={onActivity}>Corregir actividad registrada</Button></View> : null}
    <CommissionDisclosure title="Cálculo e historial">
      {row.revisions.map(revision => <View key={revision.id}>
        <Text>{revision.reason} · {money(revision.deltaCents)}</Text>
        <WorkflowHint>Posición {revision.position ?? 'no computable'} · {revision.rateBps / 100}%</WorkflowHint>
      </View>)}
      <WorkflowHint>Finalización: {row.session.completionSource === 'AUTOMATIC' ? 'automática' : row.session.completionSource === 'MANUAL' ? 'manual' : 'origen histórico desconocido'}</WorkflowHint>
    </CommissionDisclosure>
  </View>;
}
