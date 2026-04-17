import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { RootStackParamList } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import type { SpecialistFullDetail, AccountStatusType } from '../../services/adminService';

interface Props {
  route: RouteProp<RootStackParamList, 'SpecialistDetailAdmin'>;
  navigation: NavigationProp<RootStackParamList, 'SpecialistDetailAdmin'>;
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export function SpecialistDetailAdminScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const { specialistId } = route.params;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isTwoCol = windowWidth >= 768;
  const isWide = windowWidth >= 1024;

  const [specialist, setSpecialist] = useState<SpecialistFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Procesando...');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDniModal, setShowDniModal] = useState(false);

  const loadSpecialist = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getSpecialistDetail(specialistId);
      setSpecialist(data);
    } catch (_err: unknown) {
      setError('Error al cargar los datos del especialista');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [specialistId]);

  useEffect(() => {
    loadSpecialist();
  }, [loadSpecialist]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpecialist();
  }, [loadSpecialist]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ---- SUSPEND ----
  const handleSuspend = useCallback(async () => {
    if (!specialist || suspendReason.length < 10) return;
    setShowSuspendModal(false);
    setProcessingLabel('Suspendiendo cuenta...');
    setProcessing(true);
    try {
      await adminService.suspendSpecialist(specialist.id, suspendReason);
      setSuspendReason('');
      await loadSpecialist();
      showSuccess('Cuenta suspendida correctamente');
    } catch (_err: unknown) {
      setError('Error al suspender la cuenta. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [specialist, suspendReason, loadSpecialist]);

  // ---- REACTIVATE ----
  const handleReactivate = useCallback(async () => {
    if (!specialist) return;
    setShowReactivateModal(false);
    setProcessingLabel('Reactivando cuenta...');
    setProcessing(true);
    try {
      await adminService.reactivateSpecialist(specialist.id);
      await loadSpecialist();
      showSuccess('Cuenta reactivada correctamente');
    } catch (_err: unknown) {
      setError('Error al reactivar la cuenta. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [specialist, loadSpecialist]);

  // ---- DELETE ----
  const handleDelete = useCallback(async () => {
    if (!specialist || deleteConfirmText !== 'ELIMINAR') return;
    setShowDeleteStep2(false);
    setDeleteConfirmText('');
    setProcessingLabel('Eliminando cuenta...');
    setProcessing(true);
    try {
      await adminService.deleteSpecialist(specialist.id);
      await loadSpecialist();
      showSuccess('Cuenta eliminada correctamente');
    } catch (_err: unknown) {
      setError('Error al eliminar la cuenta. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [specialist, deleteConfirmText, loadSpecialist]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return { bg: heraLanding.status.confirmed.bg, text: heraLanding.status.confirmed.text, border: heraLanding.status.confirmed.border, label: 'Verificado', icon: 'shield-checkmark' as const };
      case 'PENDING':
        return { bg: heraLanding.status.pending.bg, text: heraLanding.status.pending.text, border: heraLanding.status.pending.border, label: 'Pendiente', icon: 'time' as const };
      case 'REJECTED':
        return { bg: heraLanding.status.cancelled.bg, text: heraLanding.status.cancelled.text, border: heraLanding.status.cancelled.border, label: 'Rechazado', icon: 'close-circle' as const };
      default:
        return { bg: '#F5F5F5', text: '#666', border: '#DDD', label: status, icon: 'help-circle' as const };
    }
  };

  const getAccountBadge = (status: AccountStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: heraLanding.status.confirmed.bg, text: heraLanding.success, border: heraLanding.status.confirmed.border, label: 'Activa', icon: 'checkmark-circle' as const };
      case 'SUSPENDED':
        return { bg: '#FFF3E0', text: '#F57C00', border: '#FFE082', label: 'Suspendida', icon: 'pause-circle' as const };
      case 'DELETED':
        return { bg: heraLanding.status.cancelled.bg, text: heraLanding.status.cancelled.text, border: heraLanding.status.cancelled.border, label: 'Eliminada', icon: 'trash' as const };
    }
  };

  // ---- GUARDS ----
  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={48} color={heraLanding.textMuted} />
        <Text style={styles.guardText}>Acceso denegado</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.guardText}>Cargando datos del especialista...</Text>
      </View>
    );
  }

  if (error && !specialist) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={heraLanding.warning} />
        <Text style={styles.guardText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSpecialist}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={heraLanding.primary} />
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!specialist) return null;

  const vBadge = getVerificationBadge(specialist.verificationStatus);
  const aBadge = getAccountBadge(specialist.user.accountStatus);

  // ============================================================
  // SECTION RENDERERS (shared between layouts)
  // ============================================================

  const renderHeaderCard = () => (
    <View style={styles.headerCard}>
      <SpecialistAvatar
        name={specialist.user.name}
        avatarUrl={specialist.user.avatar}
        size={isTwoCol ? 96 : 88}
      />
      <Text style={styles.headerName}>{specialist.user.name}</Text>
      <Text style={styles.headerEmail}>{specialist.user.email}</Text>
      {specialist.user.phone && (
        <Text style={styles.headerPhone}>{specialist.user.phone}</Text>
      )}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: vBadge.bg, borderColor: vBadge.border }]}>
          <Ionicons name={vBadge.icon} size={14} color={vBadge.text} />
          <Text style={[styles.badgeText, { color: vBadge.text }]}>{vBadge.label}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: aBadge.bg, borderColor: aBadge.border }]}>
          <Ionicons name={aBadge.icon} size={14} color={aBadge.text} />
          <Text style={[styles.badgeText, { color: aBadge.text }]}>{aBadge.label}</Text>
        </View>
      </View>
      <Text style={styles.headerJoinDate}>
        Miembro desde: {formatDate(specialist.user.createdAt)}
      </Text>
    </View>
  );

  const renderProfessionalInfo = () => (
    <>
      <Text style={styles.sectionTitle}>Información Profesional</Text>
      {specialist.description ? (
        <View style={styles.bioCard}>
          <Ionicons name="document-text-outline" size={20} color={heraLanding.primary} />
          <Text style={styles.bioText}>{specialist.description}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={20} color={heraLanding.textMuted} />
          <Text style={styles.emptyCardText}>Sin descripción profesional</Text>
        </View>
      )}
      <View style={styles.infoGrid}>
        <InfoCard icon="briefcase-outline" label="Especialización" value={specialist.specialization} />
        {specialist.professionalTitle && (
          <InfoCard icon="school-outline" label="Título" value={specialist.professionalTitle} />
        )}
        <InfoCard icon="cash-outline" label="Precio / sesión" value={`${specialist.pricePerSession}€`} />
        <InfoCard
          icon="globe-outline"
          label="Modalidades"
          value={[
            specialist.offersOnline ? 'Online' : null,
            specialist.offersInPerson ? 'Presencial' : null,
          ].filter(Boolean).join(' / ') || 'No especificado'}
        />
        {specialist.officeCity && (
          <InfoCard icon="location-outline" label="Ciudad" value={specialist.officeCity} />
        )}
        <InfoCard icon="eye-outline" label="Perfil visible" value={specialist.profileVisible ? 'Sí' : 'No'} />
      </View>
    </>
  );

  const renderStats = () => (
    <>
      <Text style={styles.sectionTitle}>Estadísticas</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total" value={specialist.sessionStats.total} icon="layers-outline" color={heraLanding.primary} bgColor={heraLanding.primaryMuted} />
        <StatCard label="Completadas" value={specialist.sessionStats.completed} icon="checkmark-circle-outline" color={heraLanding.success} bgColor={heraLanding.successLight} />
        <StatCard label="Canceladas" value={specialist.sessionStats.cancelled} icon="close-circle-outline" color={heraLanding.status.cancelled.text} bgColor={heraLanding.status.cancelled.bg} />
        <StatCard label="Próximas" value={specialist.sessionStats.upcoming} icon="time-outline" color={heraLanding.status.pending.text} bgColor={heraLanding.status.pending.bg} />
      </View>
      <View style={styles.ratingCard}>
        <View style={styles.ratingLeft}>
          <Text style={styles.ratingValue}>{specialist.rating.toFixed(1)}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(specialist.rating) ? 'star' : 'star-outline'}
                size={16}
                color={heraLanding.starRating}
              />
            ))}
          </View>
        </View>
        <View style={styles.ratingRight}>
          <Text style={styles.ratingCount}>{specialist.reviewCount}</Text>
          <Text style={styles.ratingLabel}>reseñas</Text>
        </View>
      </View>
    </>
  );

  const renderVerification = () => (
    <>
      <Text style={styles.sectionTitle}>Verificación</Text>
      <View style={styles.sectionCard}>
        <View style={styles.verificationHeader}>
          <View style={[styles.verificationStatusBig, { backgroundColor: vBadge.bg }]}>
            <Ionicons name={vBadge.icon} size={24} color={vBadge.text} />
            <Text style={[styles.verificationStatusText, { color: vBadge.text }]}>{vBadge.label}</Text>
          </View>
        </View>
        {specialist.colegiadoNumber && (
          <View style={styles.colegiadoBox}>
            <Text style={styles.colegiadoLabel}>N° Colegiado</Text>
            <Text style={styles.colegiadoValue}>{specialist.colegiadoNumber}</Text>
          </View>
        )}
        <View style={styles.timelineColumn}>
          <TimelineRow icon="mail-outline" label="Email" value={specialist.user.emailVerified === true ? 'Verificado' : 'No verificado'} color={specialist.user.emailVerified === true ? heraLanding.success : heraLanding.status.cancelled.text} />
          <TimelineRow icon="paper-plane-outline" label="Enviado" value={formatDateShort(specialist.verificationSubmittedAt)} />
          <TimelineRow icon="checkmark-done-outline" label="Resuelto" value={formatDateShort(specialist.verificationResolvedAt)} />
        </View>
        {specialist.dniPhotoUrl && (
          <TouchableOpacity style={styles.viewPhotoButton} onPress={() => setShowDniModal(true)}>
            <Ionicons name="image-outline" size={18} color={heraLanding.primary} />
            <Text style={styles.viewPhotoButtonText}>Ver carnet de colegiado</Text>
            <Ionicons name="chevron-forward" size={16} color={heraLanding.primary} />
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderActions = () => (
    <>
      <Text style={styles.sectionTitle}>Acciones de Cuenta</Text>
      <View style={styles.sectionCard}>
        {specialist.user.accountStatus === 'ACTIVE' && (
          <TouchableOpacity style={styles.actionButtonWarning} onPress={() => setShowSuspendModal(true)} activeOpacity={0.7}>
            <Ionicons name="pause-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonWhiteText}>Suspender cuenta</Text>
          </TouchableOpacity>
        )}
        {specialist.user.accountStatus === 'SUSPENDED' && (
          <>
            <View style={styles.suspensionBox}>
              <View style={styles.suspensionBoxHeader}>
                <Ionicons name="information-circle" size={18} color="#F57C00" />
                <Text style={styles.suspensionBoxTitle}>Cuenta suspendida</Text>
              </View>
              <Text style={styles.suspensionBoxReason}>
                {specialist.user.suspensionReason || 'Sin razón registrada'}
              </Text>
            </View>
            <TouchableOpacity style={styles.actionButtonSuccess} onPress={() => setShowReactivateModal(true)} activeOpacity={0.7}>
              <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonWhiteText}>Reactivar cuenta</Text>
            </TouchableOpacity>
          </>
        )}
        {specialist.user.accountStatus !== 'DELETED' && (
          <View style={styles.dangerZone}>
            <View style={styles.dangerDivider} />
            <TouchableOpacity style={styles.actionButtonDanger} onPress={() => setShowDeleteStep1(true)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={heraLanding.status.cancelled.text} />
              <Text style={styles.actionButtonDangerText}>Eliminar cuenta permanentemente</Text>
            </TouchableOpacity>
          </View>
        )}
        {specialist.user.accountStatus === 'DELETED' && (
          <View style={styles.deletedNotice}>
            <Ionicons name="warning-outline" size={20} color={heraLanding.status.cancelled.text} />
            <Text style={styles.deletedNoticeText}>
              Esta cuenta fue eliminada el {formatDate(specialist.user.deletedAt)}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>
      {/* Processing overlay */}
      {processing && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={heraLanding.primary} />
            <Text style={styles.overlayText}>{processingLabel}</Text>
          </View>
        </View>
      )}

      {/* Success toast */}
      {successMessage && (
        <View style={[styles.successToast, isWide && { maxWidth: 500 }]}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.successToastText}>{successMessage}</Text>
        </View>
      )}

      {/* Error banner */}
      {error && specialist && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)}>
          <Ionicons name="alert-circle" size={18} color={heraLanding.status.cancelled.text} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Ionicons name="close" size={16} color={heraLanding.status.cancelled.text} />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isWide && { maxWidth: 1100, alignSelf: 'center' as const, width: '100%' as any },
          isTwoCol && !isWide && { maxWidth: 900, alignSelf: 'center' as const, width: '100%' as any },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={heraLanding.primary}
            colors={[heraLanding.primary]}
          />
        }
      >
        {/* Back header (always full width) */}
        <TouchableOpacity
          style={styles.backHeader}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={heraLanding.primary} />
          <Text style={styles.backHeaderText}>Gestión de Especialistas</Text>
        </TouchableOpacity>

        {isTwoCol ? (
          /* ======================================================== */
          /* TWO-COLUMN LAYOUT (tablet/desktop)                       */
          /* ======================================================== */
          <View style={styles.twoColWrapper}>
            {/* LEFT COLUMN - 60% */}
            <View style={styles.leftColumn}>
              {renderHeaderCard()}
              {renderProfessionalInfo()}
            </View>

            {/* RIGHT COLUMN - 40% */}
            <View style={styles.rightColumn}>
              {renderStats()}
              {renderVerification()}
              {renderActions()}
            </View>
          </View>
        ) : (
          /* ======================================================== */
          /* SINGLE-COLUMN LAYOUT (mobile)                            */
          /* ======================================================== */
          <>
            {renderHeaderCard()}
            {renderStats()}
            {renderProfessionalInfo()}
            {renderVerification()}
            {renderActions()}
          </>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* MODALS (unchanged)                                           */}
      {/* ============================================================ */}

      {/* SUSPEND MODAL */}
      <Modal visible={showSuspendModal} transparent animationType="fade" onRequestClose={() => setShowSuspendModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="pause-circle" size={28} color="#F57C00" />
              </View>
            </View>
            <Text style={styles.modalTitle}>Suspender cuenta de {specialist.user.name}</Text>
            <Text style={styles.modalDescription}>
              Su perfil dejará de ser visible y no podrá acceder a la plataforma hasta que se reactive.
            </Text>
            <Text style={styles.modalLabel}>Motivo de suspensión (mínimo 10 caracteres)</Text>
            <TextInput
              style={styles.modalInputMultiline}
              placeholder="Describe la razón de la suspensión..."
              placeholderTextColor={heraLanding.textMuted}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.modalCharCount}>
              {suspendReason.length}/500
              {suspendReason.length > 0 && suspendReason.length < 10 && (
                <Text style={{ color: heraLanding.warning }}> — mínimo 10 caracteres</Text>
              )}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { setShowSuspendModal(false); setSuspendReason(''); }}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonWarning, suspendReason.length < 10 && styles.modalButtonDisabled]}
                onPress={handleSuspend}
                disabled={suspendReason.length < 10}
              >
                <Text style={styles.modalButtonWhiteText}>Confirmar suspensión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REACTIVATE MODAL */}
      <Modal visible={showReactivateModal} transparent animationType="fade" onRequestClose={() => setShowReactivateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: heraLanding.successLight }]}>
                <Ionicons name="play-circle" size={28} color={heraLanding.success} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Reactivar cuenta de {specialist.user.name}</Text>
            {specialist.user.suspensionReason && (
              <View style={styles.modalContextBox}>
                <Text style={styles.modalContextLabel}>Razón de suspensión:</Text>
                <Text style={styles.modalContextText}>{specialist.user.suspensionReason}</Text>
              </View>
            )}
            <Text style={styles.modalDescription}>
              Su perfil volverá a ser visible y podrá acceder a la plataforma con normalidad.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowReactivateModal(false)}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSuccess} onPress={handleReactivate}>
                <Text style={styles.modalButtonWhiteText}>Reactivar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE STEP 1 MODAL */}
      <Modal visible={showDeleteStep1} transparent animationType="fade" onRequestClose={() => setShowDeleteStep1(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: heraLanding.status.cancelled.bg }]}>
                <Ionicons name="warning" size={28} color={heraLanding.status.cancelled.text} />
              </View>
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Eliminar cuenta de {specialist.user.name}</Text>
            <View style={styles.dangerBanner}>
              <Ionicons name="alert-circle" size={16} color={heraLanding.status.cancelled.text} />
              <Text style={styles.dangerBannerText}>Esta acción NO se puede deshacer</Text>
            </View>
            <Text style={styles.modalDescription}>Consecuencias:</Text>
            <View style={styles.consequenceList}>
              <ConsequenceItem text="Se cancelarán todas sus sesiones futuras" />
              <ConsequenceItem text="Los clientes afectados serán notificados" />
              <ConsequenceItem text="Su perfil dejará de ser visible" />
              <ConsequenceItem text="La cuenta se marcará como eliminada" />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowDeleteStep1(false)}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonDanger} onPress={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>
                <Text style={styles.modalButtonWhiteText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE STEP 2 MODAL */}
      <Modal visible={showDeleteStep2} transparent animationType="fade" onRequestClose={() => { setShowDeleteStep2(false); setDeleteConfirmText(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: heraLanding.status.cancelled.bg }]}>
                <Ionicons name="trash" size={28} color={heraLanding.status.cancelled.text} />
              </View>
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Confirmación final</Text>
            <Text style={styles.modalDescription}>
              Escribe <Text style={{ fontWeight: typography.fontWeights.bold }}>ELIMINAR</Text> para confirmar la eliminación permanente de esta cuenta.
            </Text>
            <TextInput
              style={styles.modalInputSingle}
              placeholder="Escribe ELIMINAR para confirmar"
              placeholderTextColor={heraLanding.textMuted}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { setShowDeleteStep2(false); setDeleteConfirmText(''); }}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonDanger, deleteConfirmText !== 'ELIMINAR' && styles.modalButtonDisabled]}
                onPress={handleDelete}
                disabled={deleteConfirmText !== 'ELIMINAR'}
              >
                <Text style={styles.modalButtonWhiteText}>Eliminar permanentemente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DNI PHOTO - fullscreen dark overlay */}
      {showDniModal && specialist.dniPhotoUrl && (
        <Pressable
          style={styles.dniModalOverlay}
          onPress={() => setShowDniModal(false)}
        >
          <View style={styles.dniModalTopBar}>
            <Text style={styles.dniModalTitle}>Carnet de Colegiado</Text>
            <TouchableOpacity
              onPress={() => setShowDniModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.dniModalCloseButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: specialist.dniPhotoUrl }}
              style={{
                width: Math.min(windowWidth * 0.92, 900),
                height: windowHeight * 0.78,
              }}
              resizeMode="contain"
            />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SpecialistAvatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: heraLanding.primaryMuted,
        }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarFallbackText, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Ionicons name={icon as any} size={20} color={heraLanding.primary} />
      </View>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, color, bgColor }: { label: string; value: number; icon: string; color: string; bgColor: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TimelineRow({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={styles.timelineRowItem}>
      <Ionicons name={icon as any} size={16} color={color || heraLanding.textSecondary} />
      <Text style={styles.timelineRowLabel}>{label}</Text>
      <Text style={[styles.timelineRowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

function ConsequenceItem({ text }: { text: string }) {
  return (
    <View style={styles.consequenceItem}>
      <Ionicons name="remove-circle" size={16} color={heraLanding.status.cancelled.text} />
      <Text style={styles.consequenceText}>{text}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    paddingBottom: spacing.xxxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  guardText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  backLinkText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // Back header
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  backHeaderText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // ============================================================
  // TWO-COLUMN LAYOUT
  // ============================================================
  twoColWrapper: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 6, // 60%
  },
  rightColumn: {
    flex: 4, // 40%
  },

  // Processing overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  overlayText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },

  // Success toast
  successToast: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: heraLanding.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 99,
    alignSelf: 'center',
    ...shadows.md,
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    flex: 1,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.status.cancelled.bg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.status.cancelled.border,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: heraLanding.status.cancelled.text,
    fontWeight: typography.fontWeights.medium,
  },

  // ============================================================
  // HEADER CARD
  // ============================================================
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  avatarFallback: {
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: heraLanding.primaryMuted,
  },
  avatarFallbackText: {
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.primaryDark,
  },
  headerName: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  headerEmail: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    marginTop: spacing.xs,
  },
  headerPhone: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  headerJoinDate: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: spacing.md,
  },

  // ============================================================
  // STATS
  // ============================================================
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '45%' as any,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },

  // Rating card
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  ratingLeft: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    fontSize: typography.fontSizes.xxxxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingRight: {
    alignItems: 'center',
  },
  ratingCount: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
  },
  ratingLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
  },

  // ============================================================
  // PROFESSIONAL INFO
  // ============================================================
  bioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  bioText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  emptyCardText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textMuted,
    fontStyle: 'italic',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  infoCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '45%' as any,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoCardLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },

  // ============================================================
  // SECTIONS
  // ============================================================
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    ...shadows.md,
  },

  // ============================================================
  // VERIFICATION
  // ============================================================
  verificationHeader: {
    alignItems: 'center',
  },
  verificationStatusBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  verificationStatusText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  colegiadoBox: {
    backgroundColor: heraLanding.backgroundMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  colegiadoLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colegiadoValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  // Vertical timeline (works better in narrow right column)
  timelineColumn: {
    gap: spacing.sm,
  },
  timelineRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineRowLabel: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textMuted,
    width: 60,
  },
  timelineRowValue: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  viewPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: heraLanding.primary,
    borderRadius: borderRadius.lg,
    alignSelf: 'center',
  },
  viewPhotoButtonText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },

  // ============================================================
  // ACCOUNT ACTIONS
  // ============================================================
  actionButtonWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#F57C00',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    minHeight: 48,
  },
  actionButtonSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.success,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    minHeight: 48,
  },
  actionButtonWhiteText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  dangerZone: {
    marginTop: spacing.sm,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginBottom: spacing.md,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: heraLanding.status.cancelled.border,
    minHeight: 48,
  },
  actionButtonDangerText: {
    color: heraLanding.status.cancelled.text,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  suspensionBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  suspensionBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suspensionBoxTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: '#F57C00',
  },
  suspensionBoxReason: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    lineHeight: 20,
    marginLeft: spacing.xl + spacing.xs,
  },
  deletedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.status.cancelled.bg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: heraLanding.status.cancelled.border,
  },
  deletedNoticeText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: heraLanding.status.cancelled.text,
    fontWeight: typography.fontWeights.medium,
  },

  // ============================================================
  // MODALS
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    ...shadows.lg,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInputMultiline: {
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalInputSingle: {
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: typography.fontWeights.bold,
  },
  modalCharCount: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  modalContextBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  modalContextLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: '#F57C00',
    marginBottom: spacing.xs,
  },
  modalContextText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: heraLanding.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancelText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textSecondary,
  },
  modalButtonWarning: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F57C00',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonSuccess: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: heraLanding.success,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonDanger: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: heraLanding.status.cancelled.text,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonWhiteText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },

  // Danger banner (delete step 1)
  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: heraLanding.status.cancelled.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: heraLanding.status.cancelled.border,
  },
  dangerBannerText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.status.cancelled.text,
  },
  consequenceList: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consequenceText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    flex: 1,
  },

  // DNI fullscreen overlay
  dniModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dniModalTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    zIndex: 10,
  },
  dniModalTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  dniModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SpecialistDetailAdminScreen;
