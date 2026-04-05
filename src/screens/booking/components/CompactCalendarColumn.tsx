/**
 * CompactCalendarColumn
 * Clean calendar for date selection - ONLY calendar, no extras
 * Part of the 4-column Calendly-style booking layout
 * FIXED: Removed irrelevant info cards, calendar centered
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { branding, heraLanding, colors, spacing, borderRadius, shadows } from '../../../constants/colors';

// Configure Spanish locale for calendar
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ],
  dayNames: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

interface CompactCalendarColumnProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  availableDates?: string[];
  minDate?: string;
}

export const CompactCalendarColumn: React.FC<CompactCalendarColumnProps> = ({
  selectedDate,
  onDateSelect,
  availableDates,
  minDate,
}) => {
  const today = minDate || new Date().toISOString().split('T')[0];

  // Create marked dates object
  const markedDates: { [key: string]: object } = {};

  // Mark available dates if provided
  if (availableDates) {
    availableDates.forEach(date => {
      markedDates[date] = {
        marked: true,
        dotColor: heraLanding.primary,
      };
    });
  }

  // Mark selected date
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: heraLanding.primary,
      selectedTextColor: heraLanding.textOnPrimary,
    };
  }

  const handleDayPress = (day: DateData) => {
    onDateSelect(day.dateString);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Selecciona una fecha</Text>
        <Text style={styles.subtitle}>Elige el dia de tu cita</Text>
      </View>

      {/* Calendar Wrapper - Centers the calendar */}
      <View style={styles.calendarWrapper}>
        <Calendar
          current={today}
          minDate={today}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          hideExtraDays={true}
          enableSwipeMonths={true}
          firstDay={1}
          monthFormat={'MMMM yyyy'}
          theme={{
            backgroundColor: heraLanding.cardBg,
            calendarBackground: heraLanding.cardBg,
            monthTextColor: heraLanding.textPrimary,
            textMonthFontWeight: '700',
            textMonthFontSize: 18,
            textSectionTitleColor: heraLanding.textSecondary,
            textDayHeaderFontWeight: '600',
            textDayHeaderFontSize: 13,
            dayTextColor: heraLanding.textPrimary,
            textDayFontWeight: '500',
            textDayFontSize: 15,
            todayTextColor: heraLanding.primary,
            todayBackgroundColor: 'transparent',
            selectedDayBackgroundColor: heraLanding.primary,
            selectedDayTextColor: heraLanding.textOnPrimary,
            textDisabledColor: heraLanding.scrollbarThumb,
            arrowColor: heraLanding.primary,
            arrowHeight: 20,
            arrowWidth: 20,
            dotColor: heraLanding.primary,
            selectedDotColor: heraLanding.textOnPrimary,
          }}
          style={styles.calendar}
        />
      </View>

      {/* Selected Date Confirmation */}
      {selectedDate && (
        <View style={styles.selectedDateBanner}>
          <Ionicons name="checkmark-circle" size={18} color={heraLanding.primary} />
          <Text style={styles.selectedDateText}>
            {new Date(selectedDate).toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 320,
    maxWidth: 400,
    maxHeight: '100%',
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  calendarWrapper: {
    flex: 1,
    padding: spacing.md,
    paddingTop: spacing.sm,
    justifyContent: 'center',
  },
  calendar: {
    borderRadius: borderRadius.md,
  },
  selectedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: `${heraLanding.primary}10`,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    flexShrink: 0,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    textTransform: 'capitalize',
  },
});

export default CompactCalendarColumn;
