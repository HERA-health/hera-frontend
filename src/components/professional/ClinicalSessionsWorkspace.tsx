import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { ClinicalSessionFolderCard } from './ClinicalSessionFolderCard';
import { ClinicalSessionInvoiceSheet } from './ClinicalSessionInvoiceSheet';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppNavigationProp } from '../../constants/types';
import type { UploadAsset } from '../../utils/multipartUpload';
import type { Client } from '../../services/professionalService';
import type { AttachableInvoiceSummary } from '../../services/billingService';
import { billingService } from '../../services/billingService';
import type { ClinicalDocument, ClinicalSessionFolder } from '../../services/clinicalService';

interface ClinicalSessionsWorkspaceProps {
  clientId: string;
  client: Client;
  isTablet: boolean;
  sessionFolders: ClinicalSessionFolder[];
  hasMore: boolean;
  loadingMore: boolean;
  consentGranted: boolean;
  noteSaving: boolean;
  documentUploading: boolean;
  openingDocumentId: string | null;
  onOpenDocument: (document: ClinicalDocument) => Promise<void>;
  onSaveNote: (content: string, sessionId?: string) => Promise<void>;
  onUploadDocument: (
    file: UploadAsset,
    category: 'SESSION_ATTACHMENT' | 'SESSION_EXERCISE',
    sessionId?: string
  ) => Promise<unknown>;
  onLoadMore: () => void;
  onReloadWorkspace: () => Promise<unknown>;
  onRequestRefreshClient?: () => Promise<void>;
}

const formatDate = (value?: string | Date | null, withTime = false) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : 'Sin fecha';

const pickClinicalAsset = async (): Promise<UploadAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
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
  };
};

