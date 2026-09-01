import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMadridDateKey, getMadridDateKey } from '../../utils/madridTime';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SchedulerCalendar } from '../scheduling/SchedulerCalendar';
import { FocusedActionSheet } from './FocusedActionSheet';

export function MadridDateField({
  label,
  value,
  onChange,
  optional = false,
  minDate,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  minDate?: string;
  error?: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = value || minDate || getMadridDateKey();
  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <AnimatedPressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} style={[styles.trigger, { borderColor: error ? theme.error : theme.border, backgroundColor: theme.bgCard }]} hoverLift={false}>
        <Ionicons name="calendar-outline" size={18} color={theme.primary} />
        <Text style={[styles.value, { color: value ? theme.textPrimary : theme.textMuted }]}>{value ? formatMadridDateKey(value, { day: '2-digit', month: 'short', year: 'numeric' }) : optional ? 'Sin fecha de fin' : 'Seleccionar fecha'}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
      </AnimatedPressable>
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
      <FocusedActionSheet visible={open} title={label} description="La fecha se interpreta en horario de Madrid." onClose={() => setOpen(false)}>
        <SchedulerCalendar current={current} minDate={minDate} markedDates={value ? { [value]: { selected: true, selectedColor: theme.primary } } : undefined} onSelectDate={(date) => { onChange(date); setOpen(false); }} />
        {optional && value ? <AnimatedPressable onPress={() => { onChange(''); setOpen(false); }} style={styles.clear} accessibilityRole="button"><Text style={[styles.clearText, { color: theme.primary }]}>Quitar fecha</Text></AnimatedPressable> : null}
      </FocusedActionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs, marginBottom: spacing.md },
  label: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium },
  trigger: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1.5, borderRadius: borderRadius.md },
  value: { flex: 1, fontSize: typography.fontSizes.md },
  error: { fontSize: typography.fontSizes.xs },
  clear: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold },
});
