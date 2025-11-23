import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as professionalService from '../../services/professionalService';
import { ProfessionalSession, ProfessionalSessionTab } from '../../constants/types';
import { CalendarView } from '../../components/professional/CalendarView';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandText } from '../../components/common/BrandText';
import { StatusBadge } from '../../components/common/StatusBadge';

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'list' | 'calendar';

export function ProfessionalSessionsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<ProfessionalSessionTab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProfessionalSession[]>([]);

  const tabs: { id: ProfessionalSessionTab; label: string; icon: string }[] = [
    { id: 'upcoming', label: 'Próximas', icon: 'calendar' },
    { id: 'history', label: 'Historial', icon: 'time' },
    { id: 'pending', label: 'Pendientes', icon: 'hourglass' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await professionalService.getProfessionalSessions();
      // Map API data to match existing UI expectations
      const mappedSessions: ProfessionalSession[] = data.map(s => ({
        id: s.id,
        clientId: s.clientId,
        date: new Date(s.scheduledDate),
        clientName: s.client?.user?.name || 'Cliente',
        clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
        duration: 60,
        type: 'video' as const,
        status: s.status === 'SCHEDULED' ? 'scheduled' : s.status === 'COMPLETED' ? 'completed' : 'pending'
      }));
      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = async (sessionId: string, clientName: string) => {
    console.log('🔍 ========== CONFIRM SESSION CLICKED ==========');
    console.log('📋 Session ID:', sessionId);
    console.log('👤 Client name:', clientName);

    // TEMPORARY: Bypass dialog to test API call directly
    console.log('⚠️ BYPASSING DIALOG - DIRECT API CALL FOR TESTING');

    try {
      console.log('🔄 Calling professionalService.updateSessionStatus...');
      await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
      console.log('✅ Session confirmed successfully!');

      Alert.alert('Éxito', `Sesión con ${clientName} confirmada correctamente`);

      console.log('🔄 Reloading sessions...');
      await loadSessions();
      console.log('✅ Sessions reloaded');
    } catch (error: any) {
      console.error('❌ ========== ERROR CONFIRMING SESSION ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ ========== END ERROR ==========');

      Alert.alert('Error', error.message || 'No se pudo confirmar la sesión');
    }
  };

  const handleRejectSession = async (sessionId: string, clientName: string) => {
    console.log('🔍 ========== REJECT SESSION CLICKED ==========');
    console.log('📋 Session ID:', sessionId);
    console.log('👤 Client name:', clientName);

    // TEMPORARY: Bypass dialog to test API call directly
    console.log('⚠️ BYPASSING DIALOG - DIRECT API CALL FOR TESTING');

    try {
      console.log('🔄 Calling professionalService.updateSessionStatus...');
      await professionalService.updateSessionStatus(sessionId, 'CANCELLED');
      console.log('✅ Session rejected successfully!');

      Alert.alert('Sesión rechazada', `Sesión con ${clientName} ha sido rechazada`);

      console.log('🔄 Reloading sessions...');
      await loadSessions();
      console.log('✅ Sessions reloaded');
    } catch (error: any) {
      console.error('❌ ========== ERROR REJECTING SESSION ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ ========== END ERROR ==========');

      Alert.alert('Error', error.message || 'No se pudo rechazar la sesión');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'upcoming') {
      return session.status === 'scheduled' && session.date > new Date();
    } else if (activeTab === 'history') {
      return session.status === 'completed';
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
          {viewMode === 'list' ? (
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewModeButtonActive}
            >
              <Ionicons name="list" size={20} color={colors.neutral.white} />
              <Text style={styles.viewModeTextActive}>Lista</Text>
            </LinearGradient>
          ) : (
            <View style={styles.viewModeButton}>
              <Ionicons name="list" size={20} color={colors.neutral.gray600} />
              <Text style={styles.viewModeText}>Lista</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewModeButtonWrapper}
          onPress={() => setViewMode('calendar')}
        >
          {viewMode === 'calendar' ? (
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewModeButtonActive}
            >
              <Ionicons name="calendar" size={20} color={colors.neutral.white} />
              <Text style={styles.viewModeTextActive}>Calendario</Text>
            </LinearGradient>
          ) : (
            <View style={styles.viewModeButton}>
              <Ionicons name="calendar" size={20} color={colors.neutral.gray600} />
              <Text style={styles.viewModeText}>Calendario</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs - Only show in list view */}
      {viewMode === 'list' && (
        <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = sessions.filter(s => {
            if (tab.id === 'upcoming') return s.status === 'scheduled' && s.date > new Date();
            if (tab.id === 'history') return s.status === 'completed';
            if (tab.id === 'pending') return s.status === 'pending';
            return false;
          }).length;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabWrapper}
              onPress={() => setActiveTab(tab.id)}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabActive}
                >
                  <Ionicons name={tab.icon as any} size={20} color={colors.neutral.white} />
                  <Text style={styles.tabLabelActive}>{tab.label}</Text>
                  {count > 0 && (
                    <View style={styles.tabBadgeActive}>
                      <Text style={styles.tabBadgeTextActive}>{count}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.tab}>
                  <Ionicons name={tab.icon as any} size={20} color={colors.neutral.gray500} />
                  <Text style={styles.tabLabel}>{tab.label}</Text>
                  {count > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{count}</Text>
                    </View>
                  )}
                </View>
              )}
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
                color={colors.neutral.gray400}
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
                  {isToday(session.date) ? (
                    <LinearGradient
                      colors={['#2196F3', '#00897B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.dateBadgeToday}
                    >
                      <Text style={styles.dateLabelToday}>{getDateLabel(session.date)}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateLabel}>{getDateLabel(session.date)}</Text>
                    </View>
                  )}
                  <Text style={styles.sessionTime}>{formatTime(session.date)}</Text>
                </View>

                <StatusBadge
                  status={
                    session.status === 'scheduled' ? 'confirmed' :
                    session.status === 'completed' ? 'completed' :
                    'pending'
                  }
                />
              </View>

              {/* Client info */}
              <View style={styles.clientSection}>
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.clientAvatarBorder}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{session.clientInitial}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{session.clientName}</Text>
                  <View style={styles.sessionMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name={getSessionTypeIcon(session.type)}
                        size={14}
                        color={colors.neutral.gray500}
                      />
                      <Text style={styles.metaText}>
                        {session.type === 'video' && 'Videollamada'}
                        {session.type === 'audio' && 'Llamada'}
                        {session.type === 'chat' && 'Chat'}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.neutral.gray500} />
                      <Text style={styles.metaText}>{session.duration} min</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {session.notes && (
                <View style={styles.notesSection}>
                  <Ionicons name="document-text-outline" size={14} color={colors.neutral.gray600} />
                  <Text style={styles.notesText}>{session.notes}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.sessionActions}>
                {activeTab === 'upcoming' && (
                  <>
                    {session.meetingLink && (
                      <TouchableOpacity style={styles.actionButtonWrapper}>
                        <LinearGradient
                          colors={['#2196F3', '#00897B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.actionButtonPrimary}
                        >
                          <Ionicons name="videocam" size={16} color={colors.neutral.white} />
                          <Text style={styles.actionButtonTextPrimary}>Iniciar sesión</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="chatbubble-outline" size={16} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Contactar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Reagendar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {activeTab === 'history' && (
                  <>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="eye-outline" size={16} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Ver detalles</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="document-text-outline" size={16} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Ver notas</Text>
                    </TouchableOpacity>
                  </>
                )}

                {activeTab === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButtonWrapper}
                      onPress={() => handleConfirmSession(session.id, session.clientName)}
                    >
                      <LinearGradient
                        colors={['#2196F3', '#00897B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonPrimary}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.actionButtonTextPrimary}>Confirmar</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButtonDangerWrapper}
                      onPress={() => handleRejectSession(session.id, session.clientName)}
                    >
                      <View style={styles.actionButtonDanger}>
                        <Ionicons name="close" size={16} color={colors.neutral.white} />
                        <Text style={styles.actionButtonTextPrimary}>Rechazar</Text>
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
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.emptyTitle}>Cargando calendario...</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  header: {
    backgroundColor: colors.neutral.white,
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
    color: colors.neutral.gray600,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
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
    gap: spacing.xs,
    shadowColor: '#2196F3',
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
    backgroundColor: colors.neutral.white,
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
    gap: spacing.xs,
    shadowColor: '#2196F3',
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
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  dateLabelToday: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  sessionTime: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    padding: 2,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral.gray900,
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
    color: colors.neutral.gray600,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.gray700,
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
    backgroundColor: colors.primary[50],
    gap: spacing.xs,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: '#2196F3',
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
    backgroundColor: colors.neutral.gray600,
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: colors.neutral.gray600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
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
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});
