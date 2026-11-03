import React, { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { getExternalCalendarNotice, subscribeExternalCalendarNotice, dismissExternalCalendarResult } from '../../services/externalCalendarNotice';
import { PATIENT_CALENDAR_WARNING, PROFESSIONAL_CALENDAR_WARNING } from '../../services/externalCalendarContracts';

export function ExternalCalendarNotice({ result = false, patient = false }: { result?: boolean; patient?: boolean }) {
  const notice = useSyncExternalStore(subscribeExternalCalendarNotice, getExternalCalendarNotice, getExternalCalendarNotice);
  const { theme } = useTheme();
  if (!(result ? notice.result : notice.selection)) return null;
  return <View accessibilityRole="alert" style={{ padding: 12, borderRadius: result ? 0 : 8, backgroundColor: theme.bgMuted, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Text style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 20, fontSize: 13 }}>{patient ? PATIENT_CALENDAR_WARNING : PROFESSIONAL_CALENDAR_WARNING}</Text>
    {result && <AnimatedPressable accessibilityLabel="Cerrar aviso de disponibilidad" onPress={dismissExternalCalendarResult} hoverLift={false} style={{ padding: 10 }}><Text style={{ color: theme.textPrimary }}>×</Text></AnimatedPressable>}
  </View>;
}
