import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { borderRadius, shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import type { ApiSession } from '../types';
import { groupSessions, isToday, isTomorrow } from '../utils/sessionHelpers';
import { getDateString } from '../utils/calendarHelpers';
import SessionCard from './SessionCard';

interface SessionsListProps {
  sessions: ApiSession[];
  selectedDate: string;
  onJoinSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
  onLeaveReview?: (session: ApiSession) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  embedded?: boolean;
}

interface DateGroup {
  date: string;
  isToday: boolean;
  isTomorrow: boolean;
  sessions: ApiSession[];
}

const DESKTOP_BREAKPOINT = 1120;

const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  selectedDate,
  onJoinSession,
  onCancelSession,
  onLeaveReview,
  onRefresh,
  refreshing = false,
  embedded = false,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);

  const { upcomingGroups, pastGroups, upcomingCount, pastCount } = useMemo(() => {
    const { upcoming, past } = groupSessions(sessions);

    const toGroups = (items: ApiSession[], reverse: boolean): DateGroup[] => {
      const grouped = new Map<string, ApiSession[]>();
      const source = reverse ? [...items].reverse() : items;

      source.forEach(session => {
        const date = getDateString(new Date(session.date));
        if (!grouped.has(date)) grouped.set(date, []);
        grouped.get(date)?.push(session);
      });

      return Array.from(grouped.entries()).map(([date, sessionsForDate]) => ({
        date,
        isToday: isToday(sessionsForDate[0].date),
        isTomorrow: isTomorrow(sessionsForDate[0].date),
        sessions: reverse
          ? sessionsForDate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          : sessionsForDate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      })).sort((a, b) => (
        reverse
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
    };

    return {
      upcomingGroups: toGroups(upcoming, false),
      pastGroups: toGroups(past, true),
      upcomingCount: upcoming.length,
      pastCount: past.length,
    };
  }, [sessions]);

  const selectedDateUpcoming = useMemo(
    () => upcomingGroups.find(group => group.date === selectedDate),
    [selectedDate, upcomingGroups]
  );

  const renderSectionHeader = (
    title: string,
    count: number,
    icon: keyof typeof Ionicons.glyphMap,
    accent: string
  ) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconShell, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={17} color={accent} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <View style={[styles.sectionCount, { backgroundColor: `${accent}16` }]}>
        <Text style={[styles.sectionCountText, { color: accent }]}>{count}</Text>
      </View>
    </View>
  );

  const renderDateHeader = (group: DateGroup) => {
    const title = group.isToday ? 'Hoy' : group.isTomorrow ? 'Mañana' : formatDayName(group.date);
    const subtitle = formatDateShort(group.date);

    return (
      <View style={[styles.dateHeader, group.date === selectedDate && styles.dateHeaderSelected]}>
        <View style={styles.dateHeaderLeft}>
          <View style={[styles.dateIconShell, group.isToday && styles.dateIconShellToday]}>
            <Ionicons
              name={group.isToday ? 'sunny-outline' : group.isTomorrow ? 'partly-sunny-outline' : 'calendar-outline'}
              size={14}
              color={group.isToday ? theme.primary : theme.textSecondary}
            />
          </View>
          <View>
            <Text style={styles.dateTitle}>{title}</Text>
            <Text style={styles.dateSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.groupCountPill}>
          <Text style={styles.groupCountText}>
            {group.sessions.length} {group.sessions.length === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </View>
      </View>
    );
  };

  const renderNoUpcoming = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconShell}>
        <Ionicons name="checkmark" size={26} color={theme.success} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>Estás al día</Text>
        <Text style={styles.emptySubtitle}>No tienes sesiones próximas programadas.</Text>
      </View>
    </View>
  );

  const content = (
    <View style={styles.content}>
      <View style={styles.section}>
        {renderSectionHeader('Próximas sesiones', upcomingCount, 'arrow-forward-circle-outline', theme.success)}

        {selectedDateUpcoming ? (
          <View style={styles.focusedDayBlock}>
            <Text style={styles.focusedDayLabel}>Fecha seleccionada</Text>
            {renderDateHeader(selectedDateUpcoming)}
            <View style={styles.cardsStack}>
              {selectedDateUpcoming.sessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onJoinPress={() => onJoinSession?.(session.id)}
                  onCancelPress={() => onCancelSession?.(session.id)}
                  onLeaveReviewPress={onLeaveReview ? () => onLeaveReview(session) : undefined}
                  hasReview={session.hasReview}
                />
              ))}
            </View>
          </View>
        ) : upcomingGroups.length > 0 ? (
          <View style={styles.groupList}>
            {upcomingGroups.map(group => (
              <View key={group.date} style={styles.groupBlock}>
                {renderDateHeader(group)}
                <View style={styles.cardsStack}>
                  {group.sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onJoinPress={() => onJoinSession?.(session.id)}
                      onCancelPress={() => onCancelSession?.(session.id)}
                      onLeaveReviewPress={onLeaveReview ? () => onLeaveReview(session) : undefined}
                      hasReview={session.hasReview}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          renderNoUpcoming()
        )}
      </View>

      {pastGroups.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.separator} />
          {renderSectionHeader('Historial', pastCount, 'time-outline', theme.textMuted)}
          <View style={styles.groupList}>
            {pastGroups.map(group => (
              <View key={group.date} style={styles.groupBlock}>
                {renderDateHeader(group)}
                <View style={styles.cardsStack}>
                  {group.sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onLeaveReviewPress={onLeaveReview ? () => onLeaveReview(session) : undefined}
                      hasReview={session.hasReview}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (embedded) {
    return <View style={styles.embedded}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      ) : undefined}
    >
      {content}
    </ScrollView>
  );
};

function formatDayName(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', { weekday: 'long' });
}

function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const createStyles = (theme: Theme, isDark: boolean, width: number) => {
  const desktop = width >= DESKTOP_BREAKPOINT;

  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxxl,
    },
    embedded: {
      marginTop: spacing.sm,
    },
    content: {
      gap: spacing.xl,
      paddingBottom: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    sectionIconShell: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: desktop ? 18 : 17,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    sectionCount: {
      minWidth: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      alignItems: 'center',
    },
    sectionCountText: {
      fontSize: 13,
      fontFamily: theme.fontSansBold,
    },
    focusedDayBlock: {
      gap: spacing.sm,
    },
    focusedDayLabel: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    groupList: {
      gap: spacing.lg,
    },
    groupBlock: {
      gap: spacing.sm,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.sm,
    },
    dateHeaderSelected: {
      borderColor: theme.primaryAlpha20,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgCard,
    },
    dateHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    dateIconShell: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateIconShellToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    dateTitle: {
      fontSize: 15,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      textTransform: 'capitalize',
    },
    dateSubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    groupCountPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    groupCountText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    cardsStack: {
      gap: spacing.md,
    },
    emptyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.xl,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      ...shadows.md,
    },
    emptyIconShell: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: theme.successBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCopy: {
      flex: 1,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    separator: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: spacing.xs,
      marginHorizontal: spacing.lg,
    },
  });
};

export default SessionsList;
