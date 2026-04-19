import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {
  borderRadius,
  shadows,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AppNavigationProp, ProfessionalSession, SessionViewMode } from '../../constants/types';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as professionalService from '../../services/professionalService';
import {
  getVideoCallButtonLabel,
  getVideoCallButtonState,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../utils/videoCallUtils';

const TIME_SLOTS = Array.from({ length: 15 }, (_, index) => index + 7);
const WEEK_HOUR_HEIGHT = 72;
const DAY_HOUR_HEIGHT = 72;

type SessionStatusTone = 'confirmed' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface ViewOption {
  value: SessionViewMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const VIEW_OPTIONS: ViewOption[] = [
  { value: 'day', label: 'Día', icon: 'calendar' },
  { value: 'week', label: 'Semana', icon: 'calendar-outline' },
  { value: 'list', label: 'Lista', icon: 'list' },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function ProfessionalSessionsScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const dayScrollRef = useRef<ScrollView | null>(null);
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;

  const [viewMode, setViewMode] = useState<SessionViewMode>(isMobile ? 'list' : 'day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await professionalService.getProfessionalSessions();

      const mappedSessions: ProfessionalSession[] = data.map((session) => {
        const status = session.status?.toUpperCase() || '';
        const mappedStatus: ProfessionalSession['status'] =
          status === 'COMPLETED'
            ? 'completed'
            : status === 'CANCELLED'
            ? 'cancelled'
            : status === 'CONFIRMED' || status === 'SCHEDULED'
            ? 'scheduled'
            : 'pending';

        const rawType = session.type?.toUpperCase?.() || 'VIDEO_CALL';
        const mappedType: ProfessionalSession['type'] =
          rawType === 'PHONE_CALL' ? 'audio' : rawType === 'CHAT' ? 'chat' : 'video';

        return {
          id: session.id,
          clientId: session.clientId,
          clientName: session.client?.user?.name || 'Cliente',
          clientInitial: (session.client?.user?.name || 'C')[0].toUpperCase(),
          date: new Date(session.date),
          duration: session.duration || 60,
          status: mappedStatus,
          type: mappedType,
          meetingLink: session.meetingLink || undefined,
          clientAvatar: session.client?.user?.avatar || undefined,
        };
      });

      setSessions(mappedSessions);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las sesiones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    analyticsService.trackScreen('professional_sessions');
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (isMobile && viewMode === 'week') {
      setViewMode('list');
    }
  }, [isMobile, viewMode]);

  const isSameDay = useCallback((a: Date, b: Date) => a.toDateString() === b.toDateString(), []);

  const isToday = useCallback((date: Date) => isSameDay(date, new Date()), [isSameDay]);

  const getWeekDays = useCallback((date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const offset = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(offset);

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      return current;
    });
  }, []);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [getWeekDays, selectedDate]);

  const sessionsForDate = useMemo(
    () =>
      sessions
        .filter((session) => isSameDay(session.date, selectedDate))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [isSameDay, selectedDate, sessions],
  );

  const sessionsForWeek = useMemo(
    () =>
      sessions
        .filter((session) => weekDays.some((day) => isSameDay(day, session.date)))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [isSameDay, sessions, weekDays],
  );

  const nextUpcomingSession = useMemo(
    () =>
      [...sessions]
        .filter((session) => session.status !== 'cancelled' && session.date.getTime() >= currentTime.getTime())
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null,
    [currentTime, sessions],
  );

  const todaysSessions = useMemo(
    () => sessions.filter((session) => isToday(session.date) && session.status === 'scheduled'),
    [isToday, sessions],
  );

  const weekSessions = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return sessions.filter((session) => session.date >= start && session.date <= end);
  }, [sessions, weekDays]);

  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.status === 'pending'),
    [sessions],
  );

  const navigateDate = useCallback(
    (direction: number) => {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        if (viewMode === 'week') {
          next.setDate(next.getDate() + direction * 7);
        } else {
          next.setDate(next.getDate() + direction);
        }
        return next;
      });
    },
    [viewMode],
  );

  const goToToday = useCallback(() => setSelectedDate(new Date()), []);

  const getDateHeader = useCallback(() => {
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
    }
    if (isToday(selectedDate)) {
      return `Hoy, ${selectedDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`;
    }
    return selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [isToday, selectedDate, viewMode, weekDays]);

  const getSessionDisplayStatus = useCallback(
    (session: ProfessionalSession): SessionStatusTone => {
      if (session.status === 'cancelled') return 'cancelled';
      if (session.status === 'completed') return 'completed';
      if (session.status === 'pending') return 'pending';

      const sessionStart = session.date.getTime();
      const sessionEnd = sessionStart + session.duration * 60 * 1000;
      const now = currentTime.getTime();

      if (now >= sessionStart && now <= sessionEnd) {
        return 'in_progress';
      }

      return 'confirmed';
    },
    [currentTime],
  );

  const getStatusColor = useCallback(
    (status: SessionStatusTone) => {
      switch (status) {
        case 'confirmed':
          return theme.primary;
        case 'pending':
          return theme.warningAmber;
        case 'in_progress':
          return theme.success;
        case 'completed':
          return theme.primaryMuted;
        case 'cancelled':
          return theme.warning;
      }
    },
    [theme],
  );

  const getDayScrollOffset = useCallback((targetDate: Date) => {
    const startHour = TIME_SLOTS[0];
    const endHour = TIME_SLOTS[TIME_SLOTS.length - 1] + 1;
    const rawHour = targetDate.getHours() + targetDate.getMinutes() / 60;
    const clampedHour = Math.min(Math.max(rawHour, startHour), endHour);
    const offset = (clampedHour - startHour) * DAY_HOUR_HEIGHT - DAY_HOUR_HEIGHT * 0.75;
    return Math.max(0, offset);
  }, []);

  const jumpToNextSession = useCallback(() => {
    if (!nextUpcomingSession) {
      return;
    }

    setSelectedDate(new Date(nextUpcomingSession.date));
    setViewMode('day');
  }, [nextUpcomingSession]);

  useEffect(() => {
    if (viewMode !== 'day' || loading) {
      return;
    }

    const targetDate = isToday(selectedDate)
      ? currentTime
      : sessionsForDate[0]?.date ?? selectedDate;

    const timeout = setTimeout(() => {
      dayScrollRef.current?.scrollTo({
        y: getDayScrollOffset(targetDate),
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [currentTime, getDayScrollOffset, isToday, loading, selectedDate, sessionsForDate, viewMode]);

  const handleConfirmSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      try {
        setProcessingSessionId(sessionId);
        await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
        Alert.alert('Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
        await loadSessions();
      } catch {
        Alert.alert('Error', 'No se pudo confirmar la sesión');
      } finally {
        setProcessingSessionId(null);
      }
    },
    [loadSessions, processingSessionId],
  );

  const handleRejectSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      Alert.alert('Rechazar sesión', `¿Seguro que quieres rechazar la sesión con ${clientName}?`, [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingSessionId(sessionId);
              await professionalService.updateSessionStatus(sessionId, 'CANCELLED');
              await loadSessions();
            } catch {
              Alert.alert('Error', 'No se pudo rechazar la sesión');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]);
    },
    [loadSessions, processingSessionId],
  );

  const handleCompleteSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      try {
        setProcessingSessionId(sessionId);
        await professionalService.updateSessionStatus(sessionId, 'COMPLETED');
        Alert.alert('Sesión completada', `La sesión con ${clientName} se ha marcado como completada`);
        await loadSessions();
      } catch {
        Alert.alert('Error', 'No se pudo completar la sesión');
      } finally {
        setProcessingSessionId(null);
      }
    },
    [loadSessions, processingSessionId],
  );

  const handleJoinSession = useCallback(async (sessionId: string) => {
    try {
      const meetingData = await professionalService.getMeetingLink(sessionId);
      if (!meetingData.canJoin) {
        Alert.alert('Aún no es el momento', meetingData.message);
        return;
      }
      if (meetingData.meetingLink) {
        const supported = await Linking.canOpenURL(meetingData.meetingLink);
        if (supported) {
          await Linking.openURL(meetingData.meetingLink);
        }
      }
    } catch {
      Alert.alert('Error', 'Hubo un problema al unirte a la sesión');
    }
  }, []);

  const renderSessionActions = useCallback(
    (session: ProfessionalSession) => {
      if (session.status === 'pending') {
        return (
          <View style={styles.actionRow}>
            <View style={styles.actionHalf}>
              <Button
                variant="primary"
                size="small"
                onPress={() => handleConfirmSession(session.id, session.clientName)}
                loading={processingSessionId === session.id}
                fullWidth
              >
                Confirmar
              </Button>
            </View>
            <View style={styles.actionHalf}>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleRejectSession(session.id, session.clientName)}
                disabled={processingSessionId === session.id}
                fullWidth
              >
                Rechazar
              </Button>
            </View>
          </View>
        );
      }

      if (session.status === 'scheduled') {
        const buttonState = getVideoCallButtonState({
          status: 'CONFIRMED',
          type: session.type,
          date: session.date,
          duration: session.duration,
          meetingLink: session.meetingLink,
        });
        const buttonLabel = getVideoCallButtonLabel(buttonState, {
          status: 'CONFIRMED',
          type: session.type,
          date: session.date,
          duration: session.duration,
          meetingLink: session.meetingLink,
        });
        const buttonStyle = getVideoCallButtonStyle(buttonState);
        const canJoin = isVideoCallButtonClickable(buttonState);
        const sessionEnded = session.date.getTime() + session.duration * 60 * 1000 < currentTime.getTime();

        return (
          <View style={styles.actionStack}>
            {session.type === 'video' ? (
              <AnimatedPressable
                onPress={canJoin ? () => handleJoinSession(session.id) : undefined}
                disabled={!canJoin}
                hoverLift={false}
                pressScale={0.98}
                style={[
                  styles.joinButton,
                  {
                    backgroundColor: buttonStyle.backgroundColor,
                    borderColor: buttonStyle.borderColor || buttonStyle.backgroundColor,
                    opacity: buttonStyle.disabled ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons name={buttonLabel.icon as keyof typeof Ionicons.glyphMap} size={16} color={buttonStyle.textColor} />
                <Text style={[styles.joinButtonText, { color: buttonStyle.textColor }]}>
                  {buttonLabel.primary}
                </Text>
              </AnimatedPressable>
            ) : null}

            <View style={styles.actionRow}>
              {sessionEnded ? (
                <View style={styles.actionHalf}>
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => handleCompleteSession(session.id, session.clientName)}
                    loading={processingSessionId === session.id}
                    fullWidth
                  >
                    Completar
                  </Button>
                </View>
              ) : null}
              <View style={styles.actionHalf}>
                <Button
                  variant="ghost"
                  size="small"
                  onPress={() => navigation.navigate('ClientProfile', { clientId: session.clientId })}
                  fullWidth
                >
                  Ver ficha
                </Button>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.actionRow}>
          <View style={styles.actionHalf}>
            <Button
              variant="ghost"
              size="small"
              onPress={() => navigation.navigate('ClientProfile', { clientId: session.clientId })}
              fullWidth
            >
              Ver ficha
            </Button>
          </View>
        </View>
      );
    },
    [
      currentTime,
      handleCompleteSession,
      handleConfirmSession,
      handleJoinSession,
      handleRejectSession,
      navigation,
      processingSessionId,
      styles,
    ],
  );

  const renderSessionCard = useCallback(
    (session: ProfessionalSession, compact = false) => {
      const status = getSessionDisplayStatus(session);
      const accentColor = getStatusColor(status);

      return (
        <Card
          key={session.id}
          variant="default"
          padding="medium"
          style={compact ? styles.sessionCardCompact : styles.sessionCard}
        >
          <View style={styles.sessionCardHeader}>
            <View style={styles.sessionClientBlock}>
              <View style={[styles.sessionAvatar, { backgroundColor: theme.primaryAlpha12 }]}>
                <Text style={styles.sessionAvatarText}>{session.clientInitial}</Text>
              </View>
              <View style={styles.sessionClientInfo}>
                <Text style={styles.sessionClientName}>{session.clientName}</Text>
                <Text style={styles.sessionClientMeta}>
                  {formatTime(session.date)} · {session.duration} min
                </Text>
              </View>
            </View>
            <View style={[styles.sessionStatusPill, { backgroundColor: `${accentColor}20` }]}>
              <View style={[styles.sessionStatusDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.sessionStatusText, { color: accentColor }]}>
                {status === 'confirmed'
                  ? 'Confirmada'
                  : status === 'pending'
                  ? 'Pendiente'
                  : status === 'in_progress'
                  ? 'En curso'
                  : status === 'completed'
                  ? 'Completada'
                  : 'Cancelada'}
              </Text>
            </View>
          </View>
          {!compact ? renderSessionActions(session) : null}
        </Card>
      );
    },
    [
      getSessionDisplayStatus,
      getStatusColor,
      renderSessionActions,
      styles.sessionCard,
      styles.sessionCardCompact,
      theme.primaryAlpha12,
    ],
  );

  const renderMiniCalendar = () => {
    const monthDate = selectedDate;
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: Array<Date | null> = [];

    for (let i = 0; i < startOffset; i += 1) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }

    const hasSessions = (date: Date) => sessions.some((session) => isSameDay(session.date, date));

    return (
      <Card variant="default" padding="large" style={styles.sideCard}>
        <Text style={styles.sideCardTitle}>
          {monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={styles.miniWeekdays}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <Text key={day} style={styles.miniWeekday}>{day}</Text>
          ))}
        </View>
        <View style={styles.miniCalendarGrid}>
          {days.map((day, index) => {
            const selected = day ? isSameDay(day, selectedDate) : false;
            const today = day ? isToday(day) : false;
            return (
              <AnimatedPressable
                key={`${day?.toISOString() || 'empty'}-${index}`}
                onPress={day ? () => setSelectedDate(day) : undefined}
                hoverLift={false}
                pressScale={0.98}
                style={
                  selected
                    ? [styles.miniDay, styles.miniDaySelected]
                    : today
                    ? [styles.miniDay, styles.miniDayToday]
                    : styles.miniDay
                }
              >
                {day ? (
                  <>
                    <Text style={selected ? [styles.miniDayText, styles.miniDayTextSelected] : styles.miniDayText}>
                      {day.getDate()}
                    </Text>
                    {hasSessions(day) ? <View style={styles.miniDayDot} /> : null}
                  </>
                ) : null}
              </AnimatedPressable>
            );
          })}
        </View>
      </Card>
    );
  };

  const renderLegend = () => (
    <Card variant="default" padding="large" style={styles.sideCard}>
      <Text style={styles.sideCardTitle}>Estado</Text>
      {[
        ['Confirmada', getStatusColor('confirmed')],
        ['Pendiente', getStatusColor('pending')],
        ['En curso', getStatusColor('in_progress')],
        ['Completada', getStatusColor('completed')],
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color as string }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </Card>
  );

  const renderDayView = () => {
    const grouped = TIME_SLOTS.map((hour) => ({
      hour,
      items: sessionsForDate.filter((session) => session.date.getHours() === hour),
    }));

    return (
      <ScrollView
        ref={dayScrollRef}
        style={styles.viewScroll}
        contentContainerStyle={styles.dayViewContent}
        showsVerticalScrollIndicator={false}
      >
        {grouped.map(({ hour, items }) => (
          <View key={hour} style={styles.hourSection}>
            <View style={styles.hourRail}>
              <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
            </View>
            <View style={styles.hourContent}>
              {isToday(selectedDate) && currentTime.getHours() === hour ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.currentTimeLine,
                    { top: `${(currentTime.getMinutes() / 60) * 100}%` },
                  ]}
                >
                  <View style={styles.currentTimeDot} />
                  <View style={styles.currentTimeTrack} />
                  <Text style={styles.currentTimeLabel}>{formatTime(currentTime)}</Text>
                </View>
              ) : null}
              {items.length ? (
                items.map((session) => renderSessionCard(session))
              ) : (
                <View style={styles.hourEmptyLine} />
              )}
            </View>
          </View>
        ))}

        {sessionsForDate.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={44} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No hay sesiones este día</Text>
            <Text style={styles.emptySubtitle}>Cambia la fecha o pasa a la vista de lista para revisar próximas sesiones.</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const renderWeekView = () => {
    const groupedDays = weekDays.map((day) => ({
      day,
      sessions: sessionsForWeek.filter((session) => isSameDay(session.date, day)),
    }));

    if (!isDesktop) {
      return (
        <ScrollView style={styles.viewScroll} contentContainerStyle={styles.weekStackContent} showsVerticalScrollIndicator={false}>
          {groupedDays.map(({ day, sessions: daySessions }) => (
            <Card key={day.toISOString()} variant="default" padding="large" style={styles.weekDayCard}>
              <View style={styles.weekDayCardHeader}>
                <Text style={styles.weekDayCardTitle}>
                  {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.weekDayCardMeta}>{daySessions.length} sesiones</Text>
              </View>
              {daySessions.length ? daySessions.map((session) => renderSessionCard(session, true)) : (
                <Text style={styles.weekDayEmpty}>Sin sesiones</Text>
              )}
            </Card>
          ))}
        </ScrollView>
      );
    }

    const bodyHeight = TIME_SLOTS.length * WEEK_HOUR_HEIGHT;

    return (
      <ScrollView style={styles.viewScroll} contentContainerStyle={styles.weekAgendaContent} showsVerticalScrollIndicator={false}>
        <View style={styles.weekAgendaShell}>
          <View style={styles.weekAgendaHeader}>
            <View style={styles.weekAgendaTimeHeader} />
            {groupedDays.map(({ day }) => (
              <View
                key={day.toISOString()}
                style={isToday(day) ? [styles.weekAgendaDayHeader, styles.weekAgendaDayHeaderToday] : styles.weekAgendaDayHeader}
              >
                <Text style={styles.weekAgendaDayLabel}>
                  {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                </Text>
                <Text style={styles.weekAgendaDayNumber}>{day.getDate()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.weekAgendaBody}>
            <View style={styles.weekAgendaTimeColumn}>
              {TIME_SLOTS.map((hour) => (
                <View key={hour} style={styles.weekAgendaTimeSlot}>
                  <Text style={styles.weekAgendaTimeText}>{String(hour).padStart(2, '0')}:00</Text>
                </View>
              ))}
            </View>

            {groupedDays.map(({ day, sessions: daySessions }) => (
              <View
                key={day.toISOString()}
                style={[
                  styles.weekAgendaDayColumn,
                  { height: bodyHeight },
                  isToday(day) ? styles.weekAgendaDayColumnToday : null,
                ]}
              >
                {TIME_SLOTS.map((hour) => (
                  <View
                    key={`${day.toISOString()}-${hour}`}
                    style={[
                      styles.weekAgendaHourLine,
                      { top: (hour - TIME_SLOTS[0]) * WEEK_HOUR_HEIGHT },
                    ]}
                  />
                ))}

                {daySessions.length === 0 ? (
                  <View style={styles.weekAgendaEmptyState}>
                    <Text style={styles.weekAgendaEmptyText}>Sin sesiones</Text>
                  </View>
                ) : null}

                {daySessions.map((session) => {
                  const sessionHour = session.date.getHours();
                  const sessionMinute = session.date.getMinutes();
                  const topOffset =
                    (((sessionHour - TIME_SLOTS[0]) * 60) + sessionMinute) / 60 * WEEK_HOUR_HEIGHT;
                  const blockHeight = Math.max((session.duration / 60) * WEEK_HOUR_HEIGHT - 6, 54);
                  const status = getSessionDisplayStatus(session);
                  const accentColor = getStatusColor(status);

                  return (
                    <AnimatedPressable
                      key={session.id}
                      onPress={() => navigation.navigate('ClientProfile', { clientId: session.clientId })}
                      hoverLift={false}
                      pressScale={0.99}
                      style={[
                        styles.weekAgendaSession,
                        {
                          top: topOffset,
                          minHeight: blockHeight,
                          borderColor: accentColor,
                          backgroundColor: `${accentColor}12`,
                        },
                      ]}
                    >
                      <Text style={[styles.weekAgendaSessionName, { color: accentColor }]} numberOfLines={1}>
                        {session.clientName}
                      </Text>
                      <Text style={[styles.weekAgendaSessionTime, { color: accentColor }]} numberOfLines={1}>
                        {formatTime(session.date)} - {formatTime(new Date(session.date.getTime() + session.duration * 60000))}
                      </Text>
                      <Text style={styles.weekAgendaSessionMeta} numberOfLines={1}>
                        {session.duration} min
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderListView = () => {
    const grouped = new Map<string, ProfessionalSession[]>();

    [...sessions]
      .filter((session) => session.status !== 'cancelled')
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((session) => {
        const key = session.date.toDateString();
        const existing = grouped.get(key) || [];
        existing.push(session);
        grouped.set(key, existing);
      });

    const futureDates = [...grouped.keys()].filter((key) => new Date(key) >= new Date(new Date().toDateString()));

    return (
      <ScrollView style={styles.viewScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {futureDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={44} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>Todo al día</Text>
            <Text style={styles.emptySubtitle}>No tienes sesiones próximas programadas.</Text>
          </View>
        ) : (
          futureDates.map((key) => {
            const date = new Date(key);
            const sessionsForKey = grouped.get(key) || [];
            return (
              <Card key={key} variant="default" padding="large" style={styles.listGroupCard}>
                <View style={styles.listGroupHeader}>
                  <Text style={styles.listGroupTitle}>
                    {isToday(date)
                      ? 'Hoy'
                      : date.toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                  </Text>
                  <View style={styles.listGroupBadge}>
                    <Text style={styles.listGroupBadgeText}>{sessionsForKey.length}</Text>
                  </View>
                </View>
                {sessionsForKey.map((session) => renderSessionCard(session))}
              </Card>
            );
          })
        )}

        {pendingSessions.length ? (
          <Card variant="default" padding="large" style={styles.listGroupCard}>
            <View style={styles.listGroupHeader}>
              <Text style={[styles.listGroupTitle, { color: theme.warningAmber }]}>Pendientes de confirmación</Text>
              <View style={[styles.listGroupBadge, { backgroundColor: theme.warningAmber }]}>
                <Text style={styles.listGroupBadgeText}>{pendingSessions.length}</Text>
              </View>
            </View>
            {pendingSessions.map((session) => renderSessionCard(session))}
          </Card>
        ) : null}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando sesiones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Sesiones</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{todaysSessions.length}</Text>
            <Text style={styles.kpiLabel}>hoy</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{weekSessions.length}</Text>
            <Text style={styles.kpiLabel}>esta semana</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: theme.warningAmber }]}>{pendingSessions.length}</Text>
            <Text style={styles.kpiLabel}>pendientes</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {isDesktop ? (
          <View style={styles.sideRail}>
            {renderMiniCalendar()}
            {renderLegend()}
          </View>
        ) : null}

        <View style={styles.main}>
          <View style={styles.toolbar}>
            <View style={styles.viewTabs}>
              {VIEW_OPTIONS.filter((option) => !(isMobile && option.value === 'week')).map((option) => (
                <AnimatedPressable
                  key={option.value}
                  onPress={() => setViewMode(option.value)}
                  hoverLift={false}
                  pressScale={0.98}
                  style={viewMode === option.value ? [styles.viewTab, styles.viewTabActive] : styles.viewTab}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={viewMode === option.value ? theme.textOnPrimary : theme.textSecondary}
                  />
                  <Text style={viewMode === option.value ? [styles.viewTabText, styles.viewTabTextActive] : styles.viewTabText}>
                    {option.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>

            {!isDesktop ? (
              <View style={styles.inlineMiniCalendarWrap}>{renderMiniCalendar()}</View>
            ) : null}
          </View>

          <View style={styles.dateBar}>
            <AnimatedPressable onPress={() => navigateDate(-1)} style={styles.dateNavButton} hoverLift={false} pressScale={0.98}>
              <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable onPress={goToToday} style={styles.dateCenter} hoverLift={false} pressScale={0.99}>
              <Text style={styles.dateTitle}>{getDateHeader()}</Text>
              {!isToday(selectedDate) ? <Text style={styles.dateTodayLink}>Ir a hoy</Text> : null}
            </AnimatedPressable>
            <AnimatedPressable onPress={() => navigateDate(1)} style={styles.dateNavButton} hoverLift={false} pressScale={0.98}>
              <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>

          {nextUpcomingSession ? (
            <View style={styles.dateActionsRow}>
              <Button
                variant="secondary"
                size="small"
                onPress={jumpToNextSession}
                icon={<Ionicons name="arrow-forward-circle-outline" size={16} color={theme.textPrimary} />}
              >
                Ir a próxima sesión
              </Button>
              <Text style={styles.nextSessionHint}>
                {nextUpcomingSession.date.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {' · '}
                {formatTime(nextUpcomingSession.date)}
              </Text>
            </View>
          ) : null}

          {viewMode === 'day' ? renderDayView() : null}
          {viewMode === 'week' ? renderWeekView() : null}
          {viewMode === 'list' ? renderListView() : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bg,
      gap: spacing.md,
    },
    loadingText: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: theme.bgAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: spacing.md,
    },
    headerTitle: {
      fontSize: 30,
      color: theme.textPrimary,
      textAlign: 'center',
      fontFamily: theme.fontSansBold,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    kpiCard: {
      minWidth: 120,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      ...shadows.sm,
    },
    kpiValue: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    kpiLabel: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    sideRail: {
      width: 296,
      padding: spacing.lg,
      gap: spacing.lg,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      backgroundColor: theme.bgAlt,
    },
    sideCard: {
      borderRadius: borderRadius.xl,
    },
    sideCardTitle: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      textTransform: 'capitalize',
      marginBottom: spacing.md,
      fontFamily: theme.fontSansBold,
    },
    miniWeekdays: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    miniWeekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
    },
    miniCalendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    miniDay: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      marginVertical: 2,
    },
    miniDayToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    miniDaySelected: {
      backgroundColor: theme.primary,
    },
    miniDayText: {
      fontSize: 13,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    miniDayTextSelected: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    miniDayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? theme.textOnPrimary : theme.primary,
      marginTop: 2,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    main: {
      flex: 1,
      minWidth: 0,
    },
    toolbar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    viewTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    viewTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.sm,
    },
    viewTabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    viewTabText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
    },
    viewTabTextActive: {
      color: theme.textOnPrimary,
    },
    inlineMiniCalendarWrap: {
      width: '100%',
    },
    dateBar: {
      marginTop: spacing.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      ...shadows.sm,
    },
    dateActionsRow: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    dateNavButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dateCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    nextSessionHint: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    dateTitle: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      textAlign: 'center',
      textTransform: 'capitalize',
      fontFamily: theme.fontSansBold,
    },
    dateTodayLink: {
      fontSize: typography.fontSizes.xs,
      color: theme.primary,
      marginTop: 4,
      fontFamily: theme.fontSansMedium,
    },
    viewScroll: {
      flex: 1,
    },
    dayViewContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    hourSection: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: DAY_HOUR_HEIGHT,
    },
    hourRail: {
      width: 72,
      paddingTop: spacing.sm,
    },
    hourText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
    },
    hourContent: {
      flex: 1,
      position: 'relative',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    currentTimeLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    currentTimeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.warning,
      marginLeft: -5,
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    currentTimeTrack: {
      flex: 1,
      height: 2,
      backgroundColor: theme.warning,
    },
    currentTimeLabel: {
      marginLeft: spacing.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: theme.warning,
      color: theme.textOnPrimary,
      fontSize: typography.fontSizes.xs,
      fontFamily: theme.fontSansBold,
    },
    hourEmptyLine: {
      height: 24,
    },
    sessionCard: {
      borderRadius: borderRadius.lg,
    },
    sessionCardCompact: {
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    sessionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    sessionClientBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    sessionAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionAvatarText: {
      fontSize: typography.fontSizes.md,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    sessionClientInfo: {
      flex: 1,
    },
    sessionClientName: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    sessionClientMeta: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    sessionStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    sessionStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    sessionStatusText: {
      fontSize: typography.fontSizes.xs,
      fontFamily: theme.fontSansSemiBold,
    },
    actionStack: {
      gap: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    actionHalf: {
      flex: 1,
      minWidth: 120,
    },
    joinButton: {
      minHeight: 42,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    joinButtonText: {
      fontSize: typography.fontSizes.sm,
      fontFamily: theme.fontSansSemiBold,
    },
    weekStackContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    weekDayCard: {
      borderRadius: borderRadius.xl,
    },
    weekDayCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    weekDayCardTitle: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      textTransform: 'capitalize',
      fontFamily: theme.fontSansBold,
    },
    weekDayCardMeta: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    weekDayEmpty: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    weekAgendaContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    weekAgendaShell: {
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...shadows.sm,
    },
    weekAgendaHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    weekAgendaTimeHeader: {
      width: 74,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    weekAgendaDayHeader: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    weekAgendaDayHeaderToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    weekAgendaDayLabel: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      textTransform: 'capitalize',
      fontFamily: theme.fontSansSemiBold,
    },
    weekAgendaDayNumber: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    weekAgendaBody: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    weekAgendaTimeColumn: {
      width: 74,
      backgroundColor: isDark ? theme.bgAlt : theme.bgMuted,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    weekAgendaTimeSlot: {
      height: WEEK_HOUR_HEIGHT,
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    weekAgendaTimeText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
    },
    weekAgendaDayColumn: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      borderRightWidth: 1,
      borderRightColor: theme.border,
      backgroundColor: theme.bgCard,
    },
    weekAgendaDayColumnToday: {
      backgroundColor: isDark ? `${theme.primary}08` : theme.primaryAlpha12,
    },
    weekAgendaHourLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.borderLight,
    },
    weekAgendaEmptyState: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.sm,
      right: spacing.sm,
      alignItems: 'center',
    },
    weekAgendaEmptyText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    weekAgendaSession: {
      position: 'absolute',
      left: 6,
      right: 6,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      justifyContent: 'center',
      ...shadows.sm,
    },
    weekAgendaSessionName: {
      fontSize: typography.fontSizes.sm,
      fontFamily: theme.fontSansBold,
    },
    weekAgendaSessionTime: {
      fontSize: typography.fontSizes.xs,
      marginTop: 2,
      fontFamily: theme.fontSansSemiBold,
    },
    weekAgendaSessionMeta: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.fontSans,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    listGroupCard: {
      borderRadius: borderRadius.xl,
    },
    listGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    listGroupTitle: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      textTransform: 'capitalize',
      fontFamily: theme.fontSansBold,
    },
    listGroupBadge: {
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.sm,
    },
    listGroupBadgeText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    emptySubtitle: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: 420,
      fontFamily: theme.fontSans,
    },
  });
}
