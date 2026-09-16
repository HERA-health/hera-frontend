import { commissionReason } from './commissionCopy';
import React, { useState } from 'react';
import { Text as NativeText, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { CommissionSession } from '../../services/heraCommissionService';
import { Card, Text, Button, WorkflowHint, money, dateTime, exclusionLabels } from './CommissionElements';
import { LedgerTitle, ledger, SettlementBadge } from './CommissionLedgerUI';

export function ProfessionalCommissionSessionCard({ row, busy, onActivity, onReview, children }: {
 row: CommissionSession; busy: boolean; onActivity?: () => void; onReview?: () => void; children?: React.ReactNode;
}) {
 const { theme } = useTheme();
 const [details, setDetails] = useState(false);
 const attendance = row.session.status === 'CANCELLED' ? 'Cancelada' : row.session.attendanceOutcome === 'ATTENDED' ? 'Atendida' : row.session.attendanceOutcome === 'PATIENT_NO_SHOW' ? 'No asistió' : 'Asistencia pendiente';
 const origin = row.relation.status !== 'CONFIRMED' ? 'Procedencia pendiente' : row.relation.origin === 'HERA_DIRECTORY' ? 'Directorio HERA' : ['SPECIALIST_OWN', 'SPECIALIST_INVITED'].includes(row.relation.origin) ? 'Cartera propia' : row.relation.origin === 'PROFESSIONAL_REFERRAL' ? 'Derivación' : row.relation.origin === 'COLLABORATION' ? 'Colaboración' : 'Procedencia pendiente';
 return <Card style={{ padding: 20, gap: 16 }}>
  <View style={ledger.header}>
   <View style={ledger.identity}><LedgerTitle>{row.session.patientName || 'Paciente sin nombre disponible'}</LedgerTitle><WorkflowHint>{dateTime(row.session.date)} · {attendance}</WorkflowHint></View>
   <View style={[ledger.badge, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}><Ionicons name="people-outline" size={15} color={theme.textSecondary} /><WorkflowHint>{origin}</WorkflowHint></View>
  </View>
  <View style={[ledger.header, { backgroundColor: theme.bgMuted, borderRadius: 12, padding: 16 }]}>
   <View style={{ gap: 3 }}><WorkflowHint>Comisión generada</WorkflowHint><NativeText style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 28, lineHeight: 36 }}>{money(row.entitledCents)}</NativeText></View>
   <View style={{ gap: 3 }}><Text>{row.rateBps / 100}% de {row.baseCents === null ? 'una base por confirmar' : money(row.baseCents)}</Text><WorkflowHint>{row.position ? `${row.position}.ª sesión` : 'Orden pendiente de confirmar'}</WorkflowHint></View>
  </View>
  <SettlementBadge state={row.settlement?.state} settlement={row.settlement} />
  {row.settlement?.attributedAppliedCents !== undefined ? <Text>Pago identificado de esta comisión: {money(row.settlement.attributedAppliedCents ?? 0)}{row.settlement.documentCount ? ' · Consulta también el saldo de las facturas vinculadas.' : ` · Pendiente: ${money(row.settlement.unbilledPendingCents ?? 0)}`}</Text> : null}
  {row.exclusion ? <WorkflowHint>{exclusionLabels[row.exclusion] ?? 'El cálculo requiere revisión.'}</WorkflowHint> : null}
  <View style={[ledger.header, { justifyContent: 'flex-start' }]}>
   {!children && onActivity ? <Button size="small" variant="outline" disabled={busy} onPress={onActivity}>{row.movements.length ? 'Actualizar sesión' : 'Registrar cobro o asistencia'}</Button> : null}
   {!children && onReview ? <Button size="small" variant="ghost" disabled={busy} onPress={onReview}>Solicitar revisión</Button> : null}
   <Button size="small" variant="ghost" accessibilityState={{ expanded: details }} icon={<Ionicons name={details ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={theme.textSecondary} />} iconPosition="right" onPress={() => setDetails(v => !v)}>{details ? 'Ocultar detalle' : 'Ver detalle'}</Button>
  </View>
  {details ? <View style={[ledger.details, { borderTopColor: theme.border }]}>
   <WorkflowHint>Esta comisión se genera por la asistencia y el cobro del paciente. Consulta «Abonos a HERA» para ver cuánto debes abonar y lo que HERA ha confirmado como recibido.</WorkflowHint>
   <Text>Comisión prevista: {row.potentialCents === null ? 'Base pendiente de confirmar' : money(row.potentialCents)}.</Text>
   <WorkflowHint>Confirmar sesiones anteriores puede cambiar el orden y el porcentaje.</WorkflowHint>
   <LedgerTitle>Cobros del paciente</LedgerTitle>
   {row.movements.length ? row.movements.map(m => <View key={m.id} style={{ gap: 3 }}><Text>{m.kind === 'REFUND' ? 'Devolución' : 'Cobro registrado'} · {money(m.grossCents)}</Text><WorkflowHint>{dateTime(m.occurredAt)} · {m.reference}</WorkflowHint></View>) : <WorkflowHint>Todavía no has registrado cobros de esta sesión.</WorkflowHint>}
   {row.revisions.length ? <><LedgerTitle>Cambios en el cálculo</LedgerTitle>{row.revisions.map(r => <WorkflowHint key={r.id}>{commissionReason(r.reason)} · {r.beforeBps / 100}% → {r.rateBps / 100}% · Diferencia: {money(r.deltaCents)}</WorkflowHint>)}</> : null}
  </View> : null}
  {children}
 </Card>;
}
