import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Input } from '../../../components/common/Input';
import { SimpleDropdown, type DropdownOption } from '../../../components/common/SimpleDropdown';
import {
  CLINIC_SESSION_STATUS_LABELS,
  CLINIC_SESSION_STATUS_THEME_KEYS,
  CLINIC_SESSION_TYPE_LABELS,
} from '../../../components/sessions/sessionPresentation';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientAssignmentHistoryItem,
  ClinicPatientConsentDetail,
  ClinicPatientConsentDocument,
  ClinicPatientDetail,
  ClinicPatientListPageInfo,
  ClinicPatientSummary,
  ClinicSessionSummary,
} from '../../../services/clinicService';
import type { UploadAsset } from '../../../utils/multipartUpload';
import { ClinicPatientConsentPanel } from './ClinicPatientConsentPanel';
import { ClinicPatientDetailTabs } from './ClinicPatientDetailTabs';
import {
  ClinicPatientBillingFields,
  ClinicPatientIdentityFields,
} from './ClinicPatientFieldGroups';
import { StatusBadge } from './ClinicPatientBadges';
import type {
  AssignmentForm,
  AssignmentPanelMode,
  ClinicPatientDetailTab,
  ClinicPatientEditSection,
  ClinicPatientErrors,
  ClinicPatientField,
  ClinicPatientForm,
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
  detailError: string;
  saving: boolean;
  feedback: FeedbackMessage | null;
  consent: ClinicPatientConsentDetail | null;
  consentLoading: boolean;
  consentError: string;
  consentSaving: boolean;
  openingConsentDocumentId: string | null;
  assignmentHistory: ClinicPatientAssignmentHistoryItem[];
  assignmentHistoryPageInfo: ClinicPatientListPageInfo;
  assignmentHistoryLoading: boolean;
  assignmentHistoryLoadingMore: boolean;
  assignmentHistoryError: string;
  patientSessions: ClinicSessionSummary[];
  patientSessionsPageInfo: ClinicPatientListPageInfo | null;
  patientSessionsLoading: boolean;
  patientSessionsLoadingMore: boolean;
  patientSessionsError: string;
  activeTab: ClinicPatientDetailTab;
  editSection: ClinicPatientEditSection | null;
  form: ClinicPatientForm;
  errors: ClinicPatientErrors;
  sameBillingData: boolean;
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
  onRetryConsent: () => void;
  onLoadMoreAssignmentHistory: () => void;
  onRetryAssignmentHistory: () => void;
  onOpenSessionDetail: (sessionId: string) => void;
  onLoadMorePatientSessions: () => void;
  onRetryPatientSessions: () => void;
  onSelectTab: (tab: ClinicPatientDetailTab) => void;
  onEdit: (section: ClinicPatientEditSection) => void;
  onRetryDetail: () => void;
  onChange: (field: ClinicPatientField, value: string) => void;
  onToggleSameBillingData: () => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onStatusChange: () => void;
}

