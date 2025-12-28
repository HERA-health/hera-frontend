/**
 * SessionsScreen - Client Sessions View
 *
 * Beautiful 2-Column Layout (Apple Calendar Inspired):
 * - Left (70%): Scrollable sessions list with beautiful cards
 * - Right (30%): Mini calendar for navigation (sticky)
 * - Mobile: Stacks to single column with collapsible calendar
 *
 * CRITICAL: Background must be #F5F7F5 (Light Sage) - HERA signature color
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  Dimensions,
  ScrollView,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { heraLanding, colors, spacing, borderRadius, typography } from '../../constants/colors';
import { MainTabParamList } from '../../constants/types';
import * as sessionsService from '../../services/sessionsService';

import { ApiSession } from './types';
import { groupSessions } from './utils/sessionHelpers';
import { getTodayString } from './utils/calendarHelpers';

import CalendarPanel from './components/CalendarPanel';
import SessionsList from './components/SessionsList';
import { EmptyState, LoadingState } from './components';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;
const isTablet = screenWidth > 768 && screenWidth <= 1024;
const isMobile = screenWidth <= 768;

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;
type SessionsRouteProp = RouteProp<MainTabParamList, 'Sessions'>;

const SessionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionsRouteProp>();
  const sessionsListRef = useRef<ScrollView>(null);

  // State
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Auto-refresh countdown state
  const [, setCountdownTick] = useState(0);

  // Animation for header
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Refresh when navigated from booking
  useEffect(() => {
    const params = route.params as { refresh?: boolean } | undefined;
    if (params?.refresh) {
      loadSessions();
    }
  }, [route.params]);

  // Auto-refresh countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick((tick) => tick + 1);
    }, 60000);
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, []);

  const handleCancelSession = useCallback(async (sessionId: string) => {
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
  }, []);

  const handleJoinSession = useCallback(async (sessionId: string) => {
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
  }, []);

  const handleBrowseSpecialists = useCallback(() => {
    navigation.navigate('Specialists');
  }, [navigation]);

  const handleSessionPress = useCallback((session: ApiSession) => {
    // Future: Navigate to session detail view
  }, []);

  const handleDateSelect = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    // The SessionsList component will handle scrolling to this date
  }, []);

  // Calculate session stats for header
  const sessionStats = useMemo(() => {
    const { upcoming, past } = groupSessions(sessions);
    return {
      upcoming: upcoming.length,
      completed: past.filter(s => s.status === 'COMPLETED').length,
      total: sessions.length,
    };
  }, [sessions]);

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Header stats={null} />
          <LoadingState message="Cargando tus sesiones..." />
        </View>
      </SafeAreaView>
    );
  }

  const { upcoming, past } = groupSessions(sessions);
  const hasNoSessions = sessions.length === 0;

  // Render empty state
  if (hasNoSessions) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Header stats={null} />
          <EmptyState
            title="Comienza tu viaje de bienestar"
            description="Explora nuestros especialistas certificados y reserva tu primera sesión. Estamos aquí para acompañarte."
            icon="leaf-outline"
            actionLabel="Encontrar Especialista"
            onAction={handleBrowseSpecialists}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Desktop/Tablet: 2-column layout (Sessions LEFT, Calendar RIGHT)
  if (isDesktop || isTablet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <Header stats={sessionStats} />
          <View style={styles.twoColumnContainer}>
            {/* Left Column: Sessions List (70%) */}
            <View style={styles.listColumn}>
              <SessionsList
                sessions={sessions}
                selectedDate={selectedDate}
                onSessionPress={handleSessionPress}
                onJoinSession={handleJoinSession}
                onCancelSession={handleCancelSession}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </View>

            {/* Right Column: Mini Calendar (30%) */}
            <View style={styles.calendarColumn}>
              <CalendarPanel
                sessions={sessions}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Mobile: Single column with calendar header
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Header stats={sessionStats} />
        <ScrollView
          style={styles.mobileScrollView}
          contentContainerStyle={styles.mobileContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[heraLanding.primary]}
              tintColor={heraLanding.primary}
            />
          }
        >
          {/* Calendar (collapsible on mobile) */}
          <CalendarPanel
            sessions={sessions}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            compact
          />

          {/* Sessions List */}
          <SessionsList
            sessions={sessions}
            selectedDate={selectedDate}
            onSessionPress={handleSessionPress}
            onJoinSession={handleJoinSession}
            onCancelSession={handleCancelSession}
            embedded
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

/**
 * Header Component - Beautiful, informative header
 */
interface HeaderProps {
  stats: { upcoming: number; completed: number; total: number } | null;
}

const Header: React.FC<HeaderProps> = ({ stats }) => {
  // Get current greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerGreeting}>{getGreeting()}</Text>
          <Text style={styles.headerTitle}>Mis Sesiones</Text>
          <Text style={styles.headerSubtitle}>
            Tu camino hacia el bienestar
          </Text>
        </View>

        {/* Decorative icon */}
        <View style={styles.headerIconContainer}>
          <View style={styles.headerIconBg}>
            <Ionicons name="calendar" size={28} color={heraLanding.primary} />
          </View>
        </View>
      </View>

      {/* Stats pills - only show if we have data */}
      {stats && stats.total > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: heraLanding.success }]} />
            <Text style={styles.statText}>
              {stats.upcoming} {stats.upcoming === 1 ? 'próxima' : 'próximas'}
            </Text>
          </View>
          {stats.completed > 0 && (
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: heraLanding.primary }]} />
              <Text style={styles.statText}>
                {stats.completed} {stats.completed === 1 ? 'completada' : 'completadas'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL: Background color #F5F7F5 (Light Sage) - HERA signature
  // ═══════════════════════════════════════════════════════════════
  safeArea: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5 Light Sage
  },
  container: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5 Light Sage
  },

  // ═══════════════════════════════════════════════════════════════
  // Header - Elegant, warm, professional
  // ═══════════════════════════════════════════════════════════════
  header: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: isDesktop ? spacing.xxxl : spacing.xl,
    paddingTop: isDesktop ? spacing.xl : spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.primary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: isDesktop ? 32 : 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    fontWeight: '400',
    lineHeight: 22,
  },
  headerIconContainer: {
    marginLeft: spacing.md,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats pills
  statsContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },

  // ═══════════════════════════════════════════════════════════════
  // Two-column layout - FLIPPED: Sessions left (70%), Calendar right (30%)
  // ═══════════════════════════════════════════════════════════════
  twoColumnContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: isDesktop ? spacing.xxxl : spacing.xl,
    paddingTop: spacing.sm,
    gap: isDesktop ? spacing.xxl : spacing.xl,
  },

  // Left column: Sessions List (70%)
  listColumn: {
    flex: 1,
    minWidth: 0, // Prevents flex overflow issues
  },

  // Right column: Calendar (30%)
  calendarColumn: {
    width: isDesktop ? 340 : 300,
    maxWidth: 360,
    flexShrink: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // Mobile layout
  // ═══════════════════════════════════════════════════════════════
  mobileScrollView: {
    flex: 1,
  },
  mobileContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + 20,
  },
});

export default SessionsScreen;
