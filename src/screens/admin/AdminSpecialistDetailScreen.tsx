import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { heraLanding, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import type { PendingSpecialist, SpecialistFullDetail } from '../../services/adminService';
import { showAppAlert, useAppAlert } from '../../components/common/alert';

const getInsuranceStatusBadge = (status: SpecialistFullDetail['insuranceReviewStatus']) => {
  switch (status) {
    case 'APPROVED':
      return { label: 'Aprobada', color: heraLanding.success, bg: heraLanding.successLight };
    case 'PENDING':
      return { label: 'Pendiente', color: heraLanding.status.pending.text, bg: heraLanding.status.pending.bg };
    case 'REJECTED':
      return { label: 'Rechazada', color: heraLanding.status.cancelled.text, bg: heraLanding.status.cancelled.bg };
    default:
      return { label: 'No subida', color: heraLanding.textMuted, bg: heraLanding.backgroundMuted };
  }
};

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

export function AdminSpecialistDetailScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'AdminSpecialistDetail'>>();
  const { user } = useAuth();
  const appAlert = useAppAlert();
  const isAdmin = user?.isAdmin ?? false;

  const [processing, setProcessing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [detail, setDetail] = useState<SpecialistFullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [openingDocumentKey, setOpeningDocumentKey] = useState<string | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Parse specialist data from navigation params
  const specialist = useMemo<PendingSpecialist | null>(() => {
    try {
      return JSON.parse(route.params.specialist);
    } catch {
      return null;
    }
  }, [route.params.specialist]);

  useEffect(() => {
    if (!specialist?.id) {
      setDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const result = await adminService.getSpecialistDetail(specialist.id);
        if (isMounted) {
          setDetail(result);
        }
      } catch {
        if (isMounted) {
          setDetail(null);
        }
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [specialist?.id]);

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

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleOpenInsurance = useCallback(async () => {
    if (!specialist || openingDocumentKey === 'insurance') {
      return;
    }

    try {
      setOpeningDocumentKey('insurance');
      await adminService.openSpecialistInsuranceDocument(specialist.id);
    } catch {
      showAppAlert(appAlert, 'Error', 'No se pudo abrir la póliza del especialista.');
    } finally {
      setOpeningDocumentKey(null);
    }
  }, [openingDocumentKey, specialist]);

  const handleOpenCertificate = useCallback(async (
    certificateId: string,
    mimeType?: string | null
  ) => {
    if (!specialist) {
      return;
    }

    const documentKey = `certificate:${certificateId}`;
    if (openingDocumentKey === documentKey) {
      return;
    }

    try {
      setOpeningDocumentKey(documentKey);
      await adminService.openSpecialistCertificateDocument(specialist.id, certificateId, mimeType);
    } catch {
      showAppAlert(appAlert, 'Error', 'No se pudo abrir el certificado.');
    } finally {
      setOpeningDocumentKey(null);
    }
  }, [openingDocumentKey, specialist]);

  const handleReviewInsurance = useCallback(async (status: 'APPROVED' | 'REJECTED') => {
    if (!specialist || !detail?.insuranceUploaded) {
      return;
    }

    const actionLabel = status === 'APPROVED' ? 'aprobar' : 'rechazar';

    const executeReview = async () => {
      try {
        setProcessing(true);
        await adminService.reviewSpecialistInsuranceDocument(specialist.id, status);
        const refreshedDetail = await adminService.getSpecialistDetail(specialist.id);
        setDetail(refreshedDetail);

        showAppAlert(
          appAlert,
          'Revisión completada',
          `La póliza ha quedado ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
        );
      } catch {
        showAppAlert(appAlert, 'Error', `No se pudo ${actionLabel} la póliza.`);
      } finally {
        setProcessing(false);
      }
    };

    showAppAlert(appAlert,
      status === 'APPROVED' ? 'Aprobar póliza' : 'Rechazar póliza',
      `¿Quieres ${actionLabel} esta póliza?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: status === 'APPROVED' ? 'Aprobar' : 'Rechazar', onPress: () => void executeReview() },
      ]
    );
  }, [detail?.insuranceUploaded, specialist]);

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
        showAppAlert(appAlert,
          'Acción completada',
          `El especialista ha sido ${actionPast} correctamente.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch (_err: unknown) {
        showAppAlert(appAlert, 'Error', `No se pudo ${actionLabel} al especialista. Inténtalo de nuevo.`);
      } finally {
        setProcessing(false);
      }
    };

    showAppAlert(appAlert,
      `${status === 'VERIFIED' ? 'Verificar' : 'Rechazar'} especialista`,
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'VERIFIED' ? 'Verificar' : 'Rechazar',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: executeResolve,
        },
      ],
    );
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
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: specialist.dniPhotoUrl }}
                style={styles.dniPhoto}
                resizeMode="contain"
              />
              <View style={styles.photoHint}>
                <Ionicons name="expand-outline" size={16} color={heraLanding.primary} />
                <Text style={styles.photoHintText}>Toca para ampliar</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="image-outline" size={48} color={heraLanding.textMuted} />
              <Text style={styles.noPhotoText}>No hay foto del carnet de colegiado disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Documentación privada adicional</Text>

          {detailLoading ? (
            <View style={styles.noPhotoContainer}>
              <ActivityIndicator size="small" color={heraLanding.primary} />
              <Text style={styles.noPhotoText}>Cargando credenciales privadas...</Text>
            </View>
          ) : (
            <>
              {detail ? (
                <View style={styles.insuranceReviewSummary}>
                  <Text style={styles.insuranceReviewSummaryLabel}>Cobertura presencial</Text>
                  <View
                    style={[
                      styles.insuranceReviewBadge,
                      { backgroundColor: getInsuranceStatusBadge(detail.insuranceReviewStatus).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.insuranceReviewBadgeText,
                        { color: getInsuranceStatusBadge(detail.insuranceReviewStatus).color },
                      ]}
                    >
                      {getInsuranceStatusBadge(detail.insuranceReviewStatus).label}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.credentialCard}>
                <View style={styles.credentialCardHeader}>
                  <View style={styles.credentialCardIcon}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={heraLanding.primary} />
                  </View>
                  <View style={styles.credentialCardCopy}>
                    <Text style={styles.credentialCardTitle}>Póliza de responsabilidad civil</Text>
                    <Text style={styles.credentialCardDescription}>
                      {detail?.insuranceUploaded
                        ? detail.insuranceReviewStatus === 'APPROVED'
                          ? 'Aprobada. El especialista ya puede mostrar presencial.'
                          : detail.insuranceReviewStatus === 'REJECTED'
                            ? 'Rechazada. El especialista no muestra presencial al paciente.'
                            : 'Pendiente de revisión. La ubicación sigue oculta al paciente.'
                        : 'No hay póliza subida actualmente.'}
                    </Text>
                    {detail?.insuranceRejectedReason ? (
                      <Text style={styles.credentialCardMeta}>Motivo: {detail.insuranceRejectedReason}</Text>
                    ) : null}
                  </View>
                </View>

                {detail?.insuranceUploaded ? (
                  <View style={styles.reviewDocumentActions}>
                    <TouchableOpacity
                      style={styles.reviewDocumentButton}
                      onPress={() => void handleOpenInsurance()}
                      activeOpacity={0.8}
                    >
                      {openingDocumentKey === 'insurance' ? (
                        <ActivityIndicator size="small" color={heraLanding.primary} />
                      ) : (
                        <Ionicons name="eye-outline" size={18} color={heraLanding.primary} />
                      )}
                      <Text style={styles.reviewDocumentButtonText}>Abrir póliza</Text>
                    </TouchableOpacity>
                    <View style={styles.reviewDecisionRow}>
                      <TouchableOpacity
                        style={[styles.insuranceDecisionButton, styles.insuranceDecisionReject]}
                        onPress={() => void handleReviewInsurance('REJECTED')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.insuranceDecisionRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.insuranceDecisionButton, styles.insuranceDecisionApprove]}
                        onPress={() => void handleReviewInsurance('APPROVED')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.insuranceDecisionApproveText}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.credentialCard}>
                <View style={styles.credentialCardHeader}>
                  <View style={styles.credentialCardIcon}>
                    <Ionicons name="ribbon-outline" size={18} color={heraLanding.primary} />
                  </View>
                  <View style={styles.credentialCardCopy}>
                    <Text style={styles.credentialCardTitle}>Certificados y acreditaciones</Text>
                    <Text style={styles.credentialCardDescription}>
                      {detail?.certificates?.length
                        ? `${detail.certificates.length} documento(s) privado(s) disponible(s) para revisión.`
                        : 'No hay certificados privados asociados.'}
                    </Text>
                  </View>
                </View>

                {detail?.certificates?.length ? (
                  <View style={styles.certificateList}>
                    {detail.certificates.map((certificate) => (
                      <View key={certificate.id} style={styles.certificateRow}>
                        <View style={styles.certificateRowCopy}>
                          <Text style={styles.certificateName}>{certificate.name}</Text>
                          <Text style={styles.certificateMeta}>{certificate.issuer}</Text>
                          {certificate.validUntil ? (
                            <Text style={styles.certificateMeta}>
                              Válido hasta: {certificate.validUntil}
                            </Text>
                          ) : null}
                          {certificate.documentUploadedAt ? (
                            <Text style={styles.certificateMeta}>
                              Subido: {formatShortDate(certificate.documentUploadedAt)}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={styles.certificateAction}
                          onPress={() => void handleOpenCertificate(certificate.id, certificate.mimeType)}
                          activeOpacity={0.8}
                        >
                          {openingDocumentKey === `certificate:${certificate.id}` ? (
                            <ActivityIndicator size="small" color={heraLanding.primary} />
                          ) : (
                            <Ionicons name="eye-outline" size={18} color={heraLanding.primary} />
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
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

      {/* Fullscreen photo overlay */}
      {showPhotoModal && specialist.dniPhotoUrl && (
        <Pressable
          style={styles.photoModalOverlay}
          onPress={() => setShowPhotoModal(false)}
        >
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setShowPhotoModal(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: specialist.dniPhotoUrl }}
              style={{
                width: Math.min(windowWidth * 0.92, 900),
                height: windowHeight * 0.8,
              }}
              resizeMode="contain"
            />
          </Pressable>
        </Pressable>
      )}
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
    padding: spacing.md,
    ...shadows.md,
  },
  dniPhoto: {
    width: '100%',
    height: 500,
    backgroundColor: heraLanding.backgroundMuted,
    borderRadius: borderRadius.lg,
  },
  photoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  photoHintText: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },
  photoModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  photoModalClose: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 1001,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  insuranceReviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  insuranceReviewSummaryLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  insuranceReviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  insuranceReviewBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  credentialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  credentialCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  credentialCardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  credentialCardCopy: {
    flex: 1,
    gap: 2,
  },
  credentialCardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  credentialCardDescription: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },
  credentialCardMeta: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
  },
  reviewDocumentActions: {
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  reviewDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: heraLanding.primary,
    alignSelf: 'flex-start',
  },
  reviewDocumentButtonText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },
  reviewDecisionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insuranceDecisionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  insuranceDecisionApprove: {
    backgroundColor: heraLanding.successLight,
  },
  insuranceDecisionReject: {
    backgroundColor: heraLanding.status.cancelled.bg,
  },
  insuranceDecisionApproveText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.success,
    fontWeight: typography.fontWeights.semibold,
  },
  insuranceDecisionRejectText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.status.cancelled.text,
    fontWeight: typography.fontWeights.semibold,
  },
  certificateList: {
    gap: spacing.sm,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: heraLanding.backgroundMuted,
  },
  certificateRowCopy: {
    flex: 1,
    gap: 2,
  },
  certificateName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  certificateMeta: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
  },
  certificateAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
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
