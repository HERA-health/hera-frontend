import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { SimpleDropdown, type DropdownOption } from '../../../components/common/SimpleDropdown';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientAssignmentHistoryItem,
  ClinicPatientConsentDetail,
  ClinicPatientConsentDocument,
  ClinicPatientDetail,
  ClinicPatientListPageInfo,
  ClinicPatientSummary,
} from '../../../services/clinicService';
import type { UploadAsset } from '../../../utils/multipartUpload';
import { ClinicPatientConsentPanel } from './ClinicPatientConsentPanel';
import { StatusBadge } from './ClinicPatientBadges';
import type {
  AssignmentForm,
  AssignmentPanelMode,
  FeedbackMessage,
} from './clinicPatientDomain';
import {
  formatDate,
  formatDateTime,
  hasPatientDetail,
} from './clinicPatientDomain';
import { createDetailStyles } from './clinicPatientStyles';

interface ClinicPatientDetailPanelProps {
  patient: ClinicPatientSummary | ClinicPatientDetail;
  detailLoading: boolean;
  saving: boolean;
  feedback: FeedbackMessage | null;
  consent: ClinicPatientConsentDetail | null;
  consentLoading: boolean;
  consentSaving: boolean;
  openingConsentDocumentId: string | null;
  assignmentHistory: ClinicPatientAssignmentHistoryItem[];
  assignmentHistoryPageInfo: ClinicPatientListPageInfo;
  assignmentHistoryLoading: boolean;
  assignmentHistoryLoadingMore: boolean;
  assignmentHistoryError: string;
  canManage: boolean;
  assignmentMode: AssignmentPanelMode;
  assignmentForm: AssignmentForm;
  specialistOptions: DropdownOption<string>[];
  specialistsLoading: boolean;
  specialistsError: string;
  onStartAssignment: () => void;
  onCancelAssignment: () => void;
  onChangeAssignmentSpecialist: (clinicSpecialistId: string) => void;
  onChangeAssignmentReason: (reason: string) => void;
  onSubmitAssignment: () => void;
  onCloseAssignment: () => void;
  onRequestConsent: () => void;
  onUploadConsentEvidence: (file: UploadAsset) => void;
  onOpenConsentDocument: (document: ClinicPatientConsentDocument) => void;
  onLoadMoreAssignmentHistory: () => void;
  onRetryAssignmentHistory: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
}

