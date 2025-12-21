/**
 * SessionsScreen
 * Displays upcoming sessions and history with tabs
 * Shows empty state when no sessions are scheduled
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { GradientBackground } from '../../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, branding } from '../../constants/colors';
import { SessionTab } from '../../constants/types';
import { MainTabParamList } from '../../constants/types';
import * as sessionsService from '../../services/sessionsService';
import {
  getVideoCallButtonState,
  getVideoCallButtonLabel,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
  VideoCallButtonState,
} from '../../utils/videoCallUtils';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;
type SessionsRouteProp = RouteProp<MainTabParamList, 'Sessions'>;

// API Session type from backend
interface ApiSession {
  id: string;
  date: string; // ISO string
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  type: 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';
  meetingLink?: string;
  notes?: string;
  specialist: {
    id: string;
    specialization: string;
    pricePerSession: number;
    user: {
      name: string;
      email: string;
    };
  };
}

const SessionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionsRouteProp>();
  const [activeTab, setActiveTab] = useState<SessionTab>('upcoming');
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // State for countdown refresh - triggers re-render every minute
  const [, setCountdownTick] = useState(0);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    // Check if navigated here after booking
    const params = route.params as any;
    if (params?.refresh) {
      loadSessions();
    }
  }, [route.params]);

  // Auto-refresh countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick((tick) => tick + 1);
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionsService.getMySessions();
      setSessions(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar tus sesiones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleCancelSession = async (sessionId: string) => {
    Alert.alert(
      'Cancelar sesión',
      '¿Estás seguro de que deseas cancelar esta sesión?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionsService.cancelSession(sessionId);
              Alert.alert('Sesión cancelada', 'La sesión ha sido cancelada correctamente');
              await loadSessions();
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'No se pudo cancelar la sesión';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleBrowseSpecialists = () => {
    navigation.navigate('Specialists');
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      const meetingData = await sessionsService.getMeetingLink(sessionId);

      if (!meetingData.canJoin) {
        Alert.alert('Aún no es el momento', meetingData.message);
        return;
      }

      if (!meetingData.meetingLink) {
        Alert.alert('Error', 'No se pudo obtener el enlace de la videollamada.');
        return;
      }

      const supported = await Linking.canOpenURL(meetingData.meetingLink);
      if (supported) {
        await Linking.openURL(meetingData.meetingLink);
      } else {
        Alert.alert('Error', 'No se pudo abrir el enlace de la videollamada.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Hubo un problema al unirse a la sesión.';
      Alert.alert('Error', errorMessage);
    }
  };


  // Helper function to check if session is past (with 1-hour grace period after end)
  const isSessionPast = (session: ApiSession): boolean => {
    const now = new Date().getTime();
    const sessionStart = new Date(session.date).getTime();
    const sessionEnd = sessionStart + (session.duration * 60 * 1000);
    const gracePeriodEnd = sessionEnd + (60 * 60 * 1000); // 1 hour after session ends
    return now > gracePeriodEnd;
  };

  // Filter sessions by tab
  const getFilteredSessions = (): ApiSession[] => {
    switch (activeTab) {
      case 'upcoming':
        return sessions
          .filter(
            (s) =>
              (s.status === 'CONFIRMED' || s.status === 'PENDING') &&
              !isSessionPast(s)
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      case 'history':
        return sessions
          .filter(
            (s) =>
              s.status === 'COMPLETED' ||
              s.status === 'CANCELLED' ||
              ((s.status === 'CONFIRMED' || s.status === 'PENDING') &&
                isSessionPast(s))
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();
  const upcomingSessions = sessions.filter(
    (s) =>
      (s.status === 'CONFIRMED' || s.status === 'PENDING') && !isSessionPast(s)
  );
  const historySessions = sessions.filter(
    (s) =>
      s.status === 'COMPLETED' ||
      s.status === 'CANCELLED' ||
      ((s.status === 'CONFIRMED' || s.status === 'PENDING') &&
        isSessionPast(s))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSessionTypeLabel = (type: ApiSession['type']) => {
    switch (type) {
      case 'VIDEO_CALL':
        return 'Videollamada';
      case 'PHONE_CALL':
        return 'Llamada';
      case 'IN_PERSON':
        return 'Presencial';
      default:
        return type;
    }
  };

  const getSessionTypeIcon = (type: ApiSession['type']) => {
    switch (type) {
      case 'VIDEO_CALL':
        return 'videocam';
      case 'PHONE_CALL':
        return 'call';
      case 'IN_PERSON':
        return 'location';
      default:
        return 'videocam';
    }
  };

  const renderSessionCard = ({ item: session }: { item: ApiSession }) => {
    const isCompleted = session.status === 'COMPLETED';
    const isCancelled = session.status === 'CANCELLED';
    const isPending = session.status === 'PENDING';
    const isConfirmed = session.status === 'CONFIRMED';

    return (
      <Card key={session.id} style={styles.sessionCard} padding="medium">
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.specialistName}>{session.specialist.user.name}</Text>
            <Text style={styles.specialization}>{session.specialist.specialization}</Text>
            <View style={styles.sessionMeta}>
              <Ionicons name="calendar" size={14} color={colors.neutral.gray600} />
              <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
            </View>
            <View style={styles.sessionMeta}>
              <Ionicons name="time" size={14} color={colors.neutral.gray600} />
              <Text style={styles.sessionTime}>{formatTime(session.date)}</Text>
            </View>
          </View>

          <View style={styles.badgeContainer}>
            {isPending && (
              <Badge variant="warning" size="small">
                Pendiente
              </Badge>
            )}
            {isConfirmed && (
              <Badge variant="success" size="small">
                Confirmada
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="success" size="small">
                Completada
              </Badge>
            )}
            {isCancelled && (
              <Badge variant="error" size="small">
                Cancelada
              </Badge>
            )}
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.sessionDetail}>
            <Ionicons name="time" size={16} color={colors.neutral.gray600} />
            <Text style={styles.sessionDetailText}>{session.duration} minutos</Text>
          </View>
          <View style={styles.sessionDetail}>
            <Ionicons
              name={getSessionTypeIcon(session.type) as any}
              size={16}
              color={colors.neutral.gray600}
            />
            <Text style={styles.sessionDetailText}>{getSessionTypeLabel(session.type)}</Text>
          </View>
          <View style={styles.sessionDetail}>
            <Ionicons name="cash" size={16} color={colors.neutral.gray600} />
            <Text style={styles.sessionDetailText}>
              ${session.specialist.pricePerSession}
            </Text>
          </View>
        </View>

        {session.notes && (
          <Text style={styles.sessionNotes} numberOfLines={2}>
            {session.notes}
          </Text>
        )}

        {/* Video Call Button - Shows state-based button for VIDEO_CALL sessions */}
        {session.type === 'VIDEO_CALL' && !isCompleted && !isCancelled && (
          <View style={styles.videoCallSection}>
            {(() => {
              const buttonState = getVideoCallButtonState(session);
              const { primary, helper, icon } = getVideoCallButtonLabel(buttonState, session);
              const buttonStyle = getVideoCallButtonStyle(buttonState);
              const isClickable = isVideoCallButtonClickable(buttonState);

              return (
                <>
                  <TouchableOpacity
                    style={[
                      styles.videoCallButton,
                      {
                        backgroundColor: buttonStyle.backgroundColor,
                        borderColor: buttonStyle.borderColor || 'transparent',
                        borderWidth: buttonStyle.borderColor ? 1 : 0,
                      },
                    ]}
                    onPress={() => isClickable && handleJoinSession(session.id)}
                    disabled={!isClickable}
                    activeOpacity={isClickable ? 0.7 : 1}
                  >
                    <Ionicons
                      name={icon as any}
                      size={18}
                      color={buttonStyle.textColor}
                    />
                    <Text
                      style={[
                        styles.videoCallButtonText,
                        { color: buttonStyle.textColor },
                      ]}
                    >
                      {primary}
                    </Text>
                  </TouchableOpacity>
                  {helper && (
                    <Text style={styles.videoCallHelperText}>{helper}</Text>
                  )}
                </>
              );
            })()}
          </View>
        )}

        {/* Session Actions */}
        {!isCompleted && !isCancelled && (
          <View style={styles.sessionActions}>
            <Button
              variant="outline"
              size="small"
              onPress={() => handleCancelSession(session.id)}
            >
              Cancelar
            </Button>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={80} color={branding.accent} />
      </View>
      <Text style={styles.emptyTitle}>No tienes sesiones programadas</Text>
      <Text style={styles.emptyDescription}>
        Explora nuestros especialistas y reserva tu primera sesión para comenzar tu camino hacia el bienestar
      </Text>
      <Button
        variant="primary"
        onPress={handleBrowseSpecialists}
        style={styles.emptyButton}
      >
        <Ionicons name="search" size={20} color={colors.neutral.white} />
        <Text style={styles.emptyButtonText}>Buscar Especialistas</Text>
      </Button>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={branding.accent} />
          <Text style={styles.loadingText}>Cargando tus sesiones...</Text>
        </View>
      </View>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.tabTextActive,
            ]}
          >
            Próximas ({upcomingSessions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}
          >
            Historial ({historySessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={filteredSessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[branding.accent]}
            tintColor={branding.accent}
          />
        }
        ListEmptyComponent={
          activeTab === 'upcoming' ? (
            renderEmptyState()
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time" size={64} color={colors.neutral.gray300} />
              </View>
              <Text style={styles.emptyTitle}>No hay sesiones en el historial</Text>
              <Text style={styles.emptyDescription}>
                Tus sesiones completadas aparecerán aquí
              </Text>
            </View>
          )
        }
      />
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: colors.neutral.gray600,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginRight: spacing.lg,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: branding.accent,
  },
  tabText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
  },
  tabTextActive: {
    color: branding.accent,
  },
  listContent: {
    padding: spacing.lg,
  },
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs / 2,
  },
  specialization: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    marginLeft: spacing.sm,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginLeft: spacing.xs / 2,
  },
  sessionTime: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
  },
  sessionDetails: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  sessionDetailText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginLeft: spacing.xs / 2,
  },
  sessionNotes: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  videoCallSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  videoCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  videoCallButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600' as const,
    marginLeft: spacing.xs,
  },
  videoCallHelperText: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray500,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: branding.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    marginLeft: spacing.xs,
  },
});

export default SessionsScreen;
