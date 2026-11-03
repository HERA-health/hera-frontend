import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button } from '../../../../components/common';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ExternalCalendarEvent } from '../../../../services/externalCalendarContracts';
import { formatMadridInstant } from '../../../../utils/madridTime';
import { getAgendaHours } from './agendaTimeline';

export function externalEventIntersectsDay(event: ExternalCalendarEvent, day: Date) {
  const hours = getAgendaHours(day);
  return Date.parse(event.startsAt) < hours[hours.length - 1].end && Date.parse(event.endsAt) > hours[0].start;
}
export function externalEventTime(event: ExternalCalendarEvent) {
  if (event.allDay) return 'Todo el día';
  return `${formatMadridInstant(new Date(event.startsAt), { hour: '2-digit', minute: '2-digit' })}–${formatMadridInstant(new Date(event.endsAt), { hour: '2-digit', minute: '2-digit' })}`;
}
export function ExternalEventCard({ event, compact = false }: { event: ExternalCalendarEvent; compact?: boolean }) {
  const { theme } = useTheme(); const [open, setOpen] = useState(false);
  return <>
    <AnimatedPressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${event.title}, ${externalEventTime(event)}, Google Calendar${event.busy ? '' : ', libre'}`}
      hoverLift={false} style={{ padding: compact ? 5 : 12, gap: 3, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: theme.textMuted, backgroundColor: theme.bgMuted, opacity: event.busy ? 1 : 0.75 }}>
      <Text numberOfLines={compact ? 1 : 2} style={{ fontFamily: theme.fontSansSemiBold, fontSize: compact ? 11 : 14, color: theme.textPrimary }}>{event.title}</Text>
      <Text numberOfLines={1} style={{ fontFamily: theme.fontSans, fontSize: compact ? 10 : 12, color: theme.textSecondary }}>{externalEventTime(event)} · Google{event.busy ? '' : ' · Libre'}</Text>
    </AnimatedPressable>
    <ExternalEventDetail event={open ? event : null} onClose={() => setOpen(false)} />
  </>;
}
export function ExternalEventDetail({ event, onClose }: { event: ExternalCalendarEvent | null; onClose: () => void }) {
  const { theme } = useTheme();
  const [linkError, setLinkError] = useState(false);
  return <Modal visible={Boolean(event)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 460, maxHeight: '85%', borderRadius: 16, padding: 24, backgroundColor: theme.bgCard, gap: 16 }}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ionicons name="calendar-outline" size={18} color={theme.textSecondary} /><Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>Google Calendar</Text></View>
          <Text accessibilityRole="header" style={{ fontFamily: theme.fontHeading, color: theme.textPrimary, fontSize: 22 }}>{event?.title}</Text>
          {event && <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSans }}>{formatMadridInstant(new Date(event.startsAt), { day: 'numeric', month: 'long', year: 'numeric' })} · {externalEventTime(event)}</Text>}
          {event && formatMadridInstant(new Date(event.endsAt), { day: 'numeric', month: 'numeric', year: 'numeric' }) !== formatMadridInstant(new Date(event.startsAt), { day: 'numeric', month: 'numeric', year: 'numeric' }) && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>Hasta {formatMadridInstant(new Date(Date.parse(event.endsAt) - (event.allDay ? 1 : 0)), { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>{event?.calendarName}</Text>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 21 }}>Este evento se gestiona en Google Calendar.</Text>
          {event && !event.busy && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>Marcado como libre: no bloquea nuevas citas.</Text>}
          {linkError && <Text accessibilityRole="alert" style={{ color: theme.error }}>No se pudo abrir Google Calendar.</Text>}
        </ScrollView>
        <Button onPress={() => { setLinkError(false); void Linking.openURL('https://calendar.google.com/calendar/u/0/r').catch(() => setLinkError(true)); }}>Abrir Google Calendar</Button>
        <Button variant="ghost" onPress={onClose}>Cerrar</Button>
      </View>
    </View>
  </Modal>;
}
