import React from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/common/Button';
import type { useBookingConfirmation } from './useBookingConfirmation';

type Confirmation = ReturnType<typeof useBookingConfirmation>;

function statusText({ error, saving, value }: Confirmation) {
  if (error) return 'Estado sin verificar';
  if (saving) return 'Guardando…';
  if (value === null) return 'Consultando estado';
  return value ? 'Se confirman al instante' : 'Requieren tu aprobación';
}

export function BookingConfirmationSwitch({ confirmation, showIcon = true, compact = false }: {
  confirmation: Confirmation;
  showIcon?: boolean;
  compact?: boolean;
}) {
  const { theme } = useTheme();

  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, flexShrink: 1 }}>
    {showIcon && <View style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryMuted }}>
      <Ionicons name="calendar-outline" size={18} color={theme.link} />
    </View>}
    <View style={{ flexShrink: 1, gap: 2 }}>
      <Text style={{ fontFamily: theme.fontSansSemiBold, fontSize: 14, color: theme.textPrimary }}>Confirmación automática de citas</Text>
      {!compact && <Text accessibilityLiveRegion="polite" style={{ fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>
        {statusText(confirmation)}
      </Text>}
    </View>
    {confirmation.value !== null
      ? <Switch accessibilityLabel="Confirmación automática de citas" value={confirmation.value}
          accessibilityState={{ busy: confirmation.saving }} disabled={confirmation.saving || !!confirmation.error}
          onValueChange={confirmation.change} trackColor={{ false: theme.textMuted, true: theme.primary }} thumbColor={theme.textOnPrimary} />
      : !confirmation.error && <ActivityIndicator size="small" accessibilityLabel="Cargando confirmación automática" color={theme.primary} />}
  </View>;
}

export function BookingConfirmationError({ confirmation }: { confirmation: Confirmation }) {
  const { theme } = useTheme();
  if (!confirmation.error) return null;
  return <View accessibilityRole="alert" style={{ gap: 8, padding: 16, borderWidth: 1, borderColor: theme.error, borderRadius: 12 }}>
    <Text style={{ color: theme.error }}>{confirmation.error}</Text>
    <Button size="small" variant="outline" onPress={confirmation.reload}>Actualizar estado de confirmación</Button>
  </View>;
}
