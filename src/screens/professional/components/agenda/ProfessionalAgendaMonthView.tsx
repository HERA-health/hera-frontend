import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../../components/common';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { AgendaDayPopover, type AgendaPopoverAnchor } from './AgendaDayPopover';
import {
  capitalizeFirst,
  formatTime,
  getAgendaStatusPalette,
  getMonthLayoutMetrics,
  getMonthVisibleEventLimit,
  isSameCalendarDay,
  isToday,
  getStatusLabel,
  toCalendarDateKey,
  type SessionStatusTone,
} from './professionalAgendaUtils';

interface ProfessionalAgendaMonthViewProps {
  selectedDate: Date;
  sessionsForSelectedDate: ProfessionalSession[];
  sessionsByDate: Map<string, ProfessionalSession[]>;
  isMobile: boolean;
  isTablet: boolean;
  getStatus: (session: ProfessionalSession) => SessionStatusTone;
  getStatusColor: (status: SessionStatusTone) => string;
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
  onSelectDate: (date: Date) => void;
  onOpenSession: (sessionId: string) => void;
}

interface PopoverState {
  date: Date;
  anchor: AgendaPopoverAnchor;
}

export function ProfessionalAgendaMonthView({
  selectedDate,
  sessionsForSelectedDate,
  sessionsByDate,
  isMobile,
  isTablet,
  getStatus,
  getStatusColor,
  renderSessionCard,
  onSelectDate,
  onOpenSession,
}: ProfessionalAgendaMonthViewProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isMobile), [isMobile, theme]);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const metrics = getMonthLayoutMetrics(availableHeight);
  const rowHeight = isMobile ? 52 : metrics.itemHeight;
  const visibleLimit = isMobile ? 0 : getMonthVisibleEventLimit(rowHeight, isTablet);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== availableHeight) setAvailableHeight(nextHeight);
  };
  const openOverflow = (event: GestureResponderEvent, date: Date) => {
    event.stopPropagation();
    setPopover({
      date,
      anchor: { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY },
    });
  };

  return (
    <View style={styles.viewport} onLayout={handleLayout}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          !isMobile && !metrics.scrollEnabled ? styles.contentFitted : null,
        ]}
        scrollEnabled={isMobile || metrics.scrollEnabled}
        showsVerticalScrollIndicator={isMobile || metrics.scrollEnabled}
      >
        <View style={styles.calendar}>
          <View style={styles.weekHeader}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => (
              <Text key={label} style={styles.weekLabel}>
                {isMobile ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'][index] : label}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {calendarDays.map((day) => {
              const daySessions = sessionsByDate.get(toCalendarDateKey(day)) ?? [];
              const inCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const selected = isSameCalendarDay(day, selectedDate);
              const today = isToday(day);
              const hiddenCount = Math.max(0, daySessions.length - visibleLimit);
              const cellStyle = [
                styles.cell,
                {
                  height: rowHeight,
                  backgroundColor: selected ? theme.primaryAlpha12 : theme.bgCard,
                  opacity: inCurrentMonth ? 1 : 0.46,
                },
              ];
              const cellContent = (
                <>
                  {isMobile ? (
                    <View style={styles.cellTop}>
                      <View style={[styles.dayNumber, today ? { backgroundColor: theme.actionPrimary } : null]}>
                        <Text style={[styles.dayText, { color: today ? theme.actionPrimaryText : selected ? theme.primary : theme.textSecondary }]}>
                          {day.getDate()}
                        </Text>
                      </View>
                      {daySessions.length ? <Text style={styles.mobileCount}>{daySessions.length}</Text> : null}
                    </View>
                  ) : (
                    <AnimatedPressable
                      onPress={() => onSelectDate(day)}
                      hoverLift={false}
                      pressScale={0.98}
                      style={styles.cellTop}
                      accessibilityLabel={`Seleccionar ${day.toLocaleDateString('es-ES')}`}
                    >
                    <View style={[styles.dayNumber, today ? { backgroundColor: theme.actionPrimary } : null]}>
                      <Text style={[styles.dayText, { color: today ? theme.actionPrimaryText : selected ? theme.primary : theme.textSecondary }]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    </AnimatedPressable>
                  )}
                  {!isMobile ? (
                    <View style={styles.events}>
                      {daySessions.slice(0, visibleLimit).map((session) => {
                        const status = getStatus(session);
                        const statusPalette = getAgendaStatusPalette(theme, status);
                        const accent = getStatusColor(status);
                        const originColor = session.origin === 'CLINIC' ? theme.primary : theme.secondaryDark;
                        return (
                          <AnimatedPressable
                            key={session.id}
                            onPress={(event) => {
                              event.stopPropagation();
                              onOpenSession(session.id);
                            }}
                            hoverLift={false}
                            pressScale={0.98}
                            hitSlop={{ top: 2, right: 2, bottom: 2, left: 2 }}
                            style={[
                              styles.event,
                              {
                                backgroundColor: statusPalette.background,
                                borderColor: statusPalette.border,
                                borderLeftColor: originColor,
                              },
                            ]}
                            accessibilityLabel={`${session.clientName}, ${formatTime(session.date)}, ${session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}, ${getStatusLabel(status)}`}
                          >
                            <Text style={[styles.eventTime, { color: accent }]}>{formatTime(session.date)}</Text>
                            <Text style={styles.eventName} numberOfLines={1}>{session.clientName}</Text>
                          </AnimatedPressable>
                        );
                      })}
                      {hiddenCount > 0 ? (
                        <AnimatedPressable
                          onPress={(event) => openOverflow(event, day)}
                          hoverLift={false}
                          pressScale={0.97}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          style={styles.moreButton}
                          accessibilityLabel={`Ver ${hiddenCount} citas más del ${day.toLocaleDateString('es-ES')}`}
                        >
                          <Text style={styles.moreText}>+{hiddenCount} más</Text>
                        </AnimatedPressable>
                      ) : null}
                    </View>
                  ) : null}
                </>
              );

              return isMobile ? (
                <AnimatedPressable
                  key={day.toISOString()}
                  onPress={() => onSelectDate(day)}
                  hoverLift={false}
                  pressScale={0.995}
                  style={cellStyle}
                  accessibilityLabel={`${day.toLocaleDateString('es-ES')}, ${daySessions.length} citas`}
                >
                  {cellContent}
                </AnimatedPressable>
              ) : (
                <View key={day.toISOString()} style={cellStyle}>
                  {cellContent}
                </View>
              );
            })}
          </View>
        </View>

        {isMobile ? (
          <View style={styles.selectedDay}>
            <View style={styles.selectedHeading}>
              <Text style={styles.selectedTitle}>
                {capitalizeFirst(selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}
              </Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{sessionsForSelectedDate.length}</Text></View>
            </View>
            {sessionsForSelectedDate.length
              ? sessionsForSelectedDate.map((session) => renderSessionCard(session))
              : (
                <View style={styles.selectedEmpty}>
                  <Ionicons name="leaf-outline" size={20} color={theme.textMuted} />
                  <Text style={styles.emptyText}>No hay citas este día.</Text>
                </View>
              )}
          </View>
        ) : null}
      </ScrollView>
      <AgendaDayPopover
        visible={Boolean(popover)}
        date={popover?.date ?? null}
        sessions={popover ? sessionsByDate.get(toCalendarDateKey(popover.date)) ?? [] : []}
        anchor={popover?.anchor ?? null}
        onClose={() => setPopover(null)}
        onOpenSession={onOpenSession}
      />
    </View>
  );
}

