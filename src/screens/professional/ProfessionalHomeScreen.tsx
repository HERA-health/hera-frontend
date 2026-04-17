/**
 * ProfessionalHomeScreen - Calendar-based Professional Dashboard
 * Three-column layout: sidebar (via MainLayout) | calendar | right panel
 * Modernized with HERA theme tokens and dark mode support.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  layout,
  shadows,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AppNavigationProp } from '../../constants/types';
import { VerificationBanner } from '../../components/auth';
import { AnimatedPressable, Button } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as professionalService from '../../services/professionalService';
import { formatTime, getDateLabel } from '../sessions/utils/sessionHelpers';

type CalendarView = 'month' | 'week';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: MappedSession[];
}

interface MappedSession {
  id: string;
  clientId: string;
  clientName: string;
  clientInitial: string;
  date: string;
  duration: number;
  status: string;
  type: string;
}

const WEEK_VIEW_HOUR_HEIGHT = 48;
const WEEK_VIEW_START_HOUR = 9;
const WEEK_VIEW_END_HOUR = 21;
const WEEK_VIEW_MIN_BLOCK_HEIGHT = 20;
const WEEK_VIEW_BLOCK_SHORT_THRESHOLD = 40;
const WEEK_VIEW_TYPE_THRESHOLD = 60;
const WEEK_VIEW_SESSION_ICON_SIZE = 10;

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const SHORT_MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: CalendarDay[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), sessions: [] });
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today), sessions: [] });
  }

  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, days.length - (startDow + daysInMonth) + 1);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), sessions: [] });
  }

  return days;
}

function getWeekDays(referenceDate: Date): CalendarDay[] {
  const today = new Date();
  const dow = referenceDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      date,
      isCurrentMonth: date.getMonth() === referenceDate.getMonth(),
      isToday: isSameDay(date, today),
      sessions: [],
    });
  }
  return days;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapSession(s: professionalService.Session): MappedSession {
  return {
    id: s.id,
    clientId: s.clientId,
    clientName: s.client?.user?.name || 'Cliente',
    clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
    date: s.date,
    duration: 60,
    status: s.status,
    type: 'VIDEO_CALL',
  };
}

function getSessionTypeLabel(type: string): string {
  switch (type) {
    case 'VIDEO_CALL':
      return 'Videollamada';
    case 'PHONE_CALL':
      return 'Teléfono';
    case 'IN_PERSON':
      return 'Presencial';
    default:
      return type;
  }
}

function getSessionTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'VIDEO_CALL':
      return 'videocam-outline';
    case 'PHONE_CALL':
      return 'call-outline';
    case 'IN_PERSON':
      return 'person-outline';
    default:
      return 'ellipse-outline';
  }
}

function formatEndTime(startDate: string, durationMinutes: number): string {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const hh = String(end.getHours()).padStart(2, '0');
  const mm = String(end.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getSessionStatusTone(theme: Theme, status: string) {
  return status === 'CONFIRMED' ? theme.status.confirmed : theme.status.pending;
}

export function ProfessionalHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<professionalService.Session[]>([]);
  const [profile, setProfile] = useState<professionalService.ProfessionalProfile | null>(null);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('month');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    analyticsService.trackScreen('professional_dashboard');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadData = useCallback(async () => {
    try {
      const [sessionsData, profileData] = await Promise.all([
        professionalService.getProfessionalSessions(),
        professionalService.getProfessionalProfile(),
      ]);
      setSessions(sessionsData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading professional home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mappedSessions = useMemo(() => sessions.map(mapSession), [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MappedSession[]>();
    for (const session of mappedSessions) {
      const key = dateKey(new Date(session.date));
      const items = map.get(key) || [];
      items.push(session);
      map.set(key, items);
    }
    return map;
  }, [mappedSessions]);

  const pendingRequests = useMemo(
    () => mappedSessions.filter((session) => session.status === 'PENDING'),
    [mappedSessions],
  );

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return mappedSessions
      .filter((session) => session.status === 'CONFIRMED' && new Date(session.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [mappedSessions]);

  const calendarDays = useMemo(() => {
    const days =
      viewMode === 'month'
        ? getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
        : getWeekDays(currentDate);

    return days.map((day) => ({
      ...day,
      sessions: sessionsByDate.get(dateKey(day.date)) || [],
    }));
  }, [currentDate, sessionsByDate, viewMode]);

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    const weekDays = getWeekDays(currentDate);
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    const firstMonth = SHORT_MONTH_NAMES[first.getMonth()];
    const lastMonth = SHORT_MONTH_NAMES[last.getMonth()];

    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()}-${last.getDate()} ${firstMonth}`;
    }
    return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth}`;
  }, [currentDate, viewMode]);

  const handleNavigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
    setShowViewDropdown(false);
  }, [viewMode]);

  const handleNavigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
    setShowViewDropdown(false);
  }, [viewMode]);

  const handleConfirmSession = async (sessionId: string) => {
    if (processingSessionId) return;
    const request = pendingRequests.find((item) => item.id === sessionId);
    const clientName = request?.clientName || 'Cliente';

    try {
      setProcessingSessionId(sessionId);
      await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
      Alert.alert('Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
      await loadData();
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la sesión');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const handleDeclineSession = async (sessionId: string) => {
    if (processingSessionId) return;
    const request = pendingRequests.find((item) => item.id === sessionId);
    const clientName = request?.clientName || 'Cliente';

    Alert.alert(
      'Rechazar sesión',
      `¿Estás seguro de que deseas rechazar la sesión con ${clientName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingSessionId(sessionId);
              await professionalService.updateSessionStatus(sessionId, 'CANCELLED');
              Alert.alert('Sesión rechazada', `La sesión con ${clientName} ha sido rechazada`);
              await loadData();
            } catch {
              Alert.alert('Error', 'No se pudo rechazar la sesión');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ],
    );
  };

  const renderTopBar = () => (
    <Animated.View
      style={[
        styles.topBar,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.name?.split(' ')[0] || profile?.specialization || 'Hera'}
        </Text>
        <Text style={styles.topBarSubtitle}>
          Tu calendario clínico y seguimiento de sesiones, en un solo espacio.
        </Text>
      </View>

      <View style={styles.topBarRight}>
        <View style={styles.navArrows}>
          <AnimatedPressable
            onPress={handleNavigatePrev}
            style={styles.navArrowButton}
            hoverLift={false}
            pressScale={0.96}
          >
            <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
          </AnimatedPressable>
          <Text style={styles.navLabel}>{navLabel}</Text>
          <AnimatedPressable
            onPress={handleNavigateNext}
            style={styles.navArrowButton}
            hoverLift={false}
            pressScale={0.96}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
          </AnimatedPressable>
        </View>

        <View style={styles.viewSelectorContainer}>
          <AnimatedPressable
            style={styles.viewSelectorButton}
            onPress={() => setShowViewDropdown((prev) => !prev)}
            hoverLift={false}
            pressScale={0.98}
          >
            <Text style={styles.viewSelectorText}>
              {viewMode === 'month' ? 'Vista mensual' : 'Vista semanal'}
            </Text>
            <Ionicons
              name={showViewDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.textSecondary}
            />
          </AnimatedPressable>

          {showViewDropdown && (
            <View style={styles.viewDropdown}>
              <AnimatedPressable
                style={
                  viewMode === 'month'
                    ? [styles.viewDropdownItem, styles.viewDropdownItemActive]
                    : styles.viewDropdownItem
                }
                onPress={() => {
                  setViewMode('month');
                  setShowViewDropdown(false);
                }}
                hoverLift={false}
                pressScale={0.99}
              >
                <Text
                  style={
                    viewMode === 'month'
                      ? [styles.viewDropdownText, styles.viewDropdownTextActive]
                      : styles.viewDropdownText
                  }
                >
                  Vista mensual
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={
                  viewMode === 'week'
                    ? [styles.viewDropdownItem, styles.viewDropdownItemActive]
                    : styles.viewDropdownItem
                }
                onPress={() => {
                  setViewMode('week');
                  setShowViewDropdown(false);
                }}
                hoverLift={false}
                pressScale={0.99}
              >
                <Text
                  style={
                    viewMode === 'week'
                      ? [styles.viewDropdownText, styles.viewDropdownTextActive]
                      : styles.viewDropdownText
                  }
                >
                  Vista semanal
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderMonthView = () => (
    <View style={styles.calendarGrid}>
      <View style={styles.weekdayHeaderRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayHeaderCell}>
            <Text style={styles.weekdayHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: calendarDays.length / 7 }, (_, weekIdx) => (
        <View key={`week-${weekIdx}`} style={styles.calendarWeekRow}>
          {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
            const confirmed = day.sessions.filter((session) => session.status === 'CONFIRMED');
            const pending = day.sessions.filter((session) => session.status === 'PENDING');
            const pills = [...confirmed.slice(0, 2), ...pending.slice(0, 2)].slice(0, 2);
            const totalEvents = confirmed.length + pending.length;
            const extraCount = totalEvents - pills.length;

            return (
              <View
                key={dateKey(day.date)}
                style={[
                  styles.monthDayCell,
                  !day.isCurrentMonth && styles.monthDayCellMuted,
                ]}
              >
                <View style={[styles.dayNumberWrapper, day.isToday && styles.dayNumberToday]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      day.isToday && styles.dayNumberTodayText,
                      !day.isCurrentMonth && styles.dayNumberMuted,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                </View>

                {pills.map((session) => {
                  const tone = getSessionStatusTone(theme, session.status);
                  return (
                    <View
                      key={session.id}
                      style={[
                        styles.eventPill,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Text style={[styles.eventPillText, { color: tone.text }]} numberOfLines={1}>
                        {formatTime(session.date)}
                      </Text>
                    </View>
                  );
                })}

                {extraCount > 0 && (
                  <Text style={styles.extraEventsText}>+{extraCount} más</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderWeekView = () => {
    const totalHours = WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR;
    const hours = Array.from({ length: totalHours }, (_, i) => i + WEEK_VIEW_START_HOUR);
    const bodyHeight = totalHours * WEEK_VIEW_HOUR_HEIGHT;

    return (
      <ScrollView style={styles.weekViewScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.weekGrid}>
          <View style={styles.weekHeaderRow}>
            <View style={styles.weekTimeColumn} />
            {calendarDays.map((day) => (
              <View
                key={dateKey(day.date)}
                style={[styles.weekDayHeader, day.isToday && styles.weekDayHeaderToday]}
              >
                <Text style={styles.weekDayHeaderLabel}>
                  {WEEKDAY_LABELS[(day.date.getDay() + 6) % 7]}
                </Text>
                <Text
                  style={[
                    styles.weekDayHeaderNumber,
                    day.isToday && styles.weekDayHeaderNumberToday,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.weekBody}>
            <View style={styles.weekTimeColumn}>
              {hours.map((hour) => (
                <View key={`hour-${hour}`} style={styles.weekTimeLabelCell}>
                  <Text style={styles.weekTimeLabel}>{String(hour).padStart(2, '0')}:00</Text>
                </View>
              ))}
            </View>

            {calendarDays.map((day) => (
              <View
                key={dateKey(day.date)}
                style={[
                  styles.weekDayColumn,
                  { height: bodyHeight },
                  day.isToday && styles.weekDayCellToday,
                ]}
              >
                {hours.map((hour) => (
                  <View
                    key={`grid-${dateKey(day.date)}-${hour}`}
                    style={[
                      styles.weekHourGridLine,
                      { top: (hour - WEEK_VIEW_START_HOUR) * WEEK_VIEW_HOUR_HEIGHT },
                    ]}
                  />
                ))}

                {day.sessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const sessionHour = sessionDate.getHours();
                  const sessionMinutes = sessionDate.getMinutes();
                  const topOffset =
                    (((sessionHour - WEEK_VIEW_START_HOUR) * 60) + sessionMinutes) / 60 *
                    WEEK_VIEW_HOUR_HEIGHT;
                  const blockHeight = Math.max(
                    (session.duration / 60) * WEEK_VIEW_HOUR_HEIGHT,
                    WEEK_VIEW_MIN_BLOCK_HEIGHT,
                  );
                  const showClientName = blockHeight >= WEEK_VIEW_BLOCK_SHORT_THRESHOLD;
                  const showType = blockHeight >= WEEK_VIEW_TYPE_THRESHOLD;
                  const timeRange = `${formatTime(session.date)} - ${formatEndTime(session.date, session.duration)}`;
                  const tone = getSessionStatusTone(theme, session.status);

                  return (
                    <AnimatedPressable
                      key={session.id}
                      onPress={() => navigation.navigate('ProfessionalSessions')}
                      style={[
                        styles.weekSessionBlock,
                        {
                          position: 'absolute',
                          top: topOffset,
                          height: blockHeight,
                          left: 2,
                          right: 2,
                          backgroundColor: tone.bg,
                          borderColor: tone.border,
                          overflow: 'hidden',
                        },
                      ]}
                      hoverLift={false}
                      pressScale={0.98}
                    >
                      {showClientName && (
                        <Text style={[styles.weekSessionText, { color: tone.text }]} numberOfLines={1}>
                          {session.clientName}
                        </Text>
                      )}
                      <Text style={[styles.weekSessionTimeText, { color: tone.text }]} numberOfLines={1}>
                        {timeRange}
                      </Text>
                      {showType && (
                        <View style={styles.weekSessionTypeRow}>
                          <Ionicons
                            name={getSessionTypeIcon(session.type)}
                            size={WEEK_VIEW_SESSION_ICON_SIZE}
                            color={tone.text}
                          />
                          <Text
                            style={[styles.weekSessionTypeText, { color: tone.text }]}
                            numberOfLines={1}
                          >
                            {getSessionTypeLabel(session.type)}
                          </Text>
                        </View>
                      )}
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

  const renderPendingRequests = () => (
    <View style={[styles.rightPanelBlock, !isDesktop && styles.rightPanelBlockMobile]}>
      <View style={styles.rightPanelHeader}>
        <Text style={styles.rightPanelTitle}>Solicitudes pendientes</Text>
        <View style={styles.badgeLavender}>
          <Text style={styles.badgeLavenderText}>{pendingRequests.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.rightPanelScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {pendingRequests.length > 0 ? (
          pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.requestClientName}>{request.clientName}</Text>
              <Text style={styles.requestDetail}>
                {getDateLabel(request.date)} {formatTime(request.date)} · {getSessionTypeLabel(request.type)}
              </Text>

              <View style={styles.requestButtons}>
                <View style={styles.requestButtonSlot}>
                  <Button
                    variant="primary"
                    size="small"
                    onPress={() => handleConfirmSession(request.id)}
                    loading={processingSessionId === request.id}
                    fullWidth
                  >
                    Confirmar
                  </Button>
                </View>
                <View style={styles.requestButtonSlot}>
                  <Button
                    variant="outline"
                    size="small"
                    onPress={() => handleDeclineSession(request.id)}
                    disabled={processingSessionId === request.id}
                    fullWidth
                  >
                    Rechazar
                  </Button>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderUpcomingSessions = () => (
    <View
      style={[
        styles.rightPanelBlock,
        styles.rightPanelBlockBottom,
        !isDesktop && styles.rightPanelBlockMobile,
      ]}
    >
      <View style={styles.rightPanelHeader}>
        <Text style={styles.rightPanelTitle}>Próximas sesiones</Text>
        <View style={styles.badgeGreen}>
          <Text style={styles.badgeGreenText}>{upcomingSessions.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.rightPanelScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {upcomingSessions.length > 0 ? (
          upcomingSessions.map((session) => (
            <View key={session.id} style={styles.upcomingCard}>
              <View style={styles.upcomingTimeCol}>
                <Text style={styles.upcomingDayLabel}>{getDateLabel(session.date)}</Text>
                <Text style={styles.upcomingTime}>{formatTime(session.date)}</Text>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingClientName} numberOfLines={1}>
                  {session.clientName}
                </Text>
                <Text style={styles.upcomingMeta} numberOfLines={1}>
                  {getSessionTypeLabel(session.type)} · {session.duration} min
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay sesiones próximas</Text>
        )}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VerificationBanner />
      {renderTopBar()}

      {isDesktop ? (
        <View style={styles.bodyRow}>
          <View style={styles.calendarPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewMode === 'month' ? renderMonthView() : renderWeekView()}
            </ScrollView>
          </View>

          <View style={styles.rightPanel}>
            {renderPendingRequests()}
            {renderUpcomingSessions()}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.mobileScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.calendarPanelMobile}>
            {viewMode === 'month' ? renderMonthView() : renderWeekView()}
          </View>
          {renderPendingRequests()}
          {renderUpcomingSessions()}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.bgAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexWrap: 'wrap',
      gap: spacing.sm,
      zIndex: 100,
      overflow: 'visible',
    },
    greetingBlock: {
      gap: 4,
      paddingVertical: 2,
    },
    greeting: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    topBarSubtitle: {
      fontSize: typography.fontSizes.xs,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    navArrows: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    navArrowButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLabel: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      minWidth: 124,
      textAlign: 'center',
      fontFamily: theme.fontSansSemiBold,
    },
    viewSelectorContainer: {
      position: 'relative',
      zIndex: 10,
    },
    viewSelectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs + 3,
      paddingHorizontal: spacing.sm + 2,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    viewSelectorText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    viewDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: spacing.xs,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      minWidth: 152,
      shadowColor: theme.shadowNeutral,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 6,
      zIndex: 1000,
    },
    viewDropdownItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    viewDropdownItemActive: {
      backgroundColor: theme.primaryAlpha12,
    },
    viewDropdownText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    viewDropdownTextActive: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    bodyRow: {
      flex: 1,
      flexDirection: 'row',
    },
    calendarPanel: {
      flex: 1,
      padding: spacing.md,
    },
    calendarPanelMobile: {
      padding: spacing.sm,
    },
    rightPanel: {
      width: layout.rightPanelWidth,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
      backgroundColor: theme.bgAlt,
    },
    mobileScroll: {
      flex: 1,
    },
    bottomSpacer: {
      height: spacing.xxl,
    },
    calendarGrid: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...shadows.sm,
    },
    weekdayHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    weekdayHeaderCell: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    weekdayHeaderText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
    },
    calendarWeekRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    monthDayCell: {
      flex: 1,
      minHeight: 80,
      padding: spacing.xs,
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
    },
    monthDayCellMuted: {
      opacity: 0.45,
    },
    dayNumberWrapper: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    dayNumberToday: {
      backgroundColor: theme.primary,
    },
    dayNumber: {
      fontSize: typography.fontSizes.xs,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
    },
    dayNumberTodayText: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    dayNumberMuted: {
      color: theme.textMuted,
    },
    eventPill: {
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      marginBottom: 3,
      borderWidth: 1,
    },
    eventPillText: {
      fontSize: 10,
      fontFamily: theme.fontSansMedium,
    },
    extraEventsText: {
      fontSize: 9,
      color: theme.textMuted,
      marginTop: 1,
      fontFamily: theme.fontSans,
    },
    weekViewScroll: {
      flex: 1,
    },
    weekGrid: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...shadows.sm,
    },
    weekHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    weekTimeColumn: {
      width: layout.calendarTimeColumnWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDayHeader: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    weekDayHeaderToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    weekDayHeaderLabel: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
    },
    weekDayHeaderNumber: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    weekDayHeaderNumberToday: {
      color: theme.primary,
    },
    weekBody: {
      flexDirection: 'row',
    },
    weekTimeLabelCell: {
      height: WEEK_VIEW_HOUR_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 2,
    },
    weekTimeLabel: {
      fontSize: 10,
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
    },
    weekDayColumn: {
      flex: 1,
      position: 'relative',
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
    },
    weekHourGridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: WEEK_VIEW_HOUR_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    weekDayCellToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    weekSessionBlock: {
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
      borderWidth: 1,
    },
    weekSessionText: {
      fontSize: 9,
      fontFamily: theme.fontSansSemiBold,
    },
    weekSessionTimeText: {
      fontSize: 8,
      fontFamily: theme.fontSansMedium,
    },
    weekSessionTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 1,
    },
    weekSessionTypeText: {
      fontSize: 7,
      flexShrink: 1,
      fontFamily: theme.fontSansMedium,
    },
    rightPanelBlock: {
      flex: 1,
      maxHeight: '50%',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rightPanelBlockBottom: {
      borderBottomWidth: 0,
    },
    rightPanelBlockMobile: {
      maxHeight: layout.mobilePanelHeight,
      marginHorizontal: spacing.sm,
      marginTop: spacing.md,
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomWidth: 1,
      ...shadows.sm,
    },
    rightPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rightPanelTitle: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    rightPanelScroll: {
      flex: 1,
      paddingHorizontal: spacing.sm,
    },
    badgeLavender: {
      backgroundColor: theme.secondaryAlpha12,
      borderWidth: 1,
      borderColor: theme.secondaryMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    badgeLavenderText: {
      fontSize: typography.fontSizes.xs,
      color: theme.secondaryDark,
      fontFamily: theme.fontSansBold,
    },
    badgeGreen: {
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    badgeGreenText: {
      fontSize: typography.fontSizes.xs,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    requestCard: {
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    requestClientName: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      marginBottom: 2,
      fontFamily: theme.fontSansSemiBold,
    },
    requestDetail: {
      fontSize: typography.fontSizes.xs,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
      fontFamily: theme.fontSans,
    },
    requestButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    requestButtonSlot: {
      flex: 1,
    },
    upcomingCard: {
      flexDirection: 'row',
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: spacing.sm,
    },
    upcomingTimeCol: {
      alignItems: 'center',
      minWidth: 52,
      justifyContent: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
    },
    upcomingDayLabel: {
      fontSize: 10,
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    upcomingTime: {
      fontSize: typography.fontSizes.xs,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    upcomingInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    upcomingClientName: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    upcomingMeta: {
      fontSize: typography.fontSizes.xs,
      color: theme.textSecondary,
      marginTop: 1,
      fontFamily: theme.fontSans,
    },
    emptyText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
      fontFamily: theme.fontSans,
    },
  });
}
