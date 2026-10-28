import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';

interface CompactCalendarColumnProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  availableDates?: string[];
  minDate?: string;
  disabled?: boolean;
  busy?: boolean;
}

// Date-key arithmetic is independent of the browser timezone and DST transitions.
export function shiftBookingDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function CompactCalendarColumn({ selectedDate, onDateSelect, minDate, disabled = false, busy = false }: CompactCalendarColumnProps) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const count = width >= 1180 ? 7 : width >= 768 ? 5 : 3;
  const today = minDate ?? getMadridDateKey();
  const [start, setStart] = useState(selectedDate && selectedDate >= today ? selectedDate : today);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<AnimatedPressableHandle>(null);
  const closeRef = useRef<AnimatedPressableHandle>(null);
  const blocked = disabled || busy;
  useEffect(() => {
    if (selectedDate && selectedDate >= today) {
      setStart(current => selectedDate < current || selectedDate > shiftBookingDate(current, count - 1) ? selectedDate : current);
    }
  }, [selectedDate, count, today]);
  const close = () => {
    setOpen(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const select = (date: string) => {
    if (blocked || date < today) return;
    onDateSelect(date);
    if (open) { setStart(date); close(); }
  };
  const text = { fontFamily: theme.fontSans, color: theme.textPrimary };
  return <View style={styles.container} accessibilityState={{ disabled: blocked, busy }}>
    <View style={styles.controls}>
      <View style={styles.strip} accessibilityRole="radiogroup" accessibilityLabel="Fecha de la sesión">
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Fechas anteriores" disabled={blocked || start <= today}
          accessibilityState={{ disabled: blocked || start <= today }} hoverLift={false}
          onPress={() => setStart(current => { const previous = shiftBookingDate(current, -count); return previous < today ? today : previous; })}
          style={[styles.arrow, { backgroundColor: theme.primaryMuted, opacity: start <= today ? 0.4 : 1 }]}>
          <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
        </AnimatedPressable>
        {Array.from({ length: count }, (_, index) => shiftBookingDate(start, index)).map(date => {
          const selected = date === selectedDate;
          return <AnimatedPressable key={date} accessibilityRole="radio" accessibilityLabel={formatMadridDateKey(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            accessibilityState={{ checked: selected, disabled: blocked }} disabled={blocked} onPress={() => select(date)} hoverLift={false}
            style={[styles.day, { borderColor: selected ? theme.primary : theme.borderLight, backgroundColor: selected ? theme.primary : theme.bgCard }]}>
            <Text style={[text, styles.weekday, selected && { color: theme.textOnPrimary }]}>{formatMadridDateKey(date, { weekday: 'short' }).replace('.', '')}</Text>
            <Text style={[text, styles.date, { fontFamily: theme.fontSansSemiBold }, selected && { color: theme.textOnPrimary }]}>{formatMadridDateKey(date, { day: 'numeric', month: 'short' }).replace('.', '')}</Text>
          </AnimatedPressable>;
        })}
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Fechas siguientes" disabled={blocked} accessibilityState={{ disabled: blocked }} hoverLift={false}
          onPress={() => setStart(current => shiftBookingDate(current, count))} style={[styles.arrow, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
        </AnimatedPressable>
      </View>
      <AnimatedPressable focusRef={triggerRef} accessibilityRole="button" accessibilityLabel="Ver calendario completo" accessibilityState={{ expanded: open, disabled: blocked }}
        disabled={blocked} onPress={() => setOpen(true)} hoverLift={false} style={[styles.calendarTrigger, { backgroundColor: theme.primaryMuted }]}>
        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        <Text style={[text, { fontFamily: theme.fontSansSemiBold, fontSize: 12 }]}>Ver calendario completo</Text>
      </AnimatedPressable>
    </View>
    <Modal visible={open} transparent animationType="none" onRequestClose={close} onShow={() => closeRef.current?.focus()}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View accessibilityViewIsModal accessibilityLabel="Selecciona una fecha" style={[styles.dialog, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.dialogHeading}>
            <Text accessibilityRole="header" style={[text, { fontFamily: theme.fontDisplay, fontSize: 24 }]}>Selecciona una fecha</Text>
            <AnimatedPressable focusRef={closeRef} accessibilityRole="button" accessibilityLabel="Cerrar calendario" onPress={close} style={styles.close}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>
          <ScrollView>
            <Calendar key={isDark ? 'dark' : 'light'} current={selectedDate ?? start} initialDate={selectedDate ?? start} minDate={today}
              onDayPress={day => select(day.dateString)} hideExtraDays enableSwipeMonths firstDay={1} monthFormat="MMMM yyyy"
              disableAllTouchEventsForDisabledDays
              markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: theme.primary, selectedTextColor: theme.textOnPrimary } } : {}}
              theme={{ calendarBackground: theme.bgCard, monthTextColor: theme.textPrimary, textMonthFontFamily: theme.fontSansSemiBold,
                textDayFontFamily: theme.fontSans, textDayHeaderFontFamily: theme.fontSans, textSectionTitleColor: theme.textSecondary,
                dayTextColor: theme.textPrimary, todayTextColor: theme.primary, textDisabledColor: theme.textMuted, arrowColor: theme.primary,
                selectedDayBackgroundColor: theme.primary, selectedDayTextColor: theme.textOnPrimary }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', minWidth: 0 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, flexGrow: 1, flexShrink: 1, flexBasis: 480, minWidth: 0 },
  arrow: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  day: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingVertical: 6, gap: 2, borderWidth: 1, borderRadius: 12 },
  weekday: { fontSize: 12, textTransform: 'capitalize' },
  date: { fontSize: 13 },
  calendarTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 380, maxHeight: '90%', padding: 16, borderRadius: 20, borderWidth: 1 },
  dialogHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

export default CompactCalendarColumn;
