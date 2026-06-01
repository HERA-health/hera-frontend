import React, { useMemo } from 'react';
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
  saving: boolean;
  openingDocumentId: string | null;
  canManage: boolean;
  patientStatus: ClinicPatientStatus;
  onRequestDigitalConsent: () => void;
  onUploadEvidence: (file: UploadAsset) => void;
  onOpenDocument: (document: ClinicPatientConsentDocument) => void;
}

const STATUS_LABELS: Record<ClinicPatientConsentStatus, string> = {
  PENDING: 'Pendiente',
  GRANTED: 'Concedido',
  REVOKED: 'Revocado',
};

const METHOD_LABELS: Record<ClinicPatientConsentMethod, string> = {
  DIGITAL_SIGNATURE: 'Digital HERA',
  CLINIC_ADMIN_ATTESTATION: 'PDF firmado',
};

const REQUEST_STATUS_LABELS: Record<ClinicPatientConsentRequestStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Caducada',
  CANCELLED: 'Cancelada',
};

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
  saving,
  openingDocumentId,
  canManage,
  patientStatus,
  onRequestDigitalConsent,
  onUploadEvidence,
  onOpenDocument,
}: ClinicPatientConsentPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const status = consent?.status ?? 'PENDING';
  const method = consent?.method ? METHOD_LABELS[consent.method] : 'Sin método';
  const isGranted = status === 'GRANTED';
  const canOperate = canManage && patientStatus === 'ACTIVE' && !saving && !loading;

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
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={[styles.statusBadge, isGranted ? styles.statusGranted : styles.statusPending]}>
            <Text style={[styles.statusText, isGranted ? styles.statusTextGranted : styles.statusTextPending]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rows}>
        <ConsentRow label="Método" value={method} />
        <ConsentRow label="Versión" value={consent?.version ?? 'Sin versión'} />
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
            <Text style={styles.requestMeta}>
              Caduca el {new Date(consent.activeRequest.expiresAt).toLocaleString('es-ES')}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="medium"
          onPress={onRequestDigitalConsent}
          disabled={!canOperate || isGranted}
          loading={saving}
          icon={<Ionicons name="send-outline" size={18} color={theme.primary} />}
        >
          Solicitar digital
        </Button>
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
                disabled={Boolean(openingDocumentId)}
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
  });
