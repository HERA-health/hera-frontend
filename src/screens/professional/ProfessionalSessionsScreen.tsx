import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { heraLanding, colors, spacing, borderRadius, branding } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as professionalService from '../../services/professionalService';
import { ProfessionalSession, SessionViewMode } from '../../constants/types';
import {
  getVideoCallButtonState,
  getVideoCallButtonLabel,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../utils/videoCallUtils';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth >= 1024;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isMobile = screenWidth < 768;

// HERA Design System Colors
const HERA = {
  background: '#F5F7F5',      // Light Sage - THE LAW
  cardBg: '#FFFFFF',
  primary: '#8B9D83',          // Sage Green
  primaryDark: '#6E8066',
  secondary: '#B8A8D9',        // Lavender
  textPrimary: '#2C3E2C',      // Forest
  textSecondary: '#6B7B6B',    // Neutral
  textMuted: '#9BA89B',
  success: '#7BA377',          // Mint
  warning: '#D9A84F',          // Amber
  coral: '#E89D88',            // Coral
  border: '#E2E8E2',
  borderLight: '#F0F4F0',
};

// Session status colors
const STATUS_COLORS = {
  confirmed: HERA.primary,
  pending: HERA.warning,
  in_progress: HERA.success,
  completed: '#B8C8B8',
  cancelled: HERA.coral,
};

// Time slots for day view (7am to 9pm)
const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 7); // 7, 8, 9, ... 21

