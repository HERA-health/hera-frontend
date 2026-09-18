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
 const free = row.bookedGrossCents === 0 || row.baseCents === 0;
 const attendance = row.session.status === 'CANCELLED' ? 'Cancelada' : row.session.attendanceOutcome === 'ATTENDED' ? 'Atendida' : row.session.attendanceOutcome === 'PATIENT_NO_SHOW' ? 'No asistió' : 'Asistencia pendiente';
 const origin = row.relation.status !== 'CONFIRMED' ? 'Procedencia pendiente' : row.relation.origin === 'HERA_DIRECTORY' ? 'Directorio HERA' : ['SPECIALIST_OWN', 'SPECIALIST_INVITED'].includes(row.relation.origin) ? 'Cartera propia' : row.relation.origin === 'PROFESSIONAL_REFERRAL' ? 'Derivación' : row.relation.origin === 'COLLABORATION' ? 'Colaboración' : 'Procedencia pendiente';
 return <Card style={{ padding: 16, gap: 10 }}>
  <View style={ledger.header}>
   <View style={[ledger.identity, { flexBasis: 160 }]}><LedgerTitle>{row.session.patientName || 'Paciente sin nombre disponible'}</LedgerTitle><WorkflowHint>{dateTime(row.session.date)} · {attendance}</WorkflowHint></View>
   <View style={{ gap: 2 }}><NativeText accessibilityLabel={`Comisión generada: ${money(row.entitledCents)}`} style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 22, lineHeight: 28 }}>{money(row.entitledCents)}</NativeText><WorkflowHint>{free ? 'Sesión gratuita: no cuenta para la escala de comisiones' : `${row.rateBps / 100}% de ${row.baseCents === null ? 'base por confirmar' : money(row.baseCents)}`}</WorkflowHint></View>
  </View>
  <SettlementBadge state={row.settlement?.state} settlement={row.settlement} />
  {row.exclusion ? <WorkflowHint>{exclusionLabels[row.exclusion] ?? 'El cálculo requiere revisión.'}</WorkflowHint> : null}
  <View style={[ledger.header, { justifyContent: 'flex-start' }]}>
   {!children && onActivity ? <Button size="small" variant="outline" disabled={busy} onPress={onActivity}>{row.movements.length ? 'Actualizar sesión' : 'Registrar cobro o asistencia'}</Button> : null}
   <Button size="small" variant="outline" accessibilityState={{ expanded: details }} icon={<Ionicons name={details ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={theme.textSecondary} />} iconPosition="right" onPress={() => setDetails(v => !v)}>{details ? 'Ocultar detalle' : 'Ver detalle'}</Button>
  </View>
  {details ? <View style={[ledger.details, { borderTopColor: theme.border }]}>
   <WorkflowHint>{origin} · {free ? 'Sin posición en la escala' : row.position ? `${row.position}.ª sesión de pago` : 'Orden pendiente de confirmar'}</WorkflowHint>
   {row.settlement?.attributedAppliedCents !== undefined ? <Text>Pago identificado de esta comisión: {money(row.settlement.attributedAppliedCents ?? 0)}{row.settlement.documentCount ? ' · Consulta también el saldo de las facturas vinculadas.' : ` · Pendiente: ${money(row.settlement.unbilledPendingCents ?? 0)}`}</Text> : null}
   <WorkflowHint>Consulta «Pagos y facturas» para ver los pagos confirmados por HERA. El pago de una factura conjunta no atribuye un importe a cada sesión.</WorkflowHint>
   {!children && onReview ? <Button size="small" variant="outline" style={{ alignSelf: 'flex-start' }} disabled={busy} onPress={onReview}>Solicitar revisión</Button> : null}
   <Text>Comisión prevista: {free ? money(0) : row.potentialCents === null ? 'Base pendiente de confirmar' : money(row.potentialCents)}.</Text>
   <WorkflowHint>Confirmar sesiones anteriores puede cambiar el orden y el porcentaje.</WorkflowHint>
   <LedgerTitle>Cobros del paciente</LedgerTitle>
   {row.movements.length ? row.movements.map(m => <View key={m.id} style={{ gap: 3 }}><Text>{m.kind === 'REFUND' ? 'Devolución' : 'Cobro registrado'} · {money(m.grossCents)}</Text><WorkflowHint>{dateTime(m.occurredAt)} · {m.reference}</WorkflowHint></View>) : <WorkflowHint>Todavía no has registrado cobros de esta sesión.</WorkflowHint>}
   {row.revisions.length ? <><LedgerTitle>Cambios en el cálculo</LedgerTitle>{row.revisions.map(r => <WorkflowHint key={r.id}>{commissionReason(r.reason)} · {r.beforeBps / 100}% → {r.rateBps / 100}% · Diferencia: {money(r.deltaCents)}</WorkflowHint>)}</> : null}
  </View> : null}
  {children}
 </Card>;
}
