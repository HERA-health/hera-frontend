import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';

LocaleConfig.locales.es = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
  today: 'Hoy',
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
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isCompact), [theme, isDark, isCompact]);
  const today = minDate || new Date().toISOString().split('T')[0];
  const calendarSurface = isDark ? theme.bgElevated : '#FFFFFF';
  const calendarBorder = isDark ? theme.borderLight : theme.border;
  const calendarTheme = useMemo(
    () => ({
      backgroundColor: calendarSurface,
      calendarBackground: calendarSurface,
      monthTextColor: theme.textPrimary,
      textMonthFontWeight: '700' as const,
      textMonthFontSize: isCompact ? 16 : 18,
      textSectionTitleColor: theme.textMuted,
      textDayHeaderFontWeight: '600' as const,
      textDayHeaderFontSize: isCompact ? 10 : 11,
      dayTextColor: theme.textPrimary,
      textDayFontWeight: '500' as const,
      textDayFontSize: isCompact ? 13 : 14,
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
      isCompact,
      theme.primary,
      theme.secondary,
      theme.secondaryDark,
      theme.textMuted,
      theme.textOnPrimary,
      theme.textPrimary,
    ],
  );
  const calendarKey = `${isDark ? 'dark' : 'light'}-${isCompact ? 'compact' : 'regular'}`;

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
    onDateSelect(day.dateString);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una fecha</Text>
      <Text style={styles.subtitle}>Elige el dia que mejor encaje con tu agenda.</Text>

      <View style={styles.calendarShell}>
        <Calendar
          key={calendarKey}
          current={today}
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
            ? new Date(selectedDate).toLocaleDateString('es-ES', {
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
  isCompact: boolean,
) => {
  const calendarSurface = isDark ? theme.bgElevated : '#FFFFFF';
  const calendarBorder = isDark ? theme.borderLight : theme.border;

  return StyleSheet.create({
    container: {
      flexGrow: isCompact ? 0 : 1,
      flexShrink: 0,
      flexBasis: isCompact ? 'auto' : 0,
      width: '100%',
      minWidth: isCompact ? 0 : 300,
      maxWidth: isCompact ? 9999 : 360,
      alignSelf: 'stretch',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    title: {
      fontSize: 16,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    subtitle: {
      marginTop: -4,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    calendarShell: {
      width: '100%',
      minHeight: isCompact ? 292 : undefined,
      borderWidth: 1,
      borderColor: calendarBorder,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: calendarSurface,
    },
    calendar: {
      width: '100%',
      minHeight: isCompact ? 280 : undefined,
      paddingBottom: spacing.xs,
    },
    helperBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: borderRadius.md,
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
      textTransform: 'capitalize',
    },
  });
};
export default CompactCalendarColumn;
