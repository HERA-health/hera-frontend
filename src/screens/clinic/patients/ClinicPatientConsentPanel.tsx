import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/common/Button';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientConsentDetail,
  ClinicPatientConsentDocument,
  ClinicPatientConsentMethod,
  ClinicPatientConsentRequestStatus,
  ClinicPatientConsentStatus,
  ClinicPatientStatus,
} from '../../../services/clinicService';
import type { UploadAsset } from '../../../utils/multipartUpload';
import { formatDate } from './clinicPatientDomain';

interface ClinicPatientConsentPanelProps {
  consent: ClinicPatientConsentDetail | null;
  loading: boolean;
  error: string;
  saving: boolean;
  openingDocumentId: string | null;
  canManage: boolean;
  patientStatus: ClinicPatientStatus;
  onRequestDigitalConsent: () => void;
  onIssueGuestConsent: () => void;
  onResendGuestConsent: () => void;
  onCancelGuestConsent: () => void;
  onRequestGuestWithdrawal: () => void;
  onUploadEvidence: (file: UploadAsset) => void;
  onOpenDocument: (document: ClinicPatientConsentDocument) => void;
  onRetry: () => void;
}

const STATUS_LABELS: Record<ClinicPatientConsentStatus, string> = {
  PENDING: 'Pendiente',
  GRANTED: 'Concedido',
  REVOKED: 'Revocado',
};

const METHOD_LABELS: Record<ClinicPatientConsentMethod, string> = {
  DIGITAL_SIGNATURE: 'Digital HERA',
  CLINIC_ADMIN_ATTESTATION: 'PDF firmado',
  EMAIL_LINK_OTP: 'Email verificado',
};

const REQUEST_STATUS_LABELS: Record<ClinicPatientConsentRequestStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  REVOKED: 'Retirada',
  EXPIRED: 'Caducada',
  CANCELLED: 'Cancelada',
};

interface DigitalConsentGuidance {
  channel: 'HERA_ACCOUNT_EMAIL' | 'GUEST_EMAIL' | null;
  tone: 'positive' | 'warning';
  title: string;
  description: string;
  unavailableReason: string | null;
}

const getDigitalConsentGuidance = (
  consent: ClinicPatientConsentDetail,
  guestPending: boolean,
): DigitalConsentGuidance => {
  if (consent.digitalConsentChannel === 'HERA_ACCOUNT_EMAIL') {
    if (consent.status === 'GRANTED') {
      return {
        channel: 'HERA_ACCOUNT_EMAIL',
        tone: 'positive',
        title: 'Autorización digital vigente',
        description:
          'El paciente concedió la autorización desde su cuenta HERA. No necesitas solicitarla de nuevo.',
        unavailableReason: null,
      };
    }

    return {
      channel: 'HERA_ACCOUNT_EMAIL',
      tone: 'positive',
      title: 'Firma digital disponible',
      description:
        'El envío utiliza el email asociado a la cuenta HERA vinculada, aunque pueda coincidir con el email administrativo de esta ficha.',
      unavailableReason: null,
    };
  }

  if (consent.hasLinkedHeraAccount) {
    return {
      channel: null,
      tone: 'warning',
      title: 'Firma digital no disponible',
      description:
        'La cuenta HERA está vinculada, pero no dispone de un email utilizable para este envío. Registra el consentimiento mediante un PDF firmado.',
      unavailableReason: 'la cuenta HERA vinculada no tiene un email utilizable',
    };
  }

  if (consent.patientEmail) {
    if (consent.status === 'GRANTED' && consent.method === 'EMAIL_LINK_OTP') {
      return {
        channel: 'GUEST_EMAIL',
        tone: 'positive',
        title: 'Autorización por email vigente',
        description: consent.guestConsentActionsEnabled
          ? 'El paciente verificó su email y concedió la autorización. Si quiere retirarla, puedes enviarle una solicitud de confirmación.'
          : 'El paciente verificó su email y concedió la autorización. Las nuevas solicitudes están temporalmente desactivadas.',
        unavailableReason: consent.guestConsentActionsEnabled
          ? null
          : 'el canal por email está temporalmente desactivado',
      };
    }

    if (guestPending) {
      return {
        channel: 'GUEST_EMAIL',
        tone: consent.guestConsentActionsEnabled ? 'positive' : 'warning',
        title: 'Solicitud por email pendiente',
        description: consent.guestConsentActionsEnabled
          ? 'El paciente debe abrir el enlace personal y verificar el código recibido por email antes de decidir.'
          : 'La solicitud existente se puede cancelar, pero los nuevos envíos están temporalmente desactivados.',
        unavailableReason: consent.guestConsentActionsEnabled
          ? null
          : 'el canal por email está temporalmente desactivado',
      };
    }

    if (!consent.guestConsentActionsEnabled) {
      return {
        channel: 'GUEST_EMAIL',
        tone: 'warning',
        title: 'Consentimiento por email no disponible temporalmente',
        description:
          'Puedes seguir registrando un PDF firmado. El envío por email volverá a mostrarse cuando el canal esté disponible.',
        unavailableReason: 'el canal por email está temporalmente desactivado',
      };
    }

    return {
      channel: 'GUEST_EMAIL',
      tone: 'positive',
      title: 'Consentimiento por email disponible',
      description:
        'El paciente no necesita una cuenta HERA. Recibirá un enlace personal y un código para verificar su email antes de decidir.',
      unavailableReason: null,
    };
  }

  return {
    channel: null,
    tone: 'warning',
    title: 'Firma digital no disponible',
    description:
      'No hay email administrativo ni una cuenta HERA vinculada. Registra el consentimiento mediante un PDF firmado.',
    unavailableReason: 'el paciente no tiene email administrativo ni una cuenta HERA vinculada',
  };
};