export function ProfessionalSessionsScreen() {
  const [viewMode, setViewMode] = useState<SessionViewMode>(isMobile ? 'list' : 'day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await professionalService.getProfessionalSessions();

      const mappedSessions: ProfessionalSession[] = data.map((s) => {
        let mappedStatus: 'pending' | 'scheduled' | 'completed' | 'cancelled';
        const status = s.status?.toUpperCase() || '';

        if (status === 'PENDING') {
          mappedStatus = 'pending';
        } else if (status === 'CONFIRMED' || status === 'SCHEDULED') {
          mappedStatus = 'scheduled';
        } else if (status === 'COMPLETED') {
          mappedStatus = 'completed';
        } else if (status === 'CANCELLED') {
          mappedStatus = 'cancelled';
        } else {
          mappedStatus = 'pending';
        }

        return {
          id: s.id,
          clientId: s.clientId,
          date: new Date(s.scheduledDate || (s as any).date),
          clientName: s.client?.user?.name || 'Cliente',
          clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
          duration: (s as any).duration || 60,
          type: 'video' as const,
          status: mappedStatus,
          meetingLink: (s as any).meetingLink || null,
          notes: s.notes || undefined,
        };
      });

      setSessions(mappedSessions);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las sesiones');
    } finally {
      setLoading(false);
    }
  };

  // Date helpers
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  }, []);

  const getWeekDays = useCallback((date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, []);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate, getWeekDays]);

  // Filter sessions for selected date/week
  const sessionsForDate = useMemo(() => {
    return sessions.filter(s => isSameDay(s.date, selectedDate));
  }, [sessions, selectedDate, isSameDay]);

  const sessionsForWeek = useMemo(() => {
    return sessions.filter(s => {
      return weekDays.some(day => isSameDay(s.date, day));
    });
  }, [sessions, weekDays, isSameDay]);

  // Stats
  const todaysSessions = useMemo(() => {
    const today = new Date();
    return sessions.filter(s => isSameDay(s.date, today) && s.status === 'scheduled');
  }, [sessions, isSameDay]);

  const weekSessions = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return sessions.filter(s => s.date >= weekStart && s.date <= weekEnd);
  }, [sessions]);

  const pendingSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'pending');
  }, [sessions]);

  // Navigation handlers
  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Session handlers
  const handleConfirmSession = async (sessionId: string, clientName: string) => {
    if (processingSessionId) return;
    try {
      setProcessingSessionId(sessionId);
      await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
      Alert.alert('Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
      await loadSessions();
    } catch (error) {
      Alert.alert('Error', 'No se pudo confirmar la sesión');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const handleRejectSession = async (sessionId: string, clientName: string) => {
    if (processingSessionId) return;
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
              await loadSessions();
            } catch (error) {
              Alert.alert('Error', 'No se pudo rechazar la sesión');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]
    );
  };

  const handleJoinSession = async (sessionId: string) => {
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
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al unirse a la sesión');
    }
  };

  // Format helpers
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatWeekHeader = (date: Date) => {
    const week = getWeekDays(date);
    const startMonth = week[0].toLocaleDateString('es-ES', { month: 'short' });
    const endMonth = week[6].toLocaleDateString('es-ES', { month: 'short' });
    return `Semana del ${week[0].getDate()} ${startMonth} al ${week[6].getDate()} ${endMonth}`;
  };

  const getDateHeader = () => {
    if (viewMode === 'week') {
      return formatWeekHeader(selectedDate);
    }
    if (isToday(selectedDate)) {
      return `Hoy, ${formatDate(selectedDate)}`;
    }
    return formatDate(selectedDate);
  };

  // Session status helper
  const getSessionDisplayStatus = (session: ProfessionalSession) => {
    if (session.status === 'cancelled') return 'cancelled';
    if (session.status === 'completed') return 'completed';
    if (session.status === 'pending') return 'pending';

    const now = currentTime.getTime();
    const sessionStart = session.date.getTime();
    const sessionEnd = sessionStart + session.duration * 60 * 1000;

    if (now >= sessionStart && now <= sessionEnd) {
      return 'in_progress';
    }
    return 'confirmed';
  };

  // Check if session is in join window (15min before to 15min after start)
  const isInJoinWindow = (session: ProfessionalSession) => {
    const now = currentTime.getTime();
    const sessionStart = session.date.getTime();
    const sessionEnd = sessionStart + session.duration * 60 * 1000;
    const windowStart = sessionStart - 15 * 60 * 1000;
    const windowEnd = sessionEnd + 15 * 60 * 1000;
    return now >= windowStart && now <= windowEnd;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HERA.primary} />
        <Text style={styles.loadingText}>Cargando sesiones...</Text>
      </View>
    );
  }

  // Render Header with Stats
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Mis Sesiones</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todaysSessions.length}</Text>
          <Text style={styles.statLabel}>sesiones hoy</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weekSessions.length}</Text>
          <Text style={styles.statLabel}>esta semana</Text>
        </View>
        {pendingSessions.length > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: HERA.warning }]}>{pendingSessions.length}</Text>
              <Text style={styles.statLabel}>pendientes</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  // Render View Toggle
  const renderViewToggle = () => (
    <View style={styles.viewToggleContainer}>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'day' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('day')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={viewMode === 'day' ? '#FFFFFF' : HERA.textSecondary}
          />
          <Text style={[styles.viewToggleText, viewMode === 'day' && styles.viewToggleTextActive]}>
            Día
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'week' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={viewMode === 'week' ? '#FFFFFF' : HERA.textSecondary}
          />
          <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>
            Semana
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={18}
            color={viewMode === 'list' ? '#FFFFFF' : HERA.textSecondary}
          />
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Date Navigation
  const renderDateNavigation = () => (
    <View style={styles.dateNavigation}>
      <TouchableOpacity
        style={styles.dateNavButton}
        onPress={() => navigateDate(-1)}
      >
        <Ionicons name="chevron-back" size={24} color={HERA.textPrimary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.dateDisplay} onPress={goToToday}>
        <Text style={styles.dateText}>{getDateHeader()}</Text>
        {!isToday(selectedDate) && (
          <Text style={styles.todayLink}>Ir a hoy</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dateNavButton}
        onPress={() => navigateDate(1)}
      >
        <Ionicons name="chevron-forward" size={24} color={HERA.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  // Render Mini Calendar
  const renderMiniCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDayOfMonth.getDay() || 7;

    const days: (Date | null)[] = [];
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const hasSessions = (date: Date) => {
      return sessions.some(s => isSameDay(s.date, date));
    };

    return (
      <View style={styles.miniCalendar}>
        <Text style={styles.miniCalendarTitle}>{monthName}</Text>

        <View style={styles.miniCalendarWeekdays}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
            <Text key={i} style={styles.miniCalendarWeekday}>{day}</Text>
          ))}
        </View>

        <View style={styles.miniCalendarDays}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.miniCalendarDay,
                day && isToday(day) && styles.miniCalendarDayToday,
                day && isSameDay(day, selectedDate) && styles.miniCalendarDaySelected,
              ]}
              onPress={() => day && setSelectedDate(day)}
              disabled={!day}
            >
              {day && (
                <>
                  <Text
                    style={[
                      styles.miniCalendarDayText,
                      isToday(day) && styles.miniCalendarDayTextToday,
                      isSameDay(day, selectedDate) && styles.miniCalendarDayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {hasSessions(day) && (
                    <View style={styles.miniCalendarDot} />
                  )}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render Session Block (for Day/Week views)
  const renderSessionBlock = (session: ProfessionalSession, compact = false) => {
    const status = getSessionDisplayStatus(session);
    const statusColor = STATUS_COLORS[status];
    const inJoinWindow = isInJoinWindow(session);

    if (compact) {
      return (
        <TouchableOpacity
          key={session.id}
          style={[styles.sessionBlockCompact, { backgroundColor: statusColor }]}
        >
          <Text style={styles.sessionBlockCompactText} numberOfLines={1}>
            {session.clientName.split(' ')[0]}
          </Text>
          <Text style={styles.sessionBlockCompactTime}>{formatTime(session.date)}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View
        key={session.id}
        style={[
          styles.sessionBlock,
          { borderLeftColor: statusColor },
          status === 'in_progress' && styles.sessionBlockInProgress,
        ]}
      >
        <View style={styles.sessionBlockHeader}>
          <View style={styles.sessionBlockClient}>
            <View style={styles.sessionBlockAvatar}>
              <Text style={styles.sessionBlockAvatarText}>{session.clientInitial}</Text>
            </View>
            <View style={styles.sessionBlockInfo}>
              <Text style={styles.sessionBlockName}>{session.clientName}</Text>
              <View style={styles.sessionBlockMeta}>
                <Ionicons
                  name={session.type === 'video' ? 'videocam' : 'call'}
                  size={14}
                  color={HERA.textSecondary}
                />
                <Text style={styles.sessionBlockMetaText}>{session.duration} min</Text>
                {session.notes && (
                  <>
                    <Text style={styles.sessionBlockMetaDot}>•</Text>
                    <Text style={styles.sessionBlockMetaText} numberOfLines={1}>
                      {session.notes}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.sessionBlockStatus}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.sessionBlockTime}>{formatTime(session.date)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.sessionBlockActions}>
          {session.status === 'pending' ? (
            <>
              <TouchableOpacity
                style={styles.sessionActionConfirm}
                onPress={() => handleConfirmSession(session.id, session.clientName)}
                disabled={processingSessionId === session.id}
              >
                {processingSessionId === session.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.sessionActionConfirmText}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sessionActionReject}
                onPress={() => handleRejectSession(session.id, session.clientName)}
                disabled={processingSessionId === session.id}
              >
                <Ionicons name="close" size={16} color={HERA.coral} />
                <Text style={styles.sessionActionRejectText}>Rechazar</Text>
              </TouchableOpacity>
            </>
          ) : session.type === 'video' && session.status === 'scheduled' ? (
            <>
              {inJoinWindow ? (
                <TouchableOpacity
                  style={styles.sessionActionJoin}
                  onPress={() => handleJoinSession(session.id)}
                >
                  <Ionicons name="videocam" size={16} color="#FFFFFF" />
                  <Text style={styles.sessionActionJoinText}>Unirse ahora</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.sessionActionWaiting}>
                  <Ionicons name="time-outline" size={16} color={HERA.textSecondary} />
                  <Text style={styles.sessionActionWaitingText}>
                    {session.date > currentTime
                      ? `Comienza ${formatTime(session.date)}`
                      : 'Sesión finalizada'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.sessionActionSecondary}>
                <Ionicons name="person-outline" size={16} color={HERA.primary} />
                <Text style={styles.sessionActionSecondaryText}>Ver ficha</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.sessionActionSecondary}>
              <Ionicons name="document-text-outline" size={16} color={HERA.primary} />
              <Text style={styles.sessionActionSecondaryText}>Ver notas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Day View (Timeline)
  const renderDayView = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimePosition = ((currentHour - 7) + currentMinute / 60) * 80;

    // Get sessions for selected date, sorted by time
    const daySessions = sessionsForDate.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return (
      <ScrollView
        style={styles.dayViewContainer}
        contentContainerStyle={styles.dayViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Timeline */}
        <View style={styles.timeline}>
          {/* Time slots */}
          {TIME_SLOTS.map((hour) => (
            <View key={hour} style={styles.timeSlot}>
              <View style={styles.timeLabel}>
                <Text style={styles.timeLabelText}>
                  {hour.toString().padStart(2, '0')}:00
                </Text>
              </View>
              <View style={styles.timeSlotLine} />
            </View>
          ))}

          {/* Current time indicator */}
          {isToday(selectedDate) && currentHour >= 7 && currentHour < 22 && (
            <View
              style={[
                styles.currentTimeIndicator,
                { top: currentTimePosition + 8 },
              ]}
            >
              <View style={styles.currentTimeDot} />
              <View style={styles.currentTimeLine} />
              <Text style={styles.currentTimeLabel}>
                Ahora {formatTime(currentTime)}
              </Text>
            </View>
          )}

          {/* Session blocks positioned on timeline */}
          <View style={styles.sessionBlocks}>
            {daySessions.map((session) => {
              const sessionHour = session.date.getHours();
              const sessionMinute = session.date.getMinutes();
              const topPosition = ((sessionHour - 7) + sessionMinute / 60) * 80;
              const blockHeight = Math.max((session.duration / 60) * 80 - 8, 72);

              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionBlockPositioned,
                    { top: topPosition, height: blockHeight },
                  ]}
                >
                  {renderSessionBlock(session)}
                </View>
              );
            })}
          </View>
        </View>

        {/* Empty state */}
        {daySessions.length === 0 && (
          <View style={styles.emptyDayState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={HERA.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No tienes sesiones programadas</Text>
            <Text style={styles.emptySubtitle}>
              {isToday(selectedDate)
                ? 'Disfruta tu día libre o ajusta tu disponibilidad'
                : 'Selecciona otro día para ver las sesiones'}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // Render Week View (Grid)
  const renderWeekView = () => {
    return (
      <ScrollView
        style={styles.weekViewContainer}
        contentContainerStyle={styles.weekViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week header */}
        <View style={styles.weekHeader}>
          <View style={styles.weekHeaderSpacer} />
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.weekHeaderDay,
                isToday(day) && styles.weekHeaderDayToday,
                isSameDay(day, selectedDate) && styles.weekHeaderDaySelected,
              ]}
              onPress={() => {
                setSelectedDate(day);
                setViewMode('day');
              }}
            >
              <Text
                style={[
                  styles.weekHeaderDayName,
                  isToday(day) && styles.weekHeaderDayNameToday,
                ]}
              >
                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.weekHeaderDayNumber,
                  isToday(day) && styles.weekHeaderDayNumberToday,
                ]}
              >
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Week grid */}
        <View style={styles.weekGrid}>
          {/* Time column */}
          <View style={styles.weekTimeColumn}>
            {TIME_SLOTS.map((hour) => (
              <View key={hour} style={styles.weekTimeSlot}>
                <Text style={styles.weekTimeText}>
                  {hour.toString().padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const daySessions = sessions.filter((s) => isSameDay(s.date, day));

            return (
              <View key={dayIndex} style={styles.weekDayColumn}>
                {TIME_SLOTS.map((hour) => (
                  <View key={hour} style={styles.weekGridCell} />
                ))}

                {/* Sessions for this day */}
                {daySessions.map((session) => {
                  const sessionHour = session.date.getHours();
                  const sessionMinute = session.date.getMinutes();
                  const topPosition = ((sessionHour - 7) + sessionMinute / 60) * 60;
                  const blockHeight = Math.max((session.duration / 60) * 60 - 4, 40);
                  const status = getSessionDisplayStatus(session);

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.weekSessionBlock,
                        { top: topPosition, height: blockHeight, backgroundColor: STATUS_COLORS[status] },
                      ]}
                      onPress={() => {
                        setSelectedDate(day);
                        setViewMode('day');
                      }}
                    >
                      <Text style={styles.weekSessionName} numberOfLines={1}>
                        {session.clientName.split(' ')[0]}
                      </Text>
                      <Text style={styles.weekSessionTime}>{formatTime(session.date)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Render List View (Cards)
  const renderListView = () => {
    // Group sessions by date
    const groupedSessions: { [key: string]: ProfessionalSession[] } = {};

    const sortedSessions = [...sessions]
      .filter((s) => s.status !== 'cancelled')
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    sortedSessions.forEach((session) => {
      const dateKey = session.date.toDateString();
      if (!groupedSessions[dateKey]) {
        groupedSessions[dateKey] = [];
      }
      groupedSessions[dateKey].push(session);
    });

    const today = new Date();
    const todayKey = today.toDateString();

    // Filter to show today and future
    const futureDates = Object.keys(groupedSessions).filter((dateKey) => {
      const date = new Date(dateKey);
      return date >= new Date(today.toDateString());
    });

    return (
      <ScrollView
        style={styles.listViewContainer}
        contentContainerStyle={styles.listViewContent}
        showsVerticalScrollIndicator={false}
      >
        {futureDates.length === 0 ? (
          <View style={styles.emptyListState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done-outline" size={48} color={HERA.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Estás al día con tus sesiones</Text>
            <Text style={styles.emptySubtitle}>
              No tienes sesiones programadas próximamente
            </Text>
          </View>
        ) : (
          futureDates.map((dateKey) => {
            const date = new Date(dateKey);
            const isDateToday = dateKey === todayKey;
            const isTomorrow =
              new Date(date.getTime() - 86400000).toDateString() === todayKey;

            return (
              <View key={dateKey} style={styles.listDateGroup}>
                <View style={styles.listDateHeader}>
                  <Text style={styles.listDateText}>
                    {isDateToday
                      ? 'Hoy'
                      : isTomorrow
                      ? 'Mañana'
                      : formatDate(date)}
                  </Text>
                  <View style={styles.listDateBadge}>
                    <Text style={styles.listDateBadgeText}>
                      {groupedSessions[dateKey].length}
                    </Text>
                  </View>
                </View>

                {groupedSessions[dateKey].map((session) => (
                  <View key={session.id} style={styles.listCard}>
                    {renderSessionBlock(session)}
                  </View>
                ))}
              </View>
            );
          })
        )}

        {/* Pending sessions section */}
        {pendingSessions.length > 0 && (
          <View style={styles.listDateGroup}>
            <View style={styles.listDateHeader}>
              <Text style={[styles.listDateText, { color: HERA.warning }]}>
                Pendientes de confirmación
              </Text>
              <View style={[styles.listDateBadge, { backgroundColor: HERA.warning }]}>
                <Text style={styles.listDateBadgeText}>{pendingSessions.length}</Text>
              </View>
            </View>

            {pendingSessions.map((session) => (
              <View key={session.id} style={styles.listCard}>
                {renderSessionBlock(session)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.content}>
        {/* Sidebar with mini calendar (desktop only) */}
        {isDesktop && (
          <View style={styles.sidebar}>
            {renderMiniCalendar()}

            {/* Status Legend */}
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Estado</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.confirmed }]} />
                <Text style={styles.legendText}>Confirmada</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.pending }]} />
                <Text style={styles.legendText}>Pendiente</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.in_progress }]} />
                <Text style={styles.legendText}>En curso</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.completed }]} />
                <Text style={styles.legendText}>Completada</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main content */}
        <View style={styles.mainContent}>
          {renderViewToggle()}
          {renderDateNavigation()}

          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'list' && renderListView()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HERA.background, // #F5F7F5 - THE LAW
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HERA.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: HERA.textSecondary,
  },

  // Header
  header: {
    backgroundColor: HERA.cardBg,
    paddingHorizontal: isDesktop ? spacing.xxxl : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: HERA.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: HERA.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: HERA.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: HERA.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: HERA.border,
    marginHorizontal: spacing.md,
  },

  // Content layout
  content: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: HERA.cardBg,
    borderRightWidth: 1,
    borderRightColor: HERA.border,
    padding: spacing.lg,
  },

  // Mini Calendar
  miniCalendar: {
    marginBottom: spacing.xl,
  },
  miniCalendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA.textPrimary,
    textTransform: 'capitalize',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  miniCalendarWeekdays: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  miniCalendarWeekday: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: HERA.textMuted,
    textAlign: 'center',
  },
  miniCalendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  miniCalendarDayToday: {
    backgroundColor: `${HERA.primary}20`,
    borderRadius: 20,
  },
  miniCalendarDaySelected: {
    backgroundColor: HERA.primary,
    borderRadius: 20,
  },
  miniCalendarDayText: {
    fontSize: 13,
    color: HERA.textPrimary,
  },
  miniCalendarDayTextToday: {
    fontWeight: '700',
    color: HERA.primary,
  },
  miniCalendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  miniCalendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: HERA.primary,
    marginTop: 2,
  },

  // Legend
  legend: {
    padding: spacing.md,
    backgroundColor: HERA.background,
    borderRadius: borderRadius.lg,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA.textPrimary,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendText: {
    fontSize: 13,
    color: HERA.textSecondary,
  },

  // Main content
  mainContent: {
    flex: 1,
  },

  // View Toggle
  viewToggleContainer: {
    backgroundColor: HERA.cardBg,
    paddingHorizontal: isDesktop ? spacing.xl : spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: HERA.border,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: HERA.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    alignSelf: isMobile ? 'stretch' : 'flex-start',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    flex: isMobile ? 1 : undefined,
  },
  viewToggleButtonActive: {
    backgroundColor: HERA.primary,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA.textSecondary,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },

  // Date Navigation
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: isDesktop ? spacing.xl : spacing.lg,
    backgroundColor: HERA.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: HERA.border,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: HERA.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: HERA.textPrimary,
    textTransform: 'capitalize',
  },
  todayLink: {
    fontSize: 13,
    color: HERA.primary,
    marginTop: 4,
  },

  // Day View
  dayViewContainer: {
    flex: 1,
  },
  dayViewContent: {
    paddingHorizontal: isDesktop ? spacing.xl : spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  timeline: {
    position: 'relative',
    minHeight: TIME_SLOTS.length * 80,
  },
  timeSlot: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeLabel: {
    width: 60,
    paddingRight: spacing.md,
    alignItems: 'flex-end',
  },
  timeLabelText: {
    fontSize: 13,
    fontWeight: '500',
    color: HERA.textMuted,
  },
  timeSlotLine: {
    flex: 1,
    height: 1,
    backgroundColor: HERA.borderLight,
    marginTop: 8,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 60,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: HERA.coral,
    marginLeft: -5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: HERA.coral,
  },
  currentTimeLabel: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: HERA.coral,
    backgroundColor: HERA.cardBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionBlocks: {
    position: 'absolute',
    top: 0,
    left: 70,
    right: 0,
  },
  sessionBlockPositioned: {
    position: 'absolute',
    left: 0,
    right: 0,
  },

  // Session Block
  sessionBlock: {
    backgroundColor: HERA.cardBg,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionBlockInProgress: {
    shadowColor: HERA.success,
    shadowOpacity: 0.2,
  },
  sessionBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sessionBlockClient: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionBlockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${HERA.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: HERA.primary,
  },
  sessionBlockAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: HERA.primary,
  },
  sessionBlockInfo: {
    flex: 1,
  },
  sessionBlockName: {
    fontSize: 15,
    fontWeight: '600',
    color: HERA.textPrimary,
    marginBottom: 2,
  },
  sessionBlockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionBlockMetaText: {
    fontSize: 13,
    color: HERA.textSecondary,
    flex: 1,
  },
  sessionBlockMetaDot: {
    color: HERA.textMuted,
  },
  sessionBlockStatus: {
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  sessionBlockTime: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA.textPrimary,
  },
  sessionBlockActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: HERA.borderLight,
    paddingTop: spacing.sm,
  },

  // Session Actions
  sessionActionConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HERA.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  sessionActionConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionActionReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: HERA.coral,
    gap: spacing.xs,
  },
  sessionActionRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: HERA.coral,
  },
  sessionActionJoin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HERA.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  sessionActionJoinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionActionWaiting: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HERA.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  sessionActionWaitingText: {
    fontSize: 13,
    color: HERA.textSecondary,
  },
  sessionActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${HERA.primary}15`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  sessionActionSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: HERA.primary,
  },

  // Compact session block (for week view)
  sessionBlockCompact: {
    padding: spacing.xs,
    borderRadius: 4,
  },
  sessionBlockCompactText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionBlockCompactTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },

  // Week View
  weekViewContainer: {
    flex: 1,
  },
  weekViewContent: {
    paddingBottom: spacing.xxxl,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: HERA.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: HERA.border,
    paddingVertical: spacing.sm,
  },
  weekHeaderSpacer: {
    width: 50,
  },
  weekHeaderDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
  },
  weekHeaderDayToday: {
    backgroundColor: `${HERA.primary}15`,
  },
  weekHeaderDaySelected: {
    backgroundColor: HERA.primary,
  },
  weekHeaderDayName: {
    fontSize: 12,
    fontWeight: '500',
    color: HERA.textSecondary,
    textTransform: 'capitalize',
  },
  weekHeaderDayNameToday: {
    color: HERA.primary,
    fontWeight: '600',
  },
  weekHeaderDayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: HERA.textPrimary,
    marginTop: 2,
  },
  weekHeaderDayNumberToday: {
    color: HERA.primary,
  },
  weekGrid: {
    flexDirection: 'row',
    minHeight: TIME_SLOTS.length * 60,
  },
  weekTimeColumn: {
    width: 50,
    borderRightWidth: 1,
    borderRightColor: HERA.borderLight,
  },
  weekTimeSlot: {
    height: 60,
    justifyContent: 'flex-start',
    paddingRight: spacing.xs,
    paddingTop: 4,
    alignItems: 'flex-end',
  },
  weekTimeText: {
    fontSize: 11,
    color: HERA.textMuted,
  },
  weekDayColumn: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: HERA.borderLight,
  },
  weekGridCell: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: HERA.borderLight,
  },
  weekSessionBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
  },
  weekSessionName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  weekSessionTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },

  // List View
  listViewContainer: {
    flex: 1,
  },
  listViewContent: {
    padding: isDesktop ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  listDateGroup: {
    marginBottom: spacing.xl,
  },
  listDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listDateText: {
    fontSize: 18,
    fontWeight: '700',
    color: HERA.textPrimary,
    textTransform: 'capitalize',
    flex: 1,
  },
  listDateBadge: {
    backgroundColor: HERA.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  listDateBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listCard: {
    marginBottom: spacing.md,
  },

  // Empty states
  emptyDayState: {
    position: 'absolute',
    top: 0,
    left: 70,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyListState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: HERA.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: HERA.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HERA.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: HERA.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
