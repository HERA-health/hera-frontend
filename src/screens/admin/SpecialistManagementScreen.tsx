import React, { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
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
import type {
  SpecialistListItem,
  SpecialistListParams,
  VerificationStatusType,
  AccountStatusType,
} from '../../services/adminService';

type SortOption = {
  label: string;
  sortBy: 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
};

type VerificationFilter = VerificationStatusType | 'ALL';
type AccountFilter = AccountStatusType | 'ALL';
type IconName = ComponentProps<typeof Ionicons>['name'];
type SpecialistManagementStyles = ReturnType<typeof createStyles>;

type BadgeTone = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Más recientes', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Más antiguos', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Nombre A-Z', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Nombre Z-A', sortBy: 'name', sortOrder: 'desc' },
];

const VERIFICATION_FILTERS: { label: string; value: VerificationFilter }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Verificados', value: 'VERIFIED' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Rechazados', value: 'REJECTED' },
];

const ACCOUNT_FILTERS: { label: string; value: AccountFilter }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Suspendidos', value: 'SUSPENDED' },
];

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const getVerificationBadge = (status: VerificationStatusType, theme: Theme): BadgeTone => {
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Verificado',
        backgroundColor: theme.status.confirmed.bg,
        borderColor: theme.status.confirmed.border,
        textColor: theme.status.confirmed.text,
      };
    case 'PENDING':
      return {
        label: 'Pendiente',
        backgroundColor: theme.status.pending.bg,
        borderColor: theme.status.pending.border,
        textColor: theme.status.pending.text,
      };
    case 'REJECTED':
      return {
        label: 'Rechazado',
        backgroundColor: theme.status.cancelled.bg,
        borderColor: theme.status.cancelled.border,
        textColor: theme.status.cancelled.text,
      };
  }
};

const getAccountBadge = (status: AccountStatusType, theme: Theme): BadgeTone | null => {
  switch (status) {
    case 'ACTIVE':
      return null;
    case 'SUSPENDED':
      return {
        label: 'Suspendido',
        backgroundColor: theme.warningBg,
        borderColor: theme.warning,
        textColor: theme.warning,
      };
    case 'DELETED':
      return {
        label: 'Eliminado',
        backgroundColor: theme.status.cancelled.bg,
        borderColor: theme.status.cancelled.border,
        textColor: theme.status.cancelled.text,
      };
  }
};

