import React, { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button } from '../../components/common';
import { spacing, borderRadius, typography, shadows } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as adminService from '../../services/adminService';
import type { PendingSpecialist } from '../../services/adminService';

type AdminPanelStyles = ReturnType<typeof createStyles>;
type IconName = ComponentProps<typeof Ionicons>['name'];

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Sin fecha';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function AdminPanelScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.isAdmin ?? false;
  const isDesktop = width >= 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);

  const [specialists, setSpecialists] = useState<PendingSpecialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialists = useCallback(async () => {
    if (!isAdmin) {
      setSpecialists([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const data = await adminService.getPendingSpecialists();
      setSpecialists(data);
    } catch (_err: unknown) {
      setError('Error al cargar las verificaciones pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadSpecialists();
  }, [loadSpecialists]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpecialists();
  }, [loadSpecialists]);

  const handleSpecialistPress = useCallback((specialist: PendingSpecialist) => {
    navigation.navigate('AdminSpecialistDetail', {
      specialist: JSON.stringify(specialist),
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando verificaciones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <StateIcon name="alert-circle-outline" styles={styles} color={theme.warning} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <Button variant="primary" size="medium" onPress={loadSpecialists} style={styles.retryButton}>
          Reintentar
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Verificación profesional</Text>
          <Text style={styles.summaryText}>
            {specialists.length === 0
              ? 'No hay solicitudes pendientes'
              : `${specialists.length} solicitud${specialists.length !== 1 ? 'es' : ''} pendiente${specialists.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.summaryBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
          <Text style={styles.summaryBadgeText}>Control manual</Text>
        </View>
      </View>

      {specialists.length === 0 && (
        <View style={styles.emptyContainer}>
          <StateIcon name="shield-checkmark-outline" styles={styles} color={theme.success} />
          <Text style={styles.emptyTitle}>Todo al día</Text>
          <Text style={styles.emptySubtitle}>No hay verificaciones pendientes de revisión.</Text>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {specialists.map((specialist) => (
          <AnimatedPressable
            key={specialist.id}
            style={styles.card}
            onPress={() => handleSpecialistPress(specialist)}
            accessibilityRole="button"
            accessibilityLabel={`Revisar solicitud de ${specialist.user.name}`}
            hoverLift={isDesktop}
            pressScale={0.98}
          >
            <View style={styles.cardHeader}>
              <SpecialistAvatar
                name={specialist.user.name}
                avatarUrl={specialist.user.avatar}
                size={46}
                styles={styles}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {specialist.user.name}
                </Text>
                <Text style={styles.cardEmail} numberOfLines={1}>
                  {specialist.user.email}
                </Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pendiente</Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <DetailRow icon="briefcase-outline" text={specialist.specialization} styles={styles} theme={theme} />
              {specialist.colegiadoNumber && (
                <DetailRow
                  icon="document-text-outline"
                  text={`N.º ${specialist.colegiadoNumber}`}
                  styles={styles}
                  theme={theme}
                />
              )}
              <DetailRow
                icon="time-outline"
                text={formatDate(specialist.verificationSubmittedAt)}
                styles={styles}
                theme={theme}
              />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>Revisar solicitud</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  text,
  styles,
  theme,
}: {
  icon: IconName;
  text: string;
  styles: AdminPanelStyles;
  theme: Theme;
}) {
  return (
    <View style={styles.cardDetailRow}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text style={styles.cardDetailText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function StateIcon({ name, styles, color }: { name: IconName; styles: AdminPanelStyles; color: string }) {
  return (
    <View style={styles.stateIconContainer}>
      <Ionicons name={name} size={42} color={color} />
    </View>
  );
}

function SpecialistAvatar({
  name,
  avatarUrl,
  size,
  styles,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
  styles: AdminPanelStyles;
}) {
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.cardAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.cardAvatarText}>{getInitials(name)}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    maxWidth: isDesktop ? 1040 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: theme.textSecondary,
  },
  summaryCard: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isDesktop ? 'center' : 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    ...(isDark ? {} : shadows.sm),
  },
  summaryLabel: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: typography.fontSizes.xl,
    lineHeight: 28,
    color: theme.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
  },
  summaryBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: theme.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  stateIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...(isDark ? {} : shadows.sm),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardAvatar: {
    backgroundColor: theme.primaryAlpha12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
  },
  cardAvatarText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: theme.primary,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
  },
  cardEmail: {
    fontSize: typography.fontSizes.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: theme.status.pending.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.status.pending.border,
  },
  pendingBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: theme.status.pending.text,
  },
  cardDetails: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardDetailText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    gap: spacing.xs,
  },
  cardFooterText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: theme.primary,
  },
});

export default AdminPanelScreen;
