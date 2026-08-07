import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DAY_HOUR_HEIGHT, TIME_SLOTS, formatTime, isToday } from './professionalAgendaUtils';

interface ProfessionalAgendaDayViewProps {
  scrollRef: React.RefObject<ScrollView | null>;
  selectedDate: Date;
  currentTime: Date;
  sessions: ProfessionalSession[];
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
}

export function ProfessionalAgendaDayView({
  scrollRef,
  selectedDate,
  currentTime,
  sessions,
  renderSessionCard,
}: ProfessionalAgendaDayViewProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const grouped = TIME_SLOTS.map((hour) => ({
    hour,
    items: sessions.filter((session) => session.date.getHours() === hour),
  }));

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      {grouped.map(({ hour, items }) => (
        <View key={hour} style={styles.hourSection}>
          <View style={styles.hourRail}>
            <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
          </View>
          <View style={styles.hourContent}>
            {isToday(selectedDate) && currentTime.getHours() === hour ? (
              <View pointerEvents="none" style={[styles.currentTimeLine, { top: currentTime.getMinutes() / 60 * DAY_HOUR_HEIGHT }]}>
                <View style={styles.currentTimeDot} />
                <View style={styles.currentTimeTrack} />
                <Text style={styles.currentTimeLabel}>{formatTime(currentTime)}</Text>
              </View>
            ) : null}
            {items.length ? items.map((session, index) => (
              <View
                key={session.id}
                style={[
                  styles.sessionPlacement,
                  { marginTop: index === 0 ? session.date.getMinutes() / 60 * DAY_HOUR_HEIGHT : spacing.sm },
                ]}
              >
                {renderSessionCard(session)}
              </View>
            )) : <View style={styles.emptyLine} />}
          </View>
        </View>
      ))}
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={44} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>No hay sesiones este día</Text>
          <Text style={styles.emptySubtitle}>Cambia la fecha o pasa a la vista de lista para revisar próximas sesiones.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
    hourSection: { position: 'relative', minHeight: DAY_HOUR_HEIGHT, flexDirection: 'row', alignItems: 'flex-start' },
    hourRail: { width: 72, paddingTop: spacing.sm },
    hourText: { color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: typography.fontSizes.sm },
    hourContent: { minHeight: DAY_HOUR_HEIGHT, flex: 1, position: 'relative', paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: theme.borderLight, gap: spacing.sm },
    currentTimeLine: { position: 'absolute', left: 0, right: 0, zIndex: 2, flexDirection: 'row', alignItems: 'center' },
    currentTimeDot: { width: 10, height: 10, marginLeft: -5, borderRadius: 5, borderWidth: 2, borderColor: theme.bgCard, backgroundColor: theme.warning },
    currentTimeTrack: { height: 2, flex: 1, backgroundColor: theme.warning },
    currentTimeLabel: { marginLeft: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 999, color: theme.textOnPrimary, backgroundColor: theme.warning, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.xs },
    emptyLine: { height: 24 },
    sessionPlacement: { width: '100%' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
    emptyTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.lg },
    emptySubtitle: { maxWidth: 420, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: typography.fontSizes.md, textAlign: 'center' },
  });
}
