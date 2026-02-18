import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import type { PendingSpecialist } from '../../services/adminService';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

export function AdminSpecialistDetailScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'AdminSpecialistDetail'>>();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [processing, setProcessing] = useState(false);

  // Parse specialist data from navigation params
  const specialist = useMemo<PendingSpecialist | null>(() => {
    try {
      return JSON.parse(route.params.specialist);
    } catch {
      return null;
    }
  }, [route.params.specialist]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleResolve = useCallback(async (status: 'VERIFIED' | 'REJECTED') => {
    if (!specialist) return;
    const actionLabel = status === 'VERIFIED' ? 'verificar' : 'rechazar';
    const actionPast = status === 'VERIFIED' ? 'verificado' : 'rechazado';

    const message = `¿Estás seguro de que quieres ${actionLabel} a ${specialist.user.name}?${
      status === 'VERIFIED' ? '\n\nLa foto del carnet de colegiado se eliminará por cumplimiento RGPD.' : ''
    }`;

    const executeResolve = async () => {
      try {
        setProcessing(true);
        await adminService.resolveVerification(specialist.id, status);
        if (Platform.OS === 'web') {
          window.alert(`El especialista ha sido ${actionPast} correctamente.`);
          navigation.goBack();
        } else {
          Alert.alert(
            'Acción completada',
            `El especialista ha sido ${actionPast} correctamente.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (_err: unknown) {
        if (Platform.OS === 'web') {
          window.alert(`No se pudo ${actionLabel} al especialista. Inténtalo de nuevo.`);
        } else {
          Alert.alert('Error', `No se pudo ${actionLabel} al especialista. Inténtalo de nuevo.`);
        }
      } finally {
        setProcessing(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        executeResolve();
      }
    } else {
      Alert.alert(
        `${status === 'VERIFIED' ? 'Verificar' : 'Rechazar'} especialista`,
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: status === 'VERIFIED' ? 'Verificar' : 'Rechazar',
            style: status === 'REJECTED' ? 'destructive' : 'default',
            onPress: executeResolve,
          },
        ]
      );
    }
  }, [specialist, navigation]);

  // Guard: only admins
  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={48} color={heraLanding.textMuted} />
        <Text style={styles.errorText}>Acceso denegado</Text>
      </View>
    );
  }

  if (!specialist) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={heraLanding.warning} />
        <Text style={styles.errorText}>Datos del especialista no disponibles</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Processing overlay */}
      {processing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.overlayText}>Procesando...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Back header */}
        <TouchableOpacity
          style={styles.backHeader}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={heraLanding.primary} />
          <Text style={styles.backHeaderText}>Panel de Admin</Text>
        </TouchableOpacity>

        {/* Specialist Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {specialist.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pendiente</Text>
            </View>
          </View>

          <Text style={styles.specialistName}>{specialist.user.name}</Text>
          <Text style={styles.specialistEmail}>{specialist.user.email}</Text>

          <View style={styles.divider} />

          {/* Detail rows */}
          <View style={styles.detailsGrid}>
            <DetailRow
              icon="briefcase-outline"
              label="Especialización"
              value={specialist.specialization}
            />
            {specialist.colegiadoNumber && (
              <DetailRow
                icon="document-text-outline"
                label="N° Colegiado"
                value={specialist.colegiadoNumber}
              />
            )}
            <DetailRow
              icon="time-outline"
              label="Fecha de envío"
              value={formatDate(specialist.verificationSubmittedAt)}
            />
            <DetailRow
              icon="calendar-outline"
              label="Registro"
              value={formatDate(specialist.createdAt)}
            />
          </View>
        </View>

        {/* Carnet de colegiado Photo */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Foto del carnet de colegiado</Text>
          {specialist.dniPhotoUrl ? (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: specialist.dniPhotoUrl }}
                style={styles.dniPhoto}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="image-outline" size={48} color={heraLanding.textMuted} />
              <Text style={styles.noPhotoText}>No hay foto del carnet de colegiado disponible</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.rejectButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => handleResolve('REJECTED')}
          disabled={processing}
        >
          <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Rechazar</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.verifyButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => handleResolve('VERIFIED')}
          disabled={processing}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Verificar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>
        <Ionicons name={icon as any} size={18} color={heraLanding.primary} />
      </View>
      <View style={styles.detailRowContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 80, // space for action bar
    maxWidth: isDesktop ? 700 : undefined,
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
  errorText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Back header
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs,
  },
  backHeaderText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },

  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.primaryDark,
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
  specialistName: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  specialistEmail: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginVertical: spacing.lg,
  },

  // Details Grid
  detailsGrid: {
    width: '100%',
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailRowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRowContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.medium,
    marginTop: 1,
  },

  // Photo Section
  photoSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    marginBottom: spacing.md,
  },
  photoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  dniPhoto: {
    width: '100%',
    height: 400,
    backgroundColor: heraLanding.backgroundMuted,
  },
  noPhotoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  noPhotoText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textMuted,
    marginTop: spacing.sm,
  },

  // Action Bar - absolutely positioned to avoid ScrollView touch interception on web
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    zIndex: 10,
    ...shadows.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  verifyButton: {
    backgroundColor: heraLanding.success,
  },
  rejectButton: {
    backgroundColor: heraLanding.warning,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    marginTop: spacing.sm,
  },
});

export default AdminSpecialistDetailScreen;
