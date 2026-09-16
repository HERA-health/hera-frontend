import React, { useState } from 'react';
import { Text as NativeText, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, ReferralCheck as Check, money, dateTime, styles } from '../referrals/ReferralElements';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHint } from '../referrals/WorkflowUI';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import type { Balance } from '../../services/heraCommissionService';
export { CommissionDateField as WorkflowDate } from './CommissionFields';
export { Card, Text, Field, Check, money, dateTime, styles, Button, WorkflowHeader, WorkflowHint, getMadridDateKey };
export type Run = (operation: () => Promise<unknown>) => Promise<boolean>;
export function cents(value: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Introduce un importe con un máximo de dos decimales.');
  const result = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100000000) throw new Error('El importe supera el límite permitido.');
  return result;
}
export function day(value: string) { const result = parseMadridDateTime(value, '00:00'); if (!result) throw new Error('Selecciona una fecha válida en el calendario.'); return result.iso; }
export function CommissionDisclosure({ title, children, icon = 'information-circle-outline' }: {
  title: string; children: React.ReactNode; icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
    <AnimatedPressable accessibilityLabel={title} accessibilityState={{ expanded: open }} hoverLift={false} pressScale={1} tabIndex={0}
      onPress={() => setOpen(value => !value)}
      onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) setOpen(value => !value); } }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 56 }}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <NativeText style={{ flex: 1, fontFamily: theme.fontSansSemiBold, fontSize: 14, lineHeight: 21, color: theme.textPrimary }}>{title}</NativeText>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
    </AnimatedPressable>
    {open ? <View style={{ padding: 18, gap: 16, borderTopWidth: 1, borderColor: theme.border }}>{children}</View> : null}
  </Card>;
}
export function Summary({ value }: { value: Pick<Balance, 'pendingCents' | 'accruedCents' | 'undocumentedCents' | 'overdueCents' | 'receivedCents' | 'creditCents'> & Partial<Balance> }) {
  const { theme } = useTheme();
  return <View style={{ gap: 12 }}><View style={[styles.row, { alignItems: 'stretch', gap: 12 }]}>{([
    ['Pendiente de cubrir', value.paymentPendingCents ?? value.pendingCents, 'Comisiones y facturas pendientes de cubrir', 'time-outline'],
    ['Recibido por HERA', value.receivedCents, 'Abonos de comisiones confirmados', 'checkmark-circle-outline'],
    ['Saldo a tu favor', value.creditCents, 'Crédito de tus abonos a HERA', 'wallet-outline'],
  ] as const).map(([label, amount, description, icon], index) => <Card key={label} style={{ flexGrow: 1, flexBasis: 250, minWidth: 0, padding: 18, gap: 10, ...(index === 0 ? { backgroundColor: theme.bg } : {}) }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={icon} size={18} color={theme.textSecondary} /><NativeText style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 13, lineHeight: 19 }}>{label}</NativeText></View>
    <NativeText style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 30, lineHeight: 38 }}>{money(amount)}</NativeText>
    <WorkflowHint>{description}</WorkflowHint>
    {index === 0 && value.overdueCents > 0 ? <NativeText style={{ color: theme.error, fontFamily: theme.fontSansSemiBold, fontSize: 12, lineHeight: 18 }}>Vencido: {money(value.overdueCents)}</NativeText> : null}
  </Card>)}</View>
    <CommissionDisclosure title="Ver desglose de saldos" icon="list-outline">
      {([
        ['Generado en meses abiertos', value.accruedCents, 'Comisiones de periodos abiertos.'],
        ['Pendiente de factura', value.unbilledCents ?? value.undocumentedCents, 'Base de comisión sin total fiscal definitivo.'],
        ['Vencido', value.overdueCents, 'Parte del pendiente que ha superado su fecha de pago.'],
      ] as const).map(([label, amount, description]) => <View key={label} style={{ gap: 4 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}><Text>{label}</Text><Text>{money(amount)}</Text></View><WorkflowHint>{description}</WorkflowHint></View>)}
      <WorkflowHint>El saldo incluye comisiones generadas sin factura. No es una solicitud automática de pago: consulta los documentos y sus vencimientos. Las estimaciones no se dan por pagadas.</WorkflowHint>
    </CommissionDisclosure>
  </View>;
}
export const exclusionLabels: Record<string, string> = { ATTRIBUTION_PENDING: 'Procedencia o continuidad en revisión', NOT_DIRECTORY: 'Fuera de captación del Directorio', CLINIC_SESSION: 'Sesión de clínica excluida', SERVICE_OUTSIDE_SCOPE: 'Servicio fuera de alcance', OUTSIDE_AGREEMENT: 'Fuera de la vigencia del acuerdo', CANCELLED: 'Cancelada', PATIENT_NO_SHOW: 'No asistencia', FREE_SESSION: 'Sesión gratuita', ATTENDANCE_NOT_CONFIRMED: 'Asistencia pendiente de confirmar', SERVICE_BASE_NOT_CONFIRMED: 'Base del servicio pendiente de confirmar' };
