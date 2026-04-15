import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { borderRadius, shadows, spacing } from '../../constants/colors';
import { MainTabParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as sessionsService from '../../services/sessionsService';
import { Card } from '../../components/common';
import { BrandText } from '../../components/common/BrandText';

import type { ApiSession } from './types';
import { groupSessions } from './utils/sessionHelpers';
import { getTodayString } from './utils/calendarHelpers';
import CalendarPanel from './components/CalendarPanel';
import SessionsList from './components/SessionsList';
import ReviewModal from './components/ReviewModal';
import EmptyState from './components/EmptyState';
import LoadingState from './components/LoadingState';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;
type SessionsRouteProp = RouteProp<MainTabParamList, 'Sessions'>;

const DESKTOP_BREAKPOINT = 1120;
const TABLET_BREAKPOINT = 860;

const SessionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionsRouteProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const useTwoColumns = isDesktop || isTablet;

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [reviewSession, setReviewSession] = useState<ApiSession | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sessionsService.getMySessions();
      setSessions(data as ApiSession[]);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar tus sesiones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    analyticsService.trackScreen('sessions_client');
    void loadSessions();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, loadSessions]);

  useEffect(() => {
    const params = route.params as { refresh?: boolean } | undefined;
    if (params?.refresh) {
      void loadSessions();
    }
  }, [loadSessions, route.params]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await sessionsService.getMySessions();
      setSessions(data as ApiSession[]);
    } catch {
      Alert.alert('Error', 'No se pudieron actualizar tus sesiones');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCancelSession = useCallback(async (sessionId: string) => {
    Alert.alert(
      'Cancelar sesión',
      '¿Seguro que quieres cancelar esta sesión?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionsService.cancelSession(sessionId);
              analyticsService.track('session_cancelled', { sessionId });
              Alert.alert('Sesión cancelada', 'La sesión se ha cancelado correctamente.');
              await loadSessions();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'No se pudo cancelar la sesión';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  }, [loadSessions]);

  const handleJoinSession = useCallback(async (sessionId: string) => {
    try {
      const meetingData = await sessionsService.getMeetingLink(sessionId);

      if (!meetingData.canJoin) {
        Alert.alert('Todavía no', meetingData.message);
        return;
      }

      if (!meetingData.meetingLink) {
        Alert.alert('Error', 'No se pudo obtener el enlace de la videollamada.');
        return;
      }

      const supported = await Linking.canOpenURL(meetingData.meetingLink);
      if (!supported) {
        Alert.alert('Error', 'No se pudo abrir el enlace de la videollamada.');
        return;
      }

      await Linking.openURL(meetingData.meetingLink);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Hubo un problema al unirte a la sesión.';
      Alert.alert('Error', message);
    }
  }, []);

  const handleBrowseSpecialists = useCallback(() => {
    navigation.navigate('Specialists');
  }, [navigation]);

  const handleDateSelect = useCallback((dateString: string) => {
    setSelectedDate(dateString);
  }, []);

  const handleLeaveReview = useCallback((session: ApiSession) => {
    setReviewSession(session);
  }, []);

  const handleReviewSuccess = useCallback(() => {
    setSessions(prev =>
      prev.map(session => (
        session.id === reviewSession?.id ? { ...session, hasReview: true } : session
      ))
    );
    setReviewSession(null);
    Alert.alert('Gracias', 'Tu reseña se ha enviado correctamente.');
  }, [reviewSession]);

  const stats = useMemo(() => {
    const { upcoming, past } = groupSessions(sessions);
    return {
      upcoming: upcoming.length,
      completed: past.filter(session => session.status === 'COMPLETED').length,
      total: sessions.length,
    };
  }, [sessions]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.screen}>
          <Header theme={theme} styles={styles} stats={null} />
          <LoadingState message="Cargando tus sesiones..." />
        </View>
      </SafeAreaView>
    );
  }

  if (sessions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.screen}>
          <Header theme={theme} styles={styles} stats={null} />
          <EmptyState
            title="Tu agenda está lista para empezar"
            description="Cuando reserves tus próximas sesiones, las verás aquí organizadas para seguir tu proceso con claridad."
            icon="calendar-clear-outline"
            actionLabel="Encontrar especialista"
            onAction={handleBrowseSpecialists}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
        <Header theme={theme} styles={styles} stats={stats} />

        {useTwoColumns ? (
          <View style={styles.twoColumnLayout}>
            <View style={styles.listColumn}>
              <SessionsList
                sessions={sessions}
                selectedDate={selectedDate}
                onJoinSession={handleJoinSession}
                onCancelSession={handleCancelSession}
                onLeaveReview={handleLeaveReview}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </View>

            <ScrollView
              style={styles.calendarColumn}
              contentContainerStyle={styles.calendarColumnContent}
              showsVerticalScrollIndicator={false}
            >
              <CalendarPanel
                sessions={sessions}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            style={styles.mobileScroll}
            contentContainerStyle={styles.mobileScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            )}
          >
            <CalendarPanel
              sessions={sessions}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              compact
            />

            <SessionsList
              sessions={sessions}
              selectedDate={selectedDate}
              onJoinSession={handleJoinSession}
              onCancelSession={handleCancelSession}
              onLeaveReview={handleLeaveReview}
              embedded
            />
          </ScrollView>
        )}

        <ReviewModal
          visible={Boolean(reviewSession?.id)}
          sessionId={reviewSession?.id ?? ''}
          specialistName={reviewSession?.specialist.user.name ?? ''}
          specialistAvatar={reviewSession?.specialist.user.avatar ?? reviewSession?.specialist.avatar}
          onClose={() => setReviewSession(null)}
          onSuccess={handleReviewSuccess}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

