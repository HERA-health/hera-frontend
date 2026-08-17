import React, { useCallback, useMemo, useRef } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { useAppAlert } from '../../../components/common/alert';
import { Button } from '../../../components/common/Button';
import { ClinicSessionSchedulerModal } from '../../../components/clinic/ClinicSessionSchedulerModal';
import { AppointmentDetailSheet } from '../../../components/sessions/AppointmentDetailSheet';
import {
  requestClinicSessionStatusConfirmation,
  type ClinicSessionTerminalStatus,
} from '../../../components/sessions/sessionPresentation';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ScreenProps } from '../../../constants/types';
import type { ClinicSessionSummary } from '../../../services/clinicService';
import { ClinicWorkspaceScaffold } from '../components/ClinicWorkspaceScaffold';
import {
  ClinicPatientAdaptiveSheet,
  focusPatientAccessibilityTarget,
} from './ClinicPatientAdaptiveSheet';
import { ClinicPatientDetailPanel } from './ClinicPatientDetailPanel';
import { ClinicPatientFormPanel } from './ClinicPatientFormPanel';
import { ClinicPatientsListPanel } from './ClinicPatientsListPanel';
import { createWorkspaceStyles } from './clinicPatientStyles';
import { useClinicPatientAdaptiveNavigation } from './useClinicPatientAdaptiveNavigation';
import { useClinicPatientsController } from './useClinicPatientsController';

interface ClinicPatientsWorkspaceProps {
  navigation: ScreenProps<'ClinicPatients'>['navigation'];
}

