import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { heraLanding, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import type {
  SpecialistListItem,
  SpecialistListParams,
  VerificationStatusType,
  AccountStatusType,
} from '../../services/adminService';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

type SortOption = {
  label: string;
  sortBy: 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Más recientes', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Más antiguos', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Nombre A-Z', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Nombre Z-A', sortBy: 'name', sortOrder: 'desc' },
];

type VerificationFilter = VerificationStatusType | 'ALL';
type AccountFilter = AccountStatusType | 'ALL';

const VERIFICATION_FILTERS: { label: string; value: VerificationFilter }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Verificados', value: 'VERIFIED' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Rechazados', value: 'REJECTED' },
];

const ACCOUNT_FILTERS: { label: string; value: AccountFilter }[] = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Suspendidos', value: 'SUSPENDED' },
];

export function SpecialistManagementScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [specialists, setSpecialists] = useState<SpecialistListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('ALL');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL');
  const [sortIndex, setSortIndex] = useState(0);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    if (!isAdmin) return;
    try {
      setError(null);
      const params: SpecialistListParams = {
        page,
        limit: 10,
        sortBy: SORT_OPTIONS[sortIndex].sortBy,
        sortOrder: SORT_OPTIONS[sortIndex].sortOrder,
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

  const handleVerificationFilter = useCallback((value: VerificationFilter) => {
    setVerificationFilter(value);
    setPage(1);
  }, []);

  const handleAccountFilter = useCallback((value: AccountFilter) => {
    setAccountFilter(value);
    setPage(1);
  }, []);

  const cycleSortOption = useCallback(() => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length);
    setPage(1);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getVerificationBadge = (status: VerificationStatusType) => {
    switch (status) {
      case 'VERIFIED':
        return { label: 'Verificado', style: styles.badgeVerified };
      case 'PENDING':
        return { label: 'Pendiente', style: styles.badgePending };
      case 'REJECTED':
        return { label: 'Rechazado', style: styles.badgeRejected };
    }
  };

  const getAccountBadge = (status: AccountStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return null;
      case 'SUSPENDED':
        return { label: 'Suspendido', style: styles.badgeSuspended };
      case 'DELETED':
        return { label: 'Eliminado', style: styles.badgeDeleted };
    }
  };

  if (loading && specialists.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando especialistas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={heraLanding.warning} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSpecialists}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
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
          tintColor={heraLanding.primary}
          colors={[heraLanding.primary]}
        />
      }
    >
      {/* Summary */}
      <Text style={styles.summaryText}>
        {total} especialista{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={heraLanding.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={heraLanding.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={heraLanding.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {VERIFICATION_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              verificationFilter === f.value && styles.filterChipActive,
            ]}
            onPress={() => handleVerificationFilter(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                verificationFilter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        {ACCOUNT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              accountFilter === f.value && styles.filterChipActive,
            ]}
            onPress={() => handleAccountFilter(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                accountFilter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Toggle */}
      <TouchableOpacity style={styles.sortButton} onPress={cycleSortOption}>
        <Ionicons name="swap-vertical-outline" size={16} color={heraLanding.primary} />
        <Text style={styles.sortButtonText}>{SORT_OPTIONS[sortIndex].label}</Text>
      </TouchableOpacity>

      {/* Loading overlay for filter changes */}
      {loading && specialists.length > 0 && (
        <ActivityIndicator
          size="small"
          color={heraLanding.primary}
          style={{ marginVertical: spacing.sm }}
        />
      )}

      {/* Empty State */}
      {specialists.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={heraLanding.primaryMuted} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptySubtitle}>
            No se encontraron especialistas con esos criterios
          </Text>
        </View>
      )}

      {/* Specialist Cards */}
      <View style={styles.cardsContainer}>
        {specialists.map((specialist) => {
          const vBadge = getVerificationBadge(specialist.verificationStatus);
          const aBadge = getAccountBadge(specialist.user.accountStatus);

          return (
            <TouchableOpacity
              key={specialist.id}
              style={styles.card}
              onPress={() => handleSpecialistPress(specialist)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <SpecialistAvatar name={specialist.user.name} avatarUrl={specialist.user.avatar} size={44} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {specialist.user.name}
                  </Text>
                  <Text style={styles.cardEmail} numberOfLines={1}>
                    {specialist.user.email}
                  </Text>
                </View>
                <View style={styles.badgesColumn}>
                  <View style={[styles.badge, vBadge.style]}>
                    <Text style={styles.badgeText}>{vBadge.label}</Text>
                  </View>
                  {aBadge && (
                    <View style={[styles.badge, aBadge.style]}>
                      <Text style={styles.badgeText}>{aBadge.label}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.cardDetailRow}>
                  <Ionicons name="briefcase-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.cardDetailText}>{specialist.specialization}</Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Ionicons name="calendar-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.cardDetailText}>
                    Registro: {formatDate(specialist.createdAt)}
                  </Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Ionicons name="videocam-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.cardDetailText}>
                    {specialist.sessionCount} sesion{specialist.sessionCount !== 1 ? 'es' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>Ver detalles</Text>
                <Ionicons name="chevron-forward" size={16} color={heraLanding.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={page <= 1 ? heraLanding.textMuted : heraLanding.primary}
            />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Página {page} de {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= totalPages ? heraLanding.textMuted : heraLanding.primary}
            />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function SpecialistAvatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
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
      <Text style={styles.cardAvatarText}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxWidth: isDesktop ? 800 : undefined,
    alignSelf: isDesktop ? 'center' : undefined,
    width: isDesktop ? '100%' : undefined,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
  },

  // Summary
  summaryText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    paddingVertical: 2,
  },

  // Filters
  filtersRow: {
    marginBottom: spacing.md,
    maxHeight: 44,
  },
  filtersContent: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
  },
  filterChipActive: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  filterChipText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: heraLanding.borderLight,
    marginHorizontal: spacing.xs,
  },

  // Sort
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  sortButtonText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Retry
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },

  // Cards
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardAvatar: {
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.primaryDark,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  cardEmail: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
    marginTop: 1,
  },
  badgesColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeVerified: {
    backgroundColor: heraLanding.status.confirmed.bg,
    borderColor: heraLanding.status.confirmed.border,
  },
  badgePending: {
    backgroundColor: heraLanding.status.pending.bg,
    borderColor: heraLanding.status.pending.border,
  },
  badgeRejected: {
    backgroundColor: heraLanding.status.cancelled.bg,
    borderColor: heraLanding.status.cancelled.border,
  },
  badgeSuspended: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  badgeDeleted: {
    backgroundColor: heraLanding.status.cancelled.bg,
    borderColor: heraLanding.status.cancelled.border,
  },

  // Card details
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
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    gap: spacing.xs,
  },
  cardFooterText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.primary,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: heraLanding.borderLight,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});

export default SpecialistManagementScreen;
