import React, { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button } from '../../components/common';
import { useAppAlert } from '../../components/common/alert';
import { borderRadius, shadows, spacing, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { RootStackParamList } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as adminService from '../../services/adminService';
import type { AccountStatusType, SpecialistFullDetail } from '../../services/adminService';

type IconName = ComponentProps<typeof Ionicons>['name'];
type DetailStyles = ReturnType<typeof createStyles>;

interface Props {
  route: RouteProp<RootStackParamList, 'SpecialistDetailAdmin'>;
  navigation: NavigationProp<RootStackParamList, 'SpecialistDetailAdmin'>;
}

interface BadgeTone {
  label: string;
  icon: IconName;
  bg: string;
  text: string;
  border: string;
}

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
};

const formatDate = (dateStr: string | null, long = true) => {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
  }).format(date);
};

const getInsuranceStatusBadge = (
  status: SpecialistFullDetail['insuranceReviewStatus'],
  theme: Theme,
): Omit<BadgeTone, 'icon'> => {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Aprobada',
        bg: theme.status.confirmed.bg,
        text: theme.status.confirmed.text,
        border: theme.status.confirmed.border,
      };
    case 'PENDING':
      return {
        label: 'Pendiente',
        bg: theme.status.pending.bg,
        text: theme.status.pending.text,
        border: theme.status.pending.border,
      };
    case 'REJECTED':
      return {
        label: 'Rechazada',
        bg: theme.status.cancelled.bg,
        text: theme.status.cancelled.text,
        border: theme.status.cancelled.border,
      };
    default:
      return {
        label: 'No subida',
        bg: theme.bgMuted,
        text: theme.textMuted,
        border: theme.border,
      };
  }
};

const getVerificationBadge = (status: string, theme: Theme): BadgeTone => {
  switch (status) {
    case 'VERIFIED':
      return {
        bg: theme.status.confirmed.bg,
        text: theme.status.confirmed.text,
        border: theme.status.confirmed.border,
        label: 'Verificado',
        icon: 'shield-checkmark',
      };
    case 'PENDING':
      return {
        bg: theme.status.pending.bg,
        text: theme.status.pending.text,
        border: theme.status.pending.border,
        label: 'Pendiente',
        icon: 'time',
      };
    case 'REJECTED':
      return {
        bg: theme.status.cancelled.bg,
        text: theme.status.cancelled.text,
        border: theme.status.cancelled.border,
        label: 'Rechazado',
        icon: 'close-circle',
      };
    default:
      return {
        bg: theme.bgMuted,
        text: theme.textSecondary,
        border: theme.border,
        label: status,
        icon: 'help-circle',
      };
  }
};

const getAccountBadge = (status: AccountStatusType, theme: Theme): BadgeTone => {
  switch (status) {
    case 'ACTIVE':
      return {
        bg: theme.status.confirmed.bg,
        text: theme.status.confirmed.text,
        border: theme.status.confirmed.border,
        label: 'Activa',
        icon: 'checkmark-circle',
      };
    case 'SUSPENDED':
      return {
        bg: theme.warningBg,
        text: theme.warning,
        border: theme.warning,
        label: 'Suspendida',
        icon: 'pause-circle',
      };
    case 'DELETED':
      return {
        bg: theme.status.cancelled.bg,
        text: theme.status.cancelled.text,
        border: theme.status.cancelled.border,
        label: 'Bloqueada',
        icon: 'trash',
      };
  }
};

