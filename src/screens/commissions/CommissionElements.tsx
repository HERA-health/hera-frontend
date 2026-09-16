import React, { useState } from 'react';
import { Text as NativeText, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, ReferralCheck as Check, money, dateTime, styles } from '../referrals/ReferralElements';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHint } from '../referrals/WorkflowUI';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
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
export function CommissionDisclosure({ title, children, icon = 'information-circle-outline', initiallyOpen = false }: {
  title: string; children: React.ReactNode; initiallyOpen?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
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
export const exclusionLabels: Record<string, string> = { ATTRIBUTION_PENDING: 'Procedencia o continuidad en revisión', NOT_DIRECTORY: 'Fuera de captación del Directorio', CLINIC_SESSION: 'Sesión de clínica excluida', SERVICE_OUTSIDE_SCOPE: 'Servicio fuera de alcance', OUTSIDE_AGREEMENT: 'Fuera de la vigencia del acuerdo', CANCELLED: 'Cancelada', PATIENT_NO_SHOW: 'No asistencia', FREE_SESSION: 'Sesión gratuita', ATTENDANCE_NOT_CONFIRMED: 'Asistencia pendiente de confirmar', SERVICE_BASE_NOT_CONFIRMED: 'Base del servicio pendiente de confirmar' };
