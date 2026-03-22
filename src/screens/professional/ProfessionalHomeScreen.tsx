/**
 * ProfessionalHomeScreen - Calendar-based Professional Dashboard
 * Three-column layout: sidebar (via MainLayout) | calendar | right panel
 * Follows HERA design language with sage green and lavender palette
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  heraLanding,
  spacing,
  borderRadius,
  shadows,
  typography,
  layout,
} from '../../constants/colors';
import { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as professionalService from '../../services/professionalService';
import { VerificationBanner } from '../../components/auth';
import * as analyticsService from '../../services/analyticsService';
import { formatTime, getDateLabel } from '../sessions/utils/sessionHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helper functions ────────────────────────────────────────────────────────

const WEEK_VIEW_HOUR_HEIGHT = 48;
const WEEK_VIEW_START_HOUR = 9;
const WEEK_VIEW_END_HOUR = 21; // exclusive — grid shows 09:00–20:00
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
  // Monday = 0 in our system
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), sessions: [] });
  }

  // Current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today), sessions: [] });
  }

  // Fill remaining to complete grid (multiple of 7)
  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, days.length - (startDow + daysInMonth) + 1);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), sessions: [] });
  }

  return days;
}

function getWeekDays(referenceDate: Date): CalendarDay[] {
  const today = new Date();
  const dow = referenceDate.getDay();
  // Monday-based
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
    case 'VIDEO_CALL': return 'Videollamada';
    case 'PHONE_CALL': return 'Teléfono';
    case 'IN_PERSON': return 'Presencial';
    default: return type;
  }
}

function getSessionTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'VIDEO_CALL': return 'videocam-outline';
    case 'PHONE_CALL': return 'call-outline';
    case 'IN_PERSON': return 'person-outline';
    default: return 'ellipse-outline';
  }
}

function formatEndTime(startDate: string, durationMinutes: number): string {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const hh = String(end.getHours()).padStart(2, '0');
  const mm = String(end.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfessionalHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Data state
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<professionalService.Session[]>([]);
  const [profile, setProfile] = useState<professionalService.ProfessionalProfile | null>(null);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('month');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    analyticsService.trackScreen('professional_dashboard');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, profileData] = await Promise.all([
        professionalService.getProfessionalSessions(),
        professionalService.getProfessionalProfile(),
      ]);
      setSessions(sessionsData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Mapped session data ────────────────────────────────────────────────

  const mappedSessions = useMemo(() => sessions.map(mapSession), [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MappedSession[]>();
    for (const s of mappedSessions) {
      const key = dateKey(new Date(s.date));
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [mappedSessions]);

  const pendingRequests = useMemo(
    () => mappedSessions.filter((s) => s.status === 'PENDING'),
    [mappedSessions],
  );

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return mappedSessions
      .filter((s) => s.status === 'CONFIRMED' && new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [mappedSessions]);

  // ─── Calendar data ──────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const days =
      viewMode === 'month'
        ? getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
        : getWeekDays(currentDate);

    return days.map((day) => ({
      ...day,
      sessions: sessionsByDate.get(dateKey(day.date)) || [],
    }));
  }, [currentDate, viewMode, sessionsByDate]);

  // ─── Navigation label ──────────────────────────────────────────────────

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    // Week view: show range e.g. "17-23 mar"
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

  // ─── Handlers ──────────────────────────────────────────────────────────

  const navigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  }, [viewMode]);

  const handleConfirmSession = async (sessionId: string) => {
    if (processingSessionId) return;
    const request = pendingRequests.find((r) => r.id === sessionId);
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
    const request = pendingRequests.find((r) => r.id === sessionId);
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

  // ─── Render: Top Bar ───────────────────────────────────────────────────

  const renderTopBar = () => (
    <Animated.View
      style={[
        styles.topBar,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.greeting}>
        {getGreeting()}, {user?.name?.split(' ')[0] || 'Especialista'}
      </Text>

      <View style={styles.topBarRight}>
        {/* Navigation arrows */}
        <View style={styles.navArrows}>
          <TouchableOpacity onPress={navigatePrev} style={styles.navArrowButton}>
            <Ionicons name="chevron-back" size={18} color={heraLanding.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{navLabel}</Text>
          <TouchableOpacity onPress={navigateNext} style={styles.navArrowButton}>
            <Ionicons name="chevron-forward" size={18} color={heraLanding.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* View selector dropdown */}
        <View style={styles.viewSelectorContainer}>
          <TouchableOpacity
            style={styles.viewSelectorButton}
            onPress={() => setShowViewDropdown((prev) => !prev)}
          >
            <Text style={styles.viewSelectorText}>
              {viewMode === 'month' ? 'Vista mensual' : 'Vista semanal'}
            </Text>
            <Ionicons
              name={showViewDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={heraLanding.textSecondary}
            />
          </TouchableOpacity>

          {showViewDropdown && (
            <View style={styles.viewDropdown}>
              <TouchableOpacity
                style={[
                  styles.viewDropdownItem,
                  viewMode === 'month' && styles.viewDropdownItemActive,
                ]}
                onPress={() => {
                  setViewMode('month');
                  setShowViewDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.viewDropdownText,
                    viewMode === 'month' && styles.viewDropdownTextActive,
                  ]}
                >
                  Vista mensual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewDropdownItem,
                  viewMode === 'week' && styles.viewDropdownItemActive,
                ]}
                onPress={() => {
                  setViewMode('week');
                  setShowViewDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.viewDropdownText,
                    viewMode === 'week' && styles.viewDropdownTextActive,
                  ]}
                >
                  Vista semanal
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  // ─── Render: Month View ────────────────────────────────────────────────

  const renderMonthView = () => (
    <View style={styles.calendarGrid}>
      {/* Weekday headers */}
      <View style={styles.weekdayHeaderRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayHeaderCell}>
            <Text style={styles.weekdayHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day cells in rows of 7 */}
      {Array.from({ length: calendarDays.length / 7 }, (_, weekIdx) => (
        <View key={weekIdx} style={styles.calendarWeekRow}>
          {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
            const confirmed = day.sessions.filter((s) => s.status === 'CONFIRMED');
            const pending = day.sessions.filter((s) => s.status === 'PENDING');
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

                {pills.map((session) => (
                  <View
                    key={session.id}
                    style={[
                      styles.eventPill,
                      session.status === 'CONFIRMED'
                        ? styles.eventPillConfirmed
                        : styles.eventPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.eventPillText,
                        session.status === 'CONFIRMED'
                          ? styles.eventPillTextConfirmed
                          : styles.eventPillTextPending,
                      ]}
                      numberOfLines={1}
                    >
                      {formatTime(session.date)}
                    </Text>
                  </View>
                ))}

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

  // ─── Render: Week View ─────────────────────────────────────────────────

  const renderWeekView = () => {
    const totalHours = WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR;
    const hours = Array.from({ length: totalHours }, (_, i) => i + WEEK_VIEW_START_HOUR);
    const bodyHeight = totalHours * WEEK_VIEW_HOUR_HEIGHT;

    return (
      <ScrollView style={styles.weekViewScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.weekGrid}>
          {/* Header row: time col + 7 day cols */}
          <View style={styles.weekHeaderRow}>
            <View style={styles.weekTimeColumn} />
            {calendarDays.map((day) => (
              <View
                key={dateKey(day.date)}
                style={[styles.weekDayHeader, day.isToday && styles.weekDayHeaderToday]}
              >
                <Text style={styles.weekDayHeaderLabel}>
                  {WEEKDAY_LABELS[((day.date.getDay() + 6) % 7)]}
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

          {/* Body: time labels column + day columns with absolute session blocks */}
          <View style={styles.weekBody}>
            {/* Time labels column */}
            <View style={styles.weekTimeColumn}>
              {hours.map((hour) => (
                <View key={hour} style={styles.weekTimeLabelCell}>
                  <Text style={styles.weekTimeLabel}>
                    {String(hour).padStart(2, '0')}:00
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {calendarDays.map((day) => (
              <View
                key={dateKey(day.date)}
                style={[
                  styles.weekDayColumn,
                  { height: bodyHeight },
                  day.isToday && styles.weekDayCellToday,
                ]}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <View
                    key={hour}
                    style={[
                      styles.weekHourGridLine,
                      { top: (hour - WEEK_VIEW_START_HOUR) * WEEK_VIEW_HOUR_HEIGHT },
                    ]}
                  />
                ))}

                {/* Session blocks */}
                {day.sessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const sessionHour = sessionDate.getHours();
                  const sessionMinutes = sessionDate.getMinutes();
                  const topOffset =
                    ((sessionHour - WEEK_VIEW_START_HOUR) * 60 + sessionMinutes) /
                    60 *
                    WEEK_VIEW_HOUR_HEIGHT;
                  const blockHeight = Math.max(
                    (session.duration / 60) * WEEK_VIEW_HOUR_HEIGHT,
                    WEEK_VIEW_MIN_BLOCK_HEIGHT,
                  );
                  const showClientName = blockHeight >= WEEK_VIEW_BLOCK_SHORT_THRESHOLD;
                  const showType = blockHeight >= WEEK_VIEW_TYPE_THRESHOLD;
                  const timeRange = `${formatTime(session.date)} - ${formatEndTime(session.date, session.duration)}`;
                  const textColorStyle =
                    session.status === 'CONFIRMED'
                      ? styles.weekSessionTextConfirmed
                      : styles.weekSessionTextPending;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        // TODO: pass { sessionId: session.id } once ProfessionalSessionsScreen supports it
                        navigation.navigate('ProfessionalSessions');
                      }}
                      style={[
                        styles.weekSessionBlock,
                        session.status === 'CONFIRMED'
                          ? styles.weekSessionConfirmed
                          : styles.weekSessionPending,
                        {
                          position: 'absolute',
                          top: topOffset,
                          height: blockHeight,
                          left: 2,
                          right: 2,
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      {showClientName && (
                        <Text
                          style={[styles.weekSessionText, textColorStyle]}
                          numberOfLines={1}
                        >
                          {session.clientName}
                        </Text>
                      )}
                      <Text
                        style={[styles.weekSessionTimeText, textColorStyle]}
                        numberOfLines={1}
                      >
                        {timeRange}
                      </Text>
                      {showType && (
                        <View style={styles.weekSessionTypeRow}>
                          <Ionicons
                            name={getSessionTypeIcon(session.type)}
                            size={WEEK_VIEW_SESSION_ICON_SIZE}
                            color={
                              session.status === 'CONFIRMED'
                                ? heraLanding.calendarConfirmedText
                                : heraLanding.calendarPendingText
                            }
                          />
                          <Text
                            style={[styles.weekSessionTypeText, textColorStyle]}
                            numberOfLines={1}
                          >
                            {getSessionTypeLabel(session.type)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ─── Render: Right Panel — Pending Requests ────────────────────────────

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
                {getDateLabel(request.date)} {formatTime(request.date)} &middot;{' '}
                {getSessionTypeLabel(request.type)}
              </Text>
              <View style={styles.requestButtons}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    processingSessionId === request.id && styles.buttonDisabled,
                  ]}
                  onPress={() => handleConfirmSession(request.id)}
                  disabled={processingSessionId === request.id}
                >
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.declineBtn,
                    processingSessionId === request.id && styles.buttonDisabled,
                  ]}
                  onPress={() => handleDeclineSession(request.id)}
                  disabled={processingSessionId === request.id}
                >
                  <Text style={styles.declineBtnText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
        )}
      </ScrollView>
    </View>
  );

  // ─── Render: Right Panel — Upcoming Sessions ──────────────────────────

  const renderUpcomingSessions = () => (
    <View style={[styles.rightPanelBlock, styles.rightPanelBlockBottom, !isDesktop && styles.rightPanelBlockMobile]}>
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
                <Text style={styles.upcomingDayLabel}>
                  {getDateLabel(session.date)}
                </Text>
                <Text style={styles.upcomingTime}>
                  {formatTime(session.date)}
                </Text>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingClientName} numberOfLines={1}>
                  {session.clientName}
                </Text>
                <Text style={styles.upcomingMeta} numberOfLines={1}>
                  {getSessionTypeLabel(session.type)} &middot; {session.duration} min
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

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <VerificationBanner />

      {renderTopBar()}

      {isDesktop ? (
        /* Desktop: calendar + right panel side by side */
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
        /* Mobile: stacked */
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

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
  },

  // ─── Top Bar ─────────────────────────────────────────────────────────

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: heraLanding.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    flexWrap: 'wrap',
    gap: spacing.sm,
    zIndex: 100,
    overflow: 'visible',
  },
  greeting: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
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
  },
  navArrowButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: heraLanding.background,
  },
  navLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    minWidth: 100,
    textAlign: 'center',
  },

  // ─── View Selector ───────────────────────────────────────────────────

  viewSelectorContainer: {
    position: 'relative',
    zIndex: 10,
  },
  viewSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.cardBg,
  },
  viewSelectorText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textSecondary,
  },
  viewDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: heraLanding.cardBg,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    ...shadows.md,
    minWidth: 140,
    zIndex: 1000,
  },
  viewDropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  viewDropdownItemActive: {
    backgroundColor: heraLanding.primaryMuted,
  },
  viewDropdownText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },
  viewDropdownTextActive: {
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.semibold,
  },

  // ─── Body Layout ─────────────────────────────────────────────────────

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
    borderLeftColor: heraLanding.border,
    backgroundColor: heraLanding.cardBg,
  },
  mobileScroll: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },

  // ─── Month Calendar ──────────────────────────────────────────────────

  calendarGrid: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  weekdayHeaderCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  weekdayHeaderText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  monthDayCell: {
    flex: 1,
    minHeight: 80,
    padding: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: heraLanding.borderLight,
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
    marginBottom: 2,
  },
  dayNumberToday: {
    backgroundColor: heraLanding.primary,
  },
  dayNumber: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
  },
  dayNumberTodayText: {
    color: heraLanding.textOnPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  dayNumberMuted: {
    color: heraLanding.textMuted,
  },

  // ─── Event Pills ─────────────────────────────────────────────────────

  eventPill: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    marginBottom: 2,
  },
  eventPillConfirmed: {
    backgroundColor: heraLanding.calendarConfirmedBg,
  },
  eventPillPending: {
    backgroundColor: heraLanding.calendarPendingBg,
  },
  eventPillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
  },
  eventPillTextConfirmed: {
    color: heraLanding.calendarConfirmedText,
  },
  eventPillTextPending: {
    color: heraLanding.calendarPendingText,
  },
  extraEventsText: {
    fontSize: 9,
    color: heraLanding.textMuted,
    marginTop: 1,
  },

  // ─── Week View ────────────────────────────────────────────────────────

  weekViewScroll: {
    flex: 1,
  },
  weekGrid: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
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
    backgroundColor: heraLanding.calendarConfirmedBg,
  },
  weekDayHeaderLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textMuted,
  },
  weekDayHeaderNumber: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
  },
  weekDayHeaderNumberToday: {
    color: heraLanding.primary,
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
    color: heraLanding.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  weekDayColumn: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: heraLanding.borderLight,
  },
  weekHourGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WEEK_VIEW_HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  weekDayCellToday: {
    backgroundColor: 'rgba(139, 157, 131, 0.04)',
  },
  weekSessionBlock: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  weekSessionConfirmed: {
    backgroundColor: heraLanding.calendarConfirmedBg,
  },
  weekSessionPending: {
    backgroundColor: heraLanding.calendarPendingBg,
  },
  weekSessionText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.medium,
  },
  weekSessionTextConfirmed: {
    color: heraLanding.calendarConfirmedText,
  },
  weekSessionTextPending: {
    color: heraLanding.calendarPendingText,
  },
  weekSessionTimeText: {
    fontSize: 8,
    fontWeight: typography.fontWeights.medium,
  },
  weekSessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  weekSessionTypeText: {
    fontSize: 7,
    fontWeight: typography.fontWeights.medium,
    flexShrink: 1,
  },

  // ─── Right Panel ─────────────────────────────────────────────────────

  rightPanelBlock: {
    flex: 1,
    maxHeight: '50%',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  rightPanelBlockBottom: {
    borderBottomWidth: 0,
  },
  rightPanelBlockMobile: {
    maxHeight: layout.mobilePanelHeight,
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    borderBottomWidth: 0,
    ...shadows.sm,
  },
  rightPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  rightPanelTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
  },
  rightPanelScroll: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },

  // ─── Badges ──────────────────────────────────────────────────────────

  badgeLavender: {
    backgroundColor: heraLanding.calendarPendingBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeLavenderText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.calendarPendingText,
  },
  badgeGreen: {
    backgroundColor: heraLanding.calendarConfirmedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeGreenText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.calendarConfirmedText,
  },

  // ─── Request Cards ───────────────────────────────────────────────────

  requestCard: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  requestClientName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  requestDetail: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textOnPrimary,
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ─── Upcoming Session Cards ──────────────────────────────────────────

  upcomingCard: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
    gap: spacing.sm,
  },
  upcomingTimeCol: {
    alignItems: 'center',
    minWidth: 48,
  },
  upcomingDayLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.primary,
  },
  upcomingTime: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.primary,
  },
  upcomingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  upcomingClientName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  upcomingMeta: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
    marginTop: 1,
  },

  // ─── Empty State ─────────────────────────────────────────────────────

  emptyText: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
