import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Calendar, type CalendarProps, type DateData } from 'react-native-calendars';

import { borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

export interface SchedulerCalendarProps {
  current: string;
  density?: 'comfortable' | 'compact';
  enableSwipeMonths?: boolean;
  minDate?: string;
  maxDate?: string;
  markedDates?: CalendarProps['markedDates'];
  markingType?: CalendarProps['markingType'];
  testID?: string;
  onSelectDate: (date: string) => void;
}

export function SchedulerCalendar({
  current,
  density = 'comfortable',
  enableSwipeMonths = true,
  minDate,
  maxDate,
  markedDates,
  markingType,
  testID,
  onSelectDate,
}: SchedulerCalendarProps): React.ReactElement {
  const { theme, isDark } = useTheme();
  const calendarTheme = useMemo(
    () => ({
      backgroundColor: 'transparent',
      calendarBackground: 'transparent',
      monthTextColor: theme.textPrimary,
      textMonthFontWeight: '700' as const,
      textMonthFontSize: 16,
      textSectionTitleColor: theme.textMuted,
      textDayHeaderFontWeight: '600' as const,
      textDayHeaderFontSize: 11,
      dayTextColor: theme.textPrimary,
      textDayFontWeight: '500' as const,
      textDayFontSize: 14,
      todayTextColor: theme.primary,
      todayBackgroundColor: 'transparent',
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.textOnPrimary,
      textDisabledColor: theme.textMuted,
      arrowColor: theme.primary,
      dotColor: theme.secondary,
      selectedDotColor: theme.textOnPrimary,
      weekVerticalMargin: density === 'compact' ? 2 : 7,
    }),
    [
      density,
      theme.primary,
      theme.secondary,
      theme.textMuted,
      theme.textOnPrimary,
      theme.textPrimary,
    ],
  );

  return (
    <Calendar
      testID={testID}
      key={isDark ? 'scheduler-calendar-dark' : 'scheduler-calendar-light'}
      current={current}
      minDate={minDate}
      maxDate={maxDate}
      markedDates={markedDates}
      markingType={markingType}
      onDayPress={(day: DateData) => onSelectDate(day.dateString)}
      enableSwipeMonths={enableSwipeMonths}
      firstDay={1}
      hideExtraDays
      monthFormat="MMMM yyyy"
      theme={calendarTheme}
      style={styles.calendar}
    />
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
});
