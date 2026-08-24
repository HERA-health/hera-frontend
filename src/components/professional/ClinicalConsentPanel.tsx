import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Card } from '../common';
import { TourTarget } from '../onboarding/TourTarget';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Client } from '../../services/professionalService';
import type {
  ClinicalConsentEvent,
  ClinicalDocument,
  ClinicalRecord,
} from '../../services/clinicalService';
import { resolveClinicalGuestConsentEligibility } from '../../services/clinicalGuestConsentEligibility';
import type { ProfessionalTourTargetId } from '../onboarding/professionalTourTypes';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ClinicalConsentPanelProps {
  isTablet: boolean;
  client: Client;
  record: ClinicalRecord;
  consentEvidenceDocuments: ClinicalDocument[];
  openingDocumentId: string | null;
  documentUploading: boolean;
  consentSubmitting: boolean;
  closingProcess: boolean;
  loadingMoreConsentEvents: boolean;
  guestConsentSyncPending: boolean;
  onUploadConsentDocument: () => void;
  onOpenConsentDocument: (document: ClinicalDocument) => void;
  onRequestDigitalConsent: () => Promise<unknown>;
  onResendGuestConsent: () => Promise<unknown>;
  onCancelGuestConsent: () => Promise<unknown>;
  onRequestGuestWithdrawal: () => Promise<unknown>;
  onAttestClinicalConsent: (evidenceDocumentId?: string) => Promise<unknown>;
  onCloseClinicalProcess: () => Promise<void>;
  onLoadMoreConsentEvents: () => void;
  onRetryGuestConsentSync: () => Promise<boolean>;
  tourTargetId?: ProfessionalTourTargetId;
  consentDocumentTourTargetId?: ProfessionalTourTargetId;
  tourTargetsActive?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin fecha';

const formatShortDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';

const formatDateTime = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sin fecha';

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return 'document-text-outline' as const;
  }

  if (mimeType.startsWith('image/')) {
    return 'image-outline' as const;
  }

  return 'document-outline' as const;
};

const getLinkDeliveryLabel = (status: ClinicalRecord['activeConsentRequest'] extends infer _T
  ? 'PENDING' | 'PROVIDER_ACCEPTED' | 'FAILED' | 'UNKNOWN' | 'CANCELLED' | null
  : never): string => {
  switch (status) {
    case 'PROVIDER_ACCEPTED': return 'enlace enviado';
    case 'FAILED': return 'no se pudo entregar';
    case 'UNKNOWN': return 'entrega no confirmada';
    case 'CANCELLED': return 'envío cancelado';
    default: return 'preparando el envío';
  }
};

const getMethodLabel = (method: ClinicalRecord['consentMethod']) => {
  if (method === 'DIGITAL_SIGNATURE') {
    return 'Confirmada desde su cuenta HERA';
  }

  if (method === 'SPECIALIST_ATTESTATION') {
    return 'Documento firmado';
  }

  if (method === 'EMAIL_LINK_OTP') {
    return 'Confirmada por email y código';
  }

  return 'Pendiente';
};

const getEventCopy = (event: ClinicalConsentEvent) => {
  const title = (() => {
    switch (event.eventType) {
      case 'REQUESTED': return event.requestKind === 'WITHDRAWAL'
        ? 'Retirada solicitada'
        : 'Autorización solicitada';
      case 'DELIVERY_UNKNOWN': return 'Entrega no confirmada';
      case 'ACCEPTED': return event.requestKind === 'WITHDRAWAL'
        ? 'Retirada confirmada'
        : 'Autorización aceptada';
      case 'REJECTED': return 'Solicitud rechazada';
      case 'CANCELLED': return 'Solicitud cancelada';
      case 'EXPIRED': return 'Solicitud caducada';
      case 'REVOKED': return 'Autorización retirada';
      default: return 'Autorización registrada';
    }
  })();
  return {
    title,
    caption: `${getMethodLabel(event.method)} · ${formatDate(event.createdAt)}`,
  };
};