function createStyles(theme: Theme, isMobile: boolean) {
  return StyleSheet.create({
    viewport: { flex: 1, minHeight: 0 },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
      paddingTop: isMobile ? spacing.sm : 0,
      paddingBottom: isMobile ? spacing.xxxl : 0,
      gap: spacing.md,
    },
    contentFitted: { flexGrow: 1 },
    calendar: { overflow: 'hidden', borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
    weekHeader: { height: isMobile ? 34 : 38, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bgMuted },
    weekLabel: { width: '14.285%', color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: isMobile ? 10 : typography.fontSizes.xs, textAlign: 'center', textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.285%', padding: isMobile ? 4 : 6, borderRightWidth: 1, borderRightColor: theme.borderLight, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    cellTop: { minHeight: isMobile ? 24 : 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayNumber: { width: isMobile ? 24 : 26, height: isMobile ? 24 : 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontFamily: theme.fontSansSemiBold, fontSize: isMobile ? 11 : 12 },
    mobileCount: { paddingRight: 2, color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 9 },
    events: { minHeight: 0, flex: 1, marginTop: 2, gap: 2 },
    event: { minHeight: 20, paddingHorizontal: 4, borderWidth: 1, borderLeftWidth: 3, borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
    eventTime: { flexShrink: 0, fontFamily: theme.fontSansBold, fontSize: 8 },
    eventName: { minWidth: 0, flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 9 },
    moreButton: { minHeight: 16, paddingHorizontal: 4, justifyContent: 'center', alignSelf: 'flex-start', borderRadius: 4, backgroundColor: theme.primaryAlpha12 },
    moreText: { color: theme.link, fontFamily: theme.fontSansSemiBold, fontSize: 9 },
    selectedDay: { padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
    selectedHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    selectedTitle: { minWidth: 0, flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.md, textTransform: 'capitalize' },
    badge: { minWidth: 28, height: 28, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    badgeText: { color: theme.textOnPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.xs },
    selectedEmpty: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    emptyText: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: typography.fontSizes.md, textAlign: 'center' },
  });
}