const formatSessionDateTime = (value: string): string =>
  new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export function ClinicPatientDetailPanel({
  patient,
  detailLoading,
  detailError,
  saving,
  feedback,
  consent,
  consentLoading,
  consentError,
  consentSaving,
  openingConsentDocumentId,
  assignmentHistory,
  assignmentHistoryPageInfo,
  assignmentHistoryLoading,
  assignmentHistoryLoadingMore,
  assignmentHistoryError,
  patientSessions,
  patientSessionsPageInfo,
  patientSessionsLoading,
  patientSessionsLoadingMore,
  patientSessionsError,
  activeTab,
  editSection,
  form,
  errors,
  sameBillingData,
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
  onRetryConsent,
  onLoadMoreAssignmentHistory,
  onRetryAssignmentHistory,
  onOpenSessionDetail,
  onLoadMorePatientSessions,
  onRetryPatientSessions,
  onSelectTab,
  onEdit,
  onRetryDetail,
  onChange,
  onToggleSameBillingData,
  onSubmitEdit,
  onCancelEdit,
  onStatusChange,
}: ClinicPatientDetailPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const nextStatusLabel = patient.status === 'ACTIVE' ? 'Archivar' : 'Reactivar';
  const nextStatusIcon = patient.status === 'ACTIVE' ? 'archive-outline' : 'refresh-outline';
  const detail = hasPatientDetail(patient) ? patient : null;
  const activeAssignment = patient.activeAssignment;
  const responsibleInactive = activeAssignment?.clinicSpecialistStatus === 'INACTIVE';
  const responsibleLabel = activeAssignment
    ? `${activeAssignment.clinicSpecialistDisplayName}${responsibleInactive ? ' · Inactivo' : ''}`
    : 'Sin responsable';
  const nextSession = detail?.nextSession ?? null;
  const contextualActionOpen = editSection !== null || assignmentMode !== null;
  const initials = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .map((value) => value?.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'P';

  const contactRows = [
    ['Email', patient.email ?? 'Sin email'],
    ['Teléfono', patient.phone ?? 'Sin teléfono'],
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
    <Card variant="outlined" padding="none" style={styles.panel}>
      <View style={styles.hero}>
        <View style={styles.header}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{patient.displayName}</Text>
            <Text style={styles.subtitle}>
              Ficha administrativa de clínica · sin historia clínica ni notas asistenciales
            </Text>
          </View>
          <StatusBadge status={patient.status} />
        </View>

        <View style={styles.heroFacts}>
          <View style={styles.heroFact}>
            <Text style={styles.heroFactLabel}>Responsable</Text>
            <Text style={styles.heroFactValue}>{responsibleLabel}</Text>
          </View>
          <View style={styles.heroFact}>
            <Text style={styles.heroFactLabel}>Próxima cita</Text>
            <Text style={styles.heroFactValue}>
              {nextSession
                ? formatSessionDateTime(nextSession.date)
                : detail
                  ? 'Sin cita programada'
                  : detailLoading ? 'Cargando…' : 'No disponible'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="small"
            onPress={() => onEdit('summary')}
            disabled={!canManage || saving || contextualActionOpen || detailLoading || patient.status !== 'ACTIVE'}
            icon={<Ionicons name="create-outline" size={17} color={theme.primary} />}
          >
            Editar datos
          </Button>
          {nextSession && patient.status === 'ACTIVE' ? (
            <Button
              variant="ghost"
              size="small"
              onPress={() => onOpenSessionDetail(nextSession.id)}
              disabled={!canManage || saving || contextualActionOpen}
              icon={<Ionicons name="calendar-outline" size={17} color={theme.primary} />}
            >
              Abrir cita
            </Button>
          ) : null}
          <Button
            variant={patient.status === 'ACTIVE' ? 'danger' : 'secondary'}
            size="small"
            onPress={onStatusChange}
            disabled={!canManage || saving || contextualActionOpen}
            loading={saving}
            icon={(
              <Ionicons
                name={nextStatusIcon}
                size={17}
                color={patient.status === 'ACTIVE' ? theme.textOnPrimary : theme.primary}
              />
            )}
          >
            {nextStatusLabel}
          </Button>
        </View>
      </View>

      {detailError ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.detailError}
        >
          <Ionicons name="alert-circle-outline" size={19} color={theme.error} />
          <View style={styles.alertCopy}>
            <Text style={styles.detailErrorTitle}>No se pudo actualizar la ficha</Text>
            <Text style={styles.alertText}>{detailError}</Text>
            {detail ? (
              <Text style={styles.alertText}>Se muestran los últimos datos disponibles.</Text>
            ) : null}
          </View>
          <Button
            variant="ghost"
            size="small"
            onPress={onRetryDetail}
            disabled={detailLoading}
            loading={detailLoading}
          >
            Reintentar
          </Button>
        </View>
      ) : null}

      {contextualActionOpen ? null : patient.status === 'ARCHIVED' ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Paciente archivado. Reactivar paciente"
          disabled={!canManage || saving}
          onPress={onStatusChange}
          style={styles.alert}
        >
          <Ionicons name="archive-outline" size={19} color={theme.warning} />
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Paciente archivado</Text>
            <Text style={styles.alertText}>Reactívalo para recuperar las acciones operativas.</Text>
          </View>
        </AnimatedPressable>
      ) : (
        <View style={styles.alerts}>
          {!activeAssignment || responsibleInactive ? (
            <AnimatedPressable
              accessibilityRole="button"
              onPress={() => {
                onSelectTab('summary');
                onStartAssignment();
              }}
              disabled={!canManage || saving}
              style={styles.alert}
            >
              <Ionicons name="person-add-outline" size={19} color={theme.warning} />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>
                  {responsibleInactive ? 'Responsable inactivo' : 'Responsable pendiente'}
                </Text>
                <Text style={styles.alertText}>Revisa la asignación asistencial del paciente.</Text>
              </View>
            </AnimatedPressable>
          ) : null}
          {!consentLoading && !consentError && consent && consent.status !== 'GRANTED' ? (
            <AnimatedPressable
              accessibilityRole="button"
              onPress={() => onSelectTab('consent')}
              disabled={saving}
              style={styles.alert}
            >
              <Ionicons name="document-text-outline" size={19} color={theme.warning} />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>
                  Consentimiento {consent.status === 'REVOKED' ? 'revocado' : 'pendiente'}
                </Text>
                <Text style={styles.alertText}>Consulta el estado y las acciones disponibles.</Text>
              </View>
            </AnimatedPressable>
          ) : null}
          {!patient.billingDataComplete ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Revisar datos fiscales incompletos"
              onPress={() => onSelectTab('billing')}
              disabled={saving}
              style={styles.alert}
            >
              <Ionicons name="receipt-outline" size={19} color={theme.warning} />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>Datos fiscales incompletos</Text>
                <Text style={styles.alertText}>Completa la ficha antes de emitir una factura completa.</Text>
              </View>
            </AnimatedPressable>
          ) : null}
          {detail && !nextSession ? (
            <AnimatedPressable
              accessibilityRole="button"
              onPress={() => onSelectTab('sessions')}
              disabled={saving}
              style={styles.alert}
            >
              <Ionicons name="calendar-outline" size={19} color={theme.warning} />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>Sin próxima cita</Text>
                <Text style={styles.alertText}>Consulta el historial reciente en Citas.</Text>
              </View>
            </AnimatedPressable>
          ) : null}
        </View>
      )}

      <ClinicPatientDetailTabs
        activeTab={activeTab}
        disabled={saving || contextualActionOpen}
        onSelect={onSelectTab}
      />

      {activeTab === 'summary' ? (
        <View style={styles.tabPanel}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Identidad y contacto</Text>
              <Text style={styles.hint}>Información administrativa para identificar y contactar.</Text>
            </View>
            {detailLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
          </View>
          {editSection === 'summary' ? (
            <View style={styles.editor}>
              <ClinicPatientIdentityFields
                form={form}
                errors={errors}
                disabled={!canManage || saving}
                onChange={onChange}
                showTitle={false}
              />
              <View style={styles.actions}>
                <Button variant="ghost" size="medium" onPress={onCancelEdit} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={onSubmitEdit}
                  loading={saving}
                  disabled={!canManage || saving}
                >
                  Guardar datos
                </Button>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.rows}>
                {contactRows.map(([label, value]) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>{value}</Text>
                  </View>
                ))}
              </View>
              <Button
                variant="ghost"
                size="small"
                onPress={() => onEdit('summary')}
                disabled={!canManage || saving || detailLoading || patient.status !== 'ACTIVE'}
              >
                Editar identidad y contacto
              </Button>
            </>
          )}
          {editSection === null ? <AssignmentSection
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
          /> : null}
        </View>
      ) : null}

      {activeTab === 'sessions' ? (
        <View style={styles.tabPanel}>
          <NextSessionSummaryCard
            session={nextSession}
            loading={detailLoading && !detail}
            unavailable={Boolean(detailError && !detail)}
            disabled={!canManage || saving}
            onOpenSessionDetail={onOpenSessionDetail}
          />
          <PatientSessionsSection
            sessions={patientSessions}
            nextSessionId={nextSession?.id ?? null}
            pageInfo={patientSessionsPageInfo}
            loading={patientSessionsLoading}
            loadingMore={patientSessionsLoadingMore}
            error={patientSessionsError}
            canManage={canManage}
            onOpenSessionDetail={onOpenSessionDetail}
            onLoadMore={onLoadMorePatientSessions}
            onRetry={onRetryPatientSessions}
          />
        </View>
      ) : null}

      {activeTab === 'consent' ? (
        <ClinicPatientConsentPanel
          consent={consent}
          loading={consentLoading}
          error={consentError}
          saving={consentSaving}
          openingDocumentId={openingConsentDocumentId}
          canManage={canManage}
          patientStatus={patient.status}
          onRequestDigitalConsent={onRequestConsent}
          onUploadEvidence={onUploadConsentEvidence}
          onOpenDocument={onOpenConsentDocument}
          onRetry={onRetryConsent}
        />
      ) : null}

      {activeTab === 'billing' ? (
        <View style={styles.tabPanel}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Datos de facturación</Text>
              <Text style={styles.hint}>
                {patient.billingDataComplete ? 'Ficha fiscal completa.' : 'Faltan datos para facturación completa.'}
              </Text>
            </View>
            {detailLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
          </View>
          {editSection === 'billing' ? (
            <View style={styles.editor}>
              <ClinicPatientBillingFields
                form={form}
                errors={errors}
                disabled={!canManage || saving}
                sameBillingData={sameBillingData}
                onChange={onChange}
                onToggleSameBillingData={onToggleSameBillingData}
                showTitle={false}
              />
              <View style={styles.actions}>
                <Button variant="ghost" size="medium" onPress={onCancelEdit} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onPress={onSubmitEdit}
                  loading={saving}
                  disabled={!canManage || saving}
                >
                  Guardar facturación
                </Button>
              </View>
            </View>
          ) : detail ? (
            <>
              <View style={styles.rows}>
                {billingRows.map(([label, value]) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>{value}</Text>
                  </View>
                ))}
              </View>
              <Button
                variant="ghost"
                size="small"
                onPress={() => onEdit('billing')}
                disabled={!canManage || saving || patient.status !== 'ACTIVE'}
              >
                Editar datos fiscales
              </Button>
            </>
          ) : (
            <Text style={styles.hint}>
              {detailLoading
                ? 'Cargando datos fiscales de la ficha seleccionada.'
                : 'Los datos fiscales no están disponibles.'}
            </Text>
          )}
        </View>
      ) : null}

      {activeTab === 'activity' ? (
        <View style={styles.tabPanel}>
          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Alta</Text>
              <Text style={styles.rowValue}>{formatDateTime(patient.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Última actualización</Text>
              <Text style={styles.rowValue}>{formatDateTime(patient.updatedAt)}</Text>
            </View>
          </View>
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
        </View>
      ) : null}

      {feedback ? (
        <Text style={[
          styles.message,
          { color: feedback.type === 'error' ? theme.error : theme.success },
        ]}>
          {feedback.text}
        </Text>
      ) : null}
    </Card>
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

interface PatientSessionsSectionProps {
  sessions: ClinicSessionSummary[];
  nextSessionId: string | null;
  pageInfo: ClinicPatientListPageInfo | null;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  canManage: boolean;
  onOpenSessionDetail: (sessionId: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

interface NextSessionSummaryCardProps {
  session: ClinicPatientDetail['nextSession'];
  loading: boolean;
  unavailable: boolean;
  disabled: boolean;
  onOpenSessionDetail: (sessionId: string) => void;
}

function NextSessionSummaryCard({
  session,
  loading,
  unavailable,
  disabled,
  onOpenSessionDetail,
}: NextSessionSummaryCardProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);

  if (!session) {
    return (
      <View style={[styles.nextSessionCard, styles.nextSessionCardEmpty]}>
        <View style={styles.nextSessionIcon}>
          {loading ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Ionicons
              name={unavailable ? 'cloud-offline-outline' : 'calendar-outline'}
              size={20}
              color={unavailable ? theme.error : theme.textMuted}
            />
          )}
        </View>
        <View style={styles.nextSessionCopy}>
          <Text style={styles.sectionTitle}>Próxima cita</Text>
          <Text style={styles.nextSessionDate}>
            {loading ? 'Consultando agenda…' : unavailable ? 'No disponible' : 'Sin cita programada'}
          </Text>
          <Text style={styles.hint}>
            {loading
              ? 'Estamos consultando la próxima cita de este paciente.'
              : unavailable
              ? 'No se pudo verificar la próxima cita. Reintenta la carga de la ficha.'
              : 'No hay una cita pendiente o confirmada en el calendario.'}
          </Text>
        </View>
      </View>
    );
  }

  const statusPalette = theme.status[CLINIC_SESSION_STATUS_THEME_KEYS[session.status]];
  const accessibilityLabel = [
    'Abrir próxima cita',
    formatSessionDateTime(session.date),
    CLINIC_SESSION_STATUS_LABELS[session.status],
    session.clinicSpecialist?.displayName ?? 'Sin especialista',
  ].join(', ');

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onOpenSessionDetail(session.id)}
      disabled={disabled}
      style={styles.nextSessionCard}
    >
      <View style={styles.nextSessionIcon}>
        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
      </View>
      <View style={styles.nextSessionCopy}>
        <View style={styles.sessionTitleRow}>
          <Text style={styles.sectionTitle}>Próxima cita</Text>
          <View style={[
            styles.sessionStatusBadge,
            { backgroundColor: statusPalette.bg, borderColor: statusPalette.border },
          ]}>
            <Text style={[styles.sessionStatusText, { color: statusPalette.text }]}>
              {CLINIC_SESSION_STATUS_LABELS[session.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.nextSessionDate}>{formatSessionDateTime(session.date)}</Text>
        <Text style={styles.hint}>
          {CLINIC_SESSION_TYPE_LABELS[session.type]} · {session.duration} min · {session.clinicSpecialist?.displayName ?? 'Sin especialista'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

function PatientSessionsSection({
  sessions,
  nextSessionId,
  pageInfo,
  loading,
  loadingMore,
  error,
  canManage,
  onOpenSessionDetail,
  onLoadMore,
  onRetry,
}: PatientSessionsSectionProps): React.ReactElement | null {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const { upcomingSessions, recentSessions } = useMemo(() => {
    const now = Date.now();
    const visibleSessions = sessions.filter((session) => session.id !== nextSessionId);

    return {
      upcomingSessions: visibleSessions
        .filter((session) => new Date(session.date).getTime() >= now)
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
      recentSessions: visibleSessions
        .filter((session) => new Date(session.date).getTime() < now)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    };
  }, [nextSessionId, sessions]);
  const visibleSessionCount = upcomingSessions.length + recentSessions.length;

  const renderSessionGroup = (
    title: string,
    groupSessions: ClinicSessionSummary[],
  ): React.ReactElement | null => {
    if (groupSessions.length === 0) return null;

    return (
      <View style={styles.sessionGroup}>
        <Text style={styles.sessionGroupTitle}>{title}</Text>
        <View style={styles.historyList}>
          {groupSessions.map((session) => {
            const statusPalette = theme.status[CLINIC_SESSION_STATUS_THEME_KEYS[session.status]];
            return (
              <AnimatedPressable
                key={session.id}
                accessibilityRole="button"
                accessibilityLabel={`Abrir cita del ${formatSessionDateTime(session.date)}, ${CLINIC_SESSION_STATUS_LABELS[session.status]}, ${session.specialist.displayName}`}
                onPress={() => onOpenSessionDetail(session.id)}
                hoverLift={false}
                pressScale={0.99}
                style={styles.historyItem}
              >
                <View style={[
                  styles.historyMarker,
                  { backgroundColor: statusPalette.bg, borderColor: statusPalette.border },
                ]}>
                  <Ionicons name="calendar-clear-outline" size={17} color={statusPalette.text} />
                </View>
                <View style={styles.historyCopy}>
                  <View style={styles.sessionTitleRow}>
                    <Text style={styles.historyName}>{formatSessionDateTime(session.date)}</Text>
                    <View style={[
                      styles.sessionStatusBadge,
                      { backgroundColor: statusPalette.bg, borderColor: statusPalette.border },
                    ]}>
                      <Text style={[styles.sessionStatusText, { color: statusPalette.text }]}>
                        {CLINIC_SESSION_STATUS_LABELS[session.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyMeta}>
                    {CLINIC_SESSION_TYPE_LABELS[session.type]} · {session.duration} min
                  </Text>
                  <Text style={styles.historyActor}>{session.specialist.displayName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    );
  };

  if (!canManage) {
    return null;
  }

  return (
    <View style={styles.historyBox}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Citas</Text>
          <Text style={styles.hint}>
            Próximas y recientes dentro de esta clínica. La próxima cita destacada no se repite.
          </Text>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      {error ? (
        <View style={styles.historyState}>
          <Text style={[styles.message, { color: theme.error }]}>{error}</Text>
          <Button variant="ghost" size="small" onPress={onRetry} disabled={loading}>
            Reintentar
          </Button>
        </View>
      ) : null}

      {!loading && !error && visibleSessionCount === 0 ? (
        <View style={styles.assignmentEmpty}>
          <Ionicons name="calendar-outline" size={18} color={theme.textMuted} />
          <Text style={styles.hint}>
            {nextSessionId
              ? 'No hay más citas próximas o recientes en este periodo.'
              : 'No hay citas registradas para este paciente en el periodo consultado.'}
          </Text>
        </View>
      ) : null}

      {renderSessionGroup('Próximas', upcomingSessions)}
      {renderSessionGroup('Recientes', recentSessions)}

      {pageInfo?.hasMore ? (
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