export function ClinicalSessionsWorkspace({
  clientId,
  client,
  isTablet,
  sessionFolders,
  hasMore,
  loadingMore,
  consentGranted,
  noteSaving,
  documentUploading,
  openingDocumentId,
  onOpenDocument,
  onSaveNote,
  onUploadDocument,
  onLoadMore,
  onReloadWorkspace,
  onRequestRefreshClient,
}: ClinicalSessionsWorkspaceProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);

  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [invoiceSheetSession, setInvoiceSheetSession] = useState<ClinicalSessionFolder['session'] | null>(null);
  const [attachableInvoices, setAttachableInvoices] = useState<AttachableInvoiceSummary[]>([]);
  const [invoiceSheetLoading, setInvoiceSheetLoading] = useState(false);
  const [invoiceAttaching, setInvoiceAttaching] = useState(false);

  const activeDraftSession = useMemo(
    () => sessionFolders.find((folder) => folder.session.id === draftSessionId)?.session ?? null,
    [draftSessionId, sessionFolders]
  );

  const handleSaveDraft = async () => {
    const trimmedDraft = noteDraft.trim();
    if (!trimmedDraft || !draftSessionId) {
      return;
    }

    await onSaveNote(trimmedDraft, draftSessionId);
    setNoteDraft('');
    setDraftSessionId(null);
  };

  const handleUploadForSession = async (
    sessionId: string,
    category: 'SESSION_ATTACHMENT' | 'SESSION_EXERCISE'
  ) => {
    const asset = await pickClinicalAsset();
    if (!asset) {
      return;
    }

    await onUploadDocument(asset, category, sessionId);
  };

  const handleManageInvoice = async (session: ClinicalSessionFolder['session']) => {
    setInvoiceSheetSession(session);
    setInvoiceSheetLoading(true);

    try {
      const availableInvoices = await billingService.getAttachableInvoicesForSession(session.id);
      setAttachableInvoices(availableInvoices);
    } finally {
      setInvoiceSheetLoading(false);
    }
  };

  const handleAttachInvoice = async (invoiceId: string, sendToPatient: boolean) => {
    if (!invoiceSheetSession) {
      return;
    }

    try {
      setInvoiceAttaching(true);
      await billingService.attachInvoiceToSession(invoiceSheetSession.id, invoiceId, sendToPatient);
      setInvoiceSheetSession(null);
      setAttachableInvoices([]);
      await Promise.all([onReloadWorkspace(), onRequestRefreshClient?.()]);
    } finally {
      setInvoiceAttaching(false);
    }
  };

  const handleCreateInvoice = () => {
    if (!invoiceSheetSession) {
      return;
    }

    setInvoiceSheetSession(null);
    setAttachableInvoices([]);
    navigation.navigate('CreateInvoice', {
      clientId,
      sessionId: invoiceSheetSession.id,
      sessionDate: invoiceSheetSession.date,
      sessionDuration: invoiceSheetSession.duration,
      returnToClientId: clientId,
    });
  };

  const handleOpenInvoice = async (session: ClinicalSessionFolder['session']) => {
    if (!session.invoice) {
      await handleManageInvoice(session);
      return;
    }

    await billingService.downloadInvoice(session.invoice.id, session.invoice.invoiceNumber);
  };

  return (
    <View style={styles.stack}>
      <Card variant="default" padding="large">
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
              Sesiones clínicas
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Cada sesión funciona como una carpeta con sus notas, materiales y factura vinculada.
            </Text>
          </View>
          <View style={[styles.counterPill, { backgroundColor: theme.primaryAlpha12 }]}>
            <Text style={[styles.counterText, { color: theme.primary }, labelStyle]}>
              {sessionFolders.length} cargadas
            </Text>
          </View>
        </View>

        {activeDraftSession ? (
          <View style={[styles.composer, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <View style={styles.composerHeader}>
              <View style={styles.composerCopy}>
                <Text style={[styles.composerTitle, { color: theme.textPrimary }, emphasisStyle]}>
                  Nueva nota para {formatDate(activeDraftSession.date)}
                </Text>
                <Text style={[styles.composerDescription, { color: theme.textSecondary }]}>
                  Registra evolución, observaciones o acuerdos de trabajo de esta sesión.
                </Text>
              </View>
              <Button variant="ghost" size="small" onPress={() => setDraftSessionId(null)}>
                Cancelar
              </Button>
            </View>

            <TextInput
              multiline
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Escribe aquí el seguimiento clínico de la sesión..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.noteInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  fontFamily: theme.fontSans,
                },
              ]}
            />

            <View style={styles.composerActions}>
              <Button
                variant="secondary"
                size="small"
                onPress={handleSaveDraft}
                loading={noteSaving}
                disabled={!noteDraft.trim()}
              >
                Guardar nota
              </Button>
            </View>
          </View>
        ) : null}
      </Card>

      {sessionFolders.length === 0 ? (
        <Card variant="default" padding="large">
          <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <Ionicons name="calendar-clear-outline" size={22} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
              Aún no hay sesiones en esta carpeta clínica
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Cuando el paciente tenga sesiones registradas, aquí aparecerán ordenadas por fecha.
            </Text>
          </View>
        </Card>
      ) : (
        sessionFolders.map((folder) => (
          <ClinicalSessionFolderCard
            key={folder.session.id}
            session={folder.session}
            notes={folder.notes}
            documents={folder.documents}
            consentGranted={consentGranted}
            isTablet={isTablet}
            openingDocumentId={openingDocumentId}
            documentUploading={documentUploading}
            invoiceLoading={invoiceAttaching && invoiceSheetSession?.id === folder.session.id}
            onAddNote={() => {
              setDraftSessionId(folder.session.id);
              setNoteDraft('');
            }}
            onUploadAttachment={() =>
              void handleUploadForSession(folder.session.id, 'SESSION_ATTACHMENT')
            }
            onUploadExercise={() =>
              void handleUploadForSession(folder.session.id, 'SESSION_EXERCISE')
            }
            onOpenDocument={(document) => void onOpenDocument(document)}
            onOpenInvoice={() => void handleOpenInvoice(folder.session)}
            onManageInvoice={() => void handleManageInvoice(folder.session)}
          />
        ))
      )}

      {hasMore ? (
        <Button variant="ghost" size="small" onPress={onLoadMore} loading={loadingMore}>
          Cargar más sesiones
        </Button>
      ) : null}

      <ClinicalSessionInvoiceSheet
        visible={Boolean(invoiceSheetSession)}
        session={invoiceSheetSession
          ? {
              id: invoiceSheetSession.id,
              clientId,
              specialistId: client.user.id || '',
              date: invoiceSheetSession.date,
              duration: invoiceSheetSession.duration,
              status: invoiceSheetSession.status,
              type: invoiceSheetSession.type,
              invoice: invoiceSheetSession.invoice
                ? {
                    id: invoiceSheetSession.invoice.id,
                    invoiceNumber: invoiceSheetSession.invoice.invoiceNumber,
                    status: invoiceSheetSession.invoice.status,
                  }
                : null,
            }
          : null}
        invoices={attachableInvoices}
        loading={invoiceSheetLoading}
        attaching={invoiceAttaching}
        onClose={() => {
          setInvoiceSheetSession(null);
          setAttachableInvoices([]);
        }}
        onCreateNew={handleCreateInvoice}
        onAttachInvoice={(invoiceId, sendToPatient) =>
          void handleAttachInvoice(invoiceId, sendToPatient)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  counterPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  counterText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  composer: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  composerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  composerTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  composerDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  noteInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
});
