import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Card } from '../../../../components/common';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  TIME_SLOTS,
  formatSessionTimeRange,
  getAgendaStatusPalette,
  getSessionTypeLabel,
  getStatusLabel,
  getWeekLayoutMetrics,
  getWeekSessionBlockMetrics,
  isSameCalendarDay,
  isToday,
  type SessionStatusTone,
} from './professionalAgendaUtils';

interface ProfessionalAgendaWeekViewProps {
  weekDays: Date[];
  sessions: ProfessionalSession[];
  gridEnabled: boolean;
  getStatus: (session: ProfessionalSession) => SessionStatusTone;
  getStatusColor: (status: SessionStatusTone) => string;
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
  onOpenSession: (sessionId: string) => void;
}

export function ProfessionalAgendaWeekView({
  weekDays,
  sessions,
  gridEnabled,
  getStatus,
  getStatusColor,
  renderSessionCard,
  onOpenSession,
}: ProfessionalAgendaWeekViewProps): React.ReactElement {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [isDark, theme]);
  const [availableHeight, setAvailableHeight] = useState(0);
  const groupedDays = weekDays.map((day) => ({
    day,
    sessions: sessions.filter((session) => isSameCalendarDay(session.date, day)),
  }));

  if (!gridEnabled) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.stackContent} showsVerticalScrollIndicator>
        {groupedDays.map(({ day, sessions: daySessions }) => (
          <Card key={day.toISOString()} variant="default" padding="large" style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayCardTitle}>
                {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.dayCardMeta}>
                {daySessions.length} {daySessions.length === 1 ? 'sesión' : 'sesiones'}
              </Text>
            </View>
            {daySessions.length
              ? daySessions.map((session) => renderSessionCard(session, true))
              : <Text style={styles.dayEmpty}>Sin sesiones</Text>}
          </Card>
        ))}
      </ScrollView>
    );
  }

  const metrics = getWeekLayoutMetrics(availableHeight);
  const bodyHeight = metrics.itemHeight * TIME_SLOTS.length;
  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== availableHeight) setAvailableHeight(nextHeight);
  };

  return (
    <View style={styles.viewport} onLayout={handleLayout}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ minHeight: metrics.contentHeight }}
        scrollEnabled={metrics.scrollEnabled}
        showsVerticalScrollIndicator={metrics.scrollEnabled}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.timeHeader} />
            {groupedDays.map(({ day }) => (
              <View key={day.toISOString()} style={isToday(day) ? [styles.dayHeader, styles.todayHeader] : styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.toLocaleDateString('es-ES', { weekday: 'short' })}</Text>
                <Text style={styles.dayNumber}>{day.getDate()}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.body, { height: bodyHeight }]}>
            <View style={styles.timeColumn}>
              {TIME_SLOTS.map((hour) => (
                <View key={hour} style={[styles.timeSlot, { height: metrics.itemHeight }]}>
                  <Text style={styles.timeText}>{String(hour).padStart(2, '0')}:00</Text>
                </View>
              ))}
            </View>
            {groupedDays.map(({ day, sessions: daySessions }) => (
              <View
                key={day.toISOString()}
                style={[styles.dayColumn, { height: bodyHeight }, isToday(day) ? styles.todayColumn : null]}
              >
                {TIME_SLOTS.map((hour) => (
                  <View
                    key={`${day.toISOString()}-${hour}`}
                    style={[styles.hourLine, { top: (hour - TIME_SLOTS[0]) * metrics.itemHeight }]}
                  />
                ))}
                {daySessions.length === 0 ? (
                  <View style={styles.emptyDay}><Text style={styles.emptyDayText}>Sin sesiones</Text></View>
                ) : null}
                {daySessions.map((session) => {
                  const block = getWeekSessionBlockMetrics(
                    session.date,
                    session.duration,
                    metrics.itemHeight,
                    bodyHeight,
                  );
                  if (!block) return null;
                  const status = getStatus(session);
                  const statusPalette = getAgendaStatusPalette(theme, status);
                  const accentColor = getStatusColor(status);
                  const originColor = session.origin === 'CLINIC' ? theme.primary : theme.secondaryDark;
                  const showMeta = block.height >= 42;
                  return (
                    <AnimatedPressable
                      key={session.id}
                      onPress={() => onOpenSession(session.id)}
                      hoverLift={false}
                      pressScale={0.99}
                      hitSlop={{ top: 2, right: 2, bottom: 2, left: 2 }}
                      style={[
                        styles.session,
                        {
                          top: block.top,
                          height: block.height,
                          borderColor: statusPalette.border,
                          borderLeftColor: originColor,
                          backgroundColor: statusPalette.background,
                        },
                      ]}
                      accessibilityLabel={`${session.clientName}, ${formatSessionTimeRange(session)}, ${getSessionTypeLabel(session.type)}, ${session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}, ${getStatusLabel(status)}`}
                    >
                      <View style={styles.sessionPrimaryLine}>
                        <Text style={[styles.sessionTime, { color: accentColor }]} numberOfLines={1}>
                          {session.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={[styles.sessionName, { color: accentColor }]} numberOfLines={1}>
                          {session.clientName}
                        </Text>
                      </View>
                      {showMeta ? (
                        <Text style={styles.sessionMeta} numberOfLines={1}>
                          {getSessionTypeLabel(session.type)} · {session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}
                        </Text>
                      ) : null}
                    </AnimatedPressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    viewport: { flex: 1, minHeight: 0, paddingHorizontal: spacing.lg },
    scroll: { flex: 1 },
    stackContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
    dayCard: { borderRadius: borderRadius.lg },
    dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    dayCardTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.md, textTransform: 'capitalize' },
    dayCardMeta: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: typography.fontSizes.sm },
    dayEmpty: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: typography.fontSizes.sm },
    shell: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
    header: { height: 48, flexDirection: 'row', backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted, borderBottomWidth: 1, borderBottomColor: theme.border },
    timeHeader: { width: 62, borderRightWidth: 1, borderRightColor: theme.border },
    dayHeader: { minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.borderLight },
    todayHeader: { backgroundColor: theme.primaryAlpha12 },
    dayLabel: { color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: typography.fontSizes.xs, textTransform: 'capitalize' },
    dayNumber: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.md },
    body: { flexDirection: 'row', alignItems: 'stretch' },
    timeColumn: { width: 62, backgroundColor: isDark ? theme.bgAlt : theme.bgMuted, borderRightWidth: 1, borderRightColor: theme.border },
    timeSlot: { paddingTop: 3, paddingHorizontal: spacing.xs, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    timeText: { color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: 10 },
    dayColumn: { minWidth: 0, flex: 1, position: 'relative', borderRightWidth: 1, borderRightColor: theme.borderLight, backgroundColor: theme.bgCard },
    todayColumn: { backgroundColor: isDark ? `${theme.primary}08` : theme.primaryAlpha12 },
    hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: theme.borderLight },
    emptyDay: { position: 'absolute', top: spacing.md, left: spacing.xs, right: spacing.xs, alignItems: 'center' },
    emptyDayText: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 9 },
    session: { position: 'absolute', left: 3, right: 3, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderLeftWidth: 4, borderRadius: 6, justifyContent: 'center' },
    sessionPrimaryLine: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 3 },
    sessionTime: { flexShrink: 0, fontFamily: theme.fontSansBold, fontSize: 9 },
    sessionName: { minWidth: 0, flex: 1, fontFamily: theme.fontSansSemiBold, fontSize: 10 },
    sessionMeta: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 8, marginTop: 1 },
  });
}
