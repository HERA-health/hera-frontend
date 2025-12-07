import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { branding, colors, spacing, borderRadius } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/common/GradientBackground';
import * as professionalService from '../../services/professionalService';
import { ProfessionalSession, ProfessionalSessionTab } from '../../constants/types';
import { CalendarView } from '../../components/professional/CalendarView';
import { BrandText } from '../../components/common/BrandText';
import { StatusBadge } from '../../components/common/StatusBadge';

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'list' | 'calendar';

export function ProfessionalSessionsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<ProfessionalSessionTab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  const tabs: { id: ProfessionalSessionTab; label: string; icon: string }[] = [
    { id: 'upcoming', label: 'Próximas', icon: 'calendar' },
    { id: 'history', label: 'Historial', icon: 'time' },
    { id: 'pending', label: 'Pendientes', icon: 'hourglass' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    console.log('🟣 ========== LOAD SESSIONS CALLED ==========');
    try {
      setLoading(true);
      console.log('🟣 Fetching sessions from API...');

      const data = await professionalService.getProfessionalSessions();
      console.log('🟣 ========== RAW API RESPONSE ==========');
      console.log('🟣 Number of sessions received:', data.length);
      console.log('🟣 Raw data:', JSON.stringify(data, null, 2));

      // Map API data to match existing UI expectations
      const mappedSessions: ProfessionalSession[] = data.map((s, index) => {
        console.log(`🟣 --- Mapping session ${index + 1} ---`);
        console.log('🟣 Session ID:', s.id);
        console.log('🟣 Raw status from backend:', s.status);
        console.log('🟣 Status type:', typeof s.status);
        console.log('🟣 Client:', s.client?.user?.name);
        console.log('🟣 Date field (scheduledDate):', s.scheduledDate);
        console.log('🟣 Date field (date):', (s as any).date);

        // FIX: Correct status mapping to match backend enum values
        let mappedStatus: 'pending' | 'scheduled' | 'completed' | 'cancelled';
        if (s.status === 'PENDING' || s.status === 'pending') {
          mappedStatus = 'pending';
        } else if (s.status === 'CONFIRMED' || s.status === 'confirmed' || s.status === 'SCHEDULED' || s.status === 'scheduled') {
          mappedStatus = 'scheduled';
        } else if (s.status === 'COMPLETED' || s.status === 'completed') {
          mappedStatus = 'completed';
        } else if (s.status === 'CANCELLED' || s.status === 'cancelled') {
          mappedStatus = 'cancelled';
        } else {
          console.warn('🟡 Unknown status, defaulting to pending:', s.status);
          mappedStatus = 'pending';
        }

        console.log('🟣 Mapped status:', mappedStatus);

        const mapped = {
          id: s.id,
          clientId: s.clientId,
          date: new Date(s.scheduledDate || (s as any).date),
          clientName: s.client?.user?.name || 'Cliente',
          clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
          duration: 60,
          type: 'video' as const,
          status: mappedStatus
        };

        console.log('🟣 Mapped session object:', mapped);
        return mapped;
      });

      console.log('🟣 ========== ALL SESSIONS MAPPED ==========');
      console.log('🟣 Total mapped sessions:', mappedSessions.length);
      console.log('🟣 Sessions by status:', {
        pending: mappedSessions.filter(s => s.status === 'pending').length,
        scheduled: mappedSessions.filter(s => s.status === 'scheduled').length,
        completed: mappedSessions.filter(s => s.status === 'completed').length,
        cancelled: mappedSessions.filter(s => s.status === 'cancelled').length,
      });

      setSessions(mappedSessions);
      console.log('🟣 State updated with sessions');
      console.log('🟣 ========== LOAD SESSIONS COMPLETED ==========');
    } catch (error) {
      console.error('🔴 ========== ERROR LOADING SESSIONS ==========');
      console.error('🔴 Error:', error);
      console.error('🔴 Error message:', (error as any).message);
      console.error('🔴 Error stack:', (error as any).stack);
      console.error('🔴 ========== END ERROR ==========');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = async (sessionId: string, clientName: string) => {
    console.log('🔵 ========== CONFIRM BUTTON CLICKED ==========');
    console.log('🔵 Session ID:', sessionId);
    console.log('🔵 Client name:', clientName);
    console.log('🔵 Current sessions in state:', sessions.length);
    console.log('🔵 Current active tab:', activeTab);

    // Find the session in current state
    const session = sessions.find(s => s.id === sessionId);
    console.log('🔵 Session found in state:', session);
    console.log('🔵 Session current status:', session?.status);

    if (processingSessionId) {
      console.log('🟡 Already processing a session, ignoring click');
      return;
    }

    try {
      setProcessingSessionId(sessionId);
      console.log('🔵 Set processing state for session:', sessionId);

      console.log('🔵 ========== CALLING API SERVICE ==========');
      console.log('🔵 Calling: professionalService.updateSessionStatus');
      console.log('🔵 Parameters: sessionId =', sessionId, ', status = CONFIRMED');

      const result = await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');

      console.log('🔵 ========== API CALL COMPLETED ==========');
      console.log('🔵 API Result:', result);
      console.log('✅ Session confirmed successfully!');

      console.log('🔵 Showing success alert to user...');
      Alert.alert('Éxito', `Sesión con ${clientName} confirmada correctamente`);

      console.log('🔵 ========== RELOADING SESSIONS ==========');
      await loadSessions();
      console.log('✅ loadSessions completed, state should be updated');

    } catch (error: any) {
      console.error('🔴 ========== ERROR IN handleConfirmSession ==========');
      console.error('🔴 Error object:', error);
      console.error('🔴 Error name:', error.name);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error response:', error.response);
      console.error('🔴 Error response data:', error.response?.data);
      console.error('🔴 Error response status:', error.response?.status);
      console.error('🔴 Error stack:', error.stack);
      console.error('🔴 ========== END ERROR ==========');

      Alert.alert('Error', error.message || 'No se pudo confirmar la sesión');
    } finally {
      setProcessingSessionId(null);
      console.log('🔵 Cleared processing state');
      console.log('🔵 ========== CONFIRM HANDLER FINISHED ==========');
    }
  };

  const handleRejectSession = async (sessionId: string, clientName: string) => {
    console.log('🔴 ========== REJECT BUTTON CLICKED ==========');
    console.log('🔴 Session ID:', sessionId);
    console.log('🔴 Client name:', clientName);
    console.log('🔴 Current sessions in state:', sessions.length);
    console.log('🔴 Current active tab:', activeTab);

    // Find the session in current state
    const session = sessions.find(s => s.id === sessionId);
    console.log('🔴 Session found in state:', session);
    console.log('🔴 Session current status:', session?.status);

    if (processingSessionId) {
      console.log('🟡 Already processing a session, ignoring click');
      return;
    }

    try {
      setProcessingSessionId(sessionId);
      console.log('🔴 Set processing state for session:', sessionId);

      console.log('🔴 ========== CALLING API SERVICE ==========');
      console.log('🔴 Calling: professionalService.updateSessionStatus');
      console.log('🔴 Parameters: sessionId =', sessionId, ', status = CANCELLED');

      const result = await professionalService.updateSessionStatus(sessionId, 'CANCELLED');

      console.log('🔴 ========== API CALL COMPLETED ==========');
      console.log('🔴 API Result:', result);
      console.log('✅ Session rejected successfully!');

      console.log('🔴 Showing rejection alert to user...');
      Alert.alert('Sesión rechazada', `Sesión con ${clientName} ha sido rechazada`);

      console.log('🔴 ========== RELOADING SESSIONS ==========');
      await loadSessions();
      console.log('✅ loadSessions completed, state should be updated');

    } catch (error: any) {
      console.error('🔴 ========== ERROR IN handleRejectSession ==========');
      console.error('🔴 Error object:', error);
      console.error('🔴 Error name:', error.name);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error response:', error.response);
      console.error('🔴 Error response data:', error.response?.data);
      console.error('🔴 Error response status:', error.response?.status);
      console.error('🔴 Error stack:', error.stack);
      console.error('🔴 ========== END ERROR ==========');

      Alert.alert('Error', error.message || 'No se pudo rechazar la sesión');
    } finally {
      setProcessingSessionId(null);
      console.log('🔴 Cleared processing state');
      console.log('🔴 ========== REJECT HANDLER FINISHED ==========');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={branding.accent} />
      </View>
    );
  }

  // Filter sessions based on active tab
  console.log('🟤 ========== FILTERING SESSIONS FOR RENDER ==========');
  console.log('🟤 Active tab:', activeTab);
  console.log('🟤 Total sessions in state:', sessions.length);
  console.log('🟤 Sessions:', sessions.map(s => ({ id: s.id, status: s.status, client: s.clientName })));

  const filteredSessions = sessions.filter(session => {
    let shouldInclude = false;
    if (activeTab === 'upcoming') {
      shouldInclude = session.status === 'scheduled' && session.date > new Date();
      console.log(`🟤 Session ${session.id}: status=${session.status}, date>${new Date()}=${session.date > new Date()}, include=${shouldInclude}`);
    } else if (activeTab === 'history') {
      // FIX: Include both completed AND cancelled sessions in history
      shouldInclude = session.status === 'completed' || session.status === 'cancelled';
      console.log(`🟤 Session ${session.id}: status=${session.status}, include=${shouldInclude} (history includes completed and cancelled)`);
    } else if (activeTab === 'pending') {
      shouldInclude = session.status === 'pending';
      console.log(`🟤 Session ${session.id}: status=${session.status}, include=${shouldInclude}`);
    }
    return shouldInclude;
  }).sort((a, b) => {
    // Sort upcoming ascending, history descending
    if (activeTab === 'upcoming') {
      return a.date.getTime() - b.date.getTime();
    }
    return b.date.getTime() - a.date.getTime();
  });

  console.log('🟤 Filtered sessions count:', filteredSessions.length);
  console.log('🟤 Filtered sessions:', filteredSessions.map(s => ({ id: s.id, status: s.status })));
  console.log('🟤 ========== END FILTERING ==========');

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
            if (tab.id === 'upcoming') return s.status === 'scheduled' && s.date > new Date();
            if (tab.id === 'history') return s.status === 'completed' || s.status === 'cancelled';
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

              {/* Actions */}
              <View style={styles.sessionActions}>
                {activeTab === 'upcoming' && (
                  <>
                    {session.meetingLink && (
                      <TouchableOpacity style={styles.actionButtonWrapper}>
                        <View style={styles.actionButtonPrimary}>
                          <Ionicons name="videocam" size={16} color={branding.cardBackground} />
                          <Text style={styles.actionButtonTextPrimary}>Iniciar sesión</Text>
                        </View>
                      </TouchableOpacity>
                    )}
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
                      onPress={() => {
                        console.log('🟢 ========== CONFIRM BUTTON PHYSICALLY PRESSED ==========');
                        console.log('🟢 Session ID being passed:', session.id);
                        console.log('🟢 Client name being passed:', session.clientName);
                        handleConfirmSession(session.id, session.clientName);
                      }}
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
                      onPress={() => {
                        console.log('🔴 ========== REJECT BUTTON PHYSICALLY PRESSED ==========');
                        console.log('🔴 Session ID being passed:', session.id);
                        console.log('🔴 Client name being passed:', session.clientName);
                        handleRejectSession(session.id, session.clientName);
                      }}
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
