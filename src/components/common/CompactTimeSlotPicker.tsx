import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../constants/colors';
import type { TimeSlot } from '../../services/sessionsService';
import { SimpleDropdown } from './SimpleDropdown';

interface Props {
  slots: TimeSlot[];
  selectedTime?: string | null;
  resetKey: string;
  disabled?: boolean;
  onSelect: (slot: TimeSlot) => void;
  renderSlot: (slot: TimeSlot) => React.ReactNode;
}

const minutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export function previewTimeSlots(available: TimeSlot[], selectedTime?: string | null): TimeSlot[] {
  if (available.length <= 4) return available;
  const candidates = available.filter((slot, index) => {
    const start = minutes(slot.startTime);
    return start % 15 === 0 || start % 5 !== 0
      || index === 0 || index === available.length - 1
      || start - minutes(available[index - 1].startTime) > 5
      || minutes(available[index + 1].startTime) - start > 5;
  });
  const sample: TimeSlot[] = [];
  // Prefer familiar starts without rounding or inventing availability.
  for (const pool of [
    available.filter(slot => minutes(slot.startTime) % 30 === 0),
    available.filter(slot => minutes(slot.startTime) % 15 === 0),
    candidates,
  ]) {
    const remaining = pool.filter(slot => !sample.includes(slot));
    const count = Math.min(4 - sample.length, remaining.length);
    for (let index = 0; index < count; index++) {
      sample.push(remaining[count === 1 ? 0 : Math.round(index * (remaining.length - 1) / (count - 1))]);
    }
  }
  sample.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const selected = available.find(slot => slot.startTime === selectedTime);
  if (selected && !sample.includes(selected)) {
    let closest = 0;
    sample.forEach((slot, index) => {
      if (Math.abs(minutes(slot.startTime) - minutes(selected.startTime))
        <= Math.abs(minutes(sample[closest].startTime) - minutes(selected.startTime))) closest = index;
    });
    sample[closest] = selected;
  }
  return sample.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** A bounded preview; the full, unchanged availability lives in a floating menu. */
export function CompactTimeSlotPicker({ slots, selectedTime, resetKey, disabled, onSelect, renderSlot }: Props) {
  const available = useMemo(() => slots.filter(slot => slot.available !== false)
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [slots]);
  const preview = useMemo(() => previewTimeSlots(available, selectedTime), [available, selectedTime]);
  return <View style={styles.container}>
    {[preview.slice(0, 2), preview.slice(2, 4)].filter(row => row.length > 0).map((row, index) => (
      <View key={index} style={styles.row}>
        {row.map(slot => <View key={slot.startTime} style={styles.cell}>{renderSlot(slot)}</View>)}
        {row.length === 1 && <View style={styles.cell} />}
      </View>
    ))}
    {available.length > 4 && <SimpleDropdown
      key={resetKey}
      options={available.map(slot => ({ label: slot.startTime, value: slot.startTime }))}
      value={selectedTime ?? null}
      onSelect={time => {
        const slot = available.find(option => option.startTime === time);
        if (slot) onSelect(slot);
      }}
      triggerLabel="Ver todos los horarios"
      accessibilityLabel="Ver todos los horarios"
      disabled={disabled}
      maxHeight={264}
      presentation="portal"
      keyboardNavigation
      highlightSelection={false}
    />}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, minWidth: 0 },
});
