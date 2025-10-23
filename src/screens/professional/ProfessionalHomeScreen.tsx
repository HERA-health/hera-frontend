import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as professionalService from '../../services/professionalService';

const { width: screenWidth } = Dimensions.get('window');

export function ProfessionalHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);

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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  // Calculate stats from real data
  const stats = {
    totalClients: profile?.sessionsCount || 0,
    sessionsThisWeek: sessions.filter(s => {
      const date = new Date(s.scheduledDate);
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return date >= now && date <= weekLater;
    }).length,
    averageRating: profile?.rating || 0,
    pendingAppointments: sessions.filter(s => s.status === 'PENDING').length,
  };

  // Get next 3 upcoming sessions
  const upcomingSessions = sessions
    .filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 3)
    .map(s => ({
      id: s.id,
      date: new Date(s.scheduledDate),
      clientName: s.client?.user?.name || 'Cliente',
      clientInitial: (s.client?.user?.name || 'C')[0].toUpperCase(),
      duration: 60,
      status: s.status.toLowerCase()
    }));

  const statsCards = [
    {
      id: 'clients',
      label: 'Clientes totales',
      value: stats.totalClients.toString(),
      icon: 'people',
      color: colors.primary.main,
      gradient: [colors.primary.light, colors.primary.main],
    },
    {
      id: 'sessions',
      label: 'Sesiones esta semana',
      value: stats.sessionsThisWeek.toString(),
      icon: 'calendar',
      color: colors.secondary.blue,
      gradient: [colors.secondary.blue + '80', colors.secondary.blue],
    },
    {
      id: 'rating',
      label: 'Valoración media',
      value: stats.averageRating.toFixed(1),
      icon: 'star',
      color: colors.secondary.orange,
      gradient: [colors.secondary.orange + '80', colors.secondary.orange],
    },
    {
      id: 'pending',
      label: 'Citas pendientes',
      value: stats.pendingAppointments.toString(),
      icon: 'time',
      color: colors.secondary.purple,
      gradient: [colors.secondary.purple + '80', colors.secondary.purple],
    },
  ];

  const quickActions = [
    {
      id: 'clients',
      title: 'Ver mis clientes',
      description: 'Gestiona tu lista de pacientes',
      icon: 'people',
      color: colors.primary.main,
      onPress: () => navigation.navigate('ProfessionalClients'),
    },
    {
      id: 'sessions',
      title: 'Gestionar sesiones',
      description: 'Próximas citas y solicitudes',
      icon: 'calendar',
      color: colors.secondary.blue,
      onPress: () => navigation.navigate('ProfessionalSessions'),
    },
    {
      id: 'profile',
      title: 'Editar mi perfil',
      description: 'Actualiza tu información profesional',
      icon: 'create',
      color: colors.secondary.purple,
      onPress: () => navigation.navigate('ProfessionalProfile'),
    },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Welcome header with gradient */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark]}
        style={styles.welcomeHeader}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeGreeting}>Hola, {user?.name || 'Doctor/a'}</Text>
          <Text style={styles.welcomeSubtitle}>Bienvenido a tu panel profesional</Text>
        </View>

        <View style={styles.welcomeIconContainer}>
          <Ionicons name="heart" size={32} color={colors.neutral.white} />
        </View>
      </LinearGradient>

      {/* Stats cards - floating with negative margin */}
      <View style={styles.statsContainer}>
        {statsCards.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <LinearGradient
              colors={stat.gradient}
              style={styles.statIconContainer}
            >
              <Ionicons name={stat.icon as any} size={24} color={colors.neutral.white} />
            </LinearGradient>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Content container */}
      <View style={styles.contentContainer}>
        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray400} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas sesiones</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProfessionalSessions')}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {upcomingSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.neutral.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No hay sesiones programadas</Text>
              <Text style={styles.emptyDescription}>
                Tus próximas citas aparecerán aquí
              </Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {upcomingSessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionTime}>
                    <Text style={styles.sessionTimeText}>{formatTime(session.date)}</Text>
                    <Text style={styles.sessionDateText}>{formatDate(session.date)}</Text>
                  </View>

                  <View style={styles.sessionDivider} />

                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionClient}>
                      <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>{session.clientInitial}</Text>
                      </View>
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{session.clientName}</Text>
                        <View style={styles.sessionMeta}>
                          <Ionicons name="videocam" size={14} color={colors.neutral.gray500} />
                          <Text style={styles.sessionDuration}>{session.duration} min</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.sessionAction}>
                      <Ionicons name="arrow-forward" size={20} color={colors.primary.main} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  welcomeHeader: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -30,
    left: -40,
  },
  welcomeContent: {
    flex: 1,
    zIndex: 1,
  },
  welcomeGreeting: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.neutral.white,
    opacity: 0.95,
  },
  welcomeIconContainer: {
    position: 'absolute',
    top: spacing.xl,
    right: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    marginTop: -spacing.xxxl,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: screenWidth > 768 ? 150 : '47%',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    marginTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  sectionLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.main,
  },
  quickActionsGrid: {
    gap: spacing.md,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  quickActionDescription: {
    fontSize: 14,
    color: colors.neutral.gray600,
  },
  sessionsList: {
    gap: spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionTime: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  sessionDateText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textTransform: 'capitalize',
  },
  sessionDivider: {
    width: 1,
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.md,
  },
  sessionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionClient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionDuration: {
    fontSize: 13,
    color: colors.neutral.gray600,
  },
  sessionAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
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