export function SpecialistDetailAdminScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const appAlert = useAppAlert();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { specialistId } = route.params;
  const isAdmin = user?.isAdmin ?? false;
  const isTwoCol = windowWidth >= 768;
  const isWide = windowWidth >= 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isTwoCol, isWide), [theme, isDark, isTwoCol, isWide]);

  const [specialist, setSpecialist] = useState<SpecialistFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Procesando...');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDniModal, setShowDniModal] = useState(false);
  const [openingDocumentKey, setOpeningDocumentKey] = useState<string | null>(null);

  const loadSpecialist = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

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
  }, [isAdmin, specialistId]);

  useEffect(() => {
    loadSpecialist();
  }, [loadSpecialist]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpecialist();
  }, [loadSpecialist]);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleOpenInsurance = useCallback(async () => {
    if (!specialist || openingDocumentKey === 'insurance') return;

    try {
      setOpeningDocumentKey('insurance');
      await adminService.openSpecialistInsuranceDocument(specialist.id);
    } catch {
      setError('No se pudo abrir la póliza del especialista.');
    } finally {
      setOpeningDocumentKey(null);
    }
  }, [openingDocumentKey, specialist]);

  const handleOpenCertificate = useCallback(async (
    certificateId: string,
    mimeType?: string | null,
  ) => {
    if (!specialist) return;

    const key = `certificate:${certificateId}`;
    if (openingDocumentKey === key) return;

    try {
      setOpeningDocumentKey(key);
      await adminService.openSpecialistCertificateDocument(specialist.id, certificateId, mimeType);
    } catch {
      setError('No se pudo abrir el certificado.');
    } finally {
      setOpeningDocumentKey(null);
    }
  }, [openingDocumentKey, specialist]);

  const handleReviewInsurance = useCallback(async (status: 'APPROVED' | 'REJECTED') => {
    if (!specialist || !specialist.insuranceUploaded) return;

    const approving = status === 'APPROVED';
    const confirmed = await appAlert.confirm({
      title: approving ? '¿Aprobar póliza?' : '¿Rechazar póliza?',
      message: approving
        ? 'La cobertura presencial quedará aprobada y el especialista podrá mostrar modalidad presencial cuando el resto de condiciones lo permita.'
        : 'La cobertura presencial quedará rechazada y la ubicación presencial seguirá oculta al paciente.',
      confirmLabel: approving ? 'Aprobar' : 'Rechazar',
      cancelLabel: 'Cancelar',
      tone: approving ? 'success' : 'danger',
      destructive: !approving,
      dismissible: true,
    });

    if (!confirmed) return;

    setProcessingLabel(status === 'APPROVED' ? 'Aprobando póliza...' : 'Rechazando póliza...');
    setProcessing(true);
    try {
      await adminService.reviewSpecialistInsuranceDocument(specialist.id, status);
      await loadSpecialist();
      showSuccess(`Póliza ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} correctamente`);
    } catch {
      setError(`No se pudo ${status === 'APPROVED' ? 'aprobar' : 'rechazar'} la póliza.`);
    } finally {
      setProcessing(false);
    }
  }, [appAlert, loadSpecialist, showSuccess, specialist]);

  const handleSuspend = useCallback(async () => {
    if (!specialist || suspendReason.trim().length < 10) return;

    const reason = suspendReason.trim();
    const confirmed = await appAlert.confirm({
      title: '¿Suspender cuenta?',
      message: `El perfil dejará de ser visible y el especialista no podrá acceder a la plataforma hasta su reactivación.\n\nMotivo registrado: ${reason}`,
      confirmLabel: 'Suspender',
      cancelLabel: 'Cancelar',
      tone: 'warning',
      destructive: true,
      dismissible: true,
    });

    if (!confirmed) return;

    setShowSuspendModal(false);
    setProcessingLabel('Suspendiendo cuenta...');
    setProcessing(true);
    try {
      await adminService.suspendSpecialist(specialist.id, reason);
      setSuspendReason('');
      await loadSpecialist();
      showSuccess('Cuenta suspendida correctamente');
    } catch (_err: unknown) {
      setError('Error al suspender la cuenta. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [appAlert, loadSpecialist, showSuccess, specialist, suspendReason]);

  const handleReactivate = useCallback(async () => {
    if (!specialist) return;

    const confirmed = await appAlert.confirm({
      title: '¿Reactivar cuenta?',
      message: 'El especialista volverá a poder acceder a la plataforma y su perfil podrá mostrarse de nuevo según su configuración actual.',
      confirmLabel: 'Reactivar',
      cancelLabel: 'Cancelar',
      tone: 'success',
      dismissible: true,
    });

    if (!confirmed) return;

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
  }, [appAlert, loadSpecialist, showSuccess, specialist]);

  const handleDelete = useCallback(async () => {
    if (!specialist || deleteConfirmText !== 'BLOQUEAR') return;

    const confirmed = await appAlert.confirm({
      title: 'Confirmar bloqueo legal',
      message: 'Esta acción revocará el acceso, ocultará el perfil, cancelará sesiones futuras, minimizará datos no necesarios y conservará bloqueados solo los datos sujetos a obligación legal, fiscal o reclamaciones.',
      confirmLabel: 'Bloquear',
      cancelLabel: 'Cancelar',
      tone: 'danger',
      destructive: true,
      dismissible: true,
    });

    if (!confirmed) return;

    setShowDeleteStep2(false);
    setDeleteConfirmText('');
    setProcessingLabel('Bloqueando cuenta...');
    setProcessing(true);
    try {
      await adminService.blockSpecialistForLegalRetention(specialist.id);
      await loadSpecialist();
      showSuccess('Cuenta bloqueada correctamente');
    } catch (_err: unknown) {
      setError('Error al bloquear la cuenta. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [appAlert, deleteConfirmText, loadSpecialist, showSuccess, specialist]);

  const requestDeleteFlow = useCallback(async () => {
    const confirmed = await appAlert.confirm({
      title: '¿Iniciar bloqueo legal?',
      message: 'Vas a iniciar un flujo irreversible a nivel operativo. Se desactivará el acceso y se bloquearán los datos necesarios para obligaciones legales, fiscales o reclamaciones.',
      confirmLabel: 'Iniciar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
      destructive: true,
      dismissible: true,
    });

    if (confirmed) {
      setShowDeleteStep1(true);
    }
  }, [appAlert]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <StateIcon icon="shield-outline" styles={styles} color={theme.textMuted} />
        <Text style={styles.guardText}>Acceso denegado</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.guardText}>Cargando datos del especialista...</Text>
      </View>
    );
  }

  if (error && !specialist) {
    return (
      <View style={styles.centered}>
        <StateIcon icon="alert-circle-outline" styles={styles} color={theme.warning} />
        <Text style={styles.guardText}>{error}</Text>
        <Button variant="primary" size="medium" onPress={loadSpecialist}>
          Reintentar
        </Button>
        <AnimatedPressable style={styles.backLink} onPress={() => navigation.goBack()} pressScale={0.98}>
          <Ionicons name="arrow-back" size={16} color={theme.primary} />
          <Text style={styles.backLinkText}>Volver</Text>
        </AnimatedPressable>
      </View>
    );
  }

  if (!specialist) return null;

  const verificationBadge = getVerificationBadge(specialist.verificationStatus, theme);
  const accountBadge = getAccountBadge(specialist.user.accountStatus, theme);
  const insuranceBadge = getInsuranceStatusBadge(specialist.insuranceReviewStatus, theme);

  const renderHeaderCard = () => (
    <View style={styles.headerCard}>
      <SpecialistAvatar
        name={specialist.user.name}
        avatarUrl={specialist.user.avatar}
        size={isTwoCol ? 92 : 82}
        styles={styles}
        theme={theme}
      />
      <Text style={styles.headerName}>{specialist.user.name}</Text>
      <Text style={styles.headerEmail}>{specialist.user.email}</Text>
      {specialist.user.phone ? <Text style={styles.headerPhone}>{specialist.user.phone}</Text> : null}
      <View style={styles.badgeRow}>
        <StatusBadge tone={verificationBadge} styles={styles} />
        <StatusBadge tone={accountBadge} styles={styles} />
      </View>
      <Text style={styles.headerJoinDate}>
        Miembro desde: {formatDate(specialist.user.createdAt)}
      </Text>
    </View>
  );

  const renderProfessionalInfo = () => (
    <>
      <Text style={styles.sectionTitle}>Información profesional</Text>
      {specialist.description ? (
        <View style={styles.bioCard}>
          <Ionicons name="document-text-outline" size={20} color={theme.primary} />
          <Text style={styles.bioText}>{specialist.description}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={20} color={theme.textMuted} />
          <Text style={styles.emptyCardText}>Sin descripción profesional</Text>
        </View>
      )}
      <View style={styles.infoGrid}>
        <InfoCard icon="briefcase-outline" label="Especialización" value={specialist.specialization} styles={styles} theme={theme} />
        {specialist.professionalTitle ? (
          <InfoCard icon="school-outline" label="Título" value={specialist.professionalTitle} styles={styles} theme={theme} />
        ) : null}
        <InfoCard icon="cash-outline" label="Precio / sesión" value={`${specialist.pricePerSession}€`} styles={styles} theme={theme} />
        <InfoCard
          icon="globe-outline"
          label="Modalidades"
          value={[
            specialist.offersOnline ? 'Online' : null,
            specialist.offersInPerson ? 'Presencial' : null,
          ].filter(Boolean).join(' / ') || 'No especificado'}
          styles={styles}
          theme={theme}
        />
        {specialist.officeCity ? (
          <InfoCard icon="location-outline" label="Ciudad" value={specialist.officeCity} styles={styles} theme={theme} />
        ) : null}
        <InfoCard icon="eye-outline" label="Perfil visible" value={specialist.profileVisible ? 'Sí' : 'No'} styles={styles} theme={theme} />
      </View>
    </>
  );

  const renderStats = () => (
    <>
      <Text style={styles.sectionTitle}>Estadísticas</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total" value={specialist.sessionStats.total} icon="layers-outline" color={theme.primary} bgColor={theme.primaryAlpha12} styles={styles} />
        <StatCard label="Completadas" value={specialist.sessionStats.completed} icon="checkmark-circle-outline" color={theme.success} bgColor={theme.successBg} styles={styles} />
        <StatCard label="Canceladas" value={specialist.sessionStats.cancelled} icon="close-circle-outline" color={theme.status.cancelled.text} bgColor={theme.status.cancelled.bg} styles={styles} />
        <StatCard label="Próximas" value={specialist.sessionStats.upcoming} icon="time-outline" color={theme.status.pending.text} bgColor={theme.status.pending.bg} styles={styles} />
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
                color={theme.starRating}
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
          <StatusBadge tone={verificationBadge} styles={styles} large />
        </View>
        {specialist.colegiadoNumber ? (
          <View style={styles.colegiadoBox}>
            <Text style={styles.colegiadoLabel}>N.º colegiado</Text>
            <Text style={styles.colegiadoValue}>{specialist.colegiadoNumber}</Text>
          </View>
        ) : null}
        <View style={styles.timelineColumn}>
          <TimelineRow
            icon="mail-outline"
            label="Email"
            value={specialist.user.emailVerified === true ? 'Verificado' : 'No verificado'}
            color={specialist.user.emailVerified === true ? theme.success : theme.status.cancelled.text}
            styles={styles}
            theme={theme}
          />
          <TimelineRow icon="paper-plane-outline" label="Enviado" value={formatDate(specialist.verificationSubmittedAt, false)} styles={styles} theme={theme} />
          <TimelineRow icon="checkmark-done-outline" label="Resuelto" value={formatDate(specialist.verificationResolvedAt, false)} styles={styles} theme={theme} />
        </View>
        {specialist.dniPhotoUrl ? (
          <AnimatedPressable style={styles.viewPhotoButton} onPress={() => setShowDniModal(true)} pressScale={0.98}>
            <Ionicons name="image-outline" size={18} color={theme.primary} />
            <Text style={styles.viewPhotoButtonText}>Ver carnet de colegiado</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </AnimatedPressable>
        ) : null}

        <View style={styles.credentialReviewBox}>
          <Text style={styles.credentialReviewTitle}>Documentación privada</Text>
          <View style={styles.insuranceReviewSummary}>
            <Text style={styles.insuranceReviewSummaryLabel}>Cobertura presencial</Text>
            <View style={[styles.insuranceReviewBadge, { backgroundColor: insuranceBadge.bg, borderColor: insuranceBadge.border }]}>
              <Text style={[styles.insuranceReviewBadgeText, { color: insuranceBadge.text }]}>
                {insuranceBadge.label}
              </Text>
            </View>
          </View>

          <View style={styles.credentialReviewCard}>
            <View style={styles.credentialReviewCopy}>
              <Text style={styles.credentialReviewLabel}>Póliza de responsabilidad civil</Text>
              <Text style={styles.credentialReviewValue}>
                {specialist.insuranceUploaded
                  ? specialist.insuranceReviewStatus === 'APPROVED'
                    ? 'Aprobada. El especialista ya puede mostrar presencial.'
                    : specialist.insuranceReviewStatus === 'REJECTED'
                      ? 'Rechazada. El especialista no muestra presencial al paciente.'
                      : 'Pendiente de revisión. La ubicación sigue oculta al paciente.'
                  : 'No subida'}
              </Text>
              {specialist.insuranceRejectedReason ? (
                <Text style={styles.credentialReviewMeta}>Motivo: {specialist.insuranceRejectedReason}</Text>
              ) : null}
            </View>
            {specialist.insuranceUploaded ? (
              <View style={styles.credentialReviewActions}>
                <IconButton
                  icon="eye-outline"
                  label="Abrir póliza"
                  loading={openingDocumentKey === 'insurance'}
                  onPress={() => void handleOpenInsurance()}
                  styles={styles}
                  theme={theme}
                />
                <View style={styles.credentialReviewDecisionRow}>
                  <PillAction label="Rechazar" tone="danger" onPress={() => void handleReviewInsurance('REJECTED')} styles={styles} theme={theme} />
                  <PillAction label="Aprobar" tone="success" onPress={() => void handleReviewInsurance('APPROVED')} styles={styles} theme={theme} />
                </View>
              </View>
            ) : null}
          </View>

          {specialist.certificates.length ? (
            <View style={styles.credentialReviewList}>
              {specialist.certificates.map((certificate) => (
                <View key={certificate.id} style={styles.credentialReviewCard}>
                  <View style={styles.credentialReviewCopy}>
                    <Text style={styles.credentialReviewLabel}>{certificate.name}</Text>
                    <Text style={styles.credentialReviewMeta}>{certificate.issuer}</Text>
                    {certificate.validUntil ? (
                      <Text style={styles.credentialReviewMeta}>Válido hasta: {certificate.validUntil}</Text>
                    ) : null}
                    {certificate.documentUploadedAt ? (
                      <Text style={styles.credentialReviewMeta}>
                        Subido: {formatDate(certificate.documentUploadedAt, false)}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton
                    icon="eye-outline"
                    label="Abrir certificado"
                    loading={openingDocumentKey === `certificate:${certificate.id}`}
                    onPress={() => void handleOpenCertificate(certificate.id, certificate.mimeType)}
                    styles={styles}
                    theme={theme}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.credentialReviewEmpty}>No hay certificados privados asociados.</Text>
          )}
        </View>
      </View>
    </>
  );

  const renderActions = () => (
    <>
      <Text style={styles.sectionTitle}>Acciones de cuenta</Text>
      <View style={styles.sectionCard}>
        {specialist.user.accountStatus === 'ACTIVE' ? (
          <AccountAction icon="pause-circle-outline" label="Suspender cuenta" tone="warning" onPress={() => setShowSuspendModal(true)} styles={styles} theme={theme} />
        ) : null}
        {specialist.user.accountStatus === 'SUSPENDED' ? (
          <>
            <View style={styles.suspensionBox}>
              <View style={styles.suspensionBoxHeader}>
                <Ionicons name="information-circle" size={18} color={theme.warning} />
                <Text style={styles.suspensionBoxTitle}>Cuenta suspendida</Text>
              </View>
              <Text style={styles.suspensionBoxReason}>
                {specialist.user.suspensionReason || 'Sin razón registrada'}
              </Text>
            </View>
            <AccountAction icon="play-circle-outline" label="Reactivar cuenta" tone="success" onPress={() => setShowReactivateModal(true)} styles={styles} theme={theme} />
          </>
        ) : null}
        {specialist.user.accountStatus !== 'DELETED' ? (
          <View style={styles.dangerZone}>
            <View style={styles.dangerDivider} />
            <AccountAction icon="trash-outline" label="Bloquear cuenta legalmente" tone="danger" onPress={() => void requestDeleteFlow()} styles={styles} theme={theme} />
          </View>
        ) : (
          <View style={styles.deletedNotice}>
            <Ionicons name="warning-outline" size={20} color={theme.status.cancelled.text} />
            <Text style={styles.deletedNoticeText}>
              Esta cuenta fue bloqueada el {formatDate(specialist.user.deletedAt)}. Solo deben conservarse datos sujetos a obligación legal, fiscal o reclamaciones.
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {processing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.overlayText}>{processingLabel}</Text>
          </View>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successToast}>
          <Ionicons name="checkmark-circle" size={20} color={theme.textOnPrimary} />
          <Text style={styles.successToastText}>{successMessage}</Text>
        </View>
      ) : null}

      {error && specialist ? (
        <AnimatedPressable style={styles.errorBanner} onPress={() => setError(null)} pressScale={0.99}>
          <Ionicons name="alert-circle" size={18} color={theme.status.cancelled.text} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Ionicons name="close" size={16} color={theme.status.cancelled.text} />
        </AnimatedPressable>
      ) : null}

      <ScrollView
        style={styles.scrollView}
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
        <AnimatedPressable
          style={styles.backHeader}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          pressScale={0.98}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
          <Text style={styles.backHeaderText}>Gestión de especialistas</Text>
        </AnimatedPressable>

        {isTwoCol ? (
          <View style={styles.twoColWrapper}>
            <View style={styles.leftColumn}>
              {renderHeaderCard()}
              {renderProfessionalInfo()}
            </View>
            <View style={styles.rightColumn}>
              {renderStats()}
              {renderVerification()}
              {renderActions()}
            </View>
          </View>
        ) : (
          <>
            {renderHeaderCard()}
            {renderStats()}
            {renderProfessionalInfo()}
            {renderVerification()}
            {renderActions()}
          </>
        )}
      </ScrollView>

      <SuspendModal
        visible={showSuspendModal}
        specialistName={specialist.user.name}
        suspendReason={suspendReason}
        setSuspendReason={setSuspendReason}
        onCancel={() => {
          setShowSuspendModal(false);
          setSuspendReason('');
        }}
        onConfirm={handleSuspend}
        styles={styles}
        theme={theme}
      />

      <ConfirmModal
        visible={showReactivateModal}
        icon="play-circle"
        title={`Reactivar cuenta de ${specialist.user.name}`}
        description="Su perfil volverá a ser visible y podrá acceder a la plataforma con normalidad."
        contextLabel={specialist.user.suspensionReason ? 'Razón de suspensión:' : undefined}
        contextText={specialist.user.suspensionReason ?? undefined}
        confirmLabel="Reactivar"
        tone="success"
        onCancel={() => setShowReactivateModal(false)}
        onConfirm={handleReactivate}
        styles={styles}
        theme={theme}
      />

      <DeleteStepOneModal
        visible={showDeleteStep1}
        specialistName={specialist.user.name}
        onCancel={() => setShowDeleteStep1(false)}
        onContinue={() => {
          setShowDeleteStep1(false);
          setShowDeleteStep2(true);
        }}
        styles={styles}
        theme={theme}
      />

      <DeleteStepTwoModal
        visible={showDeleteStep2}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        onCancel={() => {
          setShowDeleteStep2(false);
          setDeleteConfirmText('');
        }}
        onConfirm={handleDelete}
        styles={styles}
        theme={theme}
      />

      {showDniModal && specialist.dniPhotoUrl ? (
        <Pressable style={styles.dniModalOverlay} onPress={() => setShowDniModal(false)}>
          <View style={styles.dniModalTopBar}>
            <Text style={styles.dniModalTitle}>Carnet de colegiado</Text>
            <AnimatedPressable
              onPress={() => setShowDniModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.dniModalCloseButton}
              pressScale={0.95}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
          <Pressable onPress={(event) => event.stopPropagation()}>
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
      ) : null}
    </View>
  );
}

function SpecialistAvatar({
  name,
  avatarUrl,
  size,
  styles,
  theme,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
  styles: DetailStyles;
  theme: Theme;
}) {
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
          borderColor: theme.primaryAlpha20,
        }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarFallbackText, { fontSize: size * 0.34 }]}>{getInitials(name)}</Text>
    </View>
  );
}

function StatusBadge({ tone, styles, large = false }: { tone: BadgeTone; styles: DetailStyles; large?: boolean }) {
  return (
    <View style={[styles.badge, large && styles.badgeLarge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Ionicons name={tone.icon} size={large ? 20 : 14} color={tone.text} />
      <Text style={[styles.badgeText, large && styles.badgeTextLarge, { color: tone.text }]}>{tone.label}</Text>
    </View>
  );
}

function InfoCard({ icon, label, value, styles, theme }: { icon: IconName; label: string; value: string; styles: DetailStyles; theme: Theme }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  styles,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
  bgColor: string;
  styles: DetailStyles;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TimelineRow({
  icon,
  label,
  value,
  color,
  styles,
  theme,
}: {
  icon: IconName;
  label: string;
  value: string;
  color?: string;
  styles: DetailStyles;
  theme: Theme;
}) {
  return (
    <View style={styles.timelineRowItem}>
      <Ionicons name={icon} size={16} color={color || theme.textSecondary} />
      <Text style={styles.timelineRowLabel}>{label}</Text>
      <Text style={[styles.timelineRowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  loading,
  onPress,
  styles,
  theme,
}: {
  icon: IconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  return (
    <AnimatedPressable style={styles.iconAction} onPress={onPress} accessibilityLabel={label} pressScale={0.95}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name={icon} size={18} color={theme.primary} />
      )}
    </AnimatedPressable>
  );
}

function PillAction({
  label,
  tone,
  onPress,
  styles,
  theme,
}: {
  label: string;
  tone: 'success' | 'danger';
  onPress: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  const isDanger = tone === 'danger';
  return (
    <AnimatedPressable
      style={[styles.pillAction, isDanger ? styles.pillActionDanger : styles.pillActionSuccess]}
      onPress={onPress}
      pressScale={0.97}
    >
      <Text style={[styles.pillActionText, { color: isDanger ? theme.status.cancelled.text : theme.status.confirmed.text }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function AccountAction({
  icon,
  label,
  tone,
  onPress,
  styles,
  theme,
}: {
  icon: IconName;
  label: string;
  tone: 'warning' | 'success' | 'danger';
  onPress: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  const isDanger = tone === 'danger';
  const backgroundColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warningAmber : 'transparent';
  const borderColor = isDanger ? theme.status.cancelled.border : backgroundColor;
  const textColor = isDanger ? theme.status.cancelled.text : theme.textOnPrimary;

  return (
    <AnimatedPressable
      style={[styles.accountAction, { backgroundColor, borderColor }]}
      onPress={onPress}
      pressScale={0.98}
    >
      <Ionicons name={icon} size={18} color={textColor} />
      <Text style={[styles.accountActionText, { color: textColor }]}>{label}</Text>
    </AnimatedPressable>
  );
}

function StateIcon({ icon, styles, color }: { icon: IconName; styles: DetailStyles; color: string }) {
  return (
    <View style={styles.stateIconContainer}>
      <Ionicons name={icon} size={42} color={color} />
    </View>
  );
}

function ModalFrame({
  visible,
  children,
  onRequestClose,
  styles,
}: {
  visible: boolean;
  children: React.ReactNode;
  onRequestClose: () => void;
  styles: DetailStyles;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>{children}</View>
      </View>
    </Modal>
  );
}

function SuspendModal({
  visible,
  specialistName,
  suspendReason,
  setSuspendReason,
  onCancel,
  onConfirm,
  styles,
  theme,
}: {
  visible: boolean;
  specialistName: string;
  suspendReason: string;
  setSuspendReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  const isValid = suspendReason.trim().length >= 10;
  return (
    <ModalFrame visible={visible} onRequestClose={onCancel} styles={styles}>
      <View style={styles.modalIconRow}>
        <View style={[styles.modalIconCircle, { backgroundColor: theme.warningBg }]}>
          <Ionicons name="pause-circle" size={28} color={theme.warning} />
        </View>
      </View>
      <Text style={styles.modalTitle}>Suspender cuenta de {specialistName}</Text>
      <Text style={styles.modalDescription}>
        Su perfil dejará de ser visible y no podrá acceder a la plataforma hasta que se reactive.
      </Text>
      <Text style={styles.modalLabel}>Motivo de suspensión (mínimo 10 caracteres)</Text>
      <TextInput
        style={styles.modalInputMultiline}
        placeholder="Describe la razón de la suspensión..."
        placeholderTextColor={theme.textMuted}
        value={suspendReason}
        onChangeText={setSuspendReason}
        multiline
        numberOfLines={3}
        maxLength={500}
      />
      <Text style={styles.modalCharCount}>
        {suspendReason.length}/500
        {suspendReason.length > 0 && !isValid ? (
          <Text style={{ color: theme.warning }}> - mínimo 10 caracteres</Text>
        ) : null}
      </Text>
      <View style={styles.modalButtons}>
        <ModalButton label="Cancelar" tone="neutral" onPress={onCancel} styles={styles} theme={theme} />
        <ModalButton label="Confirmar suspensión" tone="warning" onPress={onConfirm} disabled={!isValid} styles={styles} theme={theme} />
      </View>
    </ModalFrame>
  );
}

function ConfirmModal({
  visible,
  icon,
  title,
  description,
  contextLabel,
  contextText,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
  styles,
  theme,
}: {
  visible: boolean;
  icon: IconName;
  title: string;
  description: string;
  contextLabel?: string;
  contextText?: string;
  confirmLabel: string;
  tone: 'success' | 'warning' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.status.cancelled.text;
  const bg = tone === 'success' ? theme.successBg : tone === 'warning' ? theme.warningBg : theme.status.cancelled.bg;

  return (
    <ModalFrame visible={visible} onRequestClose={onCancel} styles={styles}>
      <View style={styles.modalIconRow}>
        <View style={[styles.modalIconCircle, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
      </View>
      <Text style={styles.modalTitle}>{title}</Text>
      {contextLabel && contextText ? (
        <View style={styles.modalContextBox}>
          <Text style={styles.modalContextLabel}>{contextLabel}</Text>
          <Text style={styles.modalContextText}>{contextText}</Text>
        </View>
      ) : null}
      <Text style={styles.modalDescription}>{description}</Text>
      <View style={styles.modalButtons}>
        <ModalButton label="Cancelar" tone="neutral" onPress={onCancel} styles={styles} theme={theme} />
        <ModalButton label={confirmLabel} tone={tone} onPress={onConfirm} styles={styles} theme={theme} />
      </View>
    </ModalFrame>
  );
}

function DeleteStepOneModal({
  visible,
  specialistName,
  onCancel,
  onContinue,
  styles,
  theme,
}: {
  visible: boolean;
  specialistName: string;
  onCancel: () => void;
  onContinue: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  return (
    <ConfirmModal
      visible={visible}
      icon="warning"
      title={`Bloquear cuenta de ${specialistName}`}
      description="Consecuencias: se cancelarán todas sus sesiones futuras, los clientes afectados serán notificados, su perfil dejará de ser visible, el acceso quedará revocado y los datos necesarios quedarán bloqueados por obligación legal."
      confirmLabel="Continuar"
      tone="danger"
      onCancel={onCancel}
      onConfirm={onContinue}
      styles={styles}
      theme={theme}
    />
  );
}

function DeleteStepTwoModal({
  visible,
  deleteConfirmText,
  setDeleteConfirmText,
  onCancel,
  onConfirm,
  styles,
  theme,
}: {
  visible: boolean;
  deleteConfirmText: string;
  setDeleteConfirmText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  styles: DetailStyles;
  theme: Theme;
}) {
  return (
    <ModalFrame visible={visible} onRequestClose={onCancel} styles={styles}>
      <View style={styles.modalIconRow}>
        <View style={[styles.modalIconCircle, { backgroundColor: theme.status.cancelled.bg }]}>
          <Ionicons name="trash" size={28} color={theme.status.cancelled.text} />
        </View>
      </View>
      <Text style={styles.modalTitle}>Confirmación final</Text>
      <Text style={styles.modalDescription}>
        Escribe <Text style={styles.modalStrong}>BLOQUEAR</Text> para confirmar el bloqueo legal de esta cuenta.
      </Text>
      <TextInput
        style={styles.modalInputSingle}
        placeholder="Escribe BLOQUEAR para confirmar"
        placeholderTextColor={theme.textMuted}
        value={deleteConfirmText}
        onChangeText={setDeleteConfirmText}
        autoCapitalize="characters"
      />
      <View style={styles.modalButtons}>
        <ModalButton label="Cancelar" tone="neutral" onPress={onCancel} styles={styles} theme={theme} />
        <ModalButton
          label="Bloquear legalmente"
          tone="danger"
          onPress={onConfirm}
          disabled={deleteConfirmText !== 'BLOQUEAR'}
          styles={styles}
          theme={theme}
        />
      </View>
    </ModalFrame>
  );
}

function ModalButton({
  label,
  tone,
  onPress,
  disabled = false,
  styles,
  theme,
}: {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  onPress: () => void;
  disabled?: boolean;
  styles: DetailStyles;
  theme: Theme;
}) {
  const backgroundColor =
    tone === 'success'
      ? theme.success
      : tone === 'warning'
        ? theme.warningAmber
        : tone === 'danger'
          ? theme.status.cancelled.text
          : 'transparent';
  const borderColor = tone === 'neutral' ? theme.border : backgroundColor;
  const color = tone === 'neutral' ? theme.textSecondary : theme.textOnPrimary;

  return (
    <AnimatedPressable
      style={[styles.modalButton, { backgroundColor, borderColor }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      pressScale={0.98}
    >
      <Text style={[styles.modalButtonText, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const cardShadow = (isDark: boolean) => (isDark ? {} : shadows.sm);

const createStyles = (theme: Theme, isDark: boolean, isTwoCol: boolean, isWide: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: isWide ? 1100 : isTwoCol ? 900 : undefined,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateIconContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardText: {
    fontSize: typography.fontSizes.md,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  backLinkText: {
    fontSize: typography.fontSizes.sm,
    color: theme.primary,
    fontWeight: typography.fontWeights.medium,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  backHeaderText: {
    fontSize: typography.fontSizes.md,
    color: theme.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  twoColWrapper: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 6,
  },
  rightColumn: {
    flex: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: theme.bgElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  overlayText: {
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },
  successToast: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: 500,
    backgroundColor: theme.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 99,
    alignSelf: 'center',
    ...cardShadow(isDark),
  },
  successToastText: {
    color: theme.textOnPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.status.cancelled.bg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.status.cancelled.border,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: theme.status.cancelled.text,
    fontWeight: typography.fontWeights.medium,
  },
  headerCard: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  avatarFallback: {
    backgroundColor: theme.primaryAlpha12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.primaryAlpha20,
  },
  avatarFallbackText: {
    fontWeight: typography.fontWeights.bold,
    color: theme.primary,
  },
  headerName: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  headerEmail: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    marginTop: spacing.xs,
  },
  headerPhone: {
    fontSize: typography.fontSizes.sm,
    color: theme.textMuted,
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
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeTextLarge: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  headerJoinDate: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flexGrow: 1,
    flexShrink: 0,
    width: '48%',
    minWidth: 140,
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
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
    color: theme.textSecondary,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  ratingCard: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  ratingLeft: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    fontSize: typography.fontSizes.xxxxl,
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
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
    color: theme.textPrimary,
  },
  ratingLabel: {
    fontSize: typography.fontSizes.xs,
    color: theme.textSecondary,
  },
  bioCard: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  bioText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  emptyCardText: {
    fontSize: typography.fontSizes.sm,
    color: theme.textMuted,
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
    width: '48%',
    minWidth: 180,
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: theme.primaryAlpha12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoCardLabel: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  infoCardValue: {
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
  },
  verificationHeader: {
    alignItems: 'center',
  },
  colegiadoBox: {
    backgroundColor: theme.bgMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  colegiadoLabel: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  colegiadoValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
    marginTop: spacing.xs,
  },
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
    color: theme.textMuted,
    width: 60,
  },
  timelineRowValue: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  viewPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.primaryAlpha12,
  },
  viewPhotoButtonText: {
    fontSize: typography.fontSizes.sm,
    color: theme.primary,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  credentialReviewBox: {
    gap: spacing.sm,
  },
  credentialReviewTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
    marginTop: spacing.xs,
  },
  insuranceReviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  insuranceReviewSummaryLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
  },
  insuranceReviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  insuranceReviewBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  credentialReviewList: {
    gap: spacing.sm,
  },
  credentialReviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  credentialReviewCopy: {
    flex: 1,
    gap: 2,
  },
  credentialReviewLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textPrimary,
  },
  credentialReviewValue: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
  },
  credentialReviewMeta: {
    fontSize: typography.fontSizes.xs,
    color: theme.textSecondary,
  },
  credentialReviewActions: {
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  credentialReviewDecisionRow: {
    gap: spacing.sm,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillAction: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillActionSuccess: {
    backgroundColor: theme.status.confirmed.bg,
    borderColor: theme.status.confirmed.border,
  },
  pillActionDanger: {
    backgroundColor: theme.status.cancelled.bg,
    borderColor: theme.status.cancelled.border,
  },
  pillActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  credentialReviewEmpty: {
    fontSize: typography.fontSizes.sm,
    color: theme.textMuted,
  },
  accountAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 48,
    borderWidth: 1,
  },
  accountActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  dangerZone: {
    marginTop: spacing.sm,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: theme.borderLight,
    marginBottom: spacing.md,
  },
  suspensionBox: {
    backgroundColor: theme.warningBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  suspensionBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suspensionBoxTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: theme.warning,
  },
  suspensionBoxReason: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  deletedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.status.cancelled.bg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.status.cancelled.border,
  },
  deletedNoticeText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: theme.status.cancelled.text,
    fontWeight: typography.fontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.bgElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(isDark),
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
    color: theme.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalStrong: {
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
  },
  modalLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: theme.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  modalInputMultiline: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    backgroundColor: theme.bgCard,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalInputSingle: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    backgroundColor: theme.bgCard,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: typography.fontWeights.bold,
  },
  modalCharCount: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  modalContextBox: {
    backgroundColor: theme.warningBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  modalContextLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: theme.warning,
    marginBottom: spacing.xs,
  },
  modalContextText: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
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
