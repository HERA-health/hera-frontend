import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  borderRadius,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AppNavigationProp, AppRouteProp, ProfessionalSession } from '../../constants/types';
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
import { trackProfessionalWorkspaceEvent } from '../../services/professionalWorkspaceAnalytics';
import { billingService } from '../../services/billingService';
import * as professionalService from '../../services/professionalService';
import { ProfessionalAgendaHeader } from './components/agenda/ProfessionalAgendaHeader';
import { ProfessionalAgendaToolbar } from './components/agenda/ProfessionalAgendaToolbar';
import { ProfessionalAgendaSessionCard } from './components/agenda/ProfessionalAgendaSessionCard';
import { ProfessionalAgendaDayView } from './components/agenda/ProfessionalAgendaDayView';
import { ProfessionalAgendaWeekView } from './components/agenda/ProfessionalAgendaWeekView';
import { ProfessionalAgendaMonthView } from './components/agenda/ProfessionalAgendaMonthView';
import { ProfessionalAgendaListView } from './components/agenda/ProfessionalAgendaListView';
import { useProfessionalAgendaController } from './components/agenda/useProfessionalAgendaController';
import {
  type SessionStatusTone,
  capitalizeFirst,
  getAgendaDayScrollOffset,
  getAgendaStatusPalette,
  getSessionDisplayStatus as resolveSessionDisplayStatus,
  isSameCalendarDay,
  isToday,
} from './components/agenda/professionalAgendaUtils';
import {
  getVideoCallButtonLabel,
  getVideoCallButtonState,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../utils/videoCallUtils';

const PENDING_VIDEO_MEETING_LINK = 'https://hera.local/pending-video-link';

function getFirstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
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
  const route = useRoute<AppRouteProp<'ProfessionalSessions'>>();
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const dayScrollRef = useRef<ScrollView | null>(null);
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;
  const styles = useMemo(() => createStyles(theme, isMobile), [theme, isMobile]);

  const agenda = useProfessionalAgendaController();
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    initialLoading,
    refreshing,
    hasLoadedOnce,
    loadError,
    loadErrorMessage,
    sessions,
    agendaSummary,
    nextCursor,
    loadingMore,
    loadMoreError,
    loadMoreErrorMessage,
    originFilter,
    setOriginFilter,
    currentTime,
    autoConfirmSessionRequests,
    weekDays,
    sessionsForDate,
    sessionsForWeek,
    sessionsByDate,
    nextUpcomingSession,
    refreshAgenda,
    refreshAfterMutation,
    loadMoreSessions,
    navigateDate,
    goToToday,
    jumpToNextSession,
  } = agenda;
  const agendaLoading = initialLoading || refreshing;
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [schedulableClients, setSchedulableClients] = useState<professionalService.Client[]>([]);
  const [loadingSchedulableClients, setLoadingSchedulableClients] = useState(false);
  const [schedulerVisible, setSchedulerVisible] = useState(false);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<ProfessionalSession | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<professionalService.ProfessionalSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const sessionDetailLoadSeqRef = useRef(0);

  useEffect(() => {
    if (!refreshing) {
      setShowRefreshIndicator(false);
      return undefined;
    }

    const timer = setTimeout(() => setShowRefreshIndicator(true), 150);
    return () => clearTimeout(timer);
  }, [refreshing]);

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

  const openManagedSessionEditor = useCallback(async (session: ProfessionalSession) => {
    setProcessingSessionId(session.id);
    try {
      const detail = await professionalService.getProfessionalSessionDetail(session.id);
      const clientEmail = getFirstNonBlank(
        detail.client?.primaryEmail,
        detail.client?.user?.email,
        detail.client?.email,
      );
      setEditingSession({
        ...session,
        clientEmail,
        clientSource: detail.client?.source,
        clientUserId: detail.client?.userId ?? null,
        clientAvatar: detail.client?.user?.avatar ?? session.clientAvatar,
      });
      setSchedulerVisible(true);
    } catch (error: unknown) {
      showAppAlert(appAlert, 'No se pudo abrir la cita', getErrorMessage(error, 'Inténtalo de nuevo.'));
    } finally {
      setProcessingSessionId(null);
    }
  }, [appAlert]);

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

  const openSelectedSessionInvoice = useCallback(async () => {
    const invoice = selectedSessionDetail?.invoice;
    if (!invoice) return;

    if (invoice.status === 'DRAFT') {
      closeSessionDetail();
      navigation.navigate('CreateInvoice', { invoiceId: invoice.id });
      return;
    }

    try {
      await billingService.downloadInvoice(invoice.id, invoice.invoiceNumber);
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo abrir la factura'));
    }
  }, [appAlert, closeSessionDetail, navigation, selectedSessionDetail]);

  const handleCreateManagedSession = useCallback(
    async (input: professionalService.CreateManagedClientSessionInput) => {
      try {
        setSchedulerSaving(true);
        await professionalService.createManagedClientSession(input);
        setSchedulerVisible(false);
        setEditingSession(null);
        showAppAlert(appAlert, 'Cita creada', 'La cita se ha programado correctamente.');
        await refreshAfterMutation();
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
    [appAlert, refreshAfterMutation],
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
        await refreshAfterMutation();
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
    [appAlert, editingSession, refreshAfterMutation],
  );

  useEffect(() => {
    trackProfessionalWorkspaceEvent({
      event: 'professional_agenda_opened',
      properties: {},
    });
  }, []);

  useEffect(() => {
    if (route.params?.openCreateSession) {
      navigation.setParams({ openCreateSession: undefined });
      void openManagedSessionScheduler();
    }
  }, [navigation, openManagedSessionScheduler, route.params?.openCreateSession]);

  useEffect(() => {
    const sessionId = route.params?.focusSessionId;
    if (!sessionId) return;
    navigation.setParams({ focusSessionId: undefined });
    void openSessionDetail(sessionId);
  }, [navigation, openSessionDetail, route.params?.focusSessionId]);

  const handleConfigureAgenda = useCallback(() => {
    navigation.navigate('ProfessionalProfile', { initialTab: 'agenda' });
  }, [navigation]);

  useProfessionalTourAutoStart(
    'professional_sessions_v1',
    !agendaLoading && !loadError && !schedulerVisible && !isAppAlertVisible,
  );

  const prepareSessionsListStep = useCallback(() => {
    dayScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useProfessionalTourStepPreparation(
    'professional.sessions.list',
    prepareSessionsListStep,
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

  const getSessionDisplayStatus = useCallback(
    (session: ProfessionalSession): SessionStatusTone => resolveSessionDisplayStatus(session, currentTime),
    [currentTime],
  );

  const getStatusColor = useCallback(
    (status: SessionStatusTone) => getAgendaStatusPalette(theme, status).text,
    [theme],
  );

  useEffect(() => {
    if (viewMode !== 'day' || agendaLoading) {
      return;
    }

    const targetDate = isToday(selectedDate)
      ? currentTime
      : sessionsForDate[0]?.date ?? selectedDate;

    const timeout = setTimeout(() => {
      dayScrollRef.current?.scrollTo({
        y: getAgendaDayScrollOffset(targetDate),
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [agendaLoading, currentTime, isToday, selectedDate, sessionsForDate, viewMode]);

  const handleConfirmSession = useCallback(
    async (sessionId: string, clientName: string) => {
      if (processingSessionId) return;
      try {
        setProcessingSessionId(sessionId);
        await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
        showAppAlert(appAlert, 'Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
        await refreshAfterMutation();
      } catch {
        showAppAlert(appAlert, 'Error', 'No se pudo confirmar la sesión');
      } finally {
        setProcessingSessionId(null);
      }
    },
    [processingSessionId, refreshAfterMutation],
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
              await refreshAfterMutation();
            } catch {
              showAppAlert(appAlert, 'Error', 'No se pudo rechazar la sesión');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]);
    },
    [processingSessionId, refreshAfterMutation],
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
              await refreshAfterMutation();
            } catch {
              showAppAlert(appAlert, 'Error', 'No se pudo cancelar la cita');
            } finally {
              setProcessingSessionId(null);
            }
          },
        },
      ]);
    },
    [appAlert, processingSessionId, refreshAfterMutation],
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
        <ProfessionalAgendaSessionCard
          key={session.id}
          session={session}
          status={status}
          accentColor={accentColor}
          compact={compact}
          actions={compact ? undefined : renderSessionActions(session)}
          onOpen={(sessionId) => { void openSessionDetail(sessionId); }}
        />
      );
    },
    [
      getSessionDisplayStatus,
      getStatusColor,
      openSessionDetail,
      renderSessionActions,
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
            const selected = day ? isSameCalendarDay(day, selectedDate) : false;
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
      <View style={styles.legendDivider} />
      <Text style={styles.sideCardTitle}>Origen</Text>
      {[
        ['Clínica', theme.primary],
        ['Particular', theme.secondaryDark],
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color as string }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </Card>
  );

  const renderLoadErrorNotice = () => {
    if (!loadError || !hasLoadedOnce) {
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
            onPress={() => { void refreshAgenda(); }}
            loading={refreshing}
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
        onPress={() => { void refreshAgenda(); }}
        loading={initialLoading}
      >
        Reintentar
      </Button>
    </View>
  );

  const renderDayView = () => (
    <ProfessionalAgendaDayView
      scrollRef={dayScrollRef}
      selectedDate={selectedDate}
      currentTime={currentTime}
      sessions={sessionsForDate}
      renderSessionCard={renderSessionCard}
    />
  );

  const renderWeekView = () => (
    <ProfessionalAgendaWeekView
      weekDays={weekDays}
      sessions={sessionsForWeek}
      gridEnabled={width >= 900}
      getStatus={getSessionDisplayStatus}
      getStatusColor={getStatusColor}
      renderSessionCard={renderSessionCard}
      onOpenSession={(sessionId) => { void openSessionDetail(sessionId); }}
    />
  );

  const renderListView = () => (
    <ProfessionalAgendaListView
      sessions={sessions}
      nextCursor={nextCursor}
      loadingMore={loadingMore}
      loadMoreError={loadMoreError}
      loadMoreErrorMessage={loadMoreErrorMessage}
      renderSessionCard={renderSessionCard}
      onLoadMore={() => { void loadMoreSessions(); }}
    />
  );

  const renderMonthView = () => (
    <ProfessionalAgendaMonthView
      selectedDate={selectedDate}
      sessionsForSelectedDate={sessionsForDate}
      sessionsByDate={sessionsByDate}
      isMobile={isMobile}
      isTablet={isTablet}
      getStatus={getSessionDisplayStatus}
      getStatusColor={getStatusColor}
      renderSessionCard={renderSessionCard}
      onSelectDate={setSelectedDate}
      onOpenSession={(sessionId) => { void openSessionDetail(sessionId); }}
    />
  );

  if (initialLoading) {
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
      <ProfessionalAgendaHeader
        summary={agendaSummary}
        nextSession={nextUpcomingSession}
        autoConfirmSessionRequests={autoConfirmSessionRequests}
        loadingClients={loadingSchedulableClients}
        isMobile={isMobile}
        onConfigureAgenda={handleConfigureAgenda}
        onJumpToNextSession={jumpToNextSession}
        onCreateSession={() => { void openManagedSessionScheduler(); }}
      />
      <ProfessionalAgendaToolbar
        viewMode={viewMode}
        selectedDate={selectedDate}
        weekDays={weekDays}
        originFilter={originFilter}
        compactOriginFilter={width < 1420}
        isMobile={isMobile}
        onChangeView={(nextView) => {
          setViewMode(nextView);
          trackProfessionalWorkspaceEvent({
            event: 'professional_agenda_view_changed',
            properties: { view: nextView },
          });
        }}
        onChangeOrigin={setOriginFilter}
        onNavigateDate={navigateDate}
        onGoToToday={goToToday}
      />

      <View style={styles.body}>
        {isDesktop && (viewMode === 'day' || viewMode === 'week') ? (
          <View style={styles.sideRail}>
            {renderMiniCalendar()}
            {renderLegend()}
          </View>
        ) : null}
        <View style={styles.main}>
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
            {showRefreshIndicator ? (
              <View
                pointerEvents="none"
                style={styles.refreshIndicator}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="Actualizando agenda"
                accessibilityLiveRegion="polite"
                accessibilityState={{ busy: true }}
              >
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.refreshIndicatorText}>Actualizando…</Text>
              </View>
            ) : null}
            {loadError && !hasLoadedOnce ? (
              renderLoadErrorState()
            ) : (
              <>
                {viewMode === 'day' ? renderDayView() : null}
                {viewMode === 'week' ? renderWeekView() : null}
                {viewMode === 'month' ? renderMonthView() : null}
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
        onOpenInvoice={selectedSessionDetail?.status === 'COMPLETED' && selectedSessionDetail.invoice
          ? () => void openSelectedSessionInvoice()
          : undefined}
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

function createStyles(theme: Theme, isMobile: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
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
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
    },
    body: {
      flex: 1,
      minHeight: 0,
      flexDirection: 'row',
    },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
    sideRail: {
      width: 190,
      padding: spacing.sm,
      gap: spacing.sm,
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
      backgroundColor: theme.bgAlt,
    },
    sideCard: {
      borderRadius: borderRadius.lg,
    },
    sideCardTitle: {
      marginBottom: spacing.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.sm,
    },
    miniWeekdays: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    miniWeekday: {
      flex: 1,
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
      textAlign: 'center',
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
      marginVertical: 1,
    },
    miniDayToday: {
      backgroundColor: theme.primaryAlpha12,
    },
    miniDaySelected: {
      backgroundColor: theme.primary,
    },
    miniDayText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 11,
    },
    miniDayTextSelected: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    legendDivider: {
      height: 1,
      marginVertical: spacing.xs,
      backgroundColor: theme.border,
    },
    sessionListTourContent: {
      flex: 1,
      minHeight: 0,
      position: 'relative',
    },
    refreshIndicator: {
      position: 'absolute',
      top: spacing.sm,
      right: isMobile ? spacing.md : spacing.lg,
      zIndex: 20,
      minHeight: 32,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.full,
      backgroundColor: theme.bgElevated,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    refreshIndicatorText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
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
    loadErrorNotice: {
      marginHorizontal: isMobile ? spacing.md : spacing.lg,
      marginTop: spacing.sm,
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
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.sm,
    },
    loadErrorMessage: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
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
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.xl,
      textAlign: 'center',
    },
    loadErrorStateSubtitle: {
      maxWidth: 520,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
      textAlign: 'center',
    },
    actionStack: {
      gap: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    actionHalf: {
      flex: 1,
      minWidth: 120,
    },
    clinicManagedNotice: {
      minHeight: 44,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgMuted,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
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
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    joinButtonText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
  });
}