export function SpecialistManagementScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.isAdmin ?? false;
  const isDesktop = width >= 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);

  const [specialists, setSpecialists] = useState<SpecialistListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('ALL');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL');
  const [sortIndex, setSortIndex] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadSpecialists = useCallback(async () => {
    if (!isAdmin) {
      setSpecialists([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const sortOption = SORT_OPTIONS[sortIndex];
      const params: SpecialistListParams = {
        page,
        limit: 10,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
      };

      if (verificationFilter !== 'ALL') params.verificationStatus = verificationFilter;
      if (accountFilter !== 'ALL') params.accountStatus = accountFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const data = await adminService.getSpecialists(params);
      setSpecialists(data.specialists);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (_err: unknown) {
      setError('Error al cargar los especialistas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, page, verificationFilter, accountFilter, sortIndex, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    loadSpecialists();
  }, [loadSpecialists]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpecialists();
  }, [loadSpecialists]);

  const handleSpecialistPress = useCallback((specialist: SpecialistListItem) => {
    navigation.navigate('SpecialistDetailAdmin', { specialistId: specialist.id });
  }, [navigation]);

  const cycleSortOption = useCallback(() => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length);
    setPage(1);
  }, []);

  if (loading && specialists.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando especialistas...</Text>
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
          <Text style={styles.summaryLabel}>Directorio profesional</Text>
          <Text style={styles.summaryText}>
            {total} especialista{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </Text>
        </View>
        <AnimatedPressable
          style={styles.sortButton}
          onPress={cycleSortOption}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar por ${SORT_OPTIONS[sortIndex].label}`}
          hoverLift={isDesktop}
          pressScale={0.98}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={theme.primary} />
          <Text style={styles.sortButtonText}>{SORT_OPTIONS[sortIndex].label}</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <AnimatedPressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
            style={styles.clearButton}
            pressScale={0.95}
          >
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </AnimatedPressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {VERIFICATION_FILTERS.map((filter) => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            active={verificationFilter === filter.value}
            onPress={() => {
              setVerificationFilter(filter.value);
              setPage(1);
            }}
            styles={styles}
          />
        ))}
        <View style={styles.filterDivider} />
        {ACCOUNT_FILTERS.map((filter) => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            active={accountFilter === filter.value}
            onPress={() => {
              setAccountFilter(filter.value);
              setPage(1);
            }}
            styles={styles}
          />
        ))}
      </ScrollView>

      {loading && specialists.length > 0 && (
        <ActivityIndicator
          size="small"
          color={theme.primary}
          style={styles.inlineLoader}
        />
      )}

      {specialists.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <StateIcon name="search-outline" styles={styles} color={theme.primary} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptySubtitle}>
            No se encontraron especialistas con esos criterios.
          </Text>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {specialists.map((specialist) => {
          const verificationBadge = getVerificationBadge(specialist.verificationStatus, theme);
          const accountBadge = getAccountBadge(specialist.user.accountStatus, theme);

          return (
            <AnimatedPressable
              key={specialist.id}
              style={styles.card}
              onPress={() => handleSpecialistPress(specialist)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ficha de ${specialist.user.name}`}
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
                <View style={styles.badgesColumn}>
                  <Badge tone={verificationBadge} styles={styles} />
                  {accountBadge && <Badge tone={accountBadge} styles={styles} />}
                </View>
              </View>

              <View style={styles.cardDetails}>
                <DetailRow icon="briefcase-outline" text={specialist.specialization} styles={styles} theme={theme} />
                <DetailRow
                  icon="calendar-outline"
                  text={`Registro: ${formatDate(specialist.createdAt)}`}
                  styles={styles}
                  theme={theme}
                />
                <DetailRow
                  icon="videocam-outline"
                  text={`${specialist.sessionCount} sesión${specialist.sessionCount !== 1 ? 'es' : ''}`}
                  styles={styles}
                  theme={theme}
                />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>Ver detalles</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.primary} />
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <AnimatedPressable
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            accessibilityRole="button"
            accessibilityLabel="Página anterior"
            pressScale={0.95}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={page <= 1 ? theme.textMuted : theme.primary}
            />
          </AnimatedPressable>
          <Text style={styles.pageText}>
            Página {page} de {totalPages}
          </Text>
          <AnimatedPressable
            style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
            onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            accessibilityRole="button"
            accessibilityLabel="Página siguiente"
            pressScale={0.95}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= totalPages ? theme.textMuted : theme.primary}
            />
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: SpecialistManagementStyles;
}) {
  return (
    <AnimatedPressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${active ? ', seleccionado' : ''}`}
      pressScale={0.97}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function Badge({ tone, styles }: { tone: BadgeTone; styles: SpecialistManagementStyles }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.textColor }]}>{tone.label}</Text>
    </View>
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
  styles: SpecialistManagementStyles;
  theme: Theme;
}) {
  return (
    <View style={styles.cardDetailRow}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text style={styles.cardDetailText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function StateIcon({ name, styles, color }: { name: IconName; styles: SpecialistManagementStyles; color: string }) {
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
  styles: SpecialistManagementStyles;
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    minHeight: 28,
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    paddingVertical: 2,
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    maxHeight: 44,
  },
  filtersContent: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primaryAlpha12,
    borderColor: theme.primaryAlpha20,
  },
  filterChipText: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterChipTextActive: {
    color: theme.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  filterDivider: {
    width: 1,
    height: 22,
    backgroundColor: theme.border,
    marginHorizontal: spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
  },
  sortButtonText: {
    fontSize: typography.fontSizes.sm,
    color: theme.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  inlineLoader: {
    marginVertical: spacing.sm,
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
  badgesColumn: {
    alignItems: 'flex-end',
    gap: 5,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
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
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  pageButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageText: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});

export default SpecialistManagementScreen;
