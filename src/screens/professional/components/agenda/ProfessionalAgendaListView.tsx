import { useAgendaScrollPosition } from './useAgendaScrollPosition';
import type { AgendaScrollPosition } from './ProfessionalAgendaTimeGrid';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { formatMadridInstant } from '../../../../utils/madridTime';
import { capitalizeFirst, calendarDate, toCalendarDateKey, isToday } from './professionalAgendaUtils';

interface ProfessionalAgendaListViewProps {
  sessions: ProfessionalSession[];
  scrollPosition?: AgendaScrollPosition;
  scrollRequest?: number;
  weekDays: Date[];
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
}

export function ProfessionalAgendaListView({
  sessions,
  scrollPosition,
  scrollRequest,
  weekDays,
  renderSessionCard,
}: ProfessionalAgendaListViewProps): React.ReactElement {
  const { theme } = useTheme();
  const scrollRef = useAgendaScrollPosition(scrollPosition, sessions.length > 0, scrollRequest);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const grouped = new Map<string, ProfessionalSession[]>();
  [...sessions]
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .forEach((session) => {
      const key = [toCalendarDateKey(session.date), toCalendarDateKey(weekDays[0])].sort().at(-1)!;
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
  const visibleDates = [...grouped.keys()];

  return (
    <ScrollView ref={scrollRef} onScroll={(event) => { if (scrollPosition) scrollPosition.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      {visibleDates.map((key) => {
        const date = calendarDate(key);
        const dateSessions = grouped.get(key) ?? [];
        return (
          <View key={key} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>
                {isToday(date) ? 'Hoy' : capitalizeFirst(formatMadridInstant(date, {
                  weekday: 'long', day: 'numeric', month: 'long',
                }))}
              </Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{dateSessions.length}</Text></View>
            </View>
            {dateSessions.map((session) => renderSessionCard(session))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
    groupCard: { paddingTop: spacing.md, gap: spacing.sm },
    groupHeader: { minHeight: 40, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.borderLight, backgroundColor: theme.bgCard, paddingHorizontal: 8 },
    groupTitle: { flex: 1, color: theme.textSecondary, fontFamily: theme.fontSansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
    badge: { minWidth: 28, height: 28, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    badgeText: { color: theme.textOnPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.xs },
  });
}
