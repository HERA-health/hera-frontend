import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius } from '../../../constants/colors';
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

export const CompactCalendarColumn: React.FC<CompactCalendarColumnProps> = ({
  selectedDate,
  onDateSelect,
  availableDates,
  minDate,
  disabled = false,
  busy = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const today = minDate || getMadridDateKey();
  const initialCalendarDate = selectedDate || today;
  const calendarSurface = isDark ? theme.bgElevated : theme.bgCard;
  const calendarBorder = isDark ? theme.borderLight : theme.border;
  const calendarTheme = useMemo(
    () => ({
      backgroundColor: calendarSurface,
      calendarBackground: calendarSurface,
      monthTextColor: theme.textPrimary,
      textMonthFontWeight: '700' as const,
      textMonthFontSize: 17,
      textSectionTitleColor: theme.textSecondary,
      textDayHeaderFontWeight: '600' as const,
      textDayHeaderFontSize: 11,
      dayTextColor: theme.textPrimary,
      textDayFontWeight: '500' as const,
      textDayFontSize: 14,
      todayTextColor: theme.secondaryDark,
      todayBackgroundColor: 'transparent',
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.textOnPrimary,
      textDisabledColor: theme.textMuted,
      arrowColor: theme.primary,
      dotColor: theme.secondary,
      selectedDotColor: theme.textOnPrimary,
    }),
    [
      calendarSurface,
      theme.primary,
      theme.secondary,
      theme.secondaryDark,
      theme.textMuted,
      theme.textOnPrimary,
      theme.textPrimary,
      theme.textSecondary,
    ],
  );
  const calendarKey = isDark ? 'dark' : 'light';

  const markedDates = useMemo(() => {
    const dates: Record<string, object> = {};

    availableDates?.forEach((date) => {
      dates[date] = {
        marked: true,
        dotColor: theme.secondary,
      };
    });

    if (selectedDate) {
      dates[selectedDate] = {
        ...(dates[selectedDate] ?? {}),
        selected: true,
        selectedColor: theme.primary,
        selectedTextColor: theme.textOnPrimary,
      };
    }

    return dates;
  }, [availableDates, selectedDate, theme.primary, theme.secondary, theme.textOnPrimary]);

  const handleDayPress = (day: DateData) => {
    if (disabled || busy) {
      return;
    }

    onDateSelect(day.dateString);
  };

  return (
    <View
      accessibilityState={{ busy, disabled }}
      pointerEvents={disabled || busy ? 'none' : 'auto'}
      style={styles.container}
    >
      <View style={styles.heading}>
        <View style={styles.iconShell}>
          <Ionicons name="calendar-outline" size={17} color={theme.primary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Selecciona una fecha</Text>
          <Text style={styles.subtitle}>Elige el día que mejor encaje contigo.</Text>
        </View>
      </View>

      <View style={styles.calendarShell}>
        <Calendar
          key={calendarKey}
          current={initialCalendarDate}
          initialDate={initialCalendarDate}
          minDate={today}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          hideExtraDays
          enableSwipeMonths
          firstDay={1}
          monthFormat="MMMM yyyy"
          theme={calendarTheme}
          style={[styles.calendar, { backgroundColor: calendarSurface }]}
        />
      </View>

      <View style={styles.helperBanner}>
        <Ionicons name="sparkles-outline" size={16} color={theme.secondaryDark} />
        <Text style={styles.helperText}>
          {selectedDate
            ? formatMadridDateKey(selectedDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : 'Las fechas disponibles se actualizan al momento.'}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) => {
  const calendarSurface = isDark ? theme.bgElevated : theme.bgCard;
  const calendarBorder = isDark ? theme.borderLight : theme.border;

  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      minHeight: 410,
      gap: spacing.sm,
    },
    heading: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconShell: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.primaryAlpha12,
    },
    headingCopy: {
      flex: 1,
      gap: 1,
    },
    title: {
      fontSize: 15,
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      lineHeight: 16,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    calendarShell: {
      width: '100%',
      minHeight: 306,
      borderWidth: 1,
      borderColor: isDark ? calendarBorder : theme.textMuted,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: calendarSurface,
    },
    calendar: {
      width: '100%',
      minHeight: 294,
      paddingBottom: spacing.xs,
    },
    helperBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    helperText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
  });
};
export default CompactCalendarColumn;
