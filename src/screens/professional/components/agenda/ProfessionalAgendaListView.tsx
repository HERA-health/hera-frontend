import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../../../../components/common';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { capitalizeFirst, isToday } from './professionalAgendaUtils';

interface ProfessionalAgendaListViewProps {
  sessions: ProfessionalSession[];
  nextCursor: string | null;
  loadingMore: boolean;
  loadMoreError: boolean;
  loadMoreErrorMessage: string;
  renderSessionCard: (session: ProfessionalSession, compact?: boolean) => React.ReactNode;
  onLoadMore: () => void;
}

export function ProfessionalAgendaListView({
  sessions,
  nextCursor,
  loadingMore,
  loadMoreError,
  loadMoreErrorMessage,
  renderSessionCard,
  onLoadMore,
}: ProfessionalAgendaListViewProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const grouped = new Map<string, ProfessionalSession[]>();
  [...sessions]
    .filter((session) => session.status !== 'cancelled')
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .forEach((session) => {
      const key = session.date.toDateString();
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
  const visibleDates = [...grouped.keys()];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      {visibleDates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={44} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>Todo al día</Text>
          <Text style={styles.emptySubtitle}>No tienes sesiones próximas programadas.</Text>
        </View>
      ) : visibleDates.map((key) => {
        const date = new Date(key);
        const dateSessions = grouped.get(key) ?? [];
        return (
          <Card key={key} variant="default" padding="large" style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>
                {isToday(date) ? 'Hoy' : capitalizeFirst(date.toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'long',
                }))}
              </Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{dateSessions.length}</Text></View>
            </View>
            {dateSessions.map((session) => renderSessionCard(session))}
          </Card>
        );
      })}
      {nextCursor ? (
        <View style={styles.loadMore}>
          {loadMoreError ? (
            <View accessibilityRole="alert" style={styles.loadMoreError}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.warning} />
              <Text style={styles.loadMoreErrorText}>{loadMoreErrorMessage}</Text>
            </View>
          ) : null}
          <Button variant="outline" size="small" loading={loadingMore} disabled={loadingMore} onPress={onLoadMore}>
            {loadMoreError ? 'Reintentar' : 'Cargar más'}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
    groupCard: { borderRadius: borderRadius.lg },
    groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    groupTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.lg, textTransform: 'capitalize' },
    badge: { minWidth: 28, height: 28, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
    badgeText: { color: theme.textOnPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.xs },
    loadMore: { alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
    loadMoreError: {
      maxWidth: 460,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    loadMoreErrorText: {
      flexShrink: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      textAlign: 'center',
    },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
    emptyTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: typography.fontSizes.lg },
    emptySubtitle: { maxWidth: 420, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: typography.fontSizes.md, textAlign: 'center' },
  });
}