const CONSENT_VERSION_LABELS: Record<string, string> = {
  'clinic-administration-v1': 'Autorización administrativa · v1',
  'clinic-administration-withdrawal-v1': 'Retirada de autorización · v1',
};

const formatConsentVersion = (version: string | null): string => (
  version ? CONSENT_VERSION_LABELS[version] ?? version : 'Sin versión'
);

const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return 'Tamaño no disponible';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const pickConsentPdf = async (): Promise<UploadAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0] as DocumentPicker.DocumentPickerAsset & UploadAsset;

  return {
    ...asset,
    fileName: asset.fileName || asset.name || null,
    name: asset.name || asset.fileName || null,
    mimeType: asset.mimeType || 'application/pdf',
  };
};

export function ClinicPatientConsentPanel({
  consent,
  loading,
  error,
  saving,
  openingDocumentId,
  canManage,
  patientStatus,
  onRequestDigitalConsent,
  onIssueGuestConsent,
  onResendGuestConsent,
  onCancelGuestConsent,
  onRequestGuestWithdrawal,
  onUploadEvidence,
  onOpenDocument,
  onRetry,
}: ClinicPatientConsentPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [guestClock, setGuestClock] = useState(() => Date.now());
  const status = consent?.status ?? null;
  const method = consent?.method ? METHOD_LABELS[consent.method] : 'Sin método';
  const isGranted = status === 'GRANTED';
  const guestRequest = consent?.guestRequest ?? null;
  const guestPending = guestRequest?.status === 'PENDING'
    && new Date(guestRequest.expiresAt).getTime() > guestClock;
  const guestEffectivelyExpired = guestRequest?.status === 'PENDING' && !guestPending;
  const guestActionsEnabled = consent?.guestConsentActionsEnabled === true;
  const canIssueGuest = Boolean(
    guestActionsEnabled
      && consent?.patientEmail
      && !consent.hasLinkedHeraAccount
      && !isGranted
      && !guestPending
  );
  const canRequestGuestWithdrawal = Boolean(
    guestActionsEnabled
      && isGranted
      && consent?.method === 'EMAIL_LINK_OTP'
      && !guestPending
  );
  const digitalGuidance = consent ? getDigitalConsentGuidance(consent, guestPending) : null;
  const showDigitalRequestAction = !isGranted && !guestPending;
  const digitalRequestAvailable = Boolean(
    digitalGuidance?.channel === 'HERA_ACCOUNT_EMAIL' || canIssueGuest
  );
  const requestDigitalConsent = (): void => {
    if (digitalGuidance?.channel === 'GUEST_EMAIL') {
      if (canIssueGuest) onIssueGuestConsent();
      return;
    }
    if (digitalGuidance?.channel === 'HERA_ACCOUNT_EMAIL') {
      onRequestDigitalConsent();
    }
  };
  const canOperate = Boolean(consent)
    && !error
    && canManage
    && patientStatus === 'ACTIVE'
    && !saving
    && !loading;

  useEffect(() => {
    if (guestRequest?.status !== 'PENDING') return undefined;
    const timer = setInterval(() => setGuestClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [guestRequest?.id, guestRequest?.status]);

  const handleUpload = async () => {
    const file = await pickConsentPdf();
    if (!file) return;
    onUploadEvidence(file);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Consentimiento de clínica</Text>
          <Text style={styles.subtitle}>
            Evidencia administrativa separada de historia clínica, sesiones y facturación.
          </Text>
        </View>
        {loading && !consent ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : status ? (
          <View style={[styles.statusBadge, isGranted ? styles.statusGranted : styles.statusPending]}>
            <Text style={[styles.statusText, isGranted ? styles.statusTextGranted : styles.statusTextPending]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusUnknown]}>
            <Text style={[styles.statusText, styles.statusTextUnknown]}>No disponible</Text>
          </View>
        )}
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.errorBox}
        >
          <Ionicons name="alert-circle-outline" size={19} color={theme.error} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>No se pudo verificar el consentimiento</Text>
            <Text style={styles.errorText}>{error}</Text>
            {consent ? (
              <Text style={styles.errorText}>Se muestran los últimos datos disponibles.</Text>
            ) : null}
          </View>
          <Button
            variant="ghost"
            size="small"
            onPress={onRetry}
            disabled={loading}
            loading={loading}
          >
            Reintentar
          </Button>
        </View>
      ) : null}

      {consent ? (
        <>
      <View style={styles.rows}>
        <ConsentRow label="Método" value={method} />
        <ConsentRow label="Versión" value={formatConsentVersion(consent?.version ?? null)} />
        <ConsentRow label="Solicitado" value={formatDate(consent?.requestedAt ?? null)} />
        <ConsentRow label="Concedido" value={formatDate(consent?.grantedAt ?? null)} />
      </View>

      {consent?.activeRequest ? (
        <View style={styles.requestBox}>
          <Ionicons name="mail-outline" size={18} color={theme.primary} />
          <View style={styles.requestCopy}>
            <Text style={styles.requestTitle}>
              Solicitud digital {REQUEST_STATUS_LABELS[consent.activeRequest.status].toLowerCase()}
            </Text>
            {consent.activeRequest.status === 'PENDING' ? (
              <Text style={styles.requestMeta}>
                El enlace caduca el {new Date(consent.activeRequest.expiresAt).toLocaleString('es-ES')}
              </Text>
            ) : consent.activeRequest.status === 'EXPIRED' ? (
              <Text style={styles.requestMeta}>
                El enlace caducó el {new Date(consent.activeRequest.expiresAt).toLocaleString('es-ES')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {guestRequest ? (
        <View style={styles.requestBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
          <View style={styles.requestCopy}>
            <Text style={styles.requestTitle}>
              {guestRequest.requestKind === 'WITHDRAWAL' ? 'Retirada' : 'Autorización'} por email · {guestEffectivelyExpired
                ? 'caducada'
                : REQUEST_STATUS_LABELS[guestRequest.status].toLowerCase()}
            </Text>
            <Text style={styles.requestMeta}>
              Entrega del enlace: {guestRequest.linkDeliveryStatus === 'PROVIDER_ACCEPTED'
                ? 'enviado'
                : guestRequest.linkDeliveryStatus === 'UNKNOWN'
                  ? 'entrega no confirmada'
                  : guestRequest.linkDeliveryStatus === 'FAILED'
                    ? 'no entregado y cancelado'
                    : guestRequest.linkDeliveryStatus === 'PENDING'
                      ? 'procesando'
                      : 'cancelada'}
            </Text>
            {guestPending ? (
              <Text style={styles.requestMeta}>
                El enlace caduca el {new Date(guestRequest.expiresAt).toLocaleString('es-ES')}
              </Text>
            ) : guestEffectivelyExpired || guestRequest.status === 'EXPIRED' ? (
              <Text style={styles.requestMeta}>
                El enlace caducó el {new Date(guestRequest.expiresAt).toLocaleString('es-ES')}
              </Text>
            ) : guestRequest.status === 'ACCEPTED' ? (
              <Text style={styles.requestMeta}>
                {guestRequest.requestKind === 'WITHDRAWAL'
                  ? 'Retirada confirmada por el paciente.'
                  : 'Identidad verificada y autorización confirmada.'}
              </Text>
            ) : guestRequest.status === 'REJECTED' ? (
              <Text style={styles.requestMeta}>Solicitud rechazada por el paciente.</Text>
            ) : guestRequest.status === 'REVOKED' ? (
              <Text style={styles.requestMeta}>Esta autorización fue retirada.</Text>
            ) : guestRequest.status === 'CANCELLED' ? (
              <Text style={styles.requestMeta}>Solicitud cancelada.</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {digitalGuidance ? (
        <View
          accessible
          accessibilityLabel={`${digitalGuidance.title}. Email administrativo: ${consent.patientEmail ?? 'no informado'}. Cuenta HERA: ${consent.hasLinkedHeraAccount ? 'vinculada' : 'no vinculada'}. ${digitalGuidance.description}`}
          accessibilityLiveRegion="polite"
          style={[
            styles.deliveryBox,
            digitalGuidance.tone === 'positive' ? styles.deliveryAvailable : styles.deliveryUnavailable,
          ]}
        >
          <View
            style={[
              styles.deliveryIcon,
              digitalGuidance.tone === 'positive'
                ? styles.deliveryIconAvailable
                : styles.deliveryIconUnavailable,
            ]}
          >
            <Ionicons
              name={digitalGuidance.tone === 'positive' ? 'mail-open-outline' : 'information-circle-outline'}
              size={19}
              color={digitalGuidance.tone === 'positive' ? theme.success : theme.warning}
            />
          </View>
          <View style={styles.deliveryCopy}>
            <Text style={styles.deliveryTitle}>{digitalGuidance.title}</Text>
            <View style={styles.deliveryFacts}>
              <View style={styles.deliveryFact}>
                <Ionicons name="at-outline" size={16} color={theme.textMuted} />
                <View style={styles.deliveryFactCopy}>
                  <Text style={styles.deliveryFactLabel}>Email administrativo</Text>
                  <Text style={styles.deliveryFactValue}>{consent.patientEmail ?? 'No informado'}</Text>
                </View>
              </View>
              <View style={styles.deliveryFact}>
                <Ionicons name="person-circle-outline" size={16} color={theme.textMuted} />
                <View style={styles.deliveryFactCopy}>
                  <Text style={styles.deliveryFactLabel}>Cuenta HERA</Text>
                  <Text style={styles.deliveryFactValue}>
                    {consent.hasLinkedHeraAccount ? 'Vinculada' : 'No vinculada'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.deliveryDescription}>{digitalGuidance.description}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {showDigitalRequestAction ? (
          <Button
            variant="outline"
            size="medium"
            onPress={requestDigitalConsent}
            disabled={!canOperate || !digitalRequestAvailable}
            loading={saving}
            accessibilityLabel={digitalRequestAvailable
              ? digitalGuidance?.channel === 'GUEST_EMAIL'
                ? 'Solicitar consentimiento digital por email al paciente sin cuenta HERA'
                : 'Solicitar consentimiento digital por email a la cuenta HERA vinculada'
              : `Solicitar consentimiento digital, no disponible${digitalGuidance?.unavailableReason ? `: ${digitalGuidance.unavailableReason}` : ''}`}
            icon={<Ionicons name="send-outline" size={18} color={theme.primary} />}
          >
            Solicitar digital
          </Button>
        ) : null}
        {guestPending ? (
          <>
            {guestActionsEnabled ? (
              <Button variant="outline" size="medium" onPress={onResendGuestConsent} disabled={!canOperate} loading={saving}>
                Reenviar
              </Button>
            ) : null}
            <Button variant="ghost" size="medium" onPress={onCancelGuestConsent} disabled={!canOperate} loading={saving}>
              Cancelar solicitud
            </Button>
          </>
        ) : null}
        {canRequestGuestWithdrawal ? (
          <Button variant="outline" size="medium" onPress={onRequestGuestWithdrawal} disabled={!canOperate} loading={saving}>
            Solicitar retirada
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="medium"
          onPress={() => { void handleUpload(); }}
          disabled={!canOperate}
          loading={saving}
          icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />}
        >
          Subir PDF
        </Button>
      </View>

      {consent?.documents.length ? (
        <View style={styles.documents}>
          <Text style={styles.documentsTitle}>Evidencias</Text>
          {consent.documents.map((document) => (
            <View key={document.id} style={styles.documentRow}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.documentCopy}>
                <Text style={styles.documentName} numberOfLines={1}>{document.fileName}</Text>
                <Text style={styles.documentMeta}>
                  {formatDate(document.uploadedAt)} · {formatBytes(document.sizeBytes)}
                </Text>
              </View>
              <Button
                variant="ghost"
                size="small"
                onPress={() => onOpenDocument(document)}
                loading={openingDocumentId === document.id}
                disabled={Boolean(openingDocumentId) || Boolean(error)}
                icon={<Ionicons name="download-outline" size={17} color={theme.primary} />}
              >
                Abrir
              </Button>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyEvidence}>
          <Ionicons name="document-attach-outline" size={18} color={theme.textMuted} />
          <Text style={styles.emptyEvidenceText}>Todavía no hay PDF firmado asociado.</Text>
        </View>
      )}
        </>
      ) : (
        <View style={styles.unavailableState}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="shield-outline" size={20} color={theme.textMuted} />
          )}
          <Text style={styles.emptyEvidenceText}>
            {loading
              ? 'Verificando el estado del consentimiento…'
              : 'El estado del consentimiento no está disponible.'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ConsentRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.md,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    statusBadge: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusGranted: {
      backgroundColor: theme.successBg,
      borderColor: theme.status.confirmed.border,
    },
    statusPending: {
      backgroundColor: theme.warningBg,
      borderColor: theme.warning,
    },
    statusUnknown: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
    },
    statusText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    statusTextGranted: {
      color: theme.success,
    },
    statusTextPending: {
      color: theme.warning,
    },
    statusTextUnknown: {
      color: theme.textMuted,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 8,
      backgroundColor: theme.errorBg,
      padding: spacing.sm,
    },
    errorCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    errorTitle: {
      color: theme.error,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
    },
    errorText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    rows: {
      gap: spacing.xs,
    },
    row: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.xs,
    },
    rowLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    rowValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
    },
    requestBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
    requestCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    requestTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
    },
    requestMeta: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    deliveryBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.md,
    },
    deliveryAvailable: {
      backgroundColor: theme.successBg,
      borderColor: theme.status.confirmed.border,
    },
    deliveryUnavailable: {
      backgroundColor: theme.warningBg,
      borderColor: theme.warning,
    },
    deliveryIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deliveryIconAvailable: {
      backgroundColor: theme.bgCard,
      borderColor: theme.status.confirmed.border,
    },
    deliveryIconUnavailable: {
      backgroundColor: theme.bgCard,
      borderColor: theme.warning,
    },
    deliveryCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.sm,
    },
    deliveryTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
    },
    deliveryFacts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    deliveryFact: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 180,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.sm,
    },
    deliveryFactCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    deliveryFactLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      lineHeight: 15,
      textTransform: 'uppercase',
    },
    deliveryFactValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
      flexShrink: 1,
    },
    deliveryDescription: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    documents: {
      gap: spacing.sm,
    },
    documentsTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
    },
    documentRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.sm,
    },
    documentIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    documentCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    documentName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
    },
    documentMeta: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    emptyEvidence: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
    emptyEvidenceText: {
      flex: 1,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    unavailableState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
  });
