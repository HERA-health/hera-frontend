import React, { useMemo } from 'react';
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
import type { ProfessionalTourTargetId } from '../onboarding/professionalTourTypes';

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
  onUploadConsentDocument: () => void;
  onOpenConsentDocument: (document: ClinicalDocument) => void;
  onRequestDigitalConsent: () => Promise<unknown>;
  onAttestClinicalConsent: (evidenceDocumentId?: string) => Promise<unknown>;
  onCloseClinicalProcess: () => Promise<void>;
  onLoadMoreConsentEvents: () => void;
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

const getMethodLabel = (method: ClinicalRecord['consentMethod']) => {
  if (method === 'DIGITAL_SIGNATURE') {
    return 'Firma digital de consentimiento clínico';
  }

  if (method === 'SPECIALIST_ATTESTATION') {
    return 'Documento de consentimiento clínico';
  }

  return 'Pendiente';
};

const getEventCopy = (event: ClinicalConsentEvent) => {
  if (event.status === 'REVOKED') {
    return {
      title: 'Consentimiento retirado',
      caption: `${getMethodLabel(event.method)} · ${formatDate(event.createdAt)}`,
    };
  }

  return {
    title: 'Consentimiento registrado',
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
  onUploadConsentDocument,
  onOpenConsentDocument,
  onRequestDigitalConsent,
  onAttestClinicalConsent,
  onCloseClinicalProcess,
  onLoadMoreConsentEvents,
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
  const isRegisteredClient = client.source === 'REGISTERED';
  const isManagedClient = client.source === 'MANAGED';

  const consentTone =
    record.consentStatus === 'GRANTED'
      ? theme.success
      : record.consentStatus === 'REVOKED'
        ? theme.error
        : theme.warning;

  const canRequestDigitalConsent =
    isRegisteredClient &&
    record.consentStatus !== 'GRANTED' &&
    !record.closedAt;

  const canAttestConsent =
    isManagedClient &&
    record.consentStatus !== 'GRANTED' &&
    !record.closedAt;

  const consentRequestPending =
    isRegisteredClient &&
    record.activeConsentRequest &&
    record.activeConsentRequest.status === 'PENDING';

  const statusLabel =
    record.consentStatus === 'GRANTED'
      ? 'Vigente'
      : record.consentStatus === 'REVOKED'
        ? 'Retirado'
        : 'Pendiente';
  const digitalMethodDescription = isTablet
    ? 'Vía para pacientes con cuenta HERA. Al firmar desde su cuenta, el consentimiento queda vigente y se habilita el tratamiento de sus datos clínicos.'
    : 'Paciente con cuenta HERA: firma desde su cuenta para dejar el consentimiento vigente.';
  const documentMethodDescription = isTablet
    ? 'Vía para pacientes gestionados sin cuenta HERA. Al registrar el documento firmado, el consentimiento queda vigente y se habilita el tratamiento de sus datos clínicos.'
    : 'Paciente gestionado: sube el documento firmado y regístralo para dejar el consentimiento vigente.';
  const digitalMethodPill = isRegisteredClient
    ? 'Vía de este paciente'
    : isTablet
      ? 'Vía para paciente con cuenta HERA'
      : 'Cuenta HERA';
  const documentMethodPill = isManagedClient
    ? 'Vía de este paciente'
    : isTablet
      ? 'Vía para paciente gestionado'
      : 'Paciente gestionado';
  const header = (
    <View style={[styles.header, !isTablet && styles.headerMobile]}>
      <View style={[styles.copy, !isTablet && styles.copyMobile]}>
        <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
          Consentimiento clínico
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Dos vías según el tipo de paciente. Ambas dejan el consentimiento vigente cuando se completa la vía que corresponde.
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: `${consentTone}14`,
            borderColor: `${consentTone}28`,
          },
        ]}
      >
        <Text style={[styles.statusPillText, { color: consentTone }, labelStyle]}>
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
            Firma digital de consentimiento clínico
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
            Solicitud activa hasta el {formatDate(record.activeConsentRequest?.expiresAt)}.
          </Text>
        </View>
      ) : null}

      {canRequestDigitalConsent ? (
        <View style={[styles.methodActions, !isTablet && styles.methodActionsMobile]}>
          <Button
            variant="secondary"
            size="small"
            onPress={onRequestDigitalConsent}
            loading={consentSubmitting}
          >
            Solicitar firma digital
          </Button>
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
            Documento de consentimiento clínico
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
              No hay documento de consentimiento clínico
            </Text>
            <Text style={[styles.documentEmptyDescription, !isTablet && styles.documentEmptyDescriptionMobile, { color: theme.textSecondary }]}>
              Adjunta aquí el PDF o imagen del consentimiento clínico firmado cuando lo tengas.
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
            Registrar consentimiento firmado
          </Button>
        ) : null}
      </View>

      {canAttestConsent && !latestConsentEvidenceDocumentId ? (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Primero adjunta el consentimiento firmado en esta vía.
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
            Concedido
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
            Historial de consentimiento
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
              const eventColor = event.status === 'REVOKED' ? theme.error : theme.success;

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
  },
  statusPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    letterSpacing: 0.8,
  },
  methodPillTextMobile: {
    letterSpacing: 0.4,
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
    letterSpacing: 0.8,
  },
  detailLabelMobile: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    letterSpacing: 0.4,
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
    letterSpacing: 0.8,
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
