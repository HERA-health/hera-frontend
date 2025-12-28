/**
 * ListView Component
 * Single Responsibility: Display sessions in grouped list format
 * Groups sessions into upcoming and past sections
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListViewProps, ApiSession } from '../types';
import { heraLanding, colors, spacing } from '../../../constants/colors';
import { groupSessions } from '../utils/sessionHelpers';
import SessionCard from './SessionCard';

const { width: screenWidth } = Dimensions.get('window');

interface SectionData {
  type: 'header' | 'session' | 'empty';
  title?: string;
  count?: number;
  session?: ApiSession;
  sectionKey?: string;
  emptyMessage?: string;
  emptyIcon?: string;
}

const ListView: React.FC<ListViewProps> = ({
  sessions,
  onSessionPress,
  onJoinSession,
  onCancelSession,
  onRefresh,
  refreshing = false,
}) => {
  // Group sessions into upcoming and past
  const { upcoming, past } = useMemo(() => groupSessions(sessions), [sessions]);

  // Create flat list data with section headers
  const listData = useMemo(() => {
    const data: SectionData[] = [];

    // Upcoming section
    data.push({
      type: 'header',
      title: 'Próximas sesiones',
      count: upcoming.length,
      sectionKey: 'upcoming',
    });

    if (upcoming.length === 0) {
      data.push({
        type: 'empty',
        sectionKey: 'upcoming-empty',
        emptyMessage: 'No tienes próximas sesiones programadas',
        emptyIcon: 'calendar-outline',
      });
    } else {
      upcoming.forEach((session) => {
        data.push({
          type: 'session',
          session,
          sectionKey: `session-${session.id}`,
        });
      });
    }

    // Past section (only show if there are past sessions)
    if (past.length > 0) {
      data.push({
        type: 'header',
        title: 'Historial',
        count: past.length,
        sectionKey: 'history',
      });

      past.forEach((session) => {
        data.push({
          type: 'session',
          session,
          sectionKey: `session-${session.id}`,
        });
      });
    }

    return data;
  }, [upcoming, past]);

  const renderItem = ({ item, index }: { item: SectionData; index: number }) => {
    if (item.type === 'header') {
      return (
        <View style={[styles.sectionHeader, index > 0 && styles.sectionHeaderSpaced]}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.count !== undefined && item.count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item.count}</Text>
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={styles.emptySection}>
          <Ionicons
            name={item.emptyIcon as keyof typeof Ionicons.glyphMap}
            size={40}
            color={heraLanding.textMuted}
          />
          <Text style={styles.emptySectionText}>{item.emptyMessage}</Text>
        </View>
      );
    }

    if (item.type === 'session' && item.session) {
      return (
        <SessionCard
          session={item.session}
          variant="detailed"
          onPress={() => onSessionPress?.(item.session!)}
          onJoinPress={() => onJoinSession?.(item.session!.id)}
          onCancelPress={() => onCancelSession?.(item.session!.id)}
        />
      );
    }

    return null;
  };

  const keyExtractor = (item: SectionData) => item.sectionKey || item.session?.id || '';

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[heraLanding.primary]}
            tintColor={heraLanding.primary}
          />
        ) : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl : spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    backgroundColor: heraLanding.background,
    minHeight: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  countBadge: {
    backgroundColor: heraLanding.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptySectionText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default ListView;
