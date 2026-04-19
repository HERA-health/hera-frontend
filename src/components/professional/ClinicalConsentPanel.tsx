import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Client } from '../../services/professionalService';
import type { ClinicalConsentEvent, ClinicalRecord } from '../../services/clinicalService';

interface ClinicalConsentPanelProps {
  isTablet: boolean;
  client: Client;
  record: ClinicalRecord;
  consentSubmitting: boolean;
  closingProcess: boolean;
  latestConsentEvidenceDocumentId?: string;
  loadingMoreConsentEvents: boolean;
  onRequestDigitalConsent: () => Promise<unknown>;
  onAttestClinicalConsent: (evidenceDocumentId?: string) => Promise<unknown>;
  onCloseClinicalProcess: () => Promise<void>;
  onLoadMoreConsentEvents: () => void;
}

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin fecha';

const getMethodLabel = (method: ClinicalRecord['consentMethod']) => {
  if (method === 'DIGITAL_SIGNATURE') {
    return 'Firma digital';
  }

  if (method === 'SPECIALIST_ATTESTATION') {
    return 'Consentimiento en poder del profesional';
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
  consentSubmitting,
  closingProcess,
  latestConsentEvidenceDocumentId,
  loadingMoreConsentEvents,
  onRequestDigitalConsent,
  onAttestClinicalConsent,
  onCloseClinicalProcess,
  onLoadMoreConsentEvents,
}: ClinicalConsentPanelProps) {
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);

  const consentTone =
    record.consentStatus === 'GRANTED'
      ? theme.success
      : record.consentStatus === 'REVOKED'
        ? theme.error
        : theme.warning;

  const canRequestDigitalConsent =
    client.source === 'REGISTERED' &&
    record.consentStatus !== 'GRANTED' &&
    !record.closedAt;

  const canAttestConsent =
    client.source === 'MANAGED' &&
    record.consentStatus !== 'GRANTED' &&
    !record.closedAt;

  const consentRequestPending =
    client.source === 'REGISTERED' &&
    record.activeConsentRequest &&
    record.activeConsentRequest.status === 'PENDING';

  return (
    <Card variant="default" padding="large">
      <View style={[styles.header, !isTablet && styles.headerMobile]}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
            Consentimiento
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Gestiona la autorización clínica del paciente y revisa su historial de cambios.
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
            {record.consentStatus === 'GRANTED'
              ? 'Vigente'
              : record.consentStatus === 'REVOKED'
                ? 'Retirado'
                : 'Pendiente'}
          </Text>
        </View>
      </View>

      <View style={[styles.detailGrid, !isTablet && styles.detailGridMobile]}>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, { color: theme.textMuted }, labelStyle]}>
            Método
          </Text>
          <Text style={[styles.detailValue, { color: theme.textPrimary }, emphasisStyle]}>
            {getMethodLabel(record.consentMethod)}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, { color: theme.textMuted }, labelStyle]}>
            Concedido
          </Text>
          <Text style={[styles.detailValue, { color: theme.textPrimary }, emphasisStyle]}>
            {formatDate(record.consentGivenAt)}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, { color: theme.textMuted }, labelStyle]}>
            Retención mínima
          </Text>
          <Text style={[styles.detailValue, { color: theme.textPrimary }, emphasisStyle]}>
            {record.retentionUntil ? formatDate(record.retentionUntil) : 'Sin fecha de cierre'}
          </Text>
        </View>
        <View style={[styles.detailItem, !isTablet && styles.detailItemMobile]}>
          <Text style={[styles.detailLabel, { color: theme.textMuted }, labelStyle]}>
            Proceso asistencial
          </Text>
          <Text style={[styles.detailValue, { color: theme.textPrimary }, emphasisStyle]}>
            {record.closedAt ? `Cerrado el ${formatDate(record.closedAt)}` : 'Abierto'}
          </Text>
        </View>
      </View>

      {consentRequestPending ? (
        <View style={[styles.infoBox, { backgroundColor: theme.primaryAlpha12, borderColor: theme.border }]}>
          <Ionicons name="mail-outline" size={18} color={theme.primary} />
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Solicitud enviada
            </Text>
            <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
              El paciente tiene una solicitud activa hasta el {formatDate(record.activeConsentRequest?.expiresAt)}.
            </Text>
          </View>
        </View>
      ) : null}

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

      <View style={styles.actions}>
        {canRequestDigitalConsent ? (
          <Button variant="secondary" size="small" onPress={onRequestDigitalConsent} loading={consentSubmitting}>
            Solicitar consentimiento digital
          </Button>
        ) : null}

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

        {record.consentStatus === 'GRANTED' && !record.closedAt ? (
          <Button
            variant="outline"
            size="small"
            onPress={onCloseClinicalProcess}
            loading={closingProcess}
          >
            Cerrar proceso asistencial
          </Button>
        ) : null}
      </View>

      {canAttestConsent && !latestConsentEvidenceDocumentId ? (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Antes de registrar el consentimiento, adjunta el documento firmado en la carpeta general.
        </Text>
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
    marginBottom: spacing.md,
  },
  headerMobile: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
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
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailGridMobile: {
    gap: spacing.sm,
  },
  detailItem: {
    minWidth: 180,
    flex: 1,
    gap: 6,
  },
  detailItemMobile: {
    minWidth: '100%',
  },
  detailLabel: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
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
    marginTop: spacing.xs,
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
