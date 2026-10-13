import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SchedulerCalendar } from '../../../../components/scheduling/SchedulerCalendar';
import { Button } from '../../../../components/common';
import { useTheme } from '../../../../contexts/ThemeContext';
import { calendarDate, toCalendarDateKey } from './professionalAgendaUtils';

export function ProfessionalAgendaDatePicker({ visible, selectedDate, onSelect, onClose }: {
  visible: boolean; selectedDate: Date; onSelect: (date: Date) => void; onClose: () => void;
}) {
  const { theme } = useTheme();
  const key = toCalendarDateKey(selectedDate);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable accessibilityLabel="Cerrar selector de fecha" onPress={onClose} style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Pressable onPress={(event) => event.stopPropagation()} accessibilityViewIsModal style={{ width: 360, maxWidth: '100%', backgroundColor: theme.bgCard, padding: 18, borderRadius: 16 }}>
        <SchedulerCalendar current={key} markedDates={{ [key]: { selected: true } }} onSelectDate={(value) => { onSelect(calendarDate(value)); onClose(); }} />
        <View style={{ marginTop: 12 }}><Button variant="outline" size="small" onPress={onClose}>Cerrar</Button></View>
      </Pressable>
    </Pressable>
  </Modal>;
}
