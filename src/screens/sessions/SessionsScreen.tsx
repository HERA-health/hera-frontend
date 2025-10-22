/**
 * SessionsScreen
 * Displays upcoming sessions and history with tabs
 * Shows empty state when no sessions are scheduled
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { colors, spacing, typography, borderRadius } from '../../constants/colors';
import { mockSessions } from '../../utils/mockData';
import { SessionTab, Session } from '../../constants/types';
import { MainTabParamList } from '../../constants/types';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

const SessionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<SessionTab>('upcoming');

  // Filter sessions by status
  const upcomingSessions = mockSessions.filter((s) => s.status === 'scheduled');
  const historySessions = mockSessions.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  const handleBrowseSpecialists = () => {
    navigation.navigate('Specialists');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderSessionCard = (session: Session) => {
    const isCompleted = session.status === 'completed';
    const isCancelled = session.status === 'cancelled';

    return (
      <Card key={session.id} style={styles.sessionCard} padding="medium">
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.specialistName}>{session.specialistName}</Text>
            <View style={styles.sessionMeta}>
              <Ionicons name="calendar" size={14} color={colors.neutral.gray600} />
              <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
              <Text style={styles.sessionTime}> • {formatTime(session.date)}</Text>
            </View>
          </View>

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

        <View style={styles.sessionDetails}>
          <View style={styles.sessionDetail}>
            <Ionicons name="time" size={16} color={colors.neutral.gray600} />
            <Text style={styles.sessionDetailText}>{session.duration} minutos</Text>
          </View>
          <View style={styles.sessionDetail}>
            <Ionicons
              name={session.type === 'video' ? 'videocam' : 'call'}
              size={16}
              color={colors.neutral.gray600}
            />
            <Text style={styles.sessionDetailText}>
              {session.type === 'video' ? 'Videollamada' : 'Llamada'}
            </Text>
          </View>
        </View>

        {session.notes && (
          <Text style={styles.sessionNotes} numberOfLines={2}>
            {session.notes}
          </Text>
        )}

        {!isCompleted && !isCancelled && (
          <View style={styles.sessionActions}>
            <Button variant="outline" size="small" onPress={() => {}}>
              Reprogramar
            </Button>
            <View style={{ width: spacing.sm }} />
            <Button variant="primary" size="small" onPress={() => {}}>
              Unirse
            </Button>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={80} color={colors.primary.main} />
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

  return (
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
            Próximas Sesiones ({upcomingSessions.length})
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'upcoming' ? (
          upcomingSessions.length > 0 ? (
            upcomingSessions.map(renderSessionCard)
          ) : (
            renderEmptyState()
          )
        ) : historySessions.length > 0 ? (
          historySessions.map(renderSessionCard)
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
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
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
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
  },
  tabTextActive: {
    color: colors.primary.main,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    backgroundColor: colors.primary[50],
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
