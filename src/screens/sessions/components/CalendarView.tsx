/**
 * CalendarView Component
 * Single Responsibility: Display calendar with session indicators
 * Modern, elegant design inspired by Apple Calendar and Calendly
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { CalendarViewProps } from '../types';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';
import { createMarkedDates, getTodayString, formatSelectedDateHeader } from '../utils/calendarHelpers';
import { getSessionsForDate } from '../utils/sessionHelpers';
import CompactSessionCard from './CompactSessionCard';

const { width: screenWidth } = Dimensions.get('window');

const CalendarView: React.FC<CalendarViewProps> = ({
  sessions,
  onSessionPress,
  onJoinSession,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    return createMarkedDates(sessions, selectedDate);
  }, [sessions, selectedDate]);

  // Get sessions for selected date
  const sessionsForSelectedDate = useMemo(() => {
    return getSessionsForDate(sessions, selectedDate);
  }, [sessions, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const renderLegend = () => (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: heraLanding.success }]} />
        <Text style={styles.legendText}>Confirmada</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: heraLanding.warningAmber }]} />
        <Text style={styles.legendText}>Pendiente</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: heraLanding.textMuted }]} />
        <Text style={styles.legendText}>Completada</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={40} color={heraLanding.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin sesiones programadas</Text>
      <Text style={styles.emptyDescription}>
        No tienes citas para este día
      </Text>
    </View>
  );

  const renderSessionsList = () => (
    <View style={styles.sessionsList}>
      {sessionsForSelectedDate.map((session) => (
        <CompactSessionCard
          key={session.id}
          session={session}
          onPress={() => onSessionPress?.(session)}
          onJoinPress={() => onJoinSession?.(session.id)}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Calendar Card */}
      <View style={styles.calendarCard}>
        <Calendar
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            backgroundColor: heraLanding.cardBg,
            calendarBackground: heraLanding.cardBg,
            textSectionTitleColor: heraLanding.textSecondary,
            selectedDayBackgroundColor: heraLanding.primary,
            selectedDayTextColor: heraLanding.cardBg,
            todayTextColor: heraLanding.primary,
            todayBackgroundColor: `${heraLanding.primary}15`,
            dayTextColor: heraLanding.textPrimary,
            textDisabledColor: heraLanding.textMuted,
            dotColor: heraLanding.primary,
            selectedDotColor: heraLanding.cardBg,
            arrowColor: heraLanding.primary,
            monthTextColor: heraLanding.textPrimary,
            indicatorColor: heraLanding.primary,
            textDayFontWeight: '500',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 15,
            textMonthFontSize: 17,
            textDayHeaderFontSize: 12,
          }}
          style={styles.calendar}
        />
        {renderLegend()}
      </View>

      {/* Selected Day Sessions Section */}
      <View style={styles.sessionsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="calendar" size={16} color={heraLanding.primary} />
            </View>
            <Text style={styles.sectionTitle}>
              {formatSelectedDateHeader(selectedDate)}
            </Text>
          </View>
          {sessionsForSelectedDate.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {sessionsForSelectedDate.length}
              </Text>
            </View>
          )}
        </View>

        {sessionsForSelectedDate.length === 0
          ? renderEmptyState()
          : renderSessionsList()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  calendarCard: {
    backgroundColor: heraLanding.cardBg,
    marginHorizontal: screenWidth > 768 ? spacing.xxxl : spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendar: {
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    backgroundColor: heraLanding.backgroundAlt,
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
  sessionsSection: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl : spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${heraLanding.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  countBadge: {
    backgroundColor: heraLanding.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: heraLanding.cardBg,
  },
  sessionsList: {
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
});

export default CalendarView;