interface HeaderProps {
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  stats: { upcoming: number; completed: number; total: number } | null;
}

const Header: React.FC<HeaderProps> = ({ theme, styles, stats }) => {
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <View style={styles.header}>
      <View style={styles.headerMainRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerGreeting}>{greeting}</Text>
          <BrandText style={styles.headerTitle}>Mis Sesiones</BrandText>
          <Text style={styles.headerSubtitle}>Tu camino hacia el bienestar, organizado con claridad.</Text>
        </View>

        <Card variant="outlined" padding="small" style={styles.headerIconShell}>
          <Ionicons name="calendar-outline" size={24} color={theme.primary} />
        </Card>
      </View>

      {stats && stats.total > 0 ? (
        <View style={styles.headerStats}>
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: theme.success }]} />
            <Text style={styles.statPillText}>
              {stats.upcoming} {stats.upcoming === 1 ? 'próxima' : 'próximas'}
            </Text>
          </View>

          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: theme.secondary }]} />
            <Text style={styles.statPillText}>
              {stats.completed} {stats.completed === 1 ? 'completada' : 'completadas'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean, width: number) => {
  const desktop = width >= DESKTOP_BREAKPOINT;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      paddingHorizontal: desktop ? spacing.xxxl : spacing.xl,
      paddingTop: desktop ? spacing.xl : spacing.lg,
      paddingBottom: spacing.lg,
      backgroundColor: theme.bg,
    },
    headerMainRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
    },
    headerGreeting: {
      marginBottom: 6,
      fontSize: 15,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
    headerTitle: {
      fontSize: desktop ? 34 : 30,
      color: theme.textPrimary,
    },
    headerSubtitle: {
      marginTop: 6,
      fontSize: 16,
      lineHeight: 24,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    headerIconShell: {
      width: 58,
      height: 58,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgCard,
    },
    headerStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.full,
      ...shadows.sm,
    },
    statDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
    },
    statPillText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    twoColumnLayout: {
      flex: 1,
      flexDirection: 'row',
      gap: desktop ? spacing.xxl : spacing.xl,
      paddingHorizontal: desktop ? spacing.xxxl : spacing.xl,
      paddingBottom: spacing.xl,
    },
    listColumn: {
      flex: 1,
      minWidth: 0,
    },
    calendarColumn: {
      width: desktop ? 340 : 300,
      flexShrink: 0,
    },
    calendarColumnContent: {
      paddingBottom: spacing.lg,
    },
    mobileScroll: {
      flex: 1,
    },
    mobileScrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
  });
};

export default SessionsScreen;
