import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  borderRadius,
  layout,
  shadows,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AppNavigationProp, ProfessionalSession, SessionViewMode } from '../../constants/types';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourStepPreparation,
} from '../../components/onboarding/professionalTourContext';
import { ManagedSessionSchedulerModal } from '../../components/professional/ManagedSessionSchedulerModal';
import { AppointmentDetailSheet } from '../../components/sessions/AppointmentDetailSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
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
const PENDING_VIDEO_MEETING_LINK = 'https://hera.local/pending-video-link';

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

function getSessionEndDate(session: ProfessionalSession) {
  return new Date(session.date.getTime() + session.duration * 60000);
}

function formatSessionTimeRange(session: ProfessionalSession) {
  return `${formatTime(session.date)} - ${formatTime(getSessionEndDate(session))}`;
}

function getSessionTypeLabel(type: ProfessionalSession['type']): string {
  switch (type) {
    case 'video':
      return 'Videollamada';
    case 'audio':
      return 'Teléfono';
    case 'chat':
      return 'Chat';
    case 'in_person':
      return 'Presencial';
  }
}

function capitalizeFirst(value: string) {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function getSessionClientName(client?: professionalService.Session['client']): string {
  const managedName = [client?.firstName, client?.lastName].filter(Boolean).join(' ').trim();
  return client?.displayName || managedName || client?.user?.name || 'Cliente';
}

function getFirstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function getSessionClientEmail(client?: professionalService.Session['client']): string | null {
  return getFirstNonBlank(client?.primaryEmail, client?.user?.email, client?.email);
}

function getSchedulerClientEmail(client?: professionalService.Client | null): string | null {
  return getFirstNonBlank(client?.primaryEmail, client?.user?.email, client?.email);
}

function getSchedulerClientAvatar(client?: professionalService.Client | null): string | null {
  return getFirstNonBlank(client?.user?.avatar);
}

function isProfessionalVideoSession(session: ProfessionalSession): boolean {
  return session.type === 'video' || Boolean(session.meetingLink);
}

function getProfessionalVideoCallSession(session: ProfessionalSession) {
  return {
    status: 'CONFIRMED',
    type: 'VIDEO_CALL',
    date: session.date,
    duration: session.duration,
    meetingLink: session.meetingLink || PENDING_VIDEO_MEETING_LINK,
  };
}

function toSchedulerSessionType(type: ProfessionalSession['type']): professionalService.SessionType {
  switch (type) {
    case 'audio':
      return 'PHONE_CALL';
    case 'in_person':
      return 'IN_PERSON';
    case 'video':
    case 'chat':
      return 'VIDEO_CALL';
  }
}

function buildSchedulerClientFromSession(session: ProfessionalSession): professionalService.Client {
  const email = session.clientEmail ?? null;

  return {
    id: session.clientId,
    userId: session.clientUserId ?? null,
    source: session.clientSource ?? 'MANAGED',
    firstName: session.clientName,
    lastName: '',
    email,
    phone: null,
    primaryEmail: email,
    displayName: session.clientName,
    user: {
      id: session.clientUserId ?? null,
      email: email ?? '',
      name: session.clientName,
      userType: 'CLIENT',
      avatar: session.clientAvatar ?? null,
    },
  };
}

function hydrateSchedulerClientFromSession(
  client: professionalService.Client,
  session: ProfessionalSession
): professionalService.Client {
  const sessionClient = buildSchedulerClientFromSession(session);
  const email = getSchedulerClientEmail(client) ?? getSchedulerClientEmail(sessionClient);
  const avatar = getSchedulerClientAvatar(client) ?? getSchedulerClientAvatar(sessionClient);
  const existingUser = client.user ?? sessionClient.user;

  return {
    ...client,
    firstName: client.firstName || sessionClient.firstName,
    lastName: client.lastName ?? sessionClient.lastName,
    email,
    primaryEmail: email,
    displayName: client.displayName || sessionClient.displayName,
    user: {
      ...existingUser,
      id: existingUser.id ?? sessionClient.user.id,
      email: existingUser.email || email || '',
      name: existingUser.name || sessionClient.user.name,
      userType: existingUser.userType || sessionClient.user.userType,
      avatar,
    },
  };
}

export function ProfessionalSessionsScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const dayScrollRef = useRef<ScrollView | null>(null);
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;
  const styles = useMemo(() => createStyles(theme, isDark, isMobile), [theme, isDark, isMobile]);

  const [viewMode, setViewMode] = useState<SessionViewMode>(isMobile ? 'list' : 'day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedulableClients, setSchedulableClients] = useState<professionalService.Client[]>([]);
  const [loadingSchedulableClients, setLoadingSchedulableClients] = useState(false);
  const [schedulerVisible, setSchedulerVisible] = useState(false);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<ProfessionalSession | null>(null);
  const [autoConfirmSessionRequests, setAutoConfirmSessionRequests] = useState<boolean | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<professionalService.ProfessionalSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');
  const sessionsLoadSeqRef = useRef(0);
  const sessionsRef = useRef<ProfessionalSession[]>([]);
  const sessionDetailLoadSeqRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = useCallback(async () => {
    const requestSeq = sessionsLoadSeqRef.current + 1;
    sessionsLoadSeqRef.current = requestSeq;
    const hasExistingSessions = sessionsRef.current.length > 0;

    try {
      if (!hasExistingSessions) {
        setLoading(true);
      }
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
          rawType === 'PHONE_CALL'
            ? 'audio'
            : rawType === 'CHAT'
            ? 'chat'
            : rawType === 'IN_PERSON'
            ? 'in_person'
            : 'video';
        const clientName = getSessionClientName(session.client);
        const clientEmail = getSessionClientEmail(session.client);

        return {
          id: session.id,
          clientId: session.clientId,
          clientName,
          clientInitial: (clientName || 'C')[0].toUpperCase(),
          date: new Date(session.date),
          duration: session.duration || 60,
          status: mappedStatus,
          type: mappedType,
          meetingLink: session.meetingLink || undefined,
          clientEmail,
          clientSource: session.client?.source,
          clientUserId: session.client?.userId ?? null,
          clientAvatar: session.client?.user?.avatar || undefined,
          hasInvoice: Boolean(session.invoice),
          origin: session.origin,
          clinicContext: session.clinicContext,
          actions: session.actions,
        };
      });

      if (sessionsLoadSeqRef.current !== requestSeq) {
        return;
      }

      sessionsRef.current = mappedSessions;
      setSessions(mappedSessions);
      setLoadError(false);
      setLoadErrorMessage('');
    } catch (error) {
      if (sessionsLoadSeqRef.current !== requestSeq) {
        return;
      }

      setLoadError(true);
      setLoadErrorMessage(getErrorMessage(error, 'No se pudieron cargar las sesiones'));
    } finally {
      if (sessionsLoadSeqRef.current === requestSeq) {
        setLoading(false);
      }
    }
  }, []);

  const loadSchedulableClients = useCallback(async (): Promise<professionalService.Client[]> => {
    try {
      setLoadingSchedulableClients(true);
      const clients = await professionalService.getProfessionalClients({
        source: 'ALL',
        lifecycle: 'ACTIVE',
      });
      setSchedulableClients(clients);
      return clients;
    } catch {
      showAppAlert(appAlert, 'Error', 'No se pudieron cargar tus pacientes');
      return [];
    } finally {
      setLoadingSchedulableClients(false);
    }
  }, [appAlert]);

  const loadAgendaPreference = useCallback(async () => {
    try {
      const preferences = await professionalService.getAgendaPreferences();
      setAutoConfirmSessionRequests(preferences?.autoConfirmSessionRequests ?? null);
    } catch {
      // Keep the current value. If it has not loaded yet, the chip stays neutral.
    }
  }, []);

  const openManagedSessionScheduler = useCallback(async () => {
    setEditingSession(null);
    const clients = schedulableClients.length > 0
      ? schedulableClients
      : await loadSchedulableClients();

    if (clients.length === 0) {
      showAppAlert(
        appAlert,
        'Sin pacientes disponibles',
        'Primero añade, vincula o atiende a un paciente desde tu panel para poder programar una cita.'
      );
      return;
    }

    setSchedulerVisible(true);
  }, [appAlert, loadSchedulableClients, schedulableClients]);

  const openManagedSessionEditor = useCallback((session: ProfessionalSession) => {
    setEditingSession(session);
    setSchedulerVisible(true);
  }, []);

  const closeManagedSessionScheduler = useCallback(() => {
    if (schedulerSaving) {
      return;
    }

    setSchedulerVisible(false);
    setEditingSession(null);
  }, [schedulerSaving]);

  const openSessionDetail = useCallback(async (sessionId: string) => {
    const requestSeq = sessionDetailLoadSeqRef.current + 1;
    sessionDetailLoadSeqRef.current = requestSeq;
    setSelectedSessionId(sessionId);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailError('');
    setSelectedSessionDetailLoading(true);

    try {
      const detail = await professionalService.getProfessionalSessionDetail(sessionId);
      if (sessionDetailLoadSeqRef.current !== requestSeq) return;
      setSelectedSessionDetail(detail);
    } catch (error: unknown) {
      if (sessionDetailLoadSeqRef.current !== requestSeq) return;
      setSelectedSessionDetailError(getErrorMessage(error, 'No se pudo cargar el detalle de la cita'));
    } finally {
      if (sessionDetailLoadSeqRef.current === requestSeq) {
        setSelectedSessionDetailLoading(false);
      }
    }
  }, []);

  const closeSessionDetail = useCallback(() => {
    sessionDetailLoadSeqRef.current += 1;
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
  }, []);

  const retrySessionDetail = useCallback(() => {
    if (!selectedSessionId) return;
    void openSessionDetail(selectedSessionId);
  }, [openSessionDetail, selectedSessionId]);

  const openSelectedSessionPatient = useCallback(() => {
    if (!selectedSessionDetail) return;
    const { clientId } = selectedSessionDetail;
    closeSessionDetail();
    navigation.navigate('ClientProfile', { clientId });
  }, [closeSessionDetail, navigation, selectedSessionDetail]);

  const openSelectedSessionNotes = useCallback(() => {
    const target = selectedSessionDetail?.clinicalTarget;
    if (!target) return;

    closeSessionDetail();
    navigation.navigate('ClientProfile', {
      clientId: target.clientId,
      initialTab: 'clinical',
      clinicalWorkspace: 'sessions',
      focusSessionId: target.sessionId,
    });
  }, [closeSessionDetail, navigation, selectedSessionDetail]);

  const handleCreateManagedSession = useCallback(
    async (input: professionalService.CreateManagedClientSessionInput) => {
      try {
        setSchedulerSaving(true);
        await professionalService.createManagedClientSession(input);
        setSchedulerVisible(false);
        setEditingSession(null);
        showAppAlert(appAlert, 'Cita creada', 'La cita se ha programado correctamente.');
        await loadSessions();
      } catch (error) {
        if (professionalService.isManagedSessionBufferConflictError(error)) {
          throw error;
        }

        const message = error instanceof Error ? error.message : 'No se pudo crear la cita';
        showAppAlert(appAlert, 'No se pudo crear la cita', message);
      } finally {
        setSchedulerSaving(false);
      }
    },
    [appAlert, loadSessions],
  );

  const handleUpdateManagedSession = useCallback(
    async (input: professionalService.CreateManagedClientSessionInput) => {
      if (!editingSession) {
        return;
      }

      try {
        setSchedulerSaving(true);
        await professionalService.updateManagedSessionSchedule(editingSession.id, {
          date: input.date,
          duration: input.duration,
          type: input.type,
          overrideBuffer: input.overrideBuffer,
        });
        setSchedulerVisible(false);
        setEditingSession(null);
        showAppAlert(appAlert, 'Cita modificada', 'La cita se ha actualizado correctamente.');
        await loadSessions();
      } catch (error) {
        if (professionalService.isManagedSessionBufferConflictError(error)) {
          throw error;
        }

        const message = error instanceof Error ? error.message : 'No se pudo modificar la cita';
        showAppAlert(appAlert, 'No se pudo modificar la cita', message);
      } finally {
        setSchedulerSaving(false);
      }
    },
    [appAlert, editingSession, loadSessions],
  );

  useEffect(() => {
    analyticsService.trackScreen('professional_sessions');
    loadSessions();
  }, [loadSessions]);

  useFocusEffect(
    useCallback(() => {
      void loadAgendaPreference();
    }, [loadAgendaPreference]),
  );

  useEffect(() => () => {
    sessionsLoadSeqRef.current += 1;
  }, []);

  const handleRetryLoadSessions = useCallback(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleConfigureAgenda = useCallback(() => {
    navigation.navigate('ProfessionalProfile', { initialTab: 'agenda' });
  }, [navigation]);

  useProfessionalTourAutoStart(
    'professional_sessions_v1',
    !loading && !loadError && !schedulerVisible && !isAppAlertVisible,
  );

  const prepareSessionsListStep = useCallback(() => {
    dayScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useProfessionalTourStepPreparation(
    'professional.sessions.list',
    prepareSessionsListStep,
  );

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

  const schedulerClients = useMemo(
    () => {
      if (!editingSession) {
        return schedulableClients;
      }

      const existingClient = schedulableClients.find((client) => client.id === editingSession.clientId);
      return [
        existingClient
          ? hydrateSchedulerClientFromSession(existingClient, editingSession)
          : buildSchedulerClientFromSession(editingSession),
      ];
    },
    [editingSession, schedulableClients],
  );

  const schedulerInitialValues = useMemo(
    () => editingSession
      ? {
          clientId: editingSession.clientId,
          date: editingSession.date.toISOString(),
          duration: editingSession.duration,
          type: toSchedulerSessionType(editingSession.type),
        }
      : null,
    [editingSession],
  );

  const agendaModeColor = autoConfirmSessionRequests === null
    ? theme.textSecondary
    : autoConfirmSessionRequests
      ? theme.success
      : theme.warningAmber;
  const agendaModeBorderColor = autoConfirmSessionRequests === null
    ? theme.border
    : `${agendaModeColor}66`;
  const agendaModeBackgroundColor = autoConfirmSessionRequests === null
    ? theme.bgCard
    : `${agendaModeColor}12`;
  const agendaModeIcon: keyof typeof Ionicons.glyphMap = autoConfirmSessionRequests === null
    ? 'settings-outline'
    : autoConfirmSessionRequests
      ? 'flash-outline'
      : 'time-outline';
  const agendaModeLabel = autoConfirmSessionRequests === null
    ? 'Configurar agenda'
    : autoConfirmSessionRequests
      ? 'Confirmación automática'
      : 'Confirmación manual';

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

      if (now >= sessionEnd) {
        return 'completed';
      }

      if (now >= sessionStart) {
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
        showAppAlert(appAlert, 'Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
        await loadSessions();
      } catch {
        showAppAlert(appAlert, 'Error', 'No se pudo confirmar la sesión');
      } finally {
        setProcessingSessionId(null);
      }
    },
    [loadSessions, processingSessionId],
  );

  const handleRejectSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      showAppAlert(appAlert, 'Rechazar sesión', `¿Seguro que quieres rechazar la sesión con ${clientName}?`, [
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
              showAppAlert(appAlert, 'Error', 'No se pudo rechazar la sesión');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]);
    },
    [loadSessions, processingSessionId],
  );

  const handleCancelSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      showAppAlert(appAlert, 'Cancelar cita', `¿Seguro que quieres cancelar la cita con ${clientName}?`, [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingSessionId(sessionId);
              await professionalService.updateSessionStatus(sessionId, 'CANCELLED');
              showAppAlert(appAlert, 'Cita cancelada', 'La cita se ha cancelado correctamente.');
              await loadSessions();
            } catch {
              showAppAlert(appAlert, 'Error', 'No se pudo cancelar la cita');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]);
    },
    [appAlert, loadSessions, processingSessionId],
  );

  const handleJoinSession = useCallback(async (sessionId: string) => {
    try {
      const meetingData = await professionalService.getMeetingLink(sessionId);
      if (!meetingData.canJoin) {
        showAppAlert(appAlert, 'Aún no es el momento', meetingData.message);
        return;
      }

      if (!meetingData.meetingLink) {
        showAppAlert(appAlert, 'Enlace no disponible', 'No se pudo preparar el enlace de la videollamada.');
        return;
      }

      const supported = await Linking.canOpenURL(meetingData.meetingLink);
      if (!supported) {
        showAppAlert(appAlert, 'No se pudo abrir', 'Tu dispositivo no pudo abrir el enlace de la videollamada.');
        return;
      }

      await Linking.openURL(meetingData.meetingLink);
    } catch {
      showAppAlert(appAlert, 'Error', 'Hubo un problema al unirte a la sesión');
    }
  }, [appAlert]);

  const renderSessionActions = useCallback(
    (session: ProfessionalSession) => {
      if (session.origin === 'CLINIC') {
        return (
          <View style={styles.clinicManagedNotice}>
            <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.clinicManagedText}>
              Gestionada por clínica
            </Text>
            <View style={styles.clinicManagedAction}>
              <Button
                variant="outline"
                size="small"
                onPress={() => void openSessionDetail(session.id)}
                icon={<Ionicons name="calendar-clear-outline" size={16} color={theme.primary} />}
                fullWidth
              >
                Ver detalle
              </Button>
            </View>
          </View>
        );
      }

      const actions = session.actions;
      const canConfirmPending = actions?.canConfirm ?? session.status === 'pending';
      const canCancelPending = actions?.canCancel ?? true;

      if (session.status === 'pending' && canConfirmPending) {
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
                disabled={processingSessionId === session.id || !canCancelPending}
                fullWidth
              >
                Rechazar
              </Button>
            </View>
          </View>
        );
      }

      if (session.status === 'scheduled') {
        const isVideoSession = isProfessionalVideoSession(session);
        const videoCallSession = getProfessionalVideoCallSession(session);
        const buttonState = getVideoCallButtonState(videoCallSession);
        const buttonLabel = getVideoCallButtonLabel(buttonState, videoCallSession);
        const buttonStyle = getVideoCallButtonStyle(buttonState);
        const canJoin = isVideoCallButtonClickable(buttonState);
        const sessionStarted = session.date.getTime() <= currentTime.getTime();
        const sessionEnded = session.date.getTime() + session.duration * 60 * 1000 <= currentTime.getTime();
        const canModifySession = !sessionStarted && !session.hasInvoice && (actions?.canModifySchedule ?? false);
        const canCancelSession = !sessionEnded && (actions?.canCancel ?? true);
        const canJoinSession = Boolean(actions?.canJoinVideo) && canJoin;

        return (
          <View style={styles.actionStack}>
            {isVideoSession ? (
              <AnimatedPressable
                onPress={canJoinSession ? () => handleJoinSession(session.id) : undefined}
                disabled={!canJoinSession}
                hoverLift={false}
                pressScale={0.98}
                style={[
                  styles.joinButton,
                  {
                    backgroundColor: buttonStyle.backgroundColor,
                    borderColor: buttonStyle.borderColor || buttonStyle.backgroundColor,
                    opacity: buttonStyle.disabled || !canJoinSession ? 0.75 : 1,
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
              {canModifySession ? (
                <View style={styles.actionHalf}>
                  <Button
                    variant="outline"
                    size="small"
                    onPress={() => openManagedSessionEditor(session)}
                    disabled={processingSessionId === session.id}
                    icon={<Ionicons name="create-outline" size={16} color={theme.primary} />}
                    fullWidth
                  >
                    Modificar
                  </Button>
                </View>
              ) : null}
              {canCancelSession ? (
                <View style={styles.actionHalf}>
                  <Button
                    variant="outline"
                    size="small"
                    onPress={() => handleCancelSession(session.id, session.clientName)}
                    disabled={processingSessionId === session.id}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                </View>
              ) : null}
              <View style={styles.actionHalf}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void openSessionDetail(session.id)}
                  icon={<Ionicons name="person-circle-outline" size={16} color={theme.primary} />}
                  fullWidth
                >
                  Ver detalle
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
              variant="outline"
              size="small"
              onPress={() => void openSessionDetail(session.id)}
              icon={<Ionicons name="person-circle-outline" size={16} color={theme.primary} />}
              fullWidth
            >
              Ver detalle
            </Button>
          </View>
        </View>
      );
    },
    [
      currentTime,
      handleConfirmSession,
      handleCancelSession,
      handleJoinSession,
      openManagedSessionEditor,
      openSessionDetail,
      handleRejectSession,
      processingSessionId,
      styles,
      theme.primary,
      theme.textSecondary,
    ],
  );

  const renderSessionCard = useCallback(
    (session: ProfessionalSession, compact = false) => {
      const status = getSessionDisplayStatus(session);
      const accentColor = getStatusColor(status);

      return (
        <View
          key={session.id}
        >
          <Card
            variant="default"
            padding="medium"
            style={compact ? styles.sessionCardCompact : styles.sessionCard}
          >
          <AnimatedPressable
            onPress={() => void openSessionDetail(session.id)}
            hoverLift={false}
            pressScale={0.99}
            style={styles.sessionCardDetailPressable}
            accessibilityLabel={`Ver detalle de cita de ${session.clientName}`}
          >
            <View style={styles.sessionCardHeader}>
            <View style={styles.sessionClientBlock}>
              <View style={[styles.sessionAvatar, { backgroundColor: theme.primaryAlpha12 }]}>
                {session.clientAvatar ? (
                  <Image
                    testID={`professional-session-client-avatar-${session.id}`}
                    source={{ uri: session.clientAvatar }}
                    style={styles.sessionAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.sessionAvatarText}>{session.clientInitial}</Text>
                )}
              </View>
              <View style={styles.sessionClientInfo}>
                <Text style={styles.sessionClientName}>{session.clientName}</Text>
                <Text style={styles.sessionClientMeta}>
                  {formatSessionTimeRange(session)} · {session.duration} min · {getSessionTypeLabel(session.type)}
                </Text>
                {session.origin === 'CLINIC' && session.clinicContext ? (
                  <Text style={styles.sessionClientMeta} numberOfLines={1}>
                    {session.clinicContext.clinicName}
                  </Text>
                ) : null}
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
          </AnimatedPressable>
          {!compact ? renderSessionActions(session) : null}
          </Card>
        </View>
      );
    },
    [
      getSessionDisplayStatus,
      getStatusColor,
      openSessionDetail,
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
      <Card variant="default" padding="medium" style={styles.sideCard}>
        <Text style={styles.sideCardTitle}>
          {capitalizeFirst(monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
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
    <Card variant="default" padding="medium" style={styles.sideCard}>
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

  const renderLoadErrorNotice = () => {
    if (!loadError || sessions.length === 0) {
      return null;
    }

    return (
      <View style={styles.loadErrorNotice}>
        <View style={styles.loadErrorTextBlock}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
          <View style={styles.loadErrorCopy}>
            <Text style={styles.loadErrorTitle}>No se pudieron actualizar las sesiones</Text>
            <Text style={styles.loadErrorMessage}>{loadErrorMessage}</Text>
          </View>
        </View>
        <View style={styles.loadErrorAction}>
          <Button
            variant="outline"
            size="small"
            onPress={handleRetryLoadSessions}
            loading={loading}
            fullWidth={isMobile}
          >
            Reintentar
          </Button>
        </View>
      </View>
    );
  };

  const renderLoadErrorState = () => (
    <View style={styles.loadErrorState}>
      <Ionicons name="cloud-offline-outline" size={44} color={theme.warning} />
      <Text style={styles.loadErrorStateTitle}>No se pudieron cargar las sesiones</Text>
      <Text style={styles.loadErrorStateSubtitle}>{loadErrorMessage}</Text>
      <Button
        variant="primary"
        size="medium"
        onPress={handleRetryLoadSessions}
        loading={loading}
      >
        Reintentar
      </Button>
    </View>
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
                    { top: (currentTime.getMinutes() / 60) * DAY_HOUR_HEIGHT },
                  ]}
                >
                  <View style={styles.currentTimeDot} />
                  <View style={styles.currentTimeTrack} />
                  <Text style={styles.currentTimeLabel}>{formatTime(currentTime)}</Text>
                </View>
              ) : null}
              {items.length ? (
                items.map((session, index) => (
                  <View
                    key={session.id}
                    style={[
                      styles.daySessionPlacement,
                      {
                        marginTop: index === 0
                          ? (session.date.getMinutes() / 60) * DAY_HOUR_HEIGHT
                          : spacing.sm,
                      },
                    ]}
                  >
                    {renderSessionCard(session)}
                  </View>
                ))
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
                      onPress={() => void openSessionDetail(session.id)}
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
                        {formatSessionTimeRange(session)}
                      </Text>
                      <Text style={styles.weekAgendaSessionMeta} numberOfLines={1}>
                        {session.duration} min · {getSessionTypeLabel(session.type)}
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
    <>
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Mis sesiones</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{todaysSessions.length}</Text>
                <Text style={styles.kpiLabel}>hoy</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{weekSessions.length}</Text>
                <Text style={styles.kpiLabel}>semana</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiValue, { color: theme.warningAmber }]}>{pendingSessions.length}</Text>
                <Text style={styles.kpiLabel}>pendientes</Text>
              </View>
              <AnimatedPressable
                onPress={handleConfigureAgenda}
                style={[
                  styles.bookingModeChip,
                  {
                    borderColor: agendaModeBorderColor,
                    backgroundColor: agendaModeBackgroundColor,
                  },
                ]}
                hoverLift={false}
                pressScale={0.98}
                accessibilityLabel="Configurar modo de confirmación de reservas"
              >
                <Ionicons
                  name={agendaModeIcon}
                  size={15}
                  color={agendaModeColor}
                />
                <Text
                  style={[
                    styles.bookingModeChipText,
                    { color: agendaModeColor },
                  ]}
                  numberOfLines={1}
                >
                  {agendaModeLabel}
                </Text>
                <Ionicons name="settings-outline" size={13} color={theme.textMuted} />
              </AnimatedPressable>
            </View>
          </View>
          <View style={styles.headerActionWrap}>
            <TourTarget id="professional.sessions.new-session" fill style={styles.fullWidthTourTarget}>
              <Button
                variant="primary"
                size="small"
                onPress={openManagedSessionScheduler}
                loading={loadingSchedulableClients}
                fullWidth={isMobile}
                icon={<Ionicons name="calendar-outline" size={16} color={theme.textOnPrimary} />}
              >
                Nueva cita
              </Button>
            </TourTarget>
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
            <View style={styles.toolbarTopRow}>
              <TourTarget id="professional.sessions.view-tabs" fill>
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
              </TourTarget>

              {nextUpcomingSession ? (
                <AnimatedPressable
                  onPress={jumpToNextSession}
                  hoverLift={false}
                  pressScale={0.98}
                  style={styles.nextSessionChip}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={theme.secondaryDark} />
                  <Text style={styles.nextSessionChipText} numberOfLines={1}>
                    Próxima · {nextUpcomingSession.date.toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })} · {formatSessionTimeRange(nextUpcomingSession)}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>

            {!isDesktop ? (
              <View style={styles.inlineMiniCalendarWrap}>{renderMiniCalendar()}</View>
            ) : null}
          </View>

          <TourTarget id="professional.sessions.date-controls" fill>
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
          </TourTarget>

          {renderLoadErrorNotice()}

          <View style={styles.sessionListTourContent}>
            <TourTarget
              id="professional.sessions.list"
              fill
              pointerEvents="none"
              spotlightStyle={styles.sessionListTourAnchorTargetFill}
              style={styles.sessionListTourAnchorTarget}
            >
              <View style={styles.sessionListTourAnchor} />
            </TourTarget>
            {loadError && sessions.length === 0 ? (
              renderLoadErrorState()
            ) : (
              <>
              {viewMode === 'day' ? renderDayView() : null}
              {viewMode === 'week' ? renderWeekView() : null}
              {viewMode === 'list' ? renderListView() : null}
              </>
            )}
          </View>
        </View>
        </View>
      </View>
      <AppointmentDetailSheet
        visible={Boolean(selectedSessionId)}
        mode="professional"
        professionalSession={selectedSessionDetail}
        loading={selectedSessionDetailLoading}
        error={selectedSessionDetailError}
        processing={processingSessionId === selectedSessionId}
        onClose={closeSessionDetail}
        onRetry={retrySessionDetail}
        onOpenPatient={selectedSessionDetail ? openSelectedSessionPatient : undefined}
        onOpenNotes={selectedSessionDetail?.clinicalTarget ? openSelectedSessionNotes : undefined}
        onJoinVideo={selectedSessionDetail?.actions?.canJoinVideo ? () => {
          void handleJoinSession(selectedSessionDetail.id);
        } : undefined}
      />
      <ManagedSessionSchedulerModal
        visible={schedulerVisible}
        clients={schedulerClients}
        initialClientId={editingSession?.clientId ?? null}
        editingSessionId={editingSession?.id ?? null}
        initialValues={schedulerInitialValues}
        mode={editingSession ? 'edit' : 'create'}
        saving={schedulerSaving}
        onClose={closeManagedSessionScheduler}
        onSubmit={editingSession ? handleUpdateManagedSession : handleCreateManagedSession}
      />
    </>
  );
}

function createStyles(theme: Theme, isDark: boolean, isMobile: boolean) {
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
      paddingLeft: isMobile ? layout.mobileShellLeftInset : spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: theme.bgAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: spacing.sm,
    },
    headerTopRow: {
      alignItems: isMobile ? 'stretch' : 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    headerTitleGroup: {
      flex: 1,
      minWidth: isMobile ? 0 : 560,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? spacing.sm : spacing.md,
    },
    headerTitle: {
      fontSize: isMobile ? 27 : 30,
      color: theme.textPrimary,
      minWidth: 180,
      textAlign: 'left',
      fontFamily: theme.fontSansBold,
    },
    headerActionWrap: {
      width: isMobile ? '100%' : undefined,
    },
    fullWidthTourTarget: {
      width: '100%',
    },
    kpiRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
      justifyContent: isMobile ? 'flex-start' : 'center',
    },
    kpiCard: {
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    kpiValue: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    kpiLabel: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
    },
    bookingModeChip: {
      minHeight: 34,
      maxWidth: isMobile ? '100%' : 248,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    bookingModeChipText: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: typography.fontSizes.xs,
      fontFamily: theme.fontSansSemiBold,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    sideRail: {
      width: 252,
      padding: spacing.md,
      gap: spacing.md,
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
      aspectRatio: isMobile ? undefined : 1,
      height: isMobile ? 36 : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      marginVertical: isMobile ? 1 : 2,
    },
    miniDayToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    miniDaySelected: {
      backgroundColor: theme.primary,
    },
    miniDayText: {
      fontSize: isMobile ? 12 : 13,
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
    sessionListTourContent: {
      flex: 1,
      minHeight: 0,
      position: 'relative',
    },
    sessionListTourAnchorTarget: {
      position: 'absolute',
      top: 0,
      left: isMobile ? spacing.md : spacing.lg,
      right: isMobile ? spacing.md : spacing.lg,
      height: isMobile ? 88 : 112,
    },
    sessionListTourAnchorTargetFill: {
      width: '100%',
      height: '100%',
    },
    sessionListTourAnchor: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    toolbar: {
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    toolbarTopRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    viewTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    viewTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 8,
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
    nextSessionChip: {
      minHeight: 34,
      maxWidth: isMobile ? '100%' : 360,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.secondaryLight,
      backgroundColor: theme.secondaryAlpha12,
      paddingHorizontal: spacing.sm,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    nextSessionChipText: {
      flexShrink: 1,
      fontSize: typography.fontSizes.sm,
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
    },
    dateBar: {
      marginTop: spacing.sm,
      marginHorizontal: isMobile ? spacing.md : spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: isMobile ? spacing.sm : spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      ...shadows.sm,
    },
    loadErrorNotice: {
      marginHorizontal: isMobile ? spacing.md : spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    loadErrorTextBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    loadErrorCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    loadErrorTitle: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    loadErrorMessage: {
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    loadErrorAction: {
      width: isMobile ? '100%' : 132,
    },
    loadErrorState: {
      flex: 1,
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    loadErrorStateTitle: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      textAlign: 'center',
      fontFamily: theme.fontSansBold,
    },
    loadErrorStateSubtitle: {
      maxWidth: 520,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
      color: theme.textSecondary,
      textAlign: 'center',
      fontFamily: theme.fontSans,
    },
    dateNavButton: {
      width: isMobile ? 40 : 38,
      height: isMobile ? 40 : 38,
      borderRadius: isMobile ? 20 : 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dateCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: isMobile ? spacing.xs : spacing.md,
    },
    dateTitle: {
      fontSize: isMobile ? typography.fontSizes.md : typography.fontSizes.lg,
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
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
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
      minHeight: DAY_HOUR_HEIGHT,
      position: 'relative',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: 0,
      paddingBottom: spacing.sm,
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
    daySessionPlacement: {
      width: '100%',
    },
    sessionCard: {
      borderRadius: borderRadius.lg,
    },
    sessionCardCompact: {
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    sessionCardDetailPressable: {
      width: '100%',
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
      overflow: 'hidden',
    },
    sessionAvatarImage: {
      height: '100%',
      width: '100%',
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
    clinicManagedNotice: {
      minHeight: 44,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.sm,
    },
    clinicManagedText: {
      flex: 1,
      minWidth: 150,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    clinicManagedAction: {
      minWidth: 130,
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
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
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
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
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
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
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
