/**
 * SessionsList Component
 * Left column: Beautiful scrollable list of sessions grouped by date
 * Inspired by Todoist, Things 3, Apple Reminders - clean, organized, delightful
 *
 * CRITICAL: Background harmony with #F5F7F5 (Light Sage)
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';
import { ApiSession } from '../types';
import { groupSessions, isToday, isTomorrow, formatShortDate } from '../utils/sessionHelpers';
import { getDateString } from '../utils/calendarHelpers';
import SessionCard from './SessionCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

interface SessionsListProps {
  sessions: ApiSession[];
  selectedDate: string;
  onSessionPress?: (session: ApiSession) => void;
  onJoinSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  embedded?: boolean; // For mobile: part of parent scroll
}

interface DateGroup {
  date: string;
  dateLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  sessions: ApiSession[];
  isUpcoming: boolean;
}

const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  selectedDate,
  onSessionPress,
  onJoinSession,
  onCancelSession,
  onRefresh,
  refreshing = false,
  embedded = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Group sessions by date
  const { upcomingGroups, pastGroups, upcomingCount, pastCount } = useMemo(() => {
    const { upcoming, past } = groupSessions(sessions);

    // Group upcoming sessions by date
    const upcomingByDate = new Map<string, ApiSession[]>();
    upcoming.forEach((session) => {
      const dateStr = getDateString(new Date(session.date));
      if (!upcomingByDate.has(dateStr)) {
        upcomingByDate.set(dateStr, []);
      }
      upcomingByDate.get(dateStr)!.push(session);
    });

    // Group past sessions by date (reverse chronological - most recent first)
    const pastByDate = new Map<string, ApiSession[]>();
    [...past].reverse().forEach((session) => {
      const dateStr = getDateString(new Date(session.date));
      if (!pastByDate.has(dateStr)) {
        pastByDate.set(dateStr, []);
      }
      pastByDate.get(dateStr)!.push(session);
    });

    // Convert to array of DateGroups
    const upcomingGroups: DateGroup[] = Array.from(upcomingByDate.entries()).map(([date, sessions]) => ({
      date,
      dateLabel: getDateLabel(date),
      isToday: isToday(sessions[0].date),
      isTomorrow: isTomorrow(sessions[0].date),
      sessions: sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      isUpcoming: true,
    }));

    const pastGroups: DateGroup[] = Array.from(pastByDate.entries()).map(([date, sessions]) => ({
      date,
      dateLabel: formatDateFull(date),
      isToday: false,
      isTomorrow: false,
      sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      isUpcoming: false,
    }));

    return {
      upcomingGroups,
      pastGroups,
      upcomingCount: upcoming.length,
      pastCount: past.length,
    };
  }, [sessions]);

  // Scroll to selected date when it changes
  useEffect(() => {
    // Future: Implement scroll-to-date functionality
    // This would require measuring the position of each date group
  }, [selectedDate]);

  const renderSectionHeader = (title: string, count: number, icon: string, isUpcoming: boolean) => (
    <View style={[styles.sectionHeader, isUpcoming ? styles.sectionHeaderUpcoming : styles.sectionHeaderPast]}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconBg, isUpcoming ? styles.sectionIconBgUpcoming : styles.sectionIconBgPast]}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={isUpcoming ? heraLanding.success : heraLanding.textSecondary}
          />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={[styles.sectionBadge, isUpcoming ? styles.sectionBadgeUpcoming : styles.sectionBadgePast]}>
        <Text style={[styles.sectionBadgeText, isUpcoming ? styles.sectionBadgeTextUpcoming : styles.sectionBadgeTextPast]}>
          {count}
        </Text>
      </View>
    </View>
  );

  const renderDateHeader = (group: DateGroup, isFirst: boolean = false) => {
    const iconName = group.isToday ? 'sunny' : group.isTomorrow ? 'partly-sunny' : 'calendar-outline';

    return (
      <View style={[styles.dateHeader, group.isToday && styles.dateHeaderToday]}>
        <View style={styles.dateHeaderLeft}>
          <View style={[styles.dateIconBg, group.isToday && styles.dateIconBgToday]}>
            <Ionicons
              name={iconName}
              size={14}
              color={group.isToday ? heraLanding.primary : heraLanding.textSecondary}
            />
          </View>
          <View>
            <Text style={[styles.dateHeaderText, group.isToday && styles.dateHeaderTextToday]}>
              {group.isToday ? 'Hoy' : group.isTomorrow ? 'Mañana' : formatDayName(group.date)}
            </Text>
            <Text style={styles.dateSubtext}>
              {formatDateShort(group.date)}
            </Text>
          </View>
        </View>
        <View style={styles.dateSessionCount}>
          <Text style={styles.dateSessionCountText}>
            {group.sessions.length} {group.sessions.length === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSessionCard = (session: ApiSession, index: number, isLast: boolean) => (
    <View key={session.id} style={[styles.cardWrapper, isLast && styles.cardWrapperLast]}>
      <SessionCard
        session={session}
        onPress={() => onSessionPress?.(session)}
        onJoinPress={() => onJoinSession?.(session.id)}
        onCancelPress={() => onCancelSession?.(session.id)}
      />
    </View>
  );

  const renderNoUpcomingSessions = () => (
    <View style={styles.noSessionsCard}>
      <View style={styles.noSessionsIconBg}>
        <Ionicons name="checkmark-circle" size={32} color={heraLanding.success} />
      </View>
      <View style={styles.noSessionsContent}>
        <Text style={styles.noSessionsTitle}>Estás al día</Text>
        <Text style={styles.noSessionsText}>
          No tienes sesiones próximas programadas
        </Text>
      </View>
    </View>
  );

  const content = (
    <View style={styles.contentContainer}>
      {/* Upcoming Sessions Section */}
      <View style={styles.section}>
        {renderSectionHeader('Próximas sesiones', upcomingCount, 'arrow-forward-circle', true)}

        {upcomingGroups.length > 0 ? (
          <View style={styles.groupsContainer}>
            {upcomingGroups.map((group, groupIndex) => (
              <View key={group.date} style={styles.dateGroup}>
                {renderDateHeader(group, groupIndex === 0)}
                <View style={styles.sessionsContainer}>
                  {group.sessions.map((session, index) =>
                    renderSessionCard(session, index, index === group.sessions.length - 1)
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          renderNoUpcomingSessions()
        )}
      </View>

      {/* Past Sessions (History) Section */}
      {pastGroups.length > 0 && (
        <View style={[styles.section, styles.historySection]}>
          {/* Elegant separator */}
          <View style={styles.historySeparator}>
            <View style={styles.separatorLineGradient} />
          </View>

          {renderSectionHeader('Historial', pastCount, 'time', false)}

          <View style={styles.groupsContainer}>
            {pastGroups.map((group, groupIndex) => (
              <View key={group.date} style={[styles.dateGroup, styles.dateGroupHistory]}>
                {renderDateHeader(group, groupIndex === 0)}
                <View style={styles.sessionsContainer}>
                  {group.sessions.map((session, index) =>
                    renderSessionCard(session, index, index === group.sessions.length - 1)
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Embedded mode (for mobile - part of parent scroll)
  if (embedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
  }

  // Standalone scrollable (for desktop)
  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[heraLanding.primary]}
            tintColor={heraLanding.primary}
          />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  );
};

// Helper function to get date label
function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  }
  return formatDateFull(dateString);
}

// Helper function to format full date
function formatDateFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Helper function to format day name
function formatDayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
  });
}

// Helper function to format short date
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl + 20,
  },
  embeddedContainer: {
    marginTop: spacing.md,
  },
  contentContainer: {
    // Content wrapper
  },

  // Section styles
  section: {
    marginBottom: spacing.lg,
  },
  historySection: {
    marginTop: spacing.md,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  sectionHeaderUpcoming: {
    // Upcoming specific styles
  },
  sectionHeaderPast: {
    // Past specific styles
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconBgUpcoming: {
    backgroundColor: `${heraLanding.success}15`,
  },
  sectionIconBgPast: {
    backgroundColor: `${heraLanding.textSecondary}12`,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: -0.3,
  },
  sectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeUpcoming: {
    backgroundColor: heraLanding.success,
  },
  sectionBadgePast: {
    backgroundColor: `${heraLanding.textSecondary}20`,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBadgeTextUpcoming: {
    color: colors.neutral.white,
  },
  sectionBadgeTextPast: {
    color: heraLanding.textSecondary,
  },

  // Groups container
  groupsContainer: {
    gap: spacing.lg,
  },

  // Date group
  dateGroup: {
    // Wrapper for date header + sessions
  },
  dateGroupHistory: {
    opacity: 0.9,
  },

  // Date header - beautiful, clear
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateHeaderToday: {
    backgroundColor: `${heraLanding.primary}08`,
    borderWidth: 1,
    borderColor: `${heraLanding.primary}20`,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateIconBgToday: {
    backgroundColor: `${heraLanding.primary}15`,
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  dateHeaderTextToday: {
    color: heraLanding.primary,
  },
  dateSubtext: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  dateSessionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: heraLanding.background,
    borderRadius: 8,
  },
  dateSessionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },

  // Sessions container
  sessionsContainer: {
    gap: spacing.md,
  },
  cardWrapper: {
    // Individual card wrapper
  },
  cardWrapperLast: {
    marginBottom: 0,
  },

  // No sessions card - positive, encouraging
  noSessionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  noSessionsIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${heraLanding.success}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSessionsContent: {
    flex: 1,
  },
  noSessionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  noSessionsText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },

  // History separator - elegant
  historySeparator: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  separatorLineGradient: {
    width: '80%',
    height: 1,
    backgroundColor: heraLanding.border,
    borderRadius: 1,
  },
});

export default SessionsList;
