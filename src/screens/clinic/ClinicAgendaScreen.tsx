import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DropdownOption, SimpleDropdown } from '../../components/common/SimpleDropdown';
import { spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  useClinicAgendaController,
  type ClinicAgendaCreateSessionErrors,
  type ClinicAgendaCreateSessionForm,
} from './useClinicAgendaController';

const SESSION_STATUS_LABELS: Record<clinicService.ClinicSessionStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const SESSION_TYPE_LABELS: Record<clinicService.ClinicSessionType, string> = {
  IN_PERSON: 'Presencial',
  PHONE_CALL: 'Teléfono',
  VIDEO_CALL: 'Videollamada',
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

const formatTime = (value: string): string =>
  new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

export function ClinicAgendaScreen({
  navigation,
}: ScreenProps<'ClinicAgenda'>): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 920;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const {
    canManage,
    editableFilters,
    error,
    form,
    formErrors,
    handleApplyFilters,
    handleChangeForm,
    handleCreateSession,
    handleLoadMore,
    handleOpenCreateModal,
    handleRetry,
    handleSelectClinic,
    handleUpdateStatus,
    loading,
    loadingMore,
    modalVisible,
    pageInfo,
    patientFilterOptions,
    patientOptions,
    patients,
    selectedFormPatient,
    sessions,
    setEditableFilter,
    setModalVisible,
    saving,
    specialistFilterOptions,
    workspace,
  } = useClinicAgendaController();

  const clinicName = workspace.selectedMembership?.clinic.commercialName ?? 'Agenda de clínica';

  return (
    <ClinicWorkspaceScaffold
      title={clinicName}
      subtitle="Coordina citas administrativas de clínica sin mezclar agenda privada, pagos ni área clínica sensible."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
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
            onPress={handleOpenCreateModal}
            disabled={!canManage || patients.length === 0 || saving}
            icon={<Ionicons name="add-circle-outline" size={18} color={theme.actionPrimaryText} />}
          >
            Nueva cita
          </Button>
        </View>
      ) : undefined}
    >
      {!workspace.selectedMembership ? (
        <StatePanel
          icon="business-outline"
          title="No hay clínica vinculada"
          text="Cuando esta cuenta tenga una clínica activa asociada, la agenda aparecerá aquí."
        />
      ) : (
        <View style={styles.workspace}>
          {!canManage ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                La agenda de clínica está reservada a propietarios y administradores.
              </Text>
            </View>
          ) : null}

          <View style={styles.filters}>
            <Input
              label="Desde"
              value={editableFilters.startDate}
              onChangeText={(value) => setEditableFilter('startDate', value)}
              containerStyle={styles.filterInput}
            />
            <Input
              label="Hasta"
              value={editableFilters.endDate}
              onChangeText={(value) => setEditableFilter('endDate', value)}
              containerStyle={styles.filterInput}
            />
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Estado</Text>
              <SimpleDropdown
                options={STATUS_OPTIONS}
                value={editableFilters.statusFilter}
                onSelect={(value) => setEditableFilter('statusFilter', value)}
              />
            </View>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Profesional</Text>
              <SimpleDropdown
                options={specialistFilterOptions}
                value={editableFilters.specialistFilter}
                onSelect={(value) => setEditableFilter('specialistFilter', value)}
              />
            </View>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Paciente</Text>
              <SimpleDropdown
                options={patientFilterOptions}
                value={editableFilters.patientFilter}
                onSelect={(value) => setEditableFilter('patientFilter', value)}
              />
            </View>
            <View style={styles.filterAction}>
              <Button variant="outline" size="medium" onPress={handleApplyFilters}>
                Aplicar
              </Button>
            </View>
          </View>

          {loading ? (
            <View style={styles.statePanel}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={styles.stateText}>Cargando agenda</Text>
            </View>
          ) : error ? (
            <StatePanel
              icon="alert-circle-outline"
              title="No se pudo cargar la agenda"
              text={error}
              actionLabel="Reintentar"
              onAction={handleRetry}
            />
          ) : sessions.length === 0 ? (
            <StatePanel
              icon="calendar-outline"
              title="Sin citas en este rango"
              text="Las citas creadas por la clínica aparecerán en este listado."
            />
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  saving={saving}
                  onCancel={() => {
                    void handleUpdateStatus(session, 'CANCELLED');
                  }}
                  onComplete={() => {
                    void handleUpdateStatus(session, 'COMPLETED');
                  }}
                />
              ))}
              {pageInfo?.hasMore ? (
                <Button
                  variant="outline"
                  size="medium"
                  loading={loadingMore}
                  onPress={handleLoadMore}
                >
                  Cargar más citas
                </Button>
              ) : null}
            </View>
          )}

          <CreateSessionModal
            visible={modalVisible}
            form={form}
            errors={formErrors}
            patientOptions={patientOptions}
            selectedPatient={selectedFormPatient}
            saving={saving}
            onChange={handleChangeForm}
            onClose={() => {
              if (!saving) setModalVisible(false);
            }}
            onSubmit={handleCreateSession}
          />
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}

