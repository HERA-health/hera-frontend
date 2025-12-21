import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import { branding, colors, spacing, borderRadius } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/common/GradientBackground';
import * as professionalService from '../../services/professionalService';
import { ProfessionalSession, ProfessionalSessionTab } from '../../constants/types';
import { CalendarView } from '../../components/professional/CalendarView';
import { BrandText } from '../../components/common/BrandText';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getVideoCallButtonState,
  getVideoCallButtonLabel,
  getVideoCallButtonStyle,
  isVideoCallButtonClickable,
} from '../../utils/videoCallUtils';

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'list' | 'calendar';

export function ProfessionalSessionsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<ProfessionalSessionTab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  // State for countdown refresh - triggers re-render every minute
  const [, setCountdownTick] = useState(0);

  const tabs: { id: ProfessionalSessionTab; label: string; icon: string }[] = [
    { id: 'upcoming', label: 'Próximas', icon: 'calendar' },
    { id: 'history', label: 'Historial', icon: 'time' },
    { id: 'pending', label: 'Pendientes', icon: 'hourglass' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

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
      const data = await professionalService.getProfessionalSessions();

      // Map API data to match UI expectations
      const mappedSessions: ProfessionalSession[] = data.map((s) => {
        // Map backend status to frontend status
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

  const handleConfirmSession = async (sessionId: string, clientName: string) => {
    if (processingSessionId) return;

    try {
      setProcessingSessionId(sessionId);
      await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
      Alert.alert('Éxito', `Sesión con ${clientName} confirmada correctamente`);
      await loadSessions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo confirmar la sesión';
      Alert.alert('Error', errorMessage);
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
              Alert.alert('Sesión rechazada', `Sesión con ${clientName} ha sido rechazada`);
              await loadSessions();
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'No se pudo rechazar la sesión';
              Alert.alert('Error', errorMessage);
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={branding.accent} />
      </View>
    );
  }

  // Helper function to check if session is past (with 1-hour grace period after end)
  const isSessionPast = (session: ProfessionalSession): boolean => {
    const now = new Date().getTime();
    const sessionStart = session.date.getTime();
    const sessionEnd = sessionStart + (session.duration * 60 * 1000);
    const gracePeriodEnd = sessionEnd + (60 * 60 * 1000); // 1 hour after session ends
    return now > gracePeriodEnd;
  };

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'upcoming') {
      return session.status === 'scheduled' && !isSessionPast(session);
    } else if (activeTab === 'history') {
      return session.status === 'completed' ||
             session.status === 'cancelled' ||
             (session.status === 'scheduled' && isSessionPast(session));
    } else if (activeTab === 'pending') {
      return session.status === 'pending';
    }
    return false;
  }).sort((a, b) => {
    // Sort upcoming ascending, history descending
    if (activeTab === 'upcoming') {
      return a.date.getTime() - b.date.getTime();
    }
    return b.date.getTime() - a.date.getTime();
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getSessionTypeIcon = (type: ProfessionalSession['type']) => {
    switch (type) {
      case 'video':
        return 'videocam';
      case 'audio':
        return 'call';
      case 'chat':
        return 'chatbubbles';
      default:
        return 'help-circle';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return formatShortDate(date);
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <BrandText style={styles.headerTitle}>Sesiones</BrandText>
        <Text style={styles.headerSubtitle}>
          Gestiona tus citas con pacientes
        </Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={styles.viewModeButtonWrapper}
          onPress={() => setViewMode('list')}
        >
          <View style={viewMode === 'list' ? styles.viewModeButtonActive : styles.viewModeButton}>
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'list' ? colors.neutral.white : colors.neutral.gray600}
            />
            <Text style={viewMode === 'list' ? styles.viewModeTextActive : styles.viewModeText}>
              Lista
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewModeButtonWrapper}
          onPress={() => setViewMode('calendar')}
        >
          <View style={viewMode === 'calendar' ? styles.viewModeButtonActive : styles.viewModeButton}>
            <Ionicons
              name="calendar"
              size={20}
              color={viewMode === 'calendar' ? colors.neutral.white : colors.neutral.gray600}
            />
            <Text style={viewMode === 'calendar' ? styles.viewModeTextActive : styles.viewModeText}>
              Calendario
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tabs - Only show in list view */}
      {viewMode === 'list' && (
        <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = sessions.filter(s => {
            if (tab.id === 'upcoming') {
              // Show in upcoming if: scheduled AND not past grace period
              return s.status === 'scheduled' && !isSessionPast(s);
            }
            if (tab.id === 'history') {
              // Show in history if: completed, cancelled, OR scheduled but past grace period
              return s.status === 'completed' ||
                     s.status === 'cancelled' ||
                     (s.status === 'scheduled' && isSessionPast(s));
            }
            if (tab.id === 'pending') return s.status === 'pending';
            return false;
          }).length;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabWrapper}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={isActive ? styles.tabActive : styles.tab}>
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={isActive ? colors.neutral.white : colors.neutral.gray500}
                />
                <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={isActive ? styles.tabBadgeActive : styles.tabBadge}>
                    <Text style={isActive ? styles.tabBadgeTextActive : styles.tabBadgeText}>
                      {count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        </View>
      )}

      {/* Conditional rendering based on view mode */}
      {viewMode === 'list' ? (
        /* LIST VIEW - EXISTING CODE UNCHANGED */
        <ScrollView
          style={styles.sessionsList}
          contentContainerStyle={styles.sessionsListContent}
          showsVerticalScrollIndicator={false}
        >
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={
                  activeTab === 'upcoming' ? 'calendar-outline' :
                  activeTab === 'history' ? 'checkmark-done-outline' :
                  'hourglass-outline'
                }
                size={56}
                color={branding.textLight}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' && 'No hay sesiones programadas'}
              {activeTab === 'history' && 'No hay sesiones completadas'}
              {activeTab === 'pending' && 'No hay solicitudes pendientes'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'upcoming' && 'Las próximas citas aparecerán aquí'}
              {activeTab === 'history' && 'El historial de sesiones aparecerá aquí'}
              {activeTab === 'pending' && 'Las solicitudes de pacientes aparecerán aquí'}
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              {/* Session header */}
              <View style={styles.sessionHeader}>
                <View style={styles.sessionDate}>
                  <View style={isToday(session.date) ? styles.dateBadgeToday : styles.dateBadge}>
                    <Text style={isToday(session.date) ? styles.dateLabelToday : styles.dateLabel}>
                      {getDateLabel(session.date)}
                    </Text>
                  </View>
                  <Text style={styles.sessionTime}>{formatTime(session.date)}</Text>
                </View>

                <StatusBadge
                  status={
                    session.status === 'scheduled' ? 'confirmed' :
                    session.status === 'completed' ? 'completed' :
                    session.status === 'cancelled' ? 'cancelled' :
                    'pending'
                  }
                />
              </View>

              {/* Client info */}
              <View style={styles.clientSection}>
                <View style={styles.clientAvatarBorder}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{session.clientInitial}</Text>
                  </View>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{session.clientName}</Text>
                  <View style={styles.sessionMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name={getSessionTypeIcon(session.type)}
                        size={14}
                        color={branding.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        {session.type === 'video' && 'Videollamada'}
                        {session.type === 'audio' && 'Llamada'}
                        {session.type === 'chat' && 'Chat'}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={branding.textSecondary} />
                      <Text style={styles.metaText}>{session.duration} min</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {session.notes && (
                <View style={styles.notesSection}>
                  <Ionicons name="document-text-outline" size={14} color={branding.textSecondary} />
                  <Text style={styles.notesText}>{session.notes}</Text>
                </View>
              )}

              {/* Video Call Button - Shows state-based button for video sessions */}
              {activeTab === 'upcoming' && session.type === 'video' && (
                <View style={styles.videoCallSection}>
                  {(() => {
                    // Convert professional session format to video call utils format
                    const videoSession = {
                      status: session.status === 'scheduled' ? 'CONFIRMED' : session.status.toUpperCase(),
                      type: 'VIDEO_CALL',
                      date: session.date,
                      duration: session.duration,
                      meetingLink: session.meetingLink,
                    };
                    const buttonState = getVideoCallButtonState(videoSession);
                    const { primary, helper, icon } = getVideoCallButtonLabel(buttonState, videoSession);
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

              {/* Actions */}
              <View style={styles.sessionActions}>
                {activeTab === 'upcoming' && (
                  <>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="chatbubble-outline" size={16} color={branding.accent} />
                      <Text style={styles.actionButtonText}>Contactar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="calendar-outline" size={16} color={branding.accent} />
                      <Text style={styles.actionButtonText}>Reagendar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {activeTab === 'history' && (
                  <>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="eye-outline" size={16} color={branding.accent} />
                      <Text style={styles.actionButtonText}>Ver detalles</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="document-text-outline" size={16} color={branding.accent} />
                      <Text style={styles.actionButtonText}>Ver notas</Text>
                    </TouchableOpacity>
                  </>
                )}

                {activeTab === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButtonWrapper}
                      onPress={() => handleConfirmSession(session.id, session.clientName)}
                      disabled={processingSessionId === session.id}
                    >
                      <View style={[
                        styles.actionButtonPrimary,
                        processingSessionId === session.id && { opacity: 0.5 }
                      ]}>
                        {processingSessionId === session.id ? (
                          <ActivityIndicator size="small" color={branding.cardBackground} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color={branding.cardBackground} />
                            <Text style={styles.actionButtonTextPrimary}>Confirmar</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButtonDangerWrapper}
                      onPress={() => handleRejectSession(session.id, session.clientName)}
                      disabled={processingSessionId === session.id}
                    >
                      <View style={[
                        styles.actionButtonDanger,
                        processingSessionId === session.id && { opacity: 0.5 }
                      ]}>
                        {processingSessionId === session.id ? (
                          <ActivityIndicator size="small" color={branding.error} />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color={branding.error} />
                            <Text style={styles.actionButtonTextDanger}>Rechazar</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
        </ScrollView>
      ) : (
        /* CALENDAR VIEW */
        sessions && sessions.length >= 0 ? (
          <CalendarView sessions={sessions} />
        ) : (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={branding.accent} />
            <Text style={styles.emptyTitle}>Cargando calendario...</Text>
          </View>
        )
      )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  header: {
    backgroundColor: branding.cardBackground,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: branding.textSecondary,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: branding.cardBackground,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    gap: spacing.sm,
  },
  viewModeButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.gray100,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
  },
  viewModeButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: branding.accent, // Lavanda
    gap: spacing.xs,
    borderRadius: 12,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  viewModeTextActive: {
    color: colors.neutral.white,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: branding.cardBackground,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    gap: spacing.sm,
  },
  tabWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.gray50,
    gap: spacing.xs,
    borderRadius: 12,
  },
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: branding.accent, // Lavanda
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  tabLabelActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  tabBadge: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  tabBadgeTextActive: {
    color: colors.neutral.white,
  },
  sessionsList: {
    flex: 1,
  },
  sessionsListContent: {
    padding: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    gap: spacing.lg,
  },
  sessionCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  sessionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateBadge: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  dateBadgeToday: {
    backgroundColor: branding.accent, // Lavanda
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: branding.textSecondary,
  },
  dateLabelToday: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  sessionTime: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clientAvatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: branding.primary, // Verde Salvia
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    backgroundColor: branding.cardBackground,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${branding.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: branding.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.neutral.gray300,
    marginHorizontal: spacing.sm,
  },
  metaText: {
    fontSize: 13,
    color: branding.textSecondary,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${branding.primary}15`, // Light verde salvia background
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: branding.text,
    lineHeight: 20,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  videoCallSection: {
    marginBottom: spacing.md,
  },
  videoCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  videoCallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  videoCallHelperText: {
    fontSize: 12,
    color: branding.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  actionButtonWrapper: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonDangerWrapper: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: `${branding.accent}15`, // Light lavanda background
    gap: spacing.xs,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: branding.accent, // Lavanda
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: branding.error,
    borderRadius: 12,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.accent,
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.cardBackground,
  },
  actionButtonTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.error,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: branding.surface, // Warm surface color
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 15,
    color: branding.textSecondary,
    textAlign: 'center',
  },
});
