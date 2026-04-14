import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { borderRadius, shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable, Card } from '../../../components/common';
import type { ApiSession } from '../types';
import { createMarkedDates, getSessionCountForDate, getTodayString } from '../utils/calendarHelpers';

interface CalendarPanelProps {
  sessions: ApiSession[];
  selectedDate: string;
  onDateSelect: (dateString: string) => void;
  compact?: boolean;
}

const TABLET_BREAKPOINT = 860;

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  sessions,
  selectedDate,
  onDateSelect,
  compact = false,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);
  const [expanded, setExpanded] = useState(!compact);

  const markedDates = useMemo(() => createMarkedDates(sessions, selectedDate), [sessions, selectedDate]);
  const selectedDateSessions = useMemo(
    () => getSessionCountForDate(sessions, selectedDate),
    [sessions, selectedDate]
  );

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: 'transparent',
      calendarBackground: 'transparent',
      textSectionTitleColor: theme.textMuted,
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.textOnPrimary,
      todayTextColor: theme.primary,
      todayBackgroundColor: theme.primaryAlpha12,
      dayTextColor: theme.textPrimary,
      textDisabledColor: `${theme.textMuted}88`,
      dotColor: theme.primary,
      selectedDotColor: theme.textOnPrimary,
      arrowColor: theme.primary,
      monthTextColor: theme.textPrimary,
      indicatorColor: theme.primary,
      textDayFontWeight: '500' as const,
      textMonthFontWeight: '700' as const,
      textDayHeaderFontWeight: '600' as const,
      textDayFontSize: 14,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 11,
      'stylesheet.calendar.header': {
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
        monthText: {
          fontSize: 16,
          fontWeight: '700' as const,
          color: theme.textPrimary,
          textTransform: 'capitalize',
        },
        arrow: {
          padding: 8,
        },
        week: {
          marginTop: 4,
          flexDirection: 'row',
          justifyContent: 'space-around',
        },
        dayHeader: {
          width: 32,
          textAlign: 'center',
          fontSize: 11,
          fontWeight: '600' as const,
          color: theme.textMuted,
          textTransform: 'uppercase',
        },
      },
      'stylesheet.day.basic': {
        base: {
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 17,
        },
        today: {
          backgroundColor: theme.primaryAlpha12,
          borderRadius: 17,
        },
        selected: {
          backgroundColor: theme.primary,
          borderRadius: 17,
        },
      },
    }),
    [theme]
  );

  if (compact && !expanded) {
    return (
      <AnimatedPressable style={styles.compactHeader} onPress={() => setExpanded(true)} hoverLift={false}>
        <View style={styles.compactLeft}>
          <View style={styles.compactIconShell}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
          </View>
          <View>
            <Text style={styles.compactTitle}>Calendario</Text>
            <Text style={styles.compactSubtitle}>
              {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </AnimatedPressable>
    );
  }

  return (
    <Card variant="default" padding="large" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconShell}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
          </View>
          <Text style={styles.headerTitle}>Calendario</Text>
        </View>

        {compact ? (
          <AnimatedPressable onPress={() => setExpanded(false)} hoverLift={false} pressScale={0.96} style={styles.collapseButton}>
            <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
          </AnimatedPressable>
        ) : null}
      </View>

      <View style={styles.calendarWrap}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => onDateSelect(day.dateString)}
          markedDates={markedDates}
          markingType="multi-dot"
          enableSwipeMonths
          theme={calendarTheme}
          style={styles.calendar}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryCount}>{selectedDateSessions}</Text>
        </View>
        <Text style={styles.summaryText}>
          {selectedDateSessions === 1 ? 'sesión este día' : 'sesiones este día'}
        </Text>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Estado de sesiones</Text>
        <View style={styles.legendItems}>
          <LegendItem label="Confirmada" color={theme.success} styles={styles} />
          <LegendItem label="Pendiente" color={theme.warningAmber} styles={styles} />
          <LegendItem label="Completada" color={theme.textMuted} styles={styles} />
        </View>
      </View>

      <AnimatedPressable style={styles.todayButton} onPress={() => onDateSelect(getTodayString())} hoverLift={false}>
        <Ionicons name="today-outline" size={15} color={theme.primary} />
        <Text style={styles.todayButtonText}>Ir a hoy</Text>
      </AnimatedPressable>
    </Card>
  );
};

const LegendItem = ({
  label,
  color,
  styles,
}: {
  label: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const createStyles = (theme: Theme, isDark: boolean, width: number) => {
  const tablet = width >= TABLET_BREAKPOINT;

  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      ...shadows.md,
    },
    compactHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      ...shadows.sm,
    },
    compactLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    compactIconShell: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    compactTitle: {
      fontSize: 15,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    compactSubtitle: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconShell: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    collapseButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    calendarWrap: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgCard,
      overflow: 'hidden',
    },
    calendar: {
      backgroundColor: 'transparent',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      justifyContent: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    summaryPill: {
      minWidth: 30,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    summaryCount: {
      fontSize: 14,
      fontFamily: theme.fontSansBold,
      color: theme.primary,
    },
    summaryText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    legend: {
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: spacing.sm,
    },
    legendTitle: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    legendItems: {
      flexDirection: tablet ? 'row' : 'column',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    legendText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    todayButton: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    todayButtonText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
  });
};

export default CalendarPanel;
