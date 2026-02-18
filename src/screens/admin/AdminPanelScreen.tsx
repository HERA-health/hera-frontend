import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import type { PendingSpecialist } from '../../services/adminService';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

export function AdminPanelScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [specialists, setSpecialists] = useState<PendingSpecialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialists = useCallback(async () => {
    if (!isAdmin) return;
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando verificaciones...</Text>
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
        {specialists.length === 0
          ? 'No hay verificaciones pendientes'
          : `${specialists.length} verificación${specialists.length !== 1 ? 'es' : ''} pendiente${specialists.length !== 1 ? 's' : ''}`}
      </Text>

      {/* Empty State */}
      {specialists.length === 0 && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={heraLanding.primaryMuted} />
          </View>
          <Text style={styles.emptyTitle}>Todo al día</Text>
          <Text style={styles.emptySubtitle}>No hay verificaciones pendientes de revisión</Text>
        </View>
      )}

      {/* Specialist Cards */}
      <View style={styles.cardsContainer}>
        {specialists.map((specialist) => (
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
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pendiente</Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.cardDetailRow}>
                <Ionicons name="briefcase-outline" size={14} color={heraLanding.textSecondary} />
                <Text style={styles.cardDetailText}>{specialist.specialization}</Text>
              </View>
              {specialist.colegiadoNumber && (
                <View style={styles.cardDetailRow}>
                  <Ionicons name="document-text-outline" size={14} color={heraLanding.textSecondary} />
                  <Text style={styles.cardDetailText}>N° {specialist.colegiadoNumber}</Text>
                </View>
              )}
              <View style={styles.cardDetailRow}>
                <Ionicons name="time-outline" size={14} color={heraLanding.textSecondary} />
                <Text style={styles.cardDetailText}>
                  {formatDate(specialist.verificationSubmittedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color={heraLanding.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    marginBottom: spacing.lg,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: heraLanding.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  pendingBadge: {
    backgroundColor: heraLanding.status.pending.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.status.pending.border,
  },
  pendingBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.status.pending.text,
  },

  // Card Details
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

  // Card Footer
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
});

export default AdminPanelScreen;
