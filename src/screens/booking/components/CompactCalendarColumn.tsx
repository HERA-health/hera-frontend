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
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { branding, colors, spacing, borderRadius, shadows } from '../../../constants/colors';

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
  const markedDates: { [key: string]: any } = {};

  // Mark available dates if provided
  if (availableDates) {
    availableDates.forEach(date => {
      markedDates[date] = {
        marked: true,
        dotColor: branding.primary,
      };
    });
  }

  // Mark selected date
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: branding.primary,
      selectedTextColor: branding.cardBackground,
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
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            monthTextColor: branding.text,
            textMonthFontWeight: '700',
            textMonthFontSize: 16,
            textSectionTitleColor: branding.textSecondary,
            textDayHeaderFontWeight: '600',
            textDayHeaderFontSize: 12,
            dayTextColor: branding.text,
            textDayFontWeight: '500',
            textDayFontSize: 14,
            todayTextColor: branding.accent,
            todayBackgroundColor: 'transparent',
            selectedDayBackgroundColor: branding.primary,
            selectedDayTextColor: branding.cardBackground,
            textDisabledColor: branding.textLight,
            arrowColor: branding.primary,
            arrowHeight: 20,
            arrowWidth: 20,
            dotColor: branding.primary,
            selectedDotColor: branding.cardBackground,
          }}
          style={styles.calendar}
        />
      </View>

      {/* Selected Date Confirmation */}
      {selectedDate && (
        <View style={styles.selectedDateBanner}>
          <Ionicons name="checkmark-circle" size={18} color={branding.primary} />
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
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: branding.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: branding.textSecondary,
  },
  calendarWrapper: {
    flex: 1,
    padding: spacing.md,
    paddingTop: spacing.sm,
    justifyContent: 'center', // Center calendar vertically
  },
  calendar: {
    borderRadius: borderRadius.md,
  },
  selectedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: `${branding.primary}10`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
    flexShrink: 0,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.primary,
    textTransform: 'capitalize',
  },
});

export default CompactCalendarColumn;