export function ClinicPatientsWorkspace({
  navigation,
}: ClinicPatientsWorkspaceProps): React.ReactElement {
  const { theme } = useTheme();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const isCompact = width < 940;
  const styles = useMemo(() => createWorkspaceStyles(theme, isCompact), [isCompact, theme]);
  const controller = useClinicPatientsController();
  const listHeadingRef = useRef<React.ElementRef<typeof View>>(null);
  const headerAddRef = useRef<AnimatedPressableHandle>(null);
  const newSessionButtonRef = useRef<AnimatedPressableHandle>(null);
  const returnFocusRef = useRef<AnimatedPressableHandle | null>(null);
  const clinicName = controller.workspace.selectedMembership?.clinic.commercialName;
  const selectedSessionDetail = controller.selectedSessionDetail;

  const restoreOriginFocus = useCallback(() => {
    focusPatientAccessibilityTarget(returnFocusRef.current ?? listHeadingRef.current);
  }, []);

  const adaptiveNavigation = useClinicPatientAdaptiveNavigation({
    isCompact,
    panelMode: controller.panelMode,
    selectedPatientId: controller.selectedPatientId,
    busy: controller.saving || controller.consentSaving,
    onCancelForm: controller.handleCancelForm,
    onRestoreOriginFocus: restoreOriginFocus,
  });

  const handleAdd = useCallback((origin: AnimatedPressableHandle | null) => {
    returnFocusRef.current = origin;
    controller.handleAdd();
    adaptiveNavigation.openPanel();
  }, [adaptiveNavigation.openPanel, controller.handleAdd]);

  const handleSelectPatient = useCallback((
    patientId: string,
    origin: AnimatedPressableHandle | null,
  ) => {
    returnFocusRef.current = origin;
    controller.handleSelectPatient(patientId);
    adaptiveNavigation.openPanel();
  }, [adaptiveNavigation.openPanel, controller.handleSelectPatient]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    adaptiveNavigation.closePanel();
    controller.handleSelectClinic(clinicId);
  }, [
    adaptiveNavigation.closePanel,
    controller.handleSelectClinic,
  ]);

  const confirmSelectedSessionStatus = useCallback((status: ClinicSessionTerminalStatus) => {
    if (!selectedSessionDetail) return;

    requestClinicSessionStatusConfirmation(appAlert, status, () => {
      void controller
        .handleUpdateSessionStatus(selectedSessionDetail, status)
        .then((updated) => {
          if (updated) controller.handleCloseSessionDetail();
        });
    });
  }, [
    appAlert,
    controller.handleCloseSessionDetail,
    controller.handleUpdateSessionStatus,
    selectedSessionDetail,
  ]);

  const restoreSessionButtonFocus = useCallback(() => {
    setTimeout(() => {
      focusPatientAccessibilityTarget(newSessionButtonRef.current);
    }, 0);
  }, []);

  const handleCloseSessionScheduler = useCallback(() => {
    controller.handleCloseSessionScheduler();
    restoreSessionButtonFocus();
  }, [controller.handleCloseSessionScheduler, restoreSessionButtonFocus]);

  const handlePatientSessionCreated = useCallback((session: ClinicSessionSummary) => {
    controller.handlePatientSessionCreated(session);
    restoreSessionButtonFocus();
  }, [controller.handlePatientSessionCreated, restoreSessionButtonFocus]);

  let compactPanelTitle = controller.selectedPatient?.displayName ?? 'Ficha de paciente';
  if (controller.panelMode === 'create') {
    compactPanelTitle = 'Nuevo paciente';
  } else if (controller.assignmentMode) {
    compactPanelTitle = 'Asignar responsable';
  } else if (controller.panelMode === 'edit') {
    compactPanelTitle = controller.editSection === 'billing' ? 'Editar facturación' : 'Editar datos';
  }

  const secondaryPanel = controller.panelMode === 'create' ? (
    <ClinicPatientFormPanel
      mode={controller.panelMode}
      form={controller.form}
      errors={controller.errors}
      saving={controller.saving}
      feedback={controller.feedback}
      canManage={controller.canManage}
      sameBillingData={controller.sameBillingData}
      onChange={controller.handleChange}
      onToggleSameBillingData={controller.handleToggleSameBillingData}
      onSubmit={controller.handleSubmit}
      onCancel={adaptiveNavigation.handleCancelForm}
    />
  ) : controller.selectedPatient ? (
    <ClinicPatientDetailPanel
      patient={controller.selectedPatient}
      detailLoading={controller.detailLoading}
      detailError={controller.detailError}
      saving={controller.saving}
      feedback={controller.feedback}
      consent={controller.selectedPatientConsent}
      consentLoading={controller.consentLoading}
      consentError={controller.consentError}
      consentSaving={controller.consentSaving}
      openingConsentDocumentId={controller.openingConsentDocumentId}
      assignmentHistory={controller.assignmentHistory}
      assignmentHistoryPageInfo={controller.assignmentHistoryPageInfo}
      assignmentHistoryLoading={controller.assignmentHistoryLoading}
      assignmentHistoryLoadingMore={controller.assignmentHistoryLoadingMore}
      assignmentHistoryError={controller.assignmentHistoryError}
      patientSessions={controller.patientSessions}
      patientSessionsPageInfo={controller.patientSessionsPageInfo}
      patientSessionsLoading={controller.patientSessionsLoading}
      patientSessionsLoadingMore={controller.patientSessionsLoadingMore}
      patientSessionsError={controller.patientSessionsError}
      activeTab={controller.activeDetailTab}
      editSection={controller.editSection}
      form={controller.form}
      errors={controller.errors}
      sameBillingData={controller.sameBillingData}
      canManage={controller.canManage}
      assignmentMode={controller.assignmentMode}
      assignmentForm={controller.assignmentForm}
      specialistOptions={controller.specialistOptions}
      specialistsLoading={controller.specialistsLoading}
      specialistsError={controller.specialistsError}
      onStartAssignment={controller.handleStartAssignment}
      onCancelAssignment={controller.handleCancelAssignment}
      onChangeAssignmentSpecialist={controller.handleAssignmentSpecialistChange}
      onChangeAssignmentReason={controller.handleAssignmentReasonChange}
      onSubmitAssignment={controller.handleSubmitAssignment}
      onCloseAssignment={controller.handleCloseAssignment}
      onRequestConsent={controller.handleRequestConsent}
      onUploadConsentEvidence={controller.handleUploadConsentEvidence}
      onOpenConsentDocument={controller.handleOpenConsentDocument}
      onRetryConsent={controller.handleRetryConsent}
      onLoadMoreAssignmentHistory={controller.handleLoadMoreAssignmentHistory}
      onRetryAssignmentHistory={controller.handleRetryAssignmentHistory}
      onOpenSessionDetail={controller.handleOpenSessionDetail}
      onLoadMorePatientSessions={controller.handleLoadMorePatientSessions}
      onRetryPatientSessions={controller.handleRetryPatientSessions}
      onSelectTab={controller.handleSelectDetailTab}
      onEdit={controller.handleEdit}
      onRetryDetail={controller.handleRetryDetail}
      onChange={controller.handleChange}
      onToggleSameBillingData={controller.handleToggleSameBillingData}
      onSubmitEdit={controller.handleSubmit}
      onCancelEdit={adaptiveNavigation.handleCancelForm}
      onStatusChange={controller.handleStatusChange}
      onCreateSession={controller.handleOpenSessionScheduler}
      createSessionFocusRef={newSessionButtonRef}
    />
  ) : (
    <View style={styles.statePanel}>
      <Ionicons name="person-circle-outline" size={30} color={theme.textMuted} />
      <Text style={styles.stateTitle}>Selecciona una ficha</Text>
      <Text style={styles.stateText}>
        Aquí verás los datos administrativos y fiscales del paciente seleccionado.
      </Text>
    </View>
  );

  const appointmentDetail = (
    <AppointmentDetailSheet
      visible={Boolean(controller.selectedSessionId)}
      embedded={isCompact}
      mode="clinic-admin"
      clinicSession={selectedSessionDetail}
      loading={controller.selectedSessionDetailLoading}
      error={controller.selectedSessionDetailError}
      processing={controller.saving}
      onClose={controller.handleCloseSessionDetail}
      onRetry={controller.handleRetrySessionDetail}
      onCancel={selectedSessionDetail?.actions.canCancel
        ? () => confirmSelectedSessionStatus('CANCELLED')
        : undefined}
      onComplete={selectedSessionDetail?.actions.canComplete
        ? () => confirmSelectedSessionStatus('COMPLETED')
        : undefined}
    />
  );

  return (
    <>
      <ClinicWorkspaceScaffold
        title="Pacientes"
        contextLabel={clinicName}
        subtitle="Gestiona datos administrativos y fiscales de pacientes de clínica con un espacio separado del área asistencial."
        memberships={controller.workspace.memberships}
        selectedClinicId={controller.workspace.selectedClinicId}
        loading={controller.workspace.loading}
        error={controller.workspace.error}
        onSelectClinic={handleSelectClinic}
        onRetry={controller.handleRetry}
        action={controller.workspace.selectedClinicId ? (
          <View style={styles.headerActions}>
            <Button
              variant="ghost"
              size="medium"
              onPress={() => navigation.navigate('ClinicDashboard')}
              icon={<Ionicons name="business-outline" size={18} color={theme.primary} />}
            >
              Panel
            </Button>
            <Button
              focusRef={headerAddRef}
              variant="primary"
              size="medium"
              onPress={() => handleAdd(headerAddRef.current)}
              disabled={!controller.canManage || controller.saving}
              icon={<Ionicons name="person-add-outline" size={18} color={theme.actionPrimaryText} />}
            >
              Añadir
            </Button>
          </View>
        ) : undefined}
      >
        {!controller.workspace.selectedMembership ? (
          <View style={styles.emptyPanel}>
            <Ionicons name="business-outline" size={30} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No hay clínica vinculada</Text>
            <Text style={styles.emptyText}>
              Esta cuenta existe, pero aún no tiene una clínica activa asociada por el equipo de HERA.
            </Text>
            <Button
              variant="outline"
              size="medium"
              onPress={() => { void controller.logout(); }}
              icon={<Ionicons name="log-out-outline" size={18} color={theme.primary} />}
            >
              Cerrar sesión
            </Button>
          </View>
        ) : (
          <View style={styles.workspace}>
            {!controller.canManage ? (
              <View style={styles.notice}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
                <Text style={styles.noticeText}>
                  La gestión de pacientes está reservada a propietarios y administradores de clínica.
                </Text>
              </View>
            ) : null}

            <View style={styles.contentGrid}>
              <View style={styles.listPanel}>
                <ClinicPatientsListPanel
                  patients={controller.patients}
                  pageInfo={controller.patientPageInfo}
                  selectedPatientId={controller.selectedPatientId}
                  loading={controller.patientsLoading}
                  loadingMore={controller.patientsLoadingMore}
                  error={controller.patientsError}
                  canManage={controller.canManage}
                  saving={controller.saving}
                  search={controller.search}
                  statusFilter={controller.statusFilter}
                  assignmentFilter={controller.assignmentFilter}
                  clinicSpecialistFilter={controller.clinicSpecialistFilter}
                  specialistFilterOptions={controller.specialistFilterOptions}
                  onSearchChange={controller.handleSearchChange}
                  onStatusFilterChange={controller.handleStatusFilterChange}
                  onAssignmentFilterChange={controller.handleAssignmentFilterChange}
                  onSpecialistFilterChange={controller.handleSpecialistFilterChange}
                  onSelectPatient={handleSelectPatient}
                  onAdd={handleAdd}
                  onRetry={controller.handleRetry}
                  onLoadMore={controller.handleLoadMorePatients}
                  headingRef={listHeadingRef}
                />
              </View>

              {!isCompact ? (
                <View style={styles.detailPanel}>{secondaryPanel}</View>
              ) : null}
            </View>
          </View>
        )}
      </ClinicWorkspaceScaffold>

      {isCompact && controller.workspace.selectedMembership ? (
        <ClinicPatientAdaptiveSheet
          visible={adaptiveNavigation.panelOpen}
          title={compactPanelTitle}
          busy={controller.saving || controller.consentSaving}
          onBack={controller.assignmentMode
            ? controller.handleCancelAssignment
            : adaptiveNavigation.handleBack}
          onDismiss={restoreOriginFocus}
          overlay={controller.selectedSessionId ? appointmentDetail : null}
          onOverlayRequestClose={controller.handleCloseSessionDetail}
        >
          {secondaryPanel}
        </ClinicPatientAdaptiveSheet>
      ) : null}

      {!isCompact ? appointmentDetail : null}

      <ClinicSessionSchedulerModal
        visible={controller.sessionSchedulerVisible}
        clinicName={clinicName}
        patients={controller.selectedPatient ? [controller.selectedPatient] : []}
        lockedPatientId={controller.selectedPatient?.id ?? null}
        onClose={handleCloseSessionScheduler}
        onSubmit={controller.handleSubmitPatientSession}
        onCreated={handlePatientSessionCreated}
      />
    </>
  );
}