export function ClinicalConsentPanel({
  isTablet,
  client,
  record,
  consentEvidenceDocuments,
  openingDocumentId,
  documentUploading,
  consentSubmitting,
  closingProcess,
  loadingMoreConsentEvents,
  guestConsentSyncPending,
  onUploadConsentDocument,
  onOpenConsentDocument,
  onRequestDigitalConsent,
  onResendGuestConsent,
  onCancelGuestConsent,
  onRequestGuestWithdrawal,
  onAttestClinicalConsent,
  onCloseClinicalProcess,
  onLoadMoreConsentEvents,
  onRetryGuestConsentSync,
  tourTargetId,
  consentDocumentTourTargetId,
  tourTargetsActive = true,
  style,
}: ClinicalConsentPanelProps) {
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontHeading }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const latestConsentEvidenceDocumentId = consentEvidenceDocuments[0]?.id;
  const [confirmingGuestEligibility, setConfirmingGuestEligibility] = useState(false);
  const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);
  const [displayClock, setDisplayClock] = useState(() => Date.now());
  const isRegisteredClient = client.source === 'REGISTERED';
  const isManagedClient = client.source === 'MANAGED';
  const guestConsentEligibility = resolveClinicalGuestConsentEligibility(record);
  const usesHeraAccount = isRegisteredClient
    || guestConsentEligibility === 'HAS_HERA_ACCOUNT';

  useEffect(() => {
    setConfirmingGuestEligibility(false);
    setConfirmingWithdrawal(false);
  }, [client.id]);

  useEffect(() => {
    if (record.activeConsentRequest?.status !== 'PENDING') return undefined;
    const timer = setInterval(() => setDisplayClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [record.activeConsentRequest?.status]);

  const consentTone =
    record.consentStatus === 'GRANTED'
      ? theme.status.confirmed
      : record.consentStatus === 'REVOKED'
        ? theme.status.cancelled
        : theme.status.pending;

  const hasManagedEmail = isManagedClient && [
    'ELIGIBLE',
    'FLAG_DISABLED',
    'INVALID_EMAIL',
  ].includes(guestConsentEligibility);
  const guestEmailEligible = isManagedClient
    && guestConsentEligibility === 'ELIGIBLE';
  const guestRelationshipUnavailable = [
    'CLIENT_INACTIVE',
    'NOT_MANAGED_BY_SPECIALIST',
  ].includes(guestConsentEligibility);
  const displayedRequestExpired = Boolean(
    record.activeConsentRequest?.status === 'PENDING'
    && new Date(record.activeConsentRequest.expiresAt).getTime() <= displayClock
  );
  const hasActiveConsentRequest = Boolean(record.activeConsentRequest && !displayedRequestExpired);
  const canRequestDigitalConsent =
    (usesHeraAccount || guestEmailEligible) &&
    record.consentStatus !== 'GRANTED' &&
    !hasActiveConsentRequest &&
    !record.closedAt;

  const canAttestConsent =
    isManagedClient &&
    !guestRelationshipUnavailable &&
    record.consentStatus !== 'GRANTED' &&
    !record.closedAt;

  const consentRequestPending =
    hasActiveConsentRequest &&
    record.activeConsentRequest &&
    record.activeConsentRequest.status === 'PENDING';

  const statusLabel =
    record.consentStatus === 'GRANTED'
      ? 'Vigente'
      : record.consentStatus === 'REVOKED'
        ? 'Retirada'
        : 'Pendiente';
  const statusIconName: IoniconName =
    record.consentStatus === 'GRANTED'
      ? 'shield-checkmark-outline'
      : record.consentStatus === 'REVOKED'
        ? 'close-circle-outline'
        : 'time-outline';
  const digitalMethodDescription = usesHeraAccount
    ? 'Enviaremos la autorización por email. El paciente iniciará sesión en HERA para revisarla y decidir.'
    : guestEmailEligible
      ? 'Enviaremos por email un enlace privado y un código para que el paciente revise la autorización y decida.'
      : guestConsentEligibility === 'INVALID_EMAIL'
        ? 'Corrige el email de contacto para enviar la autorización o utiliza un documento firmado.'
      : guestConsentEligibility === 'CLIENT_INACTIVE'
        ? 'La ficha ya no está activa. No se pueden registrar nuevas autorizaciones desde este expediente.'
      : guestConsentEligibility === 'NOT_MANAGED_BY_SPECIALIST'
        ? 'Este paciente ya no está gestionado desde este expediente. No se pueden iniciar nuevas solicitudes.'
      : hasManagedEmail
        ? 'La confirmación por email está temporalmente desactivada. Puedes utilizar mientras tanto un documento firmado.'
      : 'Añade un email de contacto válido para enviar la autorización o utiliza un documento firmado.';
  const documentMethodDescription = guestRelationshipUnavailable
    ? 'La relación no está activa y no admite nuevas evidencias de autorización.'
    : isTablet
      ? 'Alternativa para registrar una autorización que el paciente ya ha firmado fuera de HERA.'
      : 'Sube el documento firmado para registrar la autorización.';
  const digitalMethodPill = usesHeraAccount
    ? 'Confirmación desde su cuenta HERA'
    : guestEmailEligible
      ? 'Confirmación por email y código'
      : hasManagedEmail
        ? 'Envío por email no disponible'
        : 'No disponible';
  const documentMethodPill = isManagedClient
    ? 'Vía de este paciente'
    : isTablet
      ? 'Vía con documento firmado'
      : 'Documento firmado';
  const header = (
    <View style={[styles.header, !isTablet && styles.headerMobile]}>
      <View style={[styles.copy, !isTablet && styles.copyMobile]}>
        <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
          Autorización del expediente clínico
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Envía al paciente una autorización para usar su expediente clínico en HERA. También puedes registrar un documento firmado.
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: consentTone.bg,
            borderColor: consentTone.border,
          },
        ]}
      >
        <Ionicons name={statusIconName} size={16} color={consentTone.text} />
        <Text style={[styles.statusPillText, { color: consentTone.text }, labelStyle]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );

  const digitalMethodPanel = (
    <View
      style={[
        styles.methodPanel,
        isTablet && styles.methodPanelDesktop,
        !isTablet && styles.methodPanelMobile,
        {
          backgroundColor: theme.bgMuted,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.methodHeader, !isTablet && styles.methodHeaderMobile]}>
        <View style={[styles.methodIconWrap, !isTablet && styles.methodIconWrapMobile, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
        </View>
        <View style={[styles.methodCopy, !isTablet && styles.methodCopyMobile]}>
          <Text style={[styles.methodTitle, !isTablet && styles.methodTitleMobile, { color: theme.textPrimary }, emphasisStyle]}>
            Confirmación digital
          </Text>
          <Text style={[styles.methodDescription, !isTablet && styles.methodDescriptionMobile, { color: theme.textSecondary }]}>
            {digitalMethodDescription}
          </Text>
        </View>
      </View>

      <View style={[styles.methodPill, !isTablet && styles.methodPillMobile, { backgroundColor: theme.primaryAlpha12 }]}>
        <Text style={[styles.methodPillText, !isTablet && styles.methodPillTextMobile, { color: theme.primary }, labelStyle]}>
          {digitalMethodPill}
        </Text>
      </View>

      {consentRequestPending ? (
        <View style={[styles.methodInfo, { borderColor: theme.border }]}>
          <Ionicons name="mail-outline" size={18} color={theme.primary} />
          <Text style={[styles.methodInfoText, { color: theme.textSecondary }]}>
            {record.activeConsentRequest?.channel === 'GUEST_EMAIL'
              ? `Autorización por email: ${getLinkDeliveryLabel(record.activeConsentRequest.linkDeliveryStatus)}. Activa hasta el ${formatDateTime(record.activeConsentRequest.expiresAt)}.`
              : `Autorización enviada desde HERA. Activa hasta el ${formatDateTime(record.activeConsentRequest?.expiresAt)}.`}
          </Text>
        </View>
      ) : null}

      {canRequestDigitalConsent ? (
        <View style={[styles.methodActions, !isTablet && styles.methodActionsMobile]}>
          <Button
            variant="secondary"
            size="small"
            onPress={() => {
              if (guestEmailEligible) setConfirmingGuestEligibility(true);
              else void onRequestDigitalConsent();
            }}
            loading={consentSubmitting}
          >
            Enviar autorización por email
          </Button>
        </View>
      ) : null}

      {displayedRequestExpired ? (
        <View style={[styles.methodInfo, { borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.methodInfoText, { color: theme.textSecondary }]}>
            La solicitud anterior ha caducado. Puedes crear una nueva sin esperar a la sincronización automática.
          </Text>
        </View>
      ) : null}

      {confirmingGuestEligibility ? (
        <View style={[styles.methodInfo, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          <Ionicons name="person-outline" size={18} color={theme.primary} />
          <View style={styles.methodCopy}>
            <Text style={[styles.methodTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Confirma que esta vía es adecuada
            </Text>
            <Text style={[styles.methodInfoText, { color: theme.textSecondary }]}>
              Confirmo que el paciente es mayor de edad, actúa en su propio nombre y puede decidir por sí mismo. Si no puedes confirmarlo, utiliza el documento firmado.
            </Text>
            <View style={styles.methodActions}>
              <Button variant="primary" size="small" loading={consentSubmitting} onPress={() => {
                setConfirmingGuestEligibility(false);
                void onRequestDigitalConsent();
              }}>
                Confirmar y enviar por email
              </Button>
              <Button variant="ghost" size="small" onPress={() => setConfirmingGuestEligibility(false)}>
                Volver
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {consentRequestPending && record.activeConsentRequest?.channel === 'GUEST_EMAIL' ? (
        <View style={[styles.methodActions, !isTablet && styles.methodActionsMobile]}>
          {record.guestConsentActionsEnabled ? (
            <Button variant="secondary" size="small" loading={consentSubmitting} onPress={onResendGuestConsent}>
              Enviar enlace nuevo por email
            </Button>
          ) : null}
          <Button variant="ghost" size="small" disabled={consentSubmitting} onPress={onCancelGuestConsent}>
            Cancelar solicitud
          </Button>
        </View>
      ) : null}

      {guestConsentSyncPending ? (
        <View style={[styles.methodInfo, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          <Ionicons name="sync-outline" size={18} color={theme.primary} />
          <View style={styles.methodCopy}>
            <Text style={[styles.methodInfoText, { color: theme.textSecondary }]}>
              La operación se completó, pero esta vista todavía no ha podido sincronizarse.
            </Text>
            <Button variant="ghost" size="small" onPress={() => void onRetryGuestConsentSync()}>
              Reintentar sincronización
            </Button>
          </View>
        </View>
      ) : null}

      {record.consentStatus === 'GRANTED' && record.consentMethod === 'EMAIL_LINK_OTP' && !hasActiveConsentRequest && record.guestConsentActionsEnabled ? (
        <View style={[styles.methodActions, !isTablet && styles.methodActionsMobile]}>
          <Button variant="outline" size="small" loading={consentSubmitting} onPress={() => setConfirmingWithdrawal(true)}>
            Preparar retirada
          </Button>
        </View>
      ) : null}

      {confirmingWithdrawal ? (
        <View
          accessibilityRole="summary"
          style={[styles.methodInfo, { borderColor: theme.border, backgroundColor: theme.bgCard }]}
        >
          <Ionicons name="alert-circle-outline" size={18} color={theme.primary} />
          <View style={styles.methodCopy}>
            <Text style={[styles.methodTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Confirmar retirada por email
            </Text>
            <Text style={[styles.methodInfoText, { color: theme.textSecondary }]}>
              El paciente recibirá una nueva solicitud por email. La autorización seguirá vigente hasta que confirme la retirada. Confirma también que es mayor de edad y actúa en su propio nombre.
            </Text>
            <View style={styles.methodActions}>
              <Button variant="primary" size="small" loading={consentSubmitting} onPress={() => {
                setConfirmingWithdrawal(false);
                void onRequestGuestWithdrawal();
              }}>
                Enviar retirada por email
              </Button>
              <Button variant="ghost" size="small" onPress={() => setConfirmingWithdrawal(false)}>
                Volver
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  const documentMethodPanel = (
    <View
      style={[
        styles.methodPanel,
        isTablet && styles.methodPanelDesktop,
        !isTablet && styles.methodPanelMobile,
        {
          backgroundColor: theme.bgMuted,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.methodHeader, !isTablet && styles.methodHeaderMobile]}>
        <View style={[styles.methodIconWrap, !isTablet && styles.methodIconWrapMobile, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
        </View>
        <View style={[styles.methodCopy, !isTablet && styles.methodCopyMobile]}>
          <Text style={[styles.methodTitle, !isTablet && styles.methodTitleMobile, { color: theme.textPrimary }, emphasisStyle]}>
            Documento firmado
          </Text>
          <Text style={[styles.methodDescription, !isTablet && styles.methodDescriptionMobile, { color: theme.textSecondary }]}>
            {documentMethodDescription}
          </Text>
        </View>
      </View>

      <View style={[styles.methodPill, !isTablet && styles.methodPillMobile, { backgroundColor: theme.primaryAlpha12 }]}>
        <Text style={[styles.methodPillText, !isTablet && styles.methodPillTextMobile, { color: theme.primary }, labelStyle]}>
          {documentMethodPill}
        </Text>
      </View>

      {consentEvidenceDocuments.length === 0 ? (
        <View style={[styles.documentEmpty, !isTablet && styles.documentEmptyMobile, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="folder-open-outline" size={22} color={theme.textMuted} />
          <View style={[styles.documentEmptyCopy, !isTablet && styles.documentEmptyCopyMobile]}>
            <Text style={[styles.documentEmptyTitle, !isTablet && styles.documentEmptyTitleMobile, { color: theme.textPrimary }, emphasisStyle]}>
              No hay ningún documento firmado
            </Text>
            <Text style={[styles.documentEmptyDescription, !isTablet && styles.documentEmptyDescriptionMobile, { color: theme.textSecondary }]}>
              Adjunta aquí el PDF o la imagen de la autorización firmada cuando la tengas.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.documentList}>
          {consentEvidenceDocuments.map((document) => (
            <AnimatedPressable
              key={document.id}
              hoverLift={false}
              pressScale={0.995}
              onPress={() => onOpenConsentDocument(document)}
              style={[
                styles.documentRow,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.documentIconWrap, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons
                  name={getDocumentIcon(document.mimeType)}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View style={styles.documentMeta}>
                <Text
                  numberOfLines={1}
                  style={[styles.documentName, { color: theme.textPrimary }, emphasisStyle]}
                >
                  {document.fileName}
                </Text>
                <Text style={[styles.documentCaption, { color: theme.textSecondary }]}>
                  {formatShortDate(document.uploadedAt)} · {formatFileSize(document.sizeBytes)}
                </Text>
              </View>
              {openingDocumentId === document.id ? (
                <Ionicons name="hourglass-outline" size={18} color={theme.textMuted} />
              ) : (
                <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
              )}
            </AnimatedPressable>
          ))}
        </View>
      )}

      <View style={[styles.methodActions, !isTablet && styles.methodActionsMobile]}>
        <Button
          variant="outline"
          size="small"
          onPress={onUploadConsentDocument}
          loading={documentUploading}
        >
          Adjuntar documento
        </Button>

        {canAttestConsent ? (
          <Button
            variant="secondary"
            size="small"
            onPress={() => onAttestClinicalConsent(latestConsentEvidenceDocumentId)}
            loading={consentSubmitting}
            disabled={!latestConsentEvidenceDocumentId}
          >
            Registrar autorización firmada
          </Button>
        ) : null}
      </View>

      {canAttestConsent && !latestConsentEvidenceDocumentId ? (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Primero adjunta la autorización firmada.
        </Text>
      ) : null}
    </View>
  );

  return (
    <Card variant="default" padding="large" style={style}>
      {tourTargetId ? (
        <TourTarget
          id={tourTargetId}
          active={tourTargetsActive}
          fill
          style={styles.headerTourTarget}
        >
          {header}
        </TourTarget>
      ) : header}

      <View style={[styles.methodGrid, isTablet && styles.methodGridDesktop]}>
        {digitalMethodPanel}

        {consentDocumentTourTargetId ? (
          <TourTarget
            id={consentDocumentTourTargetId}
            active={tourTargetsActive}
            fill
            style={[styles.methodTourTarget, isTablet && styles.methodTourTargetDesktop]}
          >
            {documentMethodPanel}
          </TourTarget>
        ) : documentMethodPanel}
      </View>

      <View style={[styles.detailGrid, !isTablet && styles.detailGridMobile]}>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, !isTablet && styles.detailLabelMobile, { color: theme.textMuted }, labelStyle]}>
            Tipo
          </Text>
          <Text style={[styles.detailValue, !isTablet && styles.detailValueMobile, { color: theme.textPrimary }, emphasisStyle]}>
            {getMethodLabel(record.consentMethod)}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, !isTablet && styles.detailLabelMobile, { color: theme.textMuted }, labelStyle]}>
            Concedida
          </Text>
          <Text style={[styles.detailValue, !isTablet && styles.detailValueMobile, { color: theme.textPrimary }, emphasisStyle]}>
            {formatDate(record.consentGivenAt)}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, !isTablet && styles.detailLabelMobile, { color: theme.textMuted }, labelStyle]}>
            Retención mínima
          </Text>
          <Text style={[styles.detailValue, !isTablet && styles.detailValueMobile, { color: theme.textPrimary }, emphasisStyle]}>
            {record.retentionUntil ? formatDate(record.retentionUntil) : 'Sin fecha de cierre'}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, !isTablet && styles.detailLabelMobile, { color: theme.textMuted }, labelStyle]}>
            Proceso asistencial
          </Text>
          <Text style={[styles.detailValue, !isTablet && styles.detailValueMobile, { color: theme.textPrimary }, emphasisStyle]}>
            {record.closedAt ? `Cerrado el ${formatDate(record.closedAt)}` : 'Abierto'}
          </Text>
        </View>
      </View>

      {record.eligibleForManualReview ? (
        <View style={[styles.infoBox, { backgroundColor: theme.warningBg, borderColor: theme.warning + '24' }]}>
          <Ionicons name="time-outline" size={18} color={theme.warning} />
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Expediente elegible para revisión manual
            </Text>
            <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
              Ha superado la retención mínima y ya puede revisarse manualmente según la política clínica.
            </Text>
          </View>
        </View>
      ) : null}

      {record.consentStatus === 'GRANTED' && !record.closedAt ? (
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="small"
            onPress={onCloseClinicalProcess}
            loading={closingProcess}
          >
            Cerrar proceso asistencial
          </Button>
        </View>
      ) : null}

      <View style={styles.timeline}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineTitle, { color: theme.textPrimary }, emphasisStyle]}>
            Historial de autorizaciones
          </Text>
          <Text style={[styles.timelineCount, { color: theme.textMuted }, labelStyle]}>
            {record.consentEvents.length}
          </Text>
        </View>

        {record.consentEvents.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <Ionicons name="document-lock-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Todavía no hay eventos registrados en este expediente.
            </Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {record.consentEvents.map((event) => {
              const eventCopy = getEventCopy(event);
              const eventColor = event.eventType === 'ACCEPTED' || event.eventType === 'CONSENT_RECORDED'
                ? theme.success
                : event.eventType === 'REJECTED' || event.eventType === 'REVOKED'
                  ? theme.error
                  : event.eventType === 'REQUESTED'
                    ? theme.status.pending.text
                    : theme.textMuted;

              return (
                <View
                  key={event.id}
                  style={[styles.eventRow, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}
                >
                  <Ionicons name="ellipse" size={12} color={eventColor} />
                  <View style={styles.eventCopy}>
                    <Text style={[styles.eventTitle, { color: theme.textPrimary }, emphasisStyle]}>
                      {eventCopy.title}
                    </Text>
                    <Text style={[styles.eventCaption, { color: theme.textSecondary }]}>
                      {eventCopy.caption}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {record.pagination.consentEvents.hasMore ? (
          <Button
            variant="ghost"
            size="small"
            onPress={onLoadMoreConsentEvents}
            loading={loadingMoreConsentEvents}
          >
            Ver más eventos
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerMobile: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  headerTourTarget: {
    width: '100%',
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
  },
  copyMobile: {
    flex: 0,
    width: '100%',
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  methodGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  methodGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  methodTourTarget: {
    width: '100%',
  },
  methodTourTargetDesktop: {
    flex: 1,
    minWidth: 0,
  },
  methodPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    gap: spacing.md,
  },
  methodPanelDesktop: {
    flex: 1,
  },
  methodPanelMobile: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  methodHeaderMobile: {
    flexDirection: 'column',
  },
  methodIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconWrapMobile: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
  },
  methodCopy: {
    flex: 1,
    gap: 4,
  },
  methodCopyMobile: {
    flex: 0,
    width: '100%',
  },
  methodTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  methodTitleMobile: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  methodDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  methodDescriptionMobile: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  methodPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  methodPillMobile: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  methodPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  methodPillTextMobile: {
    letterSpacing: 0,
  },
  methodInfo: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  methodInfoText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  methodActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodActionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  documentEmpty: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  documentEmptyMobile: {
    flexDirection: 'column',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  documentEmptyCopy: {
    flex: 1,
    gap: 4,
  },
  documentEmptyCopyMobile: {
    flex: 0,
    width: '100%',
  },
  documentEmptyTitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  documentEmptyTitleMobile: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  documentEmptyDescription: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  documentEmptyDescriptionMobile: {
    lineHeight: 17,
  },
  documentList: {
    gap: spacing.sm,
  },
  documentRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  documentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentMeta: {
    flex: 1,
    gap: 4,
  },
  documentName: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  documentCaption: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailGridMobile: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailItem: {
    minWidth: 180,
    flex: 1,
    gap: 6,
  },
  detailItemMobile: {
    flex: 0,
    flexBasis: 'auto',
    minWidth: 0,
    width: '100%',
    gap: 2,
    minHeight: 34,
  },
  detailLabel: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  detailLabelMobile: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    letterSpacing: 0,
  },
  detailValue: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  detailValueMobile: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  infoBody: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  helperText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  timeline: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  timelineCount: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  eventList: {
    gap: spacing.md,
  },
  eventRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  eventCopy: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  eventCaption: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
});
