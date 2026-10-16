import React, { useState } from 'react';
import { View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { Button, Check, CommissionDisclosure, Field, Text, WorkflowDate, WorkflowHint, cents, day, dateTime, getMadridDateKey, money, exclusionLabels, type Run } from './CommissionElements';
import { CommissionSelect } from './CommissionFields';
import { LedgerTitle } from './CommissionLedgerUI';

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
  const [reason, setReason] = useState('');
  const base = row.recognizedBaseCents ?? row.baseCents;
  const awaiting = awaitingCompletion(row);
  const canRequest = !admin && !row.cancellationIssueId && row.entitledCents > 0
    && !issues.some(issue => issue.kind === 'COMMISSION_CANCELLATION' && issue.status === 'OPEN');
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 6 }}>
      <LedgerTitle>{admin ? `Referencia de paciente ${row.relation.patientReference ?? row.relationId}` : row.session.patientName ?? 'Paciente'}</LedgerTitle>
      <Text>{dateTime(row.session.date)}</Text>
      <Text>{awaiting ? 'Pendiente de realizar · Todavía no genera comisión'
        : row.potentialCents === null || base === null ? 'Base y porcentaje pendientes de confirmar'
        : row.position === null ? 'Sesión no computable'
        : `${money(base)} × ${row.rateBps / 100}% = ${amount(row.potentialCents)}`}</Text>
      <Text>Neto vigente: {awaiting ? 'Sin devengar' : row.potentialCents === null ? 'Por calcular' : money(row.entitledCents)}</Text>
      {row.exclusion ? <WorkflowHint>{exclusionLabels[row.exclusion] ?? row.exclusion}</WorkflowHint> : null}
    </View>
    {children}
    {canRequest ? requesting ? <View style={{ gap: 12 }}>
      <Field label="Motivo de la solicitud" value={reason} onChangeText={setReason} multiline maxLength={2000}
        hint="No incluyas información clínica. La comisión se mantiene hasta que HERA resuelva." />
      <Button disabled={busy || reason.trim().length < 3}
        onPress={() => void run(() => service.decide(row.accountId, false, {
          action: 'REQUEST_CANCELLATION', snapshotId: row.id, reason,
        }))}>Enviar solicitud de anulación</Button>
    </View> : <Button disabled={busy} onPress={() => setRequesting(true)}>Solicitar anulación</Button> : null}
    {!admin ? <Button size="small" variant="ghost" disabled={busy} onPress={onActivity}>Corregir actividad registrada</Button> : null}
    <CommissionDisclosure title="Cálculo e historial">
      {row.revisions.map(revision => <View key={revision.id}>
        <Text>{revision.reason} · {money(revision.deltaCents)}</Text>
        <WorkflowHint>Posición {revision.position ?? 'no computable'} · {revision.rateBps / 100}%</WorkflowHint>
      </View>)}
      <WorkflowHint>Finalización: {row.session.completionSource === 'AUTOMATIC' ? 'automática' : row.session.completionSource === 'MANUAL' ? 'manual' : 'origen histórico desconocido'}</WorkflowHint>
    </CommissionDisclosure>
  </View>;
}
