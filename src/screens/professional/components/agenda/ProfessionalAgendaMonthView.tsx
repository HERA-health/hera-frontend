import { useAgendaScrollPosition } from './useAgendaScrollPosition';
import type { AgendaScrollPosition } from './ProfessionalAgendaTimeGrid';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { formatMadridInstant } from '../../../../utils/madridTime';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../../components/common';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { AgendaDayPopover, type AgendaPopoverAnchor } from './AgendaDayPopover';
import {
  capitalizeFirst,
  formatTime, formatSessionTimeRange,
  getProvenancePalette, getProvenanceLabel, getMonthDays,
  getMonthLayoutMetrics,
  MONTH_HEADER_HEIGHT,
  getMonthVisibleEventLimit,
  isSameCalendarDay,
  isToday,
  getStatusLabel,
  toCalendarDateKey,
  type SessionStatusTone,
} from './professionalAgendaUtils';

interface ProfessionalAgendaMonthViewProps {
  scrollPosition?: AgendaScrollPosition;
  scrollRequest?: number;
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
  scrollPosition,
  scrollRequest,
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
  const scrollRef = useAgendaScrollPosition(scrollPosition, true, scrollRequest);
  const styles = useMemo(() => createStyles(theme, isMobile), [isMobile, theme]);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const calendarDays = getMonthDays(selectedDate);
  const metrics = getMonthLayoutMetrics(availableHeight, calendarDays.length / 7);
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
        ref={scrollRef}
        onScroll={(event) => { if (scrollPosition) scrollPosition.current = event.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={32}
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
              const inCurrentMonth = toCalendarDateKey(day).slice(0, 7) === toCalendarDateKey(selectedDate).slice(0, 7);
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
                          {day.getUTCDate()}
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
                      accessibilityLabel={`Seleccionar ${formatMadridInstant(day, { day: 'numeric', month: 'long' })}`}
                    >
                    <View style={[styles.dayNumber, today ? { backgroundColor: theme.actionPrimary } : null]}>
                      <Text style={[styles.dayText, { color: today ? theme.actionPrimaryText : selected ? theme.primary : theme.textSecondary }]}>
                        {day.getUTCDate()}
                      </Text>
                    </View>
                    </AnimatedPressable>
                  )}
                  {!isMobile ? (
                    <View style={styles.events}>
                      {daySessions.slice(0, visibleLimit).map((session) => {
                        const status = getStatus(session);
                        const statusPalette = getProvenancePalette(theme, session);
                        const accent = getStatusColor(status);
                        const originColor = statusPalette.border;
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
                            accessibilityLabel={`${session.clientName}, ${formatTime(session.date)}, ${getProvenanceLabel(session.provenance, session.relationshipContext)}, ${getStatusLabel(status)}`}
                          >
                            <Text style={styles.eventName} numberOfLines={1}>{session.status === 'cancelled' ? 'Cancelada · ' : ''}{session.clientName}</Text>
                            <Text style={[styles.eventTime, { color: theme.textSecondary }]} numberOfLines={1}>{formatSessionTimeRange(session)}</Text>
                            <Text style={[styles.eventTime, { color: theme.textSecondary }]} numberOfLines={1}>{getProvenanceLabel(session.provenance, session.relationshipContext)}</Text>
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
                          accessibilityLabel={`Ver ${hiddenCount} citas más del ${formatMadridInstant(day, { day: 'numeric', month: 'long' })}`}
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
                  accessibilityLabel={`${formatMadridInstant(day, { day: 'numeric', month: 'long' })}, ${daySessions.length} citas`}
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
                {capitalizeFirst(formatMadridInstant(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }))}
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
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: isMobile ? spacing.xxxl : 0,
      gap: spacing.md,
    },
    contentFitted: { flexGrow: 1 },
    calendar: { overflow: 'hidden', backgroundColor: theme.bgCard },
    weekHeader: { height: MONTH_HEADER_HEIGHT, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.borderLight, backgroundColor: theme.bgCard },
    weekLabel: { width: '14.285%', color: theme.textSecondary, fontFamily: theme.fontSansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textAlign: 'center', textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.285%', padding: isMobile ? 4 : 6, borderRightWidth: 1, borderRightColor: theme.borderLight, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    cellTop: { minHeight: isMobile ? 24 : 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayNumber: { width: isMobile ? 24 : 26, height: isMobile ? 24 : 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontFamily: theme.fontSansSemiBold, fontSize: isMobile ? 11 : 12 },
    mobileCount: { paddingRight: 2, color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 9 },
    events: { minHeight: 0, flex: 1, marginTop: 2, gap: 2 },
    event: { height: 48, paddingHorizontal: 5, paddingVertical: 3, borderLeftWidth: 3, borderRadius: 5, justifyContent: 'center' },
    eventTime: { fontFamily: theme.fontSans, fontSize: 11, lineHeight: 13 },
    eventName: { minWidth: 0, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 12, lineHeight: 15 },
    moreButton: { minHeight: 16, paddingHorizontal: 4, justifyContent: 'center', alignSelf: 'flex-start', borderRadius: 4, backgroundColor: theme.primaryAlpha12 },
    moreText: { color: theme.link, fontFamily: theme.fontSansSemiBold, fontSize: 11 },
    selectedDay: { padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
    selectedHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    selectedTitle: { minWidth: 0, flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.md, textTransform: 'capitalize' },
    badge: { minWidth: 28, height: 28, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    badgeText: { color: theme.textOnPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.xs },
    selectedEmpty: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    emptyText: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: typography.fontSizes.md, textAlign: 'center' },
  });
}
