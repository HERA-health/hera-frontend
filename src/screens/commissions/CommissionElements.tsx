import React from 'react';
import { View } from 'react-native';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, ReferralCheck as Check, money, dateTime, styles } from '../referrals/ReferralElements';
import { WorkflowButton as Button, WorkflowDate, WorkflowHeader, WorkflowHint } from '../referrals/WorkflowUI';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import type { Balance } from '../../services/heraCommissionService';
export { Card, Text, Field, Check, money, dateTime, styles, Button, WorkflowDate, WorkflowHeader, WorkflowHint, getMadridDateKey };
export type Run = (operation: () => Promise<unknown>) => Promise<boolean>;
export function cents(value: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Introduce un importe con un máximo de dos decimales.');
  const result = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100000000) throw new Error('El importe supera el límite permitido.');
  return result;
}
export function day(value: string) { const result = parseMadridDateTime(value, '00:00'); if (!result) throw new Error('Revisa la fecha (AAAA-MM-DD).'); return result.iso; }
export function Summary({ value }: { value: Pick<Balance, 'pendingCents' | 'accruedCents' | 'undocumentedCents' | 'overdueCents' | 'receivedCents' | 'creditCents'> & Partial<Balance> }) {
  return <View style={styles.row}>{([
    ['Pendiente documentado', value.pendingCents, 'Importe respaldado y pendiente de recepción.'],
    ['Devengado sin liquidar', value.accruedCents, 'Base de comisión en periodos abiertos.'],
    ['Sin documentar', value.undocumentedCents, 'Base cerrada; el total fiscal aún no está fijado.'],
    ['Vencido', value.overdueCents, 'Parte del pendiente que ha vencido.'],
    ['Recibido histórico', value.receivedCents, 'Transferencias confirmadas, netas de anulaciones de registro.'],
    ['Saldo a tu favor', value.creditCents, 'Disponible para aplicar o devolver externamente.'],
  ] as const).map(([label, amount, description]) => <Card key={label} style={{ flexGrow: 1, flexBasis: 235 }}><Text>{label}</Text><Text title>{money(amount)}</Text><WorkflowHint>{description}</WorkflowHint></Card>)}</View>;
}
export const exclusionLabels: Record<string, string> = { ATTRIBUTION_PENDING: 'Procedencia o continuidad en revisión', NOT_DIRECTORY: 'Fuera de captación del Directorio', CLINIC_SESSION: 'Sesión de clínica excluida', SERVICE_OUTSIDE_SCOPE: 'Servicio fuera de alcance', OUTSIDE_AGREEMENT: 'Fuera de la vigencia del acuerdo', CANCELLED: 'Cancelada', PATIENT_NO_SHOW: 'No asistencia', FREE_SESSION: 'Sesión gratuita', ATTENDANCE_NOT_CONFIRMED: 'Asistencia pendiente de confirmar', SERVICE_BASE_NOT_CONFIRMED: 'Base del servicio pendiente de confirmar' };
