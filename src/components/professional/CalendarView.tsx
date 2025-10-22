import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { ProfessionalSession } from '../../constants/types';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarViewProps {
  sessions: ProfessionalSession[];
}

export function CalendarView({ sessions }: CalendarViewProps) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Create marked dates object for the calendar
  const markedDates = useMemo(() => {
    const marked: any = {};

    sessions.forEach((session) => {
      const dateStr = session.date.toISOString().split('T')[0];

      if (!marked[dateStr]) {
        marked[dateStr] = {
          dots: [],
        };
      }

      // Add dot based on session status
      const dot = {
        key: session.id,
        color:
          session.status === 'scheduled'
            ? colors.primary.main
            : session.status === 'pending'
            ? colors.secondary.orange
            : colors.neutral.gray400,
      };

      marked[dateStr].dots.push(dot);
    });

    // Add selected date styling
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = colors.primary[100];
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary[100],
        dots: [],
      };
    }

    return marked;
  }, [sessions, selectedDate]);

  // Get sessions for selected date
  const sessionsForSelectedDate = useMemo(() => {
    return sessions
      .filter((session) => {
        const sessionDateStr = session.date.toISOString().split('T')[0];
        return sessionDateStr === selectedDate;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sessions, selectedDate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getSessionTypeIcon = (type: ProfessionalSession['type']) => {
    switch (type) {
      case 'video':
        return 'videocam';
      case 'audio':
        return 'call';
      case 'chat':
        return 'chatbubbles';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: colors.neutral.white,
              calendarBackground: colors.neutral.white,
              textSectionTitleColor: colors.neutral.gray600,
              selectedDayBackgroundColor: colors.primary.main,
              selectedDayTextColor: colors.neutral.white,
              todayTextColor: colors.primary.main,
              dayTextColor: colors.neutral.gray900,
              textDisabledColor: colors.neutral.gray300,
              dotColor: colors.primary.main,
              selectedDotColor: colors.neutral.white,
              arrowColor: colors.primary.main,
              monthTextColor: colors.neutral.gray900,
              indicatorColor: colors.primary.main,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 15,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            style={styles.calendar}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary.main }]} />
              <Text style={styles.legendText}>Confirmada</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.secondary.orange }]} />
              <Text style={styles.legendText}>Pendiente</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.neutral.gray400 }]} />
              <Text style={styles.legendText}>Completada</Text>
            </View>
          </View>
        </View>

        {/* Sessions for selected date */}
        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {formatSelectedDate(selectedDate)}
            </Text>
            {sessionsForSelectedDate.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{sessionsForSelectedDate.length}</Text>
              </View>
            )}
          </View>

          {sessionsForSelectedDate.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.neutral.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No hay sesiones programadas</Text>
              <Text style={styles.emptyDescription}>
                Selecciona otro día para ver las sesiones
              </Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {sessionsForSelectedDate.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    {/* Time */}
                    <View style={styles.sessionTime}>
                      <Text style={styles.sessionTimeText}>{formatTime(session.date)}</Text>
                      <View
                        style={[
                          styles.sessionStatusDot,
                          session.status === 'scheduled' && styles.sessionStatusDotScheduled,
                          session.status === 'pending' && styles.sessionStatusDotPending,
                          session.status === 'completed' && styles.sessionStatusDotCompleted,
                        ]}
                      />
                    </View>

                    {/* Divider */}
                    <View style={styles.sessionDivider} />

                    {/* Client info */}
                    <View style={styles.sessionInfo}>
                      <View style={styles.clientSection}>
                        <View style={styles.clientAvatar}>
                          <Text style={styles.clientAvatarText}>{session.clientInitial}</Text>
                        </View>
                        <View style={styles.clientInfo}>
                          <Text style={styles.clientName}>{session.clientName}</Text>
                          <View style={styles.sessionMeta}>
                            <Ionicons
                              name={getSessionTypeIcon(session.type)}
                              size={14}
                              color={colors.neutral.gray500}
                            />
                            <Text style={styles.metaText}>{session.duration} min</Text>
                          </View>
                        </View>
                      </View>

                      {/* Action button */}
                      <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="arrow-forward" size={20} color={colors.primary.main} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Notes */}
                  {session.notes && (
                    <View style={styles.notesSection}>
                      <Ionicons
                        name="document-text-outline"
                        size={14}
                        color={colors.neutral.gray600}
                      />
                      <Text style={styles.notesText} numberOfLines={2}>
                        {session.notes}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.neutral.white,
    marginHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  calendar: {
    borderRadius: 20,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray50,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  sessionsSection: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    textTransform: 'capitalize',
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  sessionsList: {
    gap: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTime: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  sessionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionStatusDotScheduled: {
    backgroundColor: colors.primary.main,
  },
  sessionStatusDotPending: {
    backgroundColor: colors.secondary.orange,
  },
  sessionStatusDotCompleted: {
    backgroundColor: colors.neutral.gray400,
  },
  sessionDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.md,
  },
  sessionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: colors.neutral.gray600,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary[50],
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.gray700,
    lineHeight: 18,
  },
});
