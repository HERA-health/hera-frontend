/**
 * CalendarPanel Component
 * Right column: Elegant mini calendar for date navigation
 * Apple Calendar widget inspired - clean, minimal, beautiful
 *
 * CRITICAL: Maintains #F5F7F5 background harmony
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';
import { ApiSession } from '../types';
import { createMarkedDates, getTodayString, getSessionCountForDate } from '../utils/calendarHelpers';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

interface CalendarPanelProps {
  sessions: ApiSession[];
  selectedDate: string;
  onDateSelect: (dateString: string) => void;
  compact?: boolean; // For mobile collapsed view
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  sessions,
  selectedDate,
  onDateSelect,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const calendarTheme = useMemo(
    () =>
      ({
        backgroundColor: 'transparent',
        calendarBackground: 'transparent',
        textSectionTitleColor: heraLanding.textMuted,
        selectedDayBackgroundColor: heraLanding.primary,
        selectedDayTextColor: colors.neutral.white,
        todayTextColor: heraLanding.primary,
        todayBackgroundColor: `${heraLanding.primary}12`,
        dayTextColor: heraLanding.textPrimary,
        textDisabledColor: `${heraLanding.textMuted}80`,
        dotColor: heraLanding.primary,
        selectedDotColor: colors.neutral.white,
        arrowColor: heraLanding.primary,
        monthTextColor: heraLanding.textPrimary,
        indicatorColor: heraLanding.primary,
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
            paddingHorizontal: 8,
            paddingVertical: 8,
          },
          monthText: {
            fontSize: 16,
            fontWeight: '700' as const,
            color: heraLanding.textPrimary,
            textTransform: 'capitalize',
          },
          arrow: {
            padding: 8,
          },
          week: {
            marginTop: 4,
            flexDirection: 'row',
            justifyContent: 'space-around',
            borderBottomWidth: 0,
          },
          dayHeader: {
            width: 32,
            textAlign: 'center',
            fontSize: 11,
                fontWeight: '600' as const,
            color: heraLanding.textMuted,
            textTransform: 'uppercase',
          },
        },
        'stylesheet.day.basic': {
          base: {
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
          },
          today: {
            backgroundColor: `${heraLanding.primary}12`,
            borderRadius: 16,
          },
          selected: {
            backgroundColor: heraLanding.primary,
            borderRadius: 16,
          },
        },
      }),
    []
  );

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    return createMarkedDates(sessions, selectedDate);
  }, [sessions, selectedDate]);

  // Count sessions for selected date
  const selectedDateSessions = useMemo(() => {
    return getSessionCountForDate(sessions, selectedDate);
  }, [sessions, selectedDate]);

  const handleDayPress = (day: DateData) => {
    onDateSelect(day.dateString);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Get month name for header
  const getMonthHeader = () => {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Compact header for mobile (when collapsed)
  if (compact && !isExpanded) {
    const today = new Date();
    const monthYear = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    return (
      <TouchableOpacity style={styles.compactHeader} onPress={toggleExpanded}>
        <View style={styles.compactHeaderLeft}>
          <View style={styles.compactIconBg}>
            <Ionicons name="calendar" size={18} color={heraLanding.primary} />
          </View>
          <View>
            <Text style={styles.compactHeaderText}>{monthYear}</Text>
            <Text style={styles.compactSubtext}>
              {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}
            </Text>
          </View>
        </View>
        <View style={styles.compactChevron}>
          <Ionicons name="chevron-down" size={18} color={heraLanding.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerMobile]}>
      {/* Header with title */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="calendar" size={20} color={heraLanding.primary} />
          </View>
          <Text style={styles.headerTitle}>Calendario</Text>
        </View>

        {/* Collapse button for mobile */}
        {compact && (
          <TouchableOpacity style={styles.collapseButton} onPress={toggleExpanded}>
            <Ionicons name="chevron-up" size={18} color={heraLanding.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType="multi-dot"
          enableSwipeMonths={true}
          theme={calendarTheme}
          style={styles.calendar}
        />
      </View>

      {/* Selected date info */}
      {selectedDateSessions > 0 && (
        <View style={styles.selectedDateInfo}>
          <View style={styles.selectedDateBadge}>
            <Text style={styles.selectedDateCount}>{selectedDateSessions}</Text>
          </View>
          <Text style={styles.selectedDateText}>
            {selectedDateSessions === 1 ? 'sesión' : 'sesiones'} este día
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Estado de sesiones</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#7BA377' }]} />
            <Text style={styles.legendText}>Confirmada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D9A84F' }]} />
            <Text style={styles.legendText}>Pendiente</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9BA39B' }]} />
            <Text style={styles.legendText}>Completada</Text>
          </View>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onDateSelect(getTodayString())}
        >
          <Ionicons name="today-outline" size={16} color={heraLanding.primary} />
          <Text style={styles.quickActionText}>Ir a hoy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    // Sticky positioning hint for desktop
    position: 'relative',
  },
  containerMobile: {
    marginBottom: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: -0.3,
  },

  // Calendar
  calendarContainer: {
    paddingHorizontal: spacing.sm,
  },
  calendar: {
    borderRadius: borderRadius.lg,
  },

  // Selected date info
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  selectedDateBadge: {
    backgroundColor: heraLanding.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  selectedDateText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },

  // Legend
  legend: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },

  // Quick actions
  quickActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    marginTop: spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${heraLanding.primary}08`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${heraLanding.primary}20`,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Compact/Mobile styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  compactSubtext: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  compactChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CalendarPanel;
