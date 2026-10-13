import { useAgendaScrollPosition } from './useAgendaScrollPosition';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import { formatMadridInstant } from '../../../../utils/madridTime';
import type { ProfessionalSession } from '../../../../constants/types';
import { ProfessionalAgendaTimeGrid } from './ProfessionalAgendaTimeGrid';
import { sessionIntersectsDay } from './agendaTimeline';
import { toCalendarDateKey } from './professionalAgendaUtils';

interface Props extends Omit<React.ComponentProps<typeof ProfessionalAgendaTimeGrid>, 'days'> {
  weekDays: Date[];
  gridEnabled: boolean;
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
}
export function ProfessionalAgendaWeekView({ weekDays, gridEnabled, renderSessionCard, ...props }: Props) {
  const { theme } = useTheme();
  const listRef = useAgendaScrollPosition(props.scrollPosition, !gridEnabled, props.scrollRequest);
  if (gridEnabled) return <ProfessionalAgendaTimeGrid {...props} days={weekDays} />;
  return <ScrollView ref={listRef} onScroll={(event) => { props.scrollPosition.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} contentContainerStyle={{ padding: 16, gap: 20 }}>
    {weekDays.map((day) => {
      const sessions = props.sessions.filter((session) => sessionIntersectsDay(session, day));
      return <View key={toCalendarDateKey(day)} style={{ gap: 8 }}>
        <View style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: theme.bgCard, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
          <Text style={{ fontFamily: theme.fontSansBold, color: theme.textSecondary, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' }}>{formatMadridInstant(day, { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        </View>
        {sessions.length ? sessions.map((session) => renderSessionCard(session, true)) : <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>Sin citas</Text>}
      </View>;
    })}
  </ScrollView>;
}
