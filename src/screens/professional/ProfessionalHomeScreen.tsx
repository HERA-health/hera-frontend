/**
 * ProfessionalHomeScreen - Specialist Dashboard
 * Modern, clean professional dashboard with stats, sessions, and pending requests
 * Follows HERA design language with sage green and lavender palette
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius, shadows } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as professionalService from '../../services/professionalService';
import { VerificationBanner } from '../../components/auth';

export function ProfessionalHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<professionalService.Session[]>([]);
  const [profile, setProfile] = useState<professionalService.ProfessionalProfile | null>(null);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, profileData] = await Promise.all([
        professionalService.getProfessionalSessions(),
        professionalService.getProfessionalProfile()
      ]);
      setSessions(sessionsData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // Calculate stats from data
  const getStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sessionsThisMonth = sessions.filter(s => {
      const date = new Date(s.scheduledDate);
      return date >= startOfMonth && date <= endOfMonth && s.status === 'COMPLETED';
    }).length;

    const todaySessions = sessions.filter(s => {
      const date = new Date(s.scheduledDate);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    });

    const pendingRequests = sessions.filter(s => s.status === 'PENDING').length;

    // Mock revenue calculation (in real app, this would come from API)
    const revenueThisMonth = sessionsThisMonth * (profile?.pricePerSession || 60);

    return {
      sessionsThisMonth,
      sessionsToday: todaySessions.length,
      pendingRequests,
      revenueThisMonth,
      completedToday: todaySessions.filter(s => s.status === 'COMPLETED').length,
      averageRating: profile?.rating || 0,
    };
  };

  const stats = getStats();

  // Get today's sessions
  const getTodaySessions = () => {
    const today = new Date();
    return sessions
      .filter(s => {
        const date = new Date(s.scheduledDate);
        return date.toDateString() === today.toDateString() && s.status !== 'CANCELLED';
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .map(s => ({
        id: s.id,
        clientName: s.client?.user?.name || 'Cliente',
        clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
        date: new Date(s.scheduledDate),
        duration: 60,
        status: s.status.toLowerCase(),
        isFirstSession: false, // Would come from API
        issue: 'Sesión programada',
      }));
  };

  // Get pending confirmations
  const getPendingRequests = () => {
    return sessions
      .filter(s => s.status === 'PENDING')
      .slice(0, 3)
      .map(s => ({
        id: s.id,
        clientName: s.client?.user?.name || 'Cliente',
        clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
        date: new Date(s.scheduledDate),
        isFirstSession: true, // Would come from API
        price: profile?.pricePerSession || 60,
      }));
  };

  const todaySessions = getTodaySessions();
  const pendingRequests = getPendingRequests();

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Handle session confirmation
  const handleConfirmSession = async (sessionId: string) => {
    if (processingSessionId) return;
    const request = pendingRequests.find(r => r.id === sessionId);
    const clientName = request?.clientName || 'Cliente';
    try {
      setProcessingSessionId(sessionId);
      await professionalService.updateSessionStatus(sessionId, 'CONFIRMED');
      Alert.alert('Sesión confirmada', `Sesión con ${clientName} confirmada correctamente`);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo confirmar la sesión');
    } finally {
      setProcessingSessionId(null);
    }
  };

  // Handle session decline
  const handleDeclineSession = async (sessionId: string) => {
    if (processingSessionId) return;
    const request = pendingRequests.find(r => r.id === sessionId);
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

  // Render welcome header
  const renderWelcomeHeader = () => (
    <Animated.View
      style={[
        styles.welcomeHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeGreeting}>
          {getGreeting()}, Dr. {user?.name?.split(' ').pop() || 'Especialista'}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Gestiona tu práctica desde aquí
        </Text>
      </View>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('ProfessionalProfile')}
      >
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={24} color={heraLanding.secondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render stats cards
  const renderStatsCards = () => {
    const statsData = [
      {
        id: 'sessions-month',
        icon: 'bar-chart',
        value: stats.sessionsThisMonth.toString(),
        label: 'Sesiones este mes',
        color: heraLanding.primary,
        bgColor: heraLanding.primaryMuted,
      },
      {
        id: 'sessions-today',
        icon: 'calendar',
        value: stats.sessionsToday.toString(),
        label: 'Sesiones hoy',
        subtext: stats.completedToday > 0 ? `${stats.completedToday} completadas` : null,
        color: heraLanding.secondary,
        bgColor: heraLanding.secondaryMuted,
      },
      {
        id: 'revenue',
        icon: 'wallet',
        value: `€${stats.revenueThisMonth}`,
        label: 'Ingresos este mes',
        subtext: profile?.pricePerSession ? `€${profile.pricePerSession}/sesión` : null,
        color: heraLanding.success,
        bgColor: 'rgba(123, 163, 119, 0.15)',
      },
    ];

    return (
      <View style={styles.section}>
        <View style={[
          styles.statsGrid,
          isDesktop && styles.statsGridDesktop,
        ]}>
          {statsData.map((stat, index) => (
            <Animated.View
              key={stat.id}
              style={[
                styles.statCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.subtext && (
                <Text style={styles.statSubtext}>{stat.subtext}</Text>
              )}
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  // Render quick actions
  const renderQuickActions = () => {
    const actions = [
      {
        id: 'clients',
        icon: 'people',
        title: 'Ver mis clientes',
        description: 'Gestiona tu lista de pacientes',
        onPress: () => navigation.navigate('ProfessionalClients'),
      },
      {
        id: 'sessions',
        icon: 'calendar',
        title: 'Gestionar sesiones',
        description: 'Próximas citas y solicitudes',
        onPress: () => navigation.navigate('ProfessionalSessions'),
      },
      {
        id: 'availability',
        icon: 'time',
        title: 'Configurar disponibilidad',
        description: 'Define tu horario',
        onPress: () => navigation.navigate('ProfessionalAvailability'),
      },
      {
        id: 'profile',
        icon: 'create',
        title: 'Editar mi perfil',
        description: 'Actualiza tu información',
        onPress: () => navigation.navigate('ProfessionalProfile'),
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={[
          styles.actionsGrid,
          isDesktop && styles.actionsGridDesktop,
        ]}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, isDesktop && styles.actionCardDesktop]}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name={action.icon as any} size={24} color={heraLanding.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={heraLanding.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render today's sessions
  const renderTodaySessions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sesiones de hoy</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProfessionalSessions')}>
          <Text style={styles.sectionLink}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {todaySessions.length > 0 ? (
        <View style={styles.sessionsList}>
          {todaySessions.map((session) => {
            const isUpcoming = session.date > new Date();
            const isInProgress = !isUpcoming && session.status === 'scheduled';

            return (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  isInProgress && styles.sessionCardActive,
                  session.status === 'completed' && styles.sessionCardCompleted,
                ]}
              >
                <View style={styles.sessionTimeContainer}>
                  <Text style={[
                    styles.sessionTime,
                    isInProgress && styles.sessionTimeActive,
                  ]}>
                    {formatTime(session.date)}
                  </Text>
                  <Text style={styles.sessionDuration}>{session.duration} min</Text>
                </View>

                <View style={styles.sessionDivider} />

                <View style={styles.sessionInfo}>
                  <View style={styles.sessionClient}>
                    <View style={[
                      styles.clientAvatar,
                      isInProgress && styles.clientAvatarActive,
                    ]}>
                      <Text style={[
                        styles.clientAvatarText,
                        isInProgress && styles.clientAvatarTextActive,
                      ]}>
                        {session.clientInitial}
                      </Text>
                    </View>
                    <View style={styles.clientDetails}>
                      <Text style={styles.clientName}>{session.clientName}</Text>
                      <View style={styles.sessionMeta}>
                        {session.isFirstSession && (
                          <View style={styles.firstSessionBadge}>
                            <Text style={styles.firstSessionBadgeText}>Primera sesión</Text>
                          </View>
                        )}
                        <Text style={styles.sessionIssue}>{session.issue}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sessionActions}>
                    {isInProgress && (
                      <TouchableOpacity style={styles.startSessionButton}>
                        <LinearGradient
                          colors={[heraLanding.primary, heraLanding.primaryDark]}
                          style={styles.startSessionGradient}
                        >
                          <Ionicons name="videocam" size={16} color="#FFFFFF" />
                          <Text style={styles.startSessionText}>Iniciar</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    {session.status === 'completed' && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={heraLanding.success} />
                        <Text style={styles.completedText}>Completada</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.viewProfileIconButton}
                      onPress={() => navigation.navigate('ClientDetail', { clientId: session.id })}
                    >
                      <Ionicons name="person-circle-outline" size={24} color={heraLanding.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="sunny-outline" size={48} color={heraLanding.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No tienes sesiones programadas hoy</Text>
          <Text style={styles.emptyDescription}>
            Disfruta tu tiempo libre
          </Text>
        </View>
      )}
    </View>
  );

  // Render pending confirmations
  const renderPendingConfirmations = () => {
    if (pendingRequests.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ProfessionalSessions')}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.requestsList}>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>Nueva solicitud</Text>
              </View>

              <View style={styles.requestContent}>
                <View style={styles.requestClient}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>{request.clientInitial}</Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestClientName}>{request.clientName}</Text>
                    {request.isFirstSession && (
                      <Text style={styles.requestType}>Primera sesión</Text>
                    )}
                    <View style={styles.requestMeta}>
                      <Ionicons name="calendar-outline" size={14} color={heraLanding.textSecondary} />
                      <Text style={styles.requestMetaText}>
                        {formatDate(request.date)} - {formatTime(request.date)}
                      </Text>
                    </View>
                    <View style={styles.requestMeta}>
                      <Ionicons name="videocam-outline" size={14} color={heraLanding.textSecondary} />
                      <Text style={styles.requestMetaText}>Videollamada</Text>
                      <Text style={styles.requestPrice}>€{request.price}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.confirmButton, processingSessionId === request.id && { opacity: 0.6 }]}
                    onPress={() => handleConfirmSession(request.id)}
                    disabled={processingSessionId === request.id}
                  >
                    <LinearGradient
                      colors={[heraLanding.primary, heraLanding.primaryDark]}
                      style={styles.confirmButtonGradient}
                    >
                      <Text style={styles.confirmButtonText}>Confirmar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineButton, processingSessionId === request.id && { opacity: 0.6 }]}
                    onPress={() => handleDeclineSession(request.id)}
                    disabled={processingSessionId === request.id}
                  >
                    <Text style={styles.declineButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Email verification reminder banner */}
        <VerificationBanner />

        {renderWelcomeHeader()}
        {renderStatsCards()}
        {renderPendingConfirmations()}
        {renderTodaySessions()}
        {renderQuickActions()}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: heraLanding.textSecondary,
  },

  // Welcome Header
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: heraLanding.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Stats Grid
  statsGrid: {
    gap: 16,
  },
  statsGridDesktop: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...shadows.md,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: heraLanding.textMuted,
    marginTop: 4,
  },

  // Actions Grid
  actionsGrid: {
    gap: 12,
  },
  actionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...shadows.sm,
  },
  actionCardDesktop: {
    flex: 1,
    minWidth: 280,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },

  // Sessions List
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...shadows.md,
  },
  sessionCardActive: {
    borderWidth: 2,
    borderColor: heraLanding.primary,
  },
  sessionCardCompleted: {
    opacity: 0.7,
  },
  sessionTimeContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTime: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  sessionTimeActive: {
    color: heraLanding.primary,
  },
  sessionDuration: {
    fontSize: 12,
    color: heraLanding.textMuted,
  },
  sessionDivider: {
    width: 1,
    backgroundColor: heraLanding.border,
    marginHorizontal: 16,
  },
  sessionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionClient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: heraLanding.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientAvatarActive: {
    backgroundColor: heraLanding.primaryMuted,
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.secondary,
  },
  clientAvatarTextActive: {
    color: heraLanding.primary,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  firstSessionBadge: {
    backgroundColor: heraLanding.secondaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  firstSessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: heraLanding.secondary,
  },
  sessionIssue: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startSessionButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  startSessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  startSessionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: heraLanding.success,
    fontWeight: '600',
  },
  viewProfileIconButton: {
    padding: 4,
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },

  // Pending Badge
  pendingBadge: {
    backgroundColor: heraLanding.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Requests List
  requestsList: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: heraLanding.primaryLight,
    ...shadows.md,
  },
  requestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  requestContent: {
    gap: 16,
  },
  requestClient: {
    flexDirection: 'row',
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: heraLanding.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  requestAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.secondary,
  },
  requestInfo: {
    flex: 1,
  },
  requestClientName: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  requestType: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requestMetaText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  requestPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: heraLanding.primary,
    marginLeft: 'auto',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
});
