import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../../../../components/common';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ProfessionalSession } from '../../../../constants/types';
import { formatMadridInstant, MADRID_TIME_ZONE } from '../../../../utils/madridTime';
import { DAY_HOUR_HEIGHT, formatTime, formatSessionTimeRange, getProvenanceLabel, getProvenancePalette, getSessionTypeLabel, getSessionDisplayStatus, getStatusLabel, isToday, toCalendarDateKey } from './professionalAgendaUtils';
import { getAgendaAxis, getAgendaHours, getInstantTop, layoutAgendaSessions } from './agendaTimeline';

export interface AgendaScrollPosition { current: number | null; }
interface Props {
  days: Date[];
  sessions: ProfessionalSession[];
  currentTime: Date;
  scrollPosition: AgendaScrollPosition;
  scrollRequest: number;
  dataReady?: boolean;
  scrollTarget?: Date | null;
  onOpenSession: (id: string) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export function ProfessionalAgendaTimeGrid({ days, sessions, currentTime, scrollPosition, scrollRequest, dataReady = true, scrollTarget, onOpenSession, scrollRef }: Props) {
  const { theme } = useTheme();
  const internalRef = useRef<ScrollView | null>(null);
  const ref = scrollRef ?? internalRef;
  const axis = useMemo(() => getAgendaAxis(days), [days]);
  const columns = useMemo(() => days.map((day) => ({ day, hours: getAgendaHours(day), blocks: layoutAgendaSessions(sessions, day, axis) })), [days, sessions, axis]);
  const zoneOffsets = [...new Set(columns.flatMap((column) => column.hours.map((hour) => hour.offset.replace('GMT', 'UTC'))))];
  const todayColumn = columns.find((column) => isToday(column.day, currentTime));
  const currentTimeTop = todayColumn ? getInstantTop(currentTime.getTime(), todayColumn.hours, axis) : null;
  const request = useRef<number | null>(null);
  useEffect(() => {
    if (!dataReady || request.current === scrollRequest) return;
    let offset = scrollPosition.current;
    if (offset === null) {
      const today = columns.find((column) => isToday(column.day, currentTime));
      const first = columns.flatMap((column) => column.blocks).filter((block) => block.session.status !== 'cancelled').sort((a, b) => a.top - b.top)[0];
      const target = scrollTarget ? columns.map((column) => getInstantTop(scrollTarget.getTime(), column.hours, axis)).find((top) => top !== null) : null;
      offset = target != null ? Math.max(0, target - DAY_HOUR_HEIGHT) : today ? Math.max(0, (getInstantTop(currentTime.getTime(), today.hours, axis) ?? 8 * DAY_HOUR_HEIGHT) - DAY_HOUR_HEIGHT) : first?.top ?? 8 * DAY_HOUR_HEIGHT;
    }
    const timer = setTimeout(() => {
      if (!ref.current) return;
      ref.current.scrollTo({ y: offset, animated: false });
      scrollPosition.current = offset;
      request.current = scrollRequest;
    }, 0);
    return () => clearTimeout(timer);
  }, [axis, columns, currentTime, ref, scrollPosition, scrollRequest, dataReady, scrollTarget]);

  return <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.bgCard }}>
    <View style={[styles.header, { borderColor: theme.borderLight, backgroundColor: theme.bgCard }]}>
      <Text accessibilityLabel={`Zona horaria del calendario: ${MADRID_TIME_ZONE}, ${zoneOffsets.join(' y ')}`} style={[styles.rail, styles.zone, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{zoneOffsets.join('\n')}</Text>
      {days.map((day) => <View key={toCalendarDateKey(day)} style={styles.dayHeader}>
        <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 }}>{formatMadridInstant(day, { weekday: 'short' }).toLocaleUpperCase('es-ES')}</Text>
        <View style={[styles.dateCircle, isToday(day, currentTime) && { backgroundColor: theme.primary }]}>
          <Text style={{ fontSize: 20, fontFamily: theme.fontSansBold, color: isToday(day, currentTime) ? theme.textOnPrimary : theme.textPrimary }}>{formatMadridInstant(day, { day: 'numeric' })}</Text>
        </View>
      </View>)}
    </View>
    <ScrollView ref={ref} style={{ flex: 1 }} onScroll={(event) => { scrollPosition.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} showsVerticalScrollIndicator>
      <View style={{ flexDirection: 'row', height: axis.length * DAY_HOUR_HEIGHT }}>
        <View style={styles.rail}>
          {axis.map((row) => <Text key={row.key} style={[styles.hour, { color: theme.textSecondary, borderColor: theme.borderLight, fontFamily: theme.fontSans }]}>{row.label}</Text>)}
          {currentTimeTop !== null ? <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(0, currentTimeTop - 8), right: 4, paddingHorizontal: 5, borderRadius: 8, backgroundColor: theme.warning }}><Text accessibilityLabel={`Hora actual en Madrid: ${formatTime(currentTime)}`} style={{ color: theme.textOnPrimary, fontFamily: theme.fontSansBold, fontSize: 11 }}>{formatTime(currentTime)}</Text></View> : null}
        </View>
        {columns.map(({ day, hours, blocks }) => {
          const nowTop = getInstantTop(currentTime.getTime(), hours, axis);
          return <View key={toCalendarDateKey(day)} style={[styles.column, { borderColor: theme.borderLight, backgroundColor: theme.bgCard }]}>
            {axis.map((row, index) => {
              const slot = hours.find((hour) => hour.key === row.key);
              return <View pointerEvents="none" key={row.key} style={[styles.gridHour, { top: index * DAY_HOUR_HEIGHT, borderColor: theme.borderLight, backgroundColor: !slot ? theme.bgMuted : undefined }]}>
                <View style={[styles.halfHour, { borderColor: theme.borderLight }]} />
                {!slot ? <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: theme.fontSans }}>{row.key.endsWith(':1') ? 'Sin repetición' : 'Cambio de hora'}</Text> : hours.length === 25 && slot.hour === 2 ? <Text style={{ fontSize: 10, color: theme.textSecondary }}>{slot.offset}</Text> : null}
              </View>;
            })}
            {blocks.map((block) => {
              const { session } = block;
              const palette = getProvenancePalette(theme, session);
              const status = getStatusLabel(getSessionDisplayStatus(session, currentTime));
              const description = `${session.clientName}, ${formatSessionTimeRange(session)}, ${getProvenanceLabel(session.provenance)}, ${status}${hours.length !== 24 ? `, ${block.offset}` : ''}`;
              return <AnimatedPressable key={block.key} onPress={() => onOpenSession(session.id)} hoverLift={false} pressScale={0.99}
                accessibilityRole="button" accessibilityLabel={description}
                style={[styles.event, { top: block.top + 1, height: Math.max(12, block.height - 2), paddingVertical: block.height < 28 ? 0 : 3, left: `${block.lane / block.lanes * 100}%`, width: `${100 / block.lanes}%`, backgroundColor: theme.bgCard, borderLeftColor: palette.border }]}>
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text numberOfLines={1} style={{ flex: 1, color: session.status === 'cancelled' ? theme.textSecondary : theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 12, lineHeight: 15, textDecorationLine: session.status === 'cancelled' ? 'line-through' : 'none' }}>{session.status === 'cancelled' ? 'Cancelada · ' : ''}{block.height < 34 ? `${formatSessionTimeRange(session)} · ` : ''}{session.clientName}</Text>
                  {session.status === 'pending' && block.height < 34 ? <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 10, lineHeight: 15 }}>Pendiente</Text> : null}
                </View>
                {block.height >= 34 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {session.status === 'pending' ? <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 10, lineHeight: 13 }}>Pendiente</Text> : null}
                  <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 13 }}>{formatSessionTimeRange(session)}{hours.length === 25 ? ` · ${block.offset}` : ''}</Text>
                </View> : null}
                {block.height >= 48 ? <Text numberOfLines={1} style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 11, lineHeight: 12 }}>{getProvenanceLabel(session.provenance)}</Text> : null}
                {block.height >= 68 && session.status !== 'pending' ? <Text numberOfLines={1} style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 11 }}>{status}</Text> : null}
                {block.height >= 86 ? <Text numberOfLines={1} style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 11 }}>{getSessionTypeLabel(session.type)}</Text> : null}
              </AnimatedPressable>;
            })}
            {nowTop !== null ? <View pointerEvents="none" style={[styles.now, { top: nowTop, borderColor: theme.warning }]} /> : null}
          </View>;
        })}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', borderBottomWidth: 1, paddingRight: 12 },
  rail: { width: 68 }, zone: { fontSize: 11, alignSelf: 'flex-end', padding: 8 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3 },
  dateCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hour: { height: DAY_HOUR_HEIGHT, borderTopWidth: 1, fontSize: 11, textAlign: 'right', paddingRight: 8, paddingTop: 3 },
  column: { flex: 1, minWidth: 0, position: 'relative', borderLeftWidth: 1 },
  gridHour: { position: 'absolute', left: 0, right: 0, height: DAY_HOUR_HEIGHT, borderTopWidth: 1 },
  halfHour: { position: 'absolute', top: DAY_HOUR_HEIGHT / 2, left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, opacity: 0.5 },
  event: { position: 'absolute', zIndex: 2, borderLeftWidth: 3, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3, overflow: 'hidden', borderRightWidth: 2, borderRightColor: 'transparent' },
  now: { position: 'absolute', zIndex: 1, left: 0, right: 0, borderTopWidth: 2 },
});