interface StatePanelProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

function StatePanel({
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: StatePanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStateStyles(theme), [theme]);

  return (
    <View style={styles.panel}>
      <Ionicons name={icon} size={28} color={theme.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <Button variant="outline" size="medium" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

interface SessionRowProps {
  session: clinicService.ClinicSessionSummary;
  saving: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

function SessionRow({
  session,
  saving,
  onCancel,
  onComplete,
}: SessionRowProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createSessionRowStyles(theme), [theme]);
  const isFuture = new Date(session.date).getTime() > Date.now();
  const canAct = session.status === 'CONFIRMED';
  const statusStyle = {
    CONFIRMED: styles.status_CONFIRMED,
    COMPLETED: styles.status_COMPLETED,
    CANCELLED: styles.status_CANCELLED,
    PENDING: styles.status_PENDING,
  }[session.status];

  return (
    <View style={styles.row}>
      <View style={styles.timeBlock}>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        <Text style={styles.time}>{formatTime(session.date)}</Text>
        <Text style={styles.duration}>{session.duration} min</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text style={styles.patient} numberOfLines={1}>{session.patient.displayName}</Text>
          <View style={[styles.statusPill, statusStyle]}>
            <Text style={styles.statusText}>{SESSION_STATUS_LABELS[session.status]}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {session.specialist.displayName}
          {session.specialist.professionalTitle ? ` · ${session.specialist.professionalTitle}` : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {SESSION_TYPE_LABELS[session.type]}
          {session.bookedPrice !== null ? ` · ${session.bookedPrice.toFixed(2)} ${session.bookedCurrency ?? 'EUR'}` : ''}
        </Text>
      </View>
      {canAct ? (
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="small"
            onPress={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="small"
            onPress={onComplete}
            disabled={saving || isFuture}
          >
            Completar
          </Button>
        </View>
      ) : null}
    </View>
  );
}

interface CreateSessionModalProps {
  visible: boolean;
  form: ClinicAgendaCreateSessionForm;
  errors: ClinicAgendaCreateSessionErrors;
  patientOptions: DropdownOption<string>[];
  selectedPatient: clinicService.ClinicPatientSummary | null;
  saving: boolean;
  onChange: <K extends keyof ClinicAgendaCreateSessionForm>(
    field: K,
    value: ClinicAgendaCreateSessionForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function CreateSessionModal({
  visible,
  form,
  errors,
  patientOptions,
  selectedPatient,
  saving,
  onChange,
  onClose,
  onSubmit,
}: CreateSessionModalProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nueva cita</Text>
              <Text style={styles.subtitle}>Agenda de clínica</Text>
            </View>
            <Button variant="ghost" size="small" onPress={onClose} disabled={saving}>
              Cerrar
            </Button>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.label}>Paciente</Text>
              <SimpleDropdown
                options={patientOptions}
                value={form.clinicPatientId || null}
                onSelect={(value) => onChange('clinicPatientId', value)}
                placeholder="Selecciona paciente"
                maxHeight={280}
              />
              {errors.clinicPatientId ? <Text style={styles.error}>{errors.clinicPatientId}</Text> : null}
            </View>

            <View style={styles.responsiblePanel}>
              <Text style={styles.responsibleLabel}>Responsable</Text>
              <Text style={styles.responsibleText}>
                {selectedPatient?.activeAssignment?.clinicSpecialistDisplayName ?? 'Sin responsable activo'}
              </Text>
              {errors.clinicSpecialistId ? <Text style={styles.error}>{errors.clinicSpecialistId}</Text> : null}
            </View>

            <View style={styles.grid}>
              <Input
                label="Fecha"
                value={form.date}
                onChangeText={(value) => onChange('date', value)}
                error={errors.date}
                containerStyle={styles.gridInput}
              />
              <Input
                label="Hora"
                value={form.time}
                onChangeText={(value) => onChange('time', value)}
                error={errors.time}
                containerStyle={styles.gridInput}
              />
              <Input
                label="Duración"
                value={form.duration}
                onChangeText={(value) => onChange('duration', value)}
                error={errors.duration}
                keyboardType="numeric"
                containerStyle={styles.gridInput}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <SimpleDropdown
                options={TYPE_OPTIONS}
                value={form.type}
                onSelect={(value) => onChange('type', value)}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button variant="outline" size="medium" onPress={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="medium" onPress={onSubmit} loading={saving}>
              Crear cita
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    workspace: {
      gap: spacing.lg,
    },
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
    noticeText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 20,
    },
    filters: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'flex-end',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      position: 'relative',
      zIndex: 20,
    },
    filterInput: {
      flex: isCompact ? undefined : 1,
      minWidth: isCompact ? undefined : 150,
      marginBottom: 0,
    },
    filterDropdown: {
      flex: isCompact ? undefined : 1.2,
      minWidth: isCompact ? undefined : 180,
      gap: spacing.xs,
      position: 'relative',
      zIndex: 30,
    },
    filterLabel: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    filterAction: {
      minWidth: isCompact ? undefined : 110,
    },
    sessionList: {
      gap: spacing.md,
      position: 'relative',
      zIndex: 1,
    },
    statePanel: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
    },
  });

const createStateStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    text: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 520,
    },
  });

const createSessionRowStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
    },
    timeBlock: {
      width: 110,
      gap: 2,
    },
    date: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      textTransform: 'capitalize',
    },
    time: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 22,
      lineHeight: 28,
    },
    duration: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
    },
    main: {
      flex: 1,
      minWidth: 220,
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
    },
    patient: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
      flexShrink: 1,
    },
    meta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 20,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderWidth: 1,
    },
    status_CONFIRMED: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    status_COMPLETED: {
      borderColor: theme.success,
      backgroundColor: theme.successBg,
    },
    status_CANCELLED: {
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
    },
    status_PENDING: {
      borderColor: theme.secondary,
      backgroundColor: theme.secondaryAlpha12,
    },
    statusText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
  });

const createModalStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.overlay,
      padding: spacing.lg,
    },
    modal: {
      width: '100%',
      maxWidth: 620,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      padding: spacing.lg,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    field: {
      gap: spacing.xs,
      position: 'relative',
      zIndex: 20,
    },
    label: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    error: {
      color: theme.error,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 16,
    },
    responsiblePanel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.md,
      gap: 4,
    },
    responsibleLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    responsibleText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 15,
      lineHeight: 21,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    gridInput: {
      flex: 1,
      minWidth: 150,
      marginBottom: 0,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: spacing.lg,
    },
  });

export default ClinicAgendaScreen;
