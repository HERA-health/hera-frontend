import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { TourTarget } from '../onboarding/TourTarget';
import { ClinicalQuestionnairePanel } from './ClinicalQuestionnairePanel';
import { ClinicalConsentPanel } from './ClinicalConsentPanel';
import { ClinicalDocumentsPanel } from './ClinicalDocumentsPanel';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { UploadAsset } from '../../utils/multipartUpload';
import type { Client } from '../../services/professionalService';
import type { ClinicalDocument, ClinicalRecord } from '../../services/clinicalService';

interface ClinicalGeneralWorkspaceProps {
  client: Client;
  record: ClinicalRecord;
  isTablet: boolean;
  noteSaving: boolean;
  documentUploading: boolean;
  consentSubmitting: boolean;
  closingProcess: boolean;
  openingDocumentId: string | null;
  loadingMoreNotes: boolean;
  loadingMoreDocuments: boolean;
  loadingMoreConsentEvents: boolean;
  onSaveNote: (content: string) => Promise<void>;
  onOpenDocument: (document: ClinicalDocument) => Promise<void>;
  onUploadDocument: (
    file: UploadAsset,
    category: 'GENERAL' | 'CONSENT_EVIDENCE' | 'MEDICAL_REPORT'
  ) => Promise<unknown>;
  onRequestDigitalConsent: () => Promise<unknown>;
  onAttestClinicalConsent: (evidenceDocumentId?: string) => Promise<void>;
  onCloseClinicalProcess: () => Promise<void>;
  onLoadMoreNotes: () => void;
  onLoadMoreDocuments: () => void;
  onLoadMoreConsentEvents: () => void;
  tourTargetsActive?: boolean;
}

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

