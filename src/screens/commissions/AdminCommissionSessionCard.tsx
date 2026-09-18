import { commissionReason } from './commissionCopy';
import React, { useState } from 'react';
import { Text as NativeText, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AccountDetail, CommissionSession } from '../../services/heraCommissionService';
import { Card, Text, Button, WorkflowHint, money, dateTime, exclusionLabels, Run } from './CommissionElements';
import { CommissionSessionSettlement } from './CommissionSessionSettlement';
import { CommissionMetrics, LedgerTitle, SettlementBadge, ledger } from './CommissionLedgerUI';

export function AdminCommissionSessionCard({ row, account, run, busy, refresh, onPeriods }: {
 row: CommissionSession; account: AccountDetail; run: Run; busy: boolean; refresh: number; onPeriods: () => void;
}) {
 const { theme } = useTheme(); const [calculation, setCalculation] = useState(false);
 const free = row.bookedGrossCents === 0 || row.baseCents === 0;
 const attendance = row.session.status === 'CANCELLED' ? 'Cancelada' : row.session.attendanceOutcome === 'ATTENDED' ? 'Atendida' : row.session.attendanceOutcome === 'PATIENT_NO_SHOW' ? 'No asistió' : 'Asistencia pendiente';
 const origin = row.relation.status !== 'CONFIRMED' ? 'Procedencia pendiente' : row.relation.origin === 'HERA_DIRECTORY' ? 'Directorio HERA' : ['SPECIALIST_OWN', 'SPECIALIST_INVITED'].includes(row.relation.origin) ? 'Cartera propia' : row.relation.origin === 'PROFESSIONAL_REFERRAL' ? 'Derivación' : row.relation.origin === 'COLLABORATION' ? 'Colaboración' : 'Procedencia pendiente';
 return <Card style={{ gap: 14, padding: 18 }}>
  <View style={ledger.header}>
   <View style={ledger.identity}><LedgerTitle>{dateTime(row.session.date)}</LedgerTitle><WorkflowHint>{attendance} · {origin}</WorkflowHint></View>
   <SettlementBadge state={row.settlement?.state} settlement={row.settlement} />
  </View>
  <CommissionMetrics items={[
   { label: 'Comisión generada', value: money(row.entitledCents), emphasis: true },
   { label: 'Base del servicio', value: row.baseCents === null ? 'Por confirmar' : money(row.baseCents) },
   { label: free ? 'Sesión gratuita' : row.position ? `${row.position}.ª sesión de pago` : 'Posición estimada', value: free ? 'No cuenta para la escala' : `${row.rateBps / 100}%` },
  ]} />
  <Button size="small" variant="ghost" style={{ alignSelf: 'flex-start', maxWidth: '100%' }} accessibilityState={{ expanded: calculation }} icon={<Ionicons name={calculation ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={theme.textSecondary} />} iconPosition="right" onPress={() => setCalculation(v => !v)}>{calculation ? 'Ocultar cálculo y cobros' : 'Ver cálculo y cobros'}</Button>
  {calculation ? <View style={[ledger.details, { borderTopColor: theme.border }]}>
   <NativeText selectable style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>Paciente · {row.session.clientId}</NativeText>
   <LedgerTitle>Cobros del paciente al especialista</LedgerTitle>
   <WorkflowHint>{row.exclusion ? exclusionLabels[row.exclusion] ?? row.exclusion : 'Asistencia y cobro externo respaldan la comisión generada.'} El cobro del paciente no acredita el abono a HERA.</WorkflowHint>
   <Text>Comisión potencial: {free ? money(0) : row.potentialCents === null ? 'Base pendiente de confirmar' : money(row.potentialCents)}. Las confirmaciones de sesiones anteriores pueden modificar la posición y el porcentaje.</Text>
   {!row.movements.length ? <WorkflowHint>No hay cobros registrados del paciente.</WorkflowHint> : row.movements.map(m => <View key={m.id} style={{ gap: 3 }}><Text>{m.kind === 'REFUND' ? 'Devolución al paciente' : 'Cobro del paciente'} · {money(m.grossCents)}</Text><WorkflowHint>{dateTime(m.occurredAt)} · {m.reference}</WorkflowHint></View>)}
   {row.revisions.length ? <><LedgerTitle>Revisiones del cálculo</LedgerTitle>{row.revisions.map(r => <WorkflowHint key={r.id}>{commissionReason(r.reason)}: {r.beforePosition ?? 'estimada'} → {r.position ?? 'sin posición'} · {r.beforeBps / 100}% → {r.rateBps / 100}% · Diferencia {money(r.deltaCents)}</WorkflowHint>)}</> : null}
  </View> : null}
  <CommissionSessionSettlement row={row} account={account} run={run} busy={busy} refresh={refresh} onPeriods={onPeriods} />
 </Card>;
}