export function ClinicPatientDetailPanel({
  patient,
  detailLoading,
  saving,
  feedback,
  consent,
  consentLoading,
  consentSaving,
  openingConsentDocumentId,
  assignmentHistory,
  assignmentHistoryPageInfo,
  assignmentHistoryLoading,
  assignmentHistoryLoadingMore,
  assignmentHistoryError,
  canManage,
  assignmentMode,
  assignmentForm,
  specialistOptions,
  specialistsLoading,
  specialistsError,
  onStartAssignment,
  onCancelAssignment,
  onChangeAssignmentSpecialist,
  onChangeAssignmentReason,
  onSubmitAssignment,
  onCloseAssignment,
  onRequestConsent,
  onUploadConsentEvidence,
  onOpenConsentDocument,
  onLoadMoreAssignmentHistory,
  onRetryAssignmentHistory,
  onEdit,
  onStatusChange,
}: ClinicPatientDetailPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const nextStatusLabel = patient.status === 'ACTIVE' ? 'Archivar' : 'Reactivar';
  const nextStatusIcon = patient.status === 'ACTIVE' ? 'archive-outline' : 'refresh-outline';
  const detail = hasPatientDetail(patient) ? patient : null;

  const contactRows = [
    ['Email', patient.email ?? 'Sin email'],
    ['Teléfono', patient.phone ?? 'Sin teléfono'],
    ['Datos fiscales', patient.billingDataComplete ? 'Completos' : 'Pendientes'],
    ['Alta', formatDate(patient.createdAt)],
    ['Última actualización', formatDate(patient.updatedAt)],
  ] as const;

  const billingRows = detail ? ([
    ['Nombre fiscal', detail.billingFullName ?? 'Sin nombre fiscal'],
    ['NIF/NIE/CIF', detail.billingTaxId ?? 'Sin identificador'],
    ['Dirección', detail.billingAddress ?? 'Sin dirección'],
    ['Código postal', detail.billingPostalCode ?? 'Sin código postal'],
    ['Ciudad', detail.billingCity ?? 'Sin ciudad'],
    ['País', detail.billingCountry ?? 'Sin país'],
  ] as const) : [];

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="medical-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{patient.displayName}</Text>
          <Text style={styles.subtitle}>
            Ficha administrativa separada del área asistencial.
          </Text>
        </View>
        <StatusBadge status={patient.status} />
      </View>

      <View style={styles.rows}>
        {contactRows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      <ClinicPatientConsentPanel
        consent={consent}
        loading={consentLoading}
        saving={consentSaving}
        openingDocumentId={openingConsentDocumentId}
        canManage={canManage}
        patientStatus={patient.status}
        onRequestDigitalConsent={onRequestConsent}
        onUploadEvidence={onUploadConsentEvidence}
        onOpenDocument={onOpenConsentDocument}
      />

      <AssignmentSection
        patient={patient}
        assignmentMode={assignmentMode}
        assignmentForm={assignmentForm}
        specialistOptions={specialistOptions}
        specialistsLoading={specialistsLoading}
        specialistsError={specialistsError}
        saving={saving}
        canManage={canManage}
        onStartAssignment={onStartAssignment}
        onCancelAssignment={onCancelAssignment}
        onChangeAssignmentSpecialist={onChangeAssignmentSpecialist}
        onChangeAssignmentReason={onChangeAssignmentReason}
        onSubmitAssignment={onSubmitAssignment}
        onCloseAssignment={onCloseAssignment}
      />

      <AssignmentHistorySection
        history={assignmentHistory}
        pageInfo={assignmentHistoryPageInfo}
        loading={assignmentHistoryLoading}
        loadingMore={assignmentHistoryLoadingMore}
        error={assignmentHistoryError}
        canManage={canManage}
        onLoadMore={onLoadMoreAssignmentHistory}
        onRetry={onRetryAssignmentHistory}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fiscal</Text>
        {detailLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      {detail ? (
        <View style={styles.rows}>
          {billingRows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Cargando datos fiscales de la ficha seleccionada.</Text>
      )}

      {feedback ? (
        <Text style={[
          styles.message,
          { color: feedback.type === 'error' ? theme.error : theme.success },
        ]}>
          {feedback.text}
        </Text>
      ) : (
        <Text style={styles.hint}>
          Mantén esta ficha centrada en datos administrativos; la información asistencial se gestiona por separado.
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="medium"
          onPress={onEdit}
          disabled={!canManage || saving || detailLoading}
          icon={<Ionicons name="create-outline" size={18} color={theme.primary} />}
        >
          Editar ficha
        </Button>
        <Button
          variant={patient.status === 'ACTIVE' ? 'danger' : 'secondary'}
          size="medium"
          onPress={onStatusChange}
          disabled={!canManage || saving}
          loading={saving}
          icon={(
            <Ionicons
              name={nextStatusIcon}
              size={18}
              color={patient.status === 'ACTIVE' ? theme.textOnPrimary : theme.primary}
            />
          )}
        >
          {nextStatusLabel}
        </Button>
      </View>
    </View>
  );
}

interface AssignmentSectionProps {
  patient: ClinicPatientSummary | ClinicPatientDetail;
  assignmentMode: AssignmentPanelMode;
  assignmentForm: AssignmentForm;
  specialistOptions: DropdownOption<string>[];
  specialistsLoading: boolean;
  specialistsError: string;
  saving: boolean;
  canManage: boolean;
  onStartAssignment: () => void;
  onCancelAssignment: () => void;
  onChangeAssignmentSpecialist: (clinicSpecialistId: string) => void;
  onChangeAssignmentReason: (reason: string) => void;
  onSubmitAssignment: () => void;
  onCloseAssignment: () => void;
}

interface AssignmentHistorySectionProps {
  history: ClinicPatientAssignmentHistoryItem[];
  pageInfo: ClinicPatientListPageInfo;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  canManage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

function AssignmentHistorySection({
  history,
  pageInfo,
  loading,
  loadingMore,
  error,
  canManage,
  onLoadMore,
  onRetry,
}: AssignmentHistorySectionProps): React.ReactElement | null {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);

  if (!canManage) {
    return null;
  }

  return (
    <View style={styles.historyBox}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Historial de responsables</Text>
          <Text style={styles.hint}>
            Registro administrativo; no traslada notas ni documentos clínicos.
          </Text>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      {error ? (
        <View style={styles.historyState}>
          <Text style={[styles.message, { color: theme.error }]}>{error}</Text>
          <Button
            variant="ghost"
            size="small"
            onPress={onRetry}
            disabled={loading}
          >
            Reintentar
          </Button>
        </View>
      ) : null}

      {!loading && !error && history.length === 0 ? (
        <View style={styles.assignmentEmpty}>
          <Ionicons name="time-outline" size={18} color={theme.textMuted} />
          <Text style={styles.hint}>Aún no hay cambios de responsable registrados.</Text>
        </View>
      ) : null}

      {history.length > 0 ? (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={[
                styles.historyMarker,
                { backgroundColor: item.status === 'ACTIVE' ? theme.primaryAlpha12 : theme.bgCard },
              ]}>
                <Ionicons
                  name={item.status === 'ACTIVE' ? 'checkmark-circle-outline' : 'swap-horizontal-outline'}
                  size={17}
                  color={item.status === 'ACTIVE' ? theme.primary : theme.textMuted}
                />
              </View>
              <View style={styles.historyCopy}>
                <Text style={styles.historyName}>{item.clinicSpecialist.displayName}</Text>
                <Text style={styles.historyMeta}>
                  {item.clinicSpecialist.professionalTitle ?? 'Especialista de clínica'} - {formatDateTime(item.startedAt)}
                  {item.endedAt ? ` a ${formatDateTime(item.endedAt)}` : ' - activo'}
                </Text>
                {item.reason ? (
                  <Text style={styles.assignmentReason}>Motivo: {item.reason}</Text>
                ) : null}
                {item.endedReason ? (
                  <Text style={styles.assignmentReason}>Cierre: {item.endedReason}</Text>
                ) : null}
                <Text style={styles.historyActor}>
                  Alta: {item.assignedBy?.name ?? 'Sin actor registrado'}
                  {item.endedBy ? ` - Cierre: ${item.endedBy.name}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {pageInfo.hasMore ? (
        <Button
          variant="ghost"
          size="medium"
          onPress={onLoadMore}
          loading={loadingMore}
          disabled={loading || loadingMore}
        >
          Cargar más
        </Button>
      ) : null}
    </View>
  );
}

function AssignmentSection({
  patient,
  assignmentMode,
  assignmentForm,
  specialistOptions,
  specialistsLoading,
  specialistsError,
  saving,
  canManage,
  onStartAssignment,
  onCancelAssignment,
  onChangeAssignmentSpecialist,
  onChangeAssignmentReason,
  onSubmitAssignment,
  onCloseAssignment,
}: AssignmentSectionProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const assignment = patient.activeAssignment;
  const canAssign = canManage && patient.status === 'ACTIVE' && !saving;
  const hasSpecialists = specialistOptions.length > 0;

  return (
    <View style={styles.assignmentBox}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Responsable asistencial</Text>
          <Text style={styles.hint}>
            Define quién atiende al paciente dentro de la clínica.
          </Text>
        </View>
        {specialistsLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      {assignment ? (
        <View style={styles.assignmentSummary}>
          <View style={styles.assignmentIcon}>
            <Ionicons name="person-outline" size={18} color={theme.primary} />
          </View>
          <View style={styles.assignmentCopy}>
            <Text style={styles.assignmentName}>{assignment.clinicSpecialistDisplayName}</Text>
            <Text style={styles.assignmentMeta}>
              {assignment.clinicSpecialistProfessionalTitle ?? 'Especialista de clínica'} - desde {formatDate(assignment.startedAt)}
            </Text>
            {assignment.reason ? (
              <Text style={styles.assignmentReason}>{assignment.reason}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.assignmentEmpty}>
          <Ionicons name="person-add-outline" size={18} color={theme.textMuted} />
          <Text style={styles.hint}>Este paciente no tiene responsable asignado.</Text>
        </View>
      )}

      {specialistsError ? (
        <Text style={[styles.message, { color: theme.error }]}>{specialistsError}</Text>
      ) : null}

      {assignmentMode ? (
        <View style={styles.assignmentForm}>
          <SimpleDropdown
            options={specialistOptions}
            value={assignmentForm.clinicSpecialistId || null}
            onSelect={onChangeAssignmentSpecialist}
            placeholder={hasSpecialists ? 'Seleccionar especialista' : 'No hay especialistas activos'}
          />
          <Input
            label="Motivo interno"
            value={assignmentForm.reason}
            placeholder="Motivo administrativo, sin datos clínicos"
            helperText="No incluyas notas clínicas, diagnósticos ni documentos."
            editable={!saving}
            onChangeText={onChangeAssignmentReason}
          />
          <View style={styles.assignmentActions}>
            <Button
              variant="ghost"
              size="medium"
              onPress={onCancelAssignment}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="medium"
              onPress={onSubmitAssignment}
              loading={saving}
              disabled={!canAssign || !hasSpecialists}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color={theme.actionPrimaryText} />}
            >
              Guardar responsable
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.assignmentActions}>
          <Button
            variant="outline"
            size="medium"
            onPress={onStartAssignment}
            disabled={!canAssign || specialistsLoading || !hasSpecialists}
            icon={<Ionicons name={assignment ? 'swap-horizontal-outline' : 'person-add-outline'} size={18} color={theme.primary} />}
          >
            {assignment ? 'Cambiar' : 'Asignar'}
          </Button>
          {assignment ? (
            <Button
              variant="ghost"
              size="medium"
              onPress={onCloseAssignment}
              disabled={!canAssign}
              icon={<Ionicons name="close-circle-outline" size={18} color={theme.primary} />}
            >
              Quitar
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}