export function ClinicalGeneralWorkspace({
  client,
  record,
  isTablet,
  noteSaving,
  documentUploading,
  consentSubmitting,
  closingProcess,
  openingDocumentId,
  loadingMoreNotes,
  loadingMoreDocuments,
  loadingMoreConsentEvents,
  onSaveNote,
  onOpenDocument,
  onUploadDocument,
  onRequestDigitalConsent,
  onAttestClinicalConsent,
  onCloseClinicalProcess,
  onLoadMoreNotes,
  onLoadMoreDocuments,
  onLoadMoreConsentEvents,
  tourTargetsActive = true,
}: ClinicalGeneralWorkspaceProps) {
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontHeading }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const [noteDraft, setNoteDraft] = useState('');
  const clinicalContentGranted = record.consentStatus === 'GRANTED';

  const consentEvidenceDocuments = useMemo(
    () => record.documents.filter((document) => document.category === 'CONSENT_EVIDENCE'),
    [record.documents]
  );
  const medicalReports = useMemo(
    () => record.documents.filter((document) => document.category === 'MEDICAL_REPORT'),
    [record.documents]
  );
  const generalDocuments = useMemo(
    () => record.documents.filter((document) => document.category === 'GENERAL'),
    [record.documents]
  );

  const handleUpload = async (category: 'GENERAL' | 'CONSENT_EVIDENCE' | 'MEDICAL_REPORT') => {
    const asset = await pickClinicalAsset();
    if (!asset) {
      return;
    }

    await onUploadDocument(asset, category);
  };

  const handleSaveNote = async () => {
    const trimmedDraft = noteDraft.trim();
    if (!trimmedDraft) {
      return;
    }

    await onSaveNote(trimmedDraft);
    setNoteDraft('');
  };

  const notesPanel = (
    <Card variant="default" padding="large" style={isTablet ? styles.stretchPanel : undefined}>
      <TourTarget
        id="professional.clinical.notes"
        active={tourTargetsActive}
        fill
        style={styles.fullWidthTourTarget}
      >
        <View style={[styles.sectionHeader, !isTablet && styles.sectionHeaderMobile]}>
          <View style={[styles.sectionCopy, !isTablet && styles.sectionCopyMobile]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }, displayTitleStyle]}>
              Notas generales
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Úsalas para registrar contexto estable del proceso, acuerdos o hitos que no dependen de una única sesión.
            </Text>
          </View>
          <View style={[styles.counterPill, { backgroundColor: theme.primaryAlpha12 }]}>
            <Text style={[styles.counterText, { color: theme.primary }, labelStyle]}>
              {record.notes.length} notas
            </Text>
          </View>
        </View>
      </TourTarget>

      <TextInput
        multiline
        value={noteDraft}
        onChangeText={setNoteDraft}
        editable={clinicalContentGranted}
        placeholder="Escribe aquí una nota general del expediente..."
        placeholderTextColor={theme.textMuted}
        style={[
          styles.noteInput,
          !isTablet && styles.noteInputMobile,
          {
            color: theme.textPrimary,
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
            fontFamily: theme.fontSans,
          },
        ]}
      />

      <View style={[styles.noteFooter, !isTablet && styles.noteFooterMobile]}>
        <Text style={[styles.noteHint, { color: theme.textMuted }]}>
          Solo estará disponible dentro del área clínica desbloqueada.
        </Text>
        <Button
          variant="secondary"
          size="small"
          onPress={handleSaveNote}
          loading={noteSaving}
          disabled={!clinicalContentGranted || !noteDraft.trim()}
        >
          Guardar nota
        </Button>
      </View>
    </Card>
  );

  const timelinePanel = (
    <Card variant="default" padding="large">
      <TourTarget
        id="professional.clinical.timeline"
        active={tourTargetsActive}
        fill
        style={styles.fullWidthTourTarget}
      >
        <View style={[styles.sectionHeader, !isTablet && styles.sectionHeaderMobile]}>
          <View style={[styles.sectionCopy, !isTablet && styles.sectionCopyMobile]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }, displayTitleStyle]}>
              Timeline general
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Revisión rápida de las notas generales más recientes del expediente.
            </Text>
          </View>
        </View>
      </TourTarget>

      {record.notes.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
          <Ionicons name="document-text-outline" size={22} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
            Todavía no hay notas generales
          </Text>
          <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
            Las notas generales aparecerán aquí para que el seguimiento del proceso sea fácil de revisar.
          </Text>
        </View>
      ) : (
        <View style={styles.timelineStack}>
          {record.notes.map((note) => (
            <View
              key={note.id}
              style={[styles.timelineRow, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}
            >
              <View style={styles.timelineDotWrap}>
                <Ionicons name="ellipse" size={10} color={theme.primary} />
              </View>
              <View style={styles.timelineCopy}>
                <Text style={[styles.timelineDate, { color: theme.textPrimary }, emphasisStyle]}>
                  {formatDate(note.updatedAt)}
                </Text>
                <Text style={[styles.timelineBody, { color: theme.textSecondary }]}>
                  {note.content}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {record.pagination.notes.hasMore ? (
        <Button variant="ghost" size="small" onPress={onLoadMoreNotes} loading={loadingMoreNotes}>
          Ver más notas
        </Button>
      ) : null}
    </Card>
  );

  const questionnairePanel = (
    <ClinicalQuestionnairePanel
      isTablet={isTablet}
      completedQuestionnaire={record.client.completedQuestionnaire}
      questionnaireAvailability={record.client.questionnaireAvailability}
      summary={record.client.questionnaireSummary}
      answers={record.client.questionnaireAnswers}
      tourTargetId="professional.clinical.questionnaire"
      tourTargetsActive={tourTargetsActive}
      style={isTablet ? styles.stretchPanel : undefined}
    />
  );

  const consentPanel = (
    <ClinicalConsentPanel
      isTablet={isTablet}
      client={client}
      record={record}
      consentEvidenceDocuments={consentEvidenceDocuments}
      openingDocumentId={openingDocumentId}
      documentUploading={documentUploading}
      consentSubmitting={consentSubmitting}
      closingProcess={closingProcess}
      loadingMoreConsentEvents={loadingMoreConsentEvents}
      onUploadConsentDocument={() => void handleUpload('CONSENT_EVIDENCE')}
      onOpenConsentDocument={(document) => void onOpenDocument(document)}
      onRequestDigitalConsent={onRequestDigitalConsent}
      onAttestClinicalConsent={onAttestClinicalConsent}
      onCloseClinicalProcess={onCloseClinicalProcess}
      onLoadMoreConsentEvents={onLoadMoreConsentEvents}
      tourTargetId="professional.clinical.consent"
      consentDocumentTourTargetId="professional.clinical.consent-documents"
      tourTargetsActive={tourTargetsActive}
    />
  );

  const medicalReportsPanel = (
    <ClinicalDocumentsPanel
      isTablet={isTablet}
      title="Informes médicos"
      description="Reúne informes de derivación, diagnósticos y documentación clínica de apoyo."
      documents={medicalReports}
      openingDocumentId={openingDocumentId}
      uploadLabel="Añadir informe"
      uploading={documentUploading}
      emptyTitle="No hay informes médicos cargados"
      emptyDescription="Sube aquí los informes relevantes que acompañan al proceso terapéutico."
      onUpload={clinicalContentGranted ? () => void handleUpload('MEDICAL_REPORT') : undefined}
      onOpenDocument={(document) => void onOpenDocument(document)}
      tourTargetId="professional.clinical.reports"
      tourTargetsActive={tourTargetsActive}
      style={isTablet ? styles.stretchPanel : undefined}
    />
  );

  const generalDocumentsPanel = (
    <ClinicalDocumentsPanel
      isTablet={isTablet}
      title="Documentación general"
      description="Espacio para documentación fija del paciente no vinculada a una sesión concreta."
      documents={generalDocuments}
      openingDocumentId={openingDocumentId}
      uploadLabel="Añadir documento"
      uploading={documentUploading}
      emptyTitle="No hay documentos generales"
      emptyDescription="Puedes dejar aquí información complementaria que convenga tener accesible en la carpeta general."
      onUpload={clinicalContentGranted ? () => void handleUpload('GENERAL') : undefined}
      onOpenDocument={(document) => void onOpenDocument(document)}
      tourTargetId="professional.clinical.documents"
      tourTargetsActive={tourTargetsActive}
      style={isTablet ? styles.stretchPanel : undefined}
    />
  );

  const documentsPagination = record.pagination.documents.hasMore ? (
    <Button
      variant="ghost"
      size="small"
      onPress={onLoadMoreDocuments}
      loading={loadingMoreDocuments}
    >
      Ver más documentos
    </Button>
  ) : null;

  const contextBand = isTablet ? (
    <View style={styles.balancedRow}>
      <View style={styles.balancedColumn}>
        {questionnairePanel}
      </View>
      <View style={styles.balancedColumn}>
        {notesPanel}
      </View>
    </View>
  ) : (
    <View style={styles.columnStack}>
      {questionnairePanel}
      {notesPanel}
    </View>
  );

  const documentationBand = isTablet ? (
    <View style={styles.balancedRow}>
      <View style={styles.balancedColumn}>
        {medicalReportsPanel}
      </View>
      <View style={styles.balancedColumn}>
        {generalDocumentsPanel}
      </View>
    </View>
  ) : (
    <View style={styles.columnStack}>
      {medicalReportsPanel}
      {generalDocumentsPanel}
    </View>
  );

  return (
    <View style={styles.workspaceStack}>
      <View style={styles.fullWidthBand}>
        {consentPanel}
      </View>
      {contextBand}
      <View style={styles.fullWidthBand}>
        {timelinePanel}
      </View>
      {documentationBand}
      {documentsPagination}
    </View>
  );
}

const styles = StyleSheet.create({
  workspaceStack: {
    gap: spacing.lg,
  },
  balancedRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  balancedColumn: {
    flex: 1,
    minWidth: 0,
  },
  fullWidthBand: {
    width: '100%',
  },
  fullWidthTourTarget: {
    width: '100%',
  },
  columnStack: {
    gap: spacing.lg,
  },
  stretchPanel: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderMobile: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  sectionCopyMobile: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  sectionDescription: {
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
  noteInput: {
    minHeight: 168,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  noteInputMobile: {
    minHeight: 120,
    padding: spacing.sm,
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  noteFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  noteFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  noteHint: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
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
  timelineStack: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  timelineRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineDotWrap: {
    paddingTop: 6,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineDate: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  timelineBody: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
});
