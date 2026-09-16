import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../components/common/AnimatedPressable';
import { SimpleDropdown, type SimpleDropdownProps } from '../../components/common/SimpleDropdown';
import { SchedulerCalendar } from '../../components/scheduling/SchedulerCalendar';
import { borderRadius, spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMadridDateKey, getMadridDateKey } from '../../utils/madridTime';

export function CommissionSelect<T extends string | number>(props: SimpleDropdownProps<T>) {
  const { theme } = useTheme();
  return <View style={styles.field}>
    {props.accessibilityLabel ? <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{props.accessibilityLabel}</Text> : null}
    <SimpleDropdown {...props} presentation="portal" selectionIndicator="radio" highlightSelection={false} maxHeight={300} />
  </View>;
}

const months = Array.from({ length: 12 }, (_, index) => ({
  key: String(index + 1).padStart(2, '0'),
  label: formatMadridDateKey(`2026-${String(index + 1).padStart(2, '0')}-01`, { month: 'long' }),
}));
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Keep date keys unchanged at the service boundary; the field only formats their presentation.
export function CommissionDateField({ label, value, onChangeText, disabled = false, granularity = 'day' }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  granularity?: 'day' | 'month';
}) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 720;
  const trigger = useRef<AnimatedPressableHandle>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number }>();
  const [panelHeight, setPanelHeight] = useState(400);
  const [year, setYear] = useState(Number((value || getMadridDateKey()).slice(0, 4)));
  const monthly = granularity === 'month';
  const close = useCallback(() => {
    setOpen(false);
    if (Platform.OS === 'web') setTimeout(() => trigger.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    trigger.current?.measureInWindow((x, y, _width, triggerHeight) => setAnchor({ x, y, height: triggerHeight }));
  }, [open, width, height]);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, close]);

  const select = (date: string) => { onChangeText(date); close(); };
  const panelWidth = Math.min(368, width - spacing.md * 2);
  const maxHeight = Math.max(0, height - spacing.md * 2);
  const visibleHeight = Math.min(panelHeight, maxHeight);
  const below = anchor ? anchor.y + anchor.height + spacing.xs : spacing.md;
  const top = Math.max(spacing.md, Math.min(
    below + visibleHeight <= height - spacing.md ? below : (anchor?.y ?? height) - visibleHeight - spacing.xs,
    height - visibleHeight - spacing.md,
  ));
  const dateLabel = value ? capitalize(formatMadridDateKey(monthly ? `${value}-01` : value, monthly
    ? { month: 'long', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    : monthly ? 'Todos los meses' : 'Seleccionar fecha';

  return <View style={styles.field}>
    <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{label}</Text>
    <AnimatedPressable focusRef={trigger} accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={dateLabel} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      hoverLift={false} pressScale={0.98} onPress={() => { setYear(Number((value || getMadridDateKey()).slice(0, 4))); setOpen(true); }}
      style={[styles.trigger, { borderColor: open ? theme.primary : theme.border, backgroundColor: open ? theme.primaryAlpha12 : theme.bgMuted, opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.copy}>
        <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 }}>{dateLabel}</Text>
        {!monthly && value ? <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, marginTop: 2 }}>{value}</Text> : null}
      </View>
      <Ionicons name={open ? 'chevron-up-outline' : 'calendar-outline'} size={19} color={theme.primary} />
    </AnimatedPressable>
    {open ? <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={[styles.layer, compact && { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.overlay }]} accessibilityViewIsModal>
        <Pressable accessible={false} testID="commission-date-backdrop" style={StyleSheet.absoluteFill} onPress={close} />
        <View onLayout={event => setPanelHeight(event.nativeEvent.layout.height)} style={[styles.panel, {
          width: panelWidth, maxHeight, borderColor: theme.border, backgroundColor: theme.bgElevated, shadowColor: theme.shadowNeutral,
        }, !compact && { position: 'absolute', top, left: Math.max(spacing.md, Math.min(anchor?.x ?? spacing.md, width - panelWidth - spacing.md)) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
            <View style={styles.panelHeader}>
              <Text accessibilityRole="header" style={[styles.copy, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 }]}>{label}</Text>
              <AnimatedPressable accessibilityRole="button" accessibilityLabel="Cerrar calendario" onPress={close} hoverLift={false} style={styles.iconButton}>
                <Ionicons name="close-outline" size={21} color={theme.textSecondary} />
              </AnimatedPressable>
            </View>
            {monthly ? <>
              <View style={styles.yearRow}>
                <AnimatedPressable accessibilityRole="button" accessibilityLabel="Año anterior" disabled={year <= 1} onPress={() => setYear(year - 1)} hoverLift={false} style={styles.iconButton}><Ionicons name="chevron-back" size={18} color={theme.primary} /></AnimatedPressable>
                <Text accessibilityLiveRegion="polite" style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 20 }}>{year}</Text>
                <AnimatedPressable accessibilityRole="button" accessibilityLabel="Año siguiente" disabled={year >= 9999} onPress={() => setYear(year + 1)} hoverLift={false} style={styles.iconButton}><Ionicons name="chevron-forward" size={18} color={theme.primary} /></AnimatedPressable>
              </View>
              <View style={styles.monthGrid}>
                {months.map(month => {
                  const key = `${String(year).padStart(4, '0')}-${month.key}`;
                  const selected = value === key;
                  return <AnimatedPressable key={month.key} accessibilityRole="button" accessibilityLabel={`${capitalize(month.label)} de ${year}`} accessibilityState={{ selected }}
                    onPress={() => select(key)} hoverLift={false} style={[styles.month, { backgroundColor: selected ? theme.primary : theme.bgMuted, borderColor: selected ? theme.primary : theme.border }]}>
                    <Text style={{ color: selected ? theme.textOnPrimary : theme.textPrimary, fontFamily: selected ? theme.fontSansSemiBold : theme.fontSans, fontSize: 13 }}>{capitalize(month.label)}</Text>
                  </AnimatedPressable>;
                })}
              </View>
              <AnimatedPressable accessibilityRole="button" onPress={() => select('')} hoverLift={false} style={styles.clear}><Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}>Todos los meses</Text></AnimatedPressable>
            </> : <SchedulerCalendar current={value || getMadridDateKey()} markedDates={value ? { [value]: { selected: true, selectedColor: theme.primary, selectedTextColor: theme.textOnPrimary } } : undefined} onSelectDate={select} />}
          </ScrollView>
        </View>
      </View>
    </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 14 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: borderRadius.lg },
  copy: { flex: 1, minWidth: 0 },
  layer: { flex: 1 },
  panel: { borderWidth: 1, borderRadius: borderRadius.lg, overflow: 'hidden', elevation: 12, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 22 },
  panelContent: { padding: spacing.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  month: { width: '32%', flexGrow: 1, minHeight: 44, borderWidth: 1, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  clear: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
});
