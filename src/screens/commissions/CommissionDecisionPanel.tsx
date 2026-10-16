import React from 'react';
import { View } from 'react-native';
import type { DecisionPreview } from '../../services/heraCommissionService';
import { Button, Field, Text, WorkflowHint, dateTime, money } from './CommissionElements';
import { LedgerTitle } from './CommissionLedgerUI';

const attendance = (value: string | null) => value === 'ATTENDED' ? 'Realizada' : value === 'NOT_ATTENDED' ? 'No realizada' : 'Sin dato histórico';
const amount = (value: number | null) => value === null ? 'Sin dato' : money(value);

export function CommissionDecisionPanel({ preview, reason, onReason, busy, onDecide }: {
  preview: DecisionPreview;
  reason: string;
  onReason: (value: string) => void;
  busy: boolean;
  onDecide: (decision: 'APPROVED' | 'REJECTED') => void;
}) {
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 6 }}>
      <LedgerTitle>{preview.kind === 'SESSION_CORRECTION' ? 'Corrección de sesión' : 'Anulación de comisión'}</LedgerTitle>
      <Text>{dateTime(preview.sessionDate)} · Paciente {preview.patientReference.slice(-8)}</Text>
      <Text>Motivo: {preview.reason}</Text>
    </View>
    {preview.kind === 'SESSION_CORRECTION' && preview.recognized && preview.proposal ?
      <View style={{ gap: 8 }}>
        <LedgerTitle>Cambio solicitado</LedgerTitle>
        <Text>Asistencia: {attendance(preview.recognized.attendance)} → {attendance(preview.proposal.attendance)}</Text>
        <Text>Base del servicio: {amount(preview.recognized.baseCents)} → {amount(preview.proposal.baseCents)}</Text>
        <Text>Impuestos del servicio: {amount(preview.recognized.taxCents)} → {amount(preview.proposal.taxCents)}</Text>
      </View> : null}
    <View style={{ gap: 6 }}>
      <LedgerTitle>Comisión vigente: {money(preview.commissionCents)}</LedgerTitle>
      <Text>{preview.message}</Text>
      <Text>Ajuste si se aprueba: {money(preview.totalAdjustmentCents)}</Text>
      {preview.creditReleasedCents > 0 ? <Text>Saldo a favor que se libera: {money(preview.creditReleasedCents)}</Text> : null}
      {preview.adjustments.map((adjustment, index) => <WorkflowHint key={index}>
        Periodo {adjustment.period} · {money(adjustment.deltaCents)} · Sesión {adjustment.snapshotId.slice(-8)}
      </WorkflowHint>)}
      <WorkflowHint>{preview.periodEffect === 'OPEN_PERIOD_ADJUSTMENT' ? 'El ajuste se registrará en un periodo abierto.' : 'El ajuste actualizará el periodo abierto e invalidará su preparación.'}</WorkflowHint>
      {preview.rectificationRequired ? <Text>Será necesaria una rectificativa fiscal. El ingreso original se conserva.</Text> : null}
    </View>
    <Field label="Motivo de la decisión" value={reason} onChangeText={onReason} multiline maxLength={2000} hint="No incluyas información clínica." />
    <View style={{ gap: 10 }}>
      <Button disabled={busy || reason.trim().length < 3} onPress={() => onDecide('APPROVED')}>Aprobar solicitud</Button>
      <Button disabled={busy || reason.trim().length < 3} variant="outline" onPress={() => onDecide('REJECTED')}>Rechazar solicitud</Button>
    </View>
  </View>;
}
