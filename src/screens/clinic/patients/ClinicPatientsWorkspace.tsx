import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/common/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ScreenProps } from '../../../constants/types';
import { ClinicWorkspaceScaffold } from '../components/ClinicWorkspaceScaffold';
import { ClinicPatientDetailPanel } from './ClinicPatientDetailPanel';
import { ClinicPatientFormPanel } from './ClinicPatientFormPanel';
import { ClinicPatientsListPanel } from './ClinicPatientsListPanel';
import { hasPatientDetail } from './clinicPatientDomain';
import { createWorkspaceStyles } from './clinicPatientStyles';
import { useClinicPatientsController } from './useClinicPatientsController';

interface ClinicPatientsWorkspaceProps {
  navigation: ScreenProps<'ClinicPatients'>['navigation'];
}

export function ClinicPatientsWorkspace({
  navigation,
}: ClinicPatientsWorkspaceProps): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 940;
  const styles = useMemo(() => createWorkspaceStyles(theme, isCompact), [isCompact, theme]);
  const controller = useClinicPatientsController();
  const clinicName = controller.workspace.selectedMembership?.clinic.commercialName;

  return (
    <ClinicWorkspaceScaffold
      title="Pacientes"
      contextLabel={clinicName}
      subtitle="Gestiona datos administrativos y fiscales de pacientes de clínica con un espacio separado del área asistencial."
      memberships={controller.workspace.memberships}
      selectedClinicId={controller.workspace.selectedClinicId}
      loading={controller.workspace.loading}
      error={controller.workspace.error}
      onSelectClinic={controller.handleSelectClinic}
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
            variant="primary"
            size="medium"
            onPress={controller.handleAdd}
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
                onSelectPatient={controller.handleSelectPatient}
                onAdd={controller.handleAdd}
                onRetry={controller.handleRetry}
                onLoadMore={controller.handleLoadMorePatients}
              />
            </View>

            <View style={styles.detailPanel}>
              {controller.panelMode === 'create' || controller.panelMode === 'edit' ? (
                <ClinicPatientFormPanel
                  mode={controller.panelMode}
                  form={controller.form}
                  errors={controller.errors}
                  saving={controller.saving}
                  feedback={controller.feedback}
                  canManage={controller.canManage}
                  onChange={controller.handleChange}
                  onSubmit={controller.handleSubmit}
                  onCancel={controller.handleCancelForm}
                />
              ) : controller.selectedPatient ? (
                <ClinicPatientDetailPanel
                  patient={controller.selectedPatient}
                  detailLoading={controller.detailLoading && !hasPatientDetail(controller.selectedPatient)}
                  saving={controller.saving}
                  feedback={controller.feedback}
                  consent={controller.selectedPatientConsent}
                  consentLoading={controller.consentLoading}
                  consentSaving={controller.consentSaving}
                  openingConsentDocumentId={controller.openingConsentDocumentId}
                  assignmentHistory={controller.assignmentHistory}
                  assignmentHistoryPageInfo={controller.assignmentHistoryPageInfo}
                  assignmentHistoryLoading={controller.assignmentHistoryLoading}
                  assignmentHistoryLoadingMore={controller.assignmentHistoryLoadingMore}
                  assignmentHistoryError={controller.assignmentHistoryError}
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
                  onLoadMoreAssignmentHistory={controller.handleLoadMoreAssignmentHistory}
                  onRetryAssignmentHistory={controller.handleRetryAssignmentHistory}
                  onEdit={controller.handleEdit}
                  onStatusChange={controller.handleStatusChange}
                />
              ) : (
                <View style={styles.statePanel}>
                  <Ionicons name="person-circle-outline" size={30} color={theme.textMuted} />
                  <Text style={styles.stateTitle}>Selecciona una ficha</Text>
                  <Text style={styles.stateText}>
                    Aquí verás los datos administrativos y fiscales del paciente seleccionado.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}
