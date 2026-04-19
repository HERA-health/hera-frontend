import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { ClinicalDocument, ClinicalNote } from '../../services/clinicalService';

interface ClinicalSessionFolderCardSession {
  id: string;
  date: string;
  duration: number;
  status: string;
  type: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total?: number;
  } | null;
}

interface ClinicalSessionFolderCardProps {
  session: ClinicalSessionFolderCardSession;
  notes: ClinicalNote[];
  documents: ClinicalDocument[];
  consentGranted: boolean;
  isTablet: boolean;
  openingDocumentId: string | null;
  documentUploading: boolean;
  invoiceLoading: boolean;
  onAddNote: () => void;
  onUploadAttachment: () => void;
  onUploadExercise: () => void;
  onOpenDocument: (document: ClinicalDocument) => void;
  onOpenInvoice: () => void;
  onManageInvoice: () => void;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Videollamada',
  IN_PERSON: 'Presencial',
  PHONE_CALL: 'Llamada',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
};

const SESSION_NOTES_PREVIEW_COUNT = 2;
const SESSION_MATERIAL_PREVIEW_COUNT = 3;

const formatDate = (value?: string | Date | null, withTime = true) =>
  value
    ? new Date(value).toLocaleString(
        'es-ES',
        withTime
          ? {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          : {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }
      )
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

export function ClinicalSessionFolderCard({
  session,
  notes,
  documents,
  consentGranted,
  isTablet,
  openingDocumentId,
  documentUploading,
  invoiceLoading,
  onAddNote,
  onUploadAttachment,
  onUploadExercise,
  onOpenDocument,
  onOpenInvoice,
  onManageInvoice,
}: ClinicalSessionFolderCardProps) {
  const { theme } = useTheme();

  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const [visibleNotesCount, setVisibleNotesCount] = useState(SESSION_NOTES_PREVIEW_COUNT);
  const [visibleExercisesCount, setVisibleExercisesCount] = useState(SESSION_MATERIAL_PREVIEW_COUNT);
  const [visibleAttachmentsCount, setVisibleAttachmentsCount] = useState(
    SESSION_MATERIAL_PREVIEW_COUNT
  );

  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [notes]
  );

  const attachmentDocuments = useMemo(
    () => documents.filter((document) => document.category !== 'SESSION_EXERCISE'),
    [documents]
  );

  const exerciseDocuments = useMemo(
    () => documents.filter((document) => document.category === 'SESSION_EXERCISE'),
    [documents]
  );
  const visibleNotes = useMemo(
    () => sortedNotes.slice(0, visibleNotesCount),
    [sortedNotes, visibleNotesCount]
  );
  const visibleExercises = useMemo(
    () => exerciseDocuments.slice(0, visibleExercisesCount),
    [exerciseDocuments, visibleExercisesCount]
  );
  const visibleAttachments = useMemo(
    () => attachmentDocuments.slice(0, visibleAttachmentsCount),
    [attachmentDocuments, visibleAttachmentsCount]
  );

  const canManageInvoice = session.status.toUpperCase() === 'COMPLETED' && !session.invoice;
  const statusColor =
    session.status.toUpperCase() === 'COMPLETED'
      ? theme.success
      : session.status.toUpperCase() === 'CONFIRMED'
        ? theme.primary
        : session.status.toUpperCase() === 'PENDING'
          ? theme.warning
          : theme.textMuted;

  return (
    <Card variant="default" padding="large" style={styles.folderCard}>
      <View style={[styles.folderHeader, !isTablet && styles.folderHeaderStack]}>
        <View style={styles.folderIntro}>
          <View style={[styles.folderEyebrow, { backgroundColor: theme.primaryAlpha12 }]}>
            <Ionicons name="folder-open-outline" size={14} color={theme.primary} />
            <Text style={[styles.folderEyebrowText, { color: theme.primary }, labelStyle]}>
              Carpeta de sesión
            </Text>
          </View>
          <Text style={[styles.folderTitle, { color: theme.textPrimary }, displayTitleStyle]}>
            {formatDate(session.date, false)}
          </Text>
          <Text style={[styles.folderSubtitle, { color: theme.textSecondary }]}>
            {session.duration} min · {SESSION_TYPE_LABELS[session.type] || session.type}
          </Text>
        </View>

        <View style={styles.folderMeta}>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: `${statusColor}16`,
                borderColor: `${statusColor}2E`,
              },
            ]}
          >
            <Text style={[styles.metaPillText, { color: statusColor }, labelStyle]}>
              {SESSION_STATUS_LABELS[session.status] || session.status}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <Text style={[styles.metaPillText, { color: theme.textSecondary }, labelStyle]}>
              {sortedNotes.length} {sortedNotes.length === 1 ? 'nota' : 'notas'}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <Text style={[styles.metaPillText, { color: theme.textSecondary }, labelStyle]}>
              {documents.length} {documents.length === 1 ? 'archivo' : 'archivos'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button variant="secondary" size="small" onPress={onAddNote}>
          Añadir nota
        </Button>
        <Button
          variant="ghost"
          size="small"
          onPress={onUploadAttachment}
          disabled={!consentGranted}
          loading={documentUploading}
        >
          Adjuntar documento
        </Button>
        <Button
          variant="ghost"
          size="small"
          onPress={onUploadExercise}
          disabled={!consentGranted}
          loading={documentUploading}
        >
          Subir ejercicio
        </Button>
      </View>

      <View style={[styles.dossierGrid, !isTablet && styles.dossierGridStack]}>
        <Card variant="outlined" padding="large" style={[styles.dossierPanel, { borderColor: theme.border }]}>
          <View style={styles.panelTopRow}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Notas clínicas
            </Text>
            <Text style={[styles.panelCount, { color: theme.textMuted }, labelStyle]}>
              {sortedNotes.length}
            </Text>
          </View>

          {sortedNotes.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Todavía no hay notas asociadas a esta sesión.
              </Text>
            </View>
          ) : (
            <View style={styles.listStack}>
              {visibleNotes.map((note) => (
                <View
                  key={note.id}
                  style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
                >
                  <View style={styles.listRowHeader}>
                    <Ionicons name="ellipse" size={10} color={theme.primary} />
                    <Text style={[styles.listRowTitle, { color: theme.textPrimary }, emphasisStyle]}>
                      {formatDate(note.updatedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.listRowBody, { color: theme.textSecondary }]}>
                    {note.content}
                  </Text>
                </View>
              ))}

              {visibleNotesCount < sortedNotes.length ? (
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => setVisibleNotesCount((current) => current + SESSION_NOTES_PREVIEW_COUNT)}
                >
                  Ver más notas
                </Button>
              ) : null}
            </View>
          )}
        </Card>

        <Card variant="outlined" padding="large" style={[styles.dossierPanel, { borderColor: theme.border }]}>
          <View style={styles.panelTopRow}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Facturación
            </Text>
            <Text style={[styles.panelCount, { color: theme.textMuted }, labelStyle]}>
              {session.invoice ? 'Sincronizada' : 'Pendiente'}
            </Text>
          </View>

          {session.invoice ? (
            <View style={styles.invoicePanelContent}>
              <View style={[styles.invoiceBadge, { backgroundColor: theme.successBg, borderColor: `${theme.success}25` }]}>
                <Text style={[styles.invoiceBadgeText, { color: theme.success }, labelStyle]}>
                  {session.invoice.status === 'PAID'
                    ? 'Pagada'
                    : session.invoice.status === 'SENT'
                      ? 'Enviada'
                      : session.invoice.status === 'CANCELLED'
                        ? 'Cancelada'
                        : 'Borrador'}
                </Text>
              </View>
              <Text style={[styles.invoiceNumber, { color: theme.textPrimary }, displayTitleStyle]}>
                {session.invoice.invoiceNumber}
              </Text>
              <Text style={[styles.invoiceCopy, { color: theme.textSecondary }]}>
                Esta factura está vinculada a la sesión y disponible también en el área de facturación.
              </Text>
              <Button variant="outline" size="small" onPress={onOpenInvoice}>
                Abrir factura
              </Button>
            </View>
          ) : canManageInvoice ? (
            <View style={styles.invoicePanelContent}>
              <Text style={[styles.invoiceNumber, { color: theme.textPrimary }, displayTitleStyle]}>
                Elige cómo facturarla
              </Text>
              <Text style={[styles.invoiceCopy, { color: theme.textSecondary }]}>
                Puedes reutilizar una factura preparada o crear una nueva desde esta sesión sin salir del flujo clínico.
              </Text>
              <Button
                variant="primary"
                size="small"
                onPress={onManageInvoice}
                loading={invoiceLoading}
              >
                Gestionar factura
              </Button>
            </View>
          ) : (
            <View style={styles.invoicePanelContent}>
              <Text style={[styles.invoiceNumber, { color: theme.textPrimary }, displayTitleStyle]}>
                No disponible todavía
              </Text>
              <Text style={[styles.invoiceCopy, { color: theme.textSecondary }]}>
                La factura de esta sesión se activa cuando la sesión queda completada.
              </Text>
            </View>
          )}
        </Card>

        <Card variant="outlined" padding="large" style={[styles.dossierPanel, { borderColor: theme.border }]}>
          <View style={styles.panelTopRow}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Material de sesión
            </Text>
            <Text style={[styles.panelCount, { color: theme.textMuted }, labelStyle]}>
              {documents.length}
            </Text>
          </View>

          {documents.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
              <Ionicons name="attach-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No hay documentos ni ejercicios asociados a esta sesión.
              </Text>
            </View>
          ) : (
            <View style={styles.materialStack}>
              {exerciseDocuments.length > 0 ? (
                <View style={styles.materialSection}>
                  <Text style={[styles.materialSectionTitle, { color: theme.textMuted }, labelStyle]}>
                    Ejercicios y recursos
                  </Text>
                  {visibleExercises.map((document) => (
                    <View
                      key={document.id}
                      style={[styles.documentRow, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
                    >
                      <View style={[styles.documentIconWrap, { backgroundColor: theme.primaryAlpha12 }]}>
                        <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
                      </View>
                      <View style={styles.documentCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.listRowTitle, { color: theme.textPrimary }, emphasisStyle]}
                        >
                          {document.fileName}
                        </Text>
                        <Text style={[styles.listRowBody, { color: theme.textSecondary }]}>
                          Ejercicio · {formatDate(document.uploadedAt)} · {formatFileSize(document.sizeBytes)}
                        </Text>
                      </View>
                      <Button
                        variant="ghost"
                        size="small"
                        onPress={() => onOpenDocument(document)}
                        loading={openingDocumentId === document.id}
                      >
                        Abrir
                      </Button>
                    </View>
                  ))}

                  {visibleExercisesCount < exerciseDocuments.length ? (
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() =>
                        setVisibleExercisesCount((current) => current + SESSION_MATERIAL_PREVIEW_COUNT)
                      }
                    >
                      Ver más ejercicios
                    </Button>
                  ) : null}
                </View>
              ) : null}

              {attachmentDocuments.length > 0 ? (
                <View style={styles.materialSection}>
                  <Text style={[styles.materialSectionTitle, { color: theme.textMuted }, labelStyle]}>
                    Documentos enlazados
                  </Text>
                  {visibleAttachments.map((document) => (
                    <View
                      key={document.id}
                      style={[styles.documentRow, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
                    >
                      <View style={[styles.documentIconWrap, { backgroundColor: theme.primaryAlpha12 }]}>
                        <Ionicons name={getDocumentIcon(document.mimeType)} size={16} color={theme.primary} />
                      </View>
                      <View style={styles.documentCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.listRowTitle, { color: theme.textPrimary }, emphasisStyle]}
                        >
                          {document.fileName}
                        </Text>
                        <Text style={[styles.listRowBody, { color: theme.textSecondary }]}>
                          Documento · {formatDate(document.uploadedAt)} · {formatFileSize(document.sizeBytes)}
                        </Text>
                      </View>
                      <Button
                        variant="ghost"
                        size="small"
                        onPress={() => onOpenDocument(document)}
                        loading={openingDocumentId === document.id}
                      >
                        Abrir
                      </Button>
                    </View>
                  ))}

                  {visibleAttachmentsCount < attachmentDocuments.length ? (
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() =>
                        setVisibleAttachmentsCount((current) => current + SESSION_MATERIAL_PREVIEW_COUNT)
                      }
                    >
                      Ver más archivos
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </Card>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  folderCard: {
    gap: spacing.lg,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  folderHeaderStack: {
    flexDirection: 'column',
  },
  folderIntro: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 240,
  },
  folderEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  folderEyebrowText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  folderTitle: {
    fontSize: typography.fontSizes.xxxl,
    lineHeight: 36,
  },
  folderSubtitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  folderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    minWidth: 220,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  metaPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dossierGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  dossierGridStack: {
    flexDirection: 'column',
  },
  dossierPanel: {
    flex: 1,
    minWidth: 240,
    gap: spacing.md,
  },
  panelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  panelCount: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyWrap: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  listStack: {
    gap: spacing.sm,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  listRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listRowTitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  listRowBody: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 21,
  },
  invoicePanelContent: {
    gap: spacing.sm,
  },
  invoiceBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  invoiceBadgeText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  invoiceNumber: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  invoiceCopy: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  materialStack: {
    gap: spacing.md,
  },
  materialSection: {
    gap: spacing.sm,
  },
  materialSectionTitle: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  documentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCopy: {
    flex: 1,
    gap: 2,
  },
});
