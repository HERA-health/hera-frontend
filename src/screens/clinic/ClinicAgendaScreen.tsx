import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { ClinicSessionSchedulerModal } from '../../components/clinic/ClinicSessionSchedulerModal';
import { useAppAlert } from '../../components/common/alert';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from '../../components/common/AnimatedPressable';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { AppointmentDetailSheet } from '../../components/sessions/AppointmentDetailSheet';
import {
  CLINIC_SESSION_STATUS_LABELS,
  CLINIC_SESSION_STATUS_THEME_KEYS,
  CLINIC_SESSION_TYPE_LABELS,
  requestClinicSessionStatusConfirmation,
  type ClinicSessionTerminalStatus,
} from '../../components/sessions/sessionPresentation';
import { borderRadius, spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import {
  STATUS_OPTIONS,
  useClinicAgendaController,
  type ClinicStatusUpdatableSession,
} from './useClinicAgendaController';

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
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const isCompact = width < 920;
  const isNarrow = width < 620;
  const styles = useMemo(
    () => createStyles(theme, isCompact, isNarrow),
    [isCompact, isNarrow, theme],
  );
  const {
    agendaRefreshError,
    agendaLoadingMore,
    agendaPageInfo,
    canManage,
    editableFilters,
    error,
    handleApplyFilters,
    handleCloseCreateModal: closeCreateModal,
    handleLoadMoreSessions,
    handleLoadMorePatientOptions,
    handleOpenCreateModal,
    handleOpenSessionDetail,
    handlePatientLookupSearchChange,
    handleRetry,
    handleRetryAgendaRefresh,
    handleRetryPatientLookup,
    handleRetrySessionDetail,
    handleRetrySpecialists,
    handleSelectClinic,
    handleSessionCreated: completeSessionCreation,
    handleSubmitSession,
    handleUpdateStatus,
    handleCloseSessionDetail,
    loading,
    modalVisible,
    originFilterOptions,
    patientFilterOptions,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupError,
    patientLookupSearch,
    patientOptions,
    patients,
    selectedSessionDetail,
    selectedSessionDetailError,
    selectedSessionDetailLoading,
    selectedSessionId,
    sessions,
    setEditableFilter,
    saving,
    specialistsError,
    specialistFilterOptions,
    workspace,
  } = useClinicAgendaController();

  const clinicName = workspace.selectedMembership?.clinic.commercialName;
  const selectedDetail = selectedSessionDetail;
  const [selectedPrivateSession, setSelectedPrivateSession] =
    useState<clinicService.ClinicAgendaPrivateSession | null>(null);
  const newSessionButtonRef = useRef<AnimatedPressableHandle>(null);

  const restoreNewSessionFocus = useCallback(() => {
    setTimeout(() => {
      newSessionButtonRef.current?.focus();
    }, 0);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    closeCreateModal();
    restoreNewSessionFocus();
  }, [closeCreateModal, restoreNewSessionFocus]);

  const handleSessionCreated = useCallback((session: clinicService.ClinicSessionSummary) => {
    completeSessionCreation(session);
    restoreNewSessionFocus();
  }, [completeSessionCreation, restoreNewSessionFocus]);

  const confirmSessionStatusUpdate = useCallback((
    session: ClinicStatusUpdatableSession,
    status: ClinicSessionTerminalStatus,
    closeDetailAfterSuccess = false,
  ) => {
    requestClinicSessionStatusConfirmation(appAlert, status, () => {
      void handleUpdateStatus(session, status).then((updated) => {
        if (updated && closeDetailAfterSuccess) handleCloseSessionDetail();
      });
    });
  }, [appAlert, handleCloseSessionDetail, handleUpdateStatus]);

  return (
    <ClinicWorkspaceScaffold
      title="Agenda"
      contextLabel={clinicName}
      subtitle="Coordina la agenda del equipo y consulta la ocupación particular de un profesional vinculado sin acceder a datos clínicos, de contacto o financieros."
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
                focusRef={newSessionButtonRef}
                variant="primary"
            size="medium"
            onPress={handleOpenCreateModal}
            disabled={!canManage || saving}
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
            <View style={styles.filterHeader}>
              <View style={styles.filterHeading}>
                <View style={styles.filterIcon}>
                  <Ionicons name="options-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.filterHeadingCopy}>
                  <Text style={styles.filterTitle}>Filtrar agenda</Text>
                  <Text style={styles.filterDescription}>
                    Ajusta el periodo y el contexto antes de actualizar la vista.
                  </Text>
                </View>
              </View>
              <View style={styles.coordinationBadge}>
                <Ionicons name="people-outline" size={15} color={theme.secondaryDark} />
                <Text style={styles.coordinationBadgeText}>Vista de coordinación</Text>
              </View>
            </View>

            <View style={styles.primaryFilters}>
              <View style={styles.periodFilter}>
                <View style={styles.filterLabelRow}>
                  <Ionicons name="calendar-outline" size={15} color={theme.primary} />
                  <Text style={styles.filterLabel}>Periodo</Text>
                </View>
                <View style={styles.periodInputs}>
                  <Input
                    label="Desde"
                    value={editableFilters.startDate}
                    onChangeText={(value) => setEditableFilter('startDate', value)}
                    containerStyle={styles.dateInput}
                    leftIcon={<Ionicons name="calendar-clear-outline" size={16} color={theme.textMuted} />}
                  />
                  <View style={styles.periodConnector} />
                  <Input
                    label="Hasta"
                    value={editableFilters.endDate}
                    onChangeText={(value) => setEditableFilter('endDate', value)}
                    containerStyle={styles.dateInput}
                    leftIcon={<Ionicons name="calendar-clear-outline" size={16} color={theme.textMuted} />}
                  />
                </View>
              </View>

              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Estado</Text>
                <SimpleDropdown
                  compact
                  accessibilityLabel="Filtrar agenda por estado"
                  highlightSelection={false}
                  options={STATUS_OPTIONS}
                  value={editableFilters.statusFilter}
                  onSelect={(value) => setEditableFilter('statusFilter', value)}
                />
              </View>

              <View style={styles.professionalFilter}>
                <Text style={styles.filterLabel}>Profesional</Text>
                <SimpleDropdown
                  compact
                  accessibilityLabel="Filtrar agenda por profesional"
                  highlightSelection={false}
                  options={specialistFilterOptions}
                  value={editableFilters.specialistFilter}
                  onSelect={(value) => setEditableFilter('specialistFilter', value)}
                />
                {specialistsError ? (
                  <View accessibilityRole="alert" style={styles.referenceError}>
                    <Text style={styles.referenceErrorText}>{specialistsError}</Text>
                    <Button variant="ghost" size="small" onPress={handleRetrySpecialists}>
                      Reintentar
                    </Button>
                  </View>
                ) : null}
              </View>

              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Origen</Text>
                <SimpleDropdown
                  compact
                  accessibilityLabel="Filtrar agenda por origen"
                  highlightSelection={false}
                  options={originFilterOptions}
                  value={editableFilters.originFilter}
                  onSelect={(value) => setEditableFilter('originFilter', value)}
                />
              </View>

              <View style={styles.filterAction}>
                <Button
                  variant="primary"
                  size="medium"
                  fullWidth
                  onPress={handleApplyFilters}
                  icon={<Ionicons name="refresh-outline" size={17} color={theme.actionPrimaryText} />}
                >
                  Actualizar agenda
                </Button>
              </View>
            </View>

            <View style={styles.patientFilter}>
              <View style={styles.patientFilterHeader}>
                <View style={styles.filterLabelRow}>
                  <Ionicons name="person-outline" size={15} color={theme.primary} />
                  <Text style={styles.filterLabel}>Paciente</Text>
                </View>
                <Text style={styles.patientFilterHint}>Opcional</Text>
              </View>
              <View style={styles.patientFilterControls}>
                <Input
                  accessibilityLabel="Buscar paciente para filtrar la agenda"
                  placeholder="Buscar por nombre"
                  value={patientLookupSearch}
                  onChangeText={handlePatientLookupSearchChange}
                  containerStyle={styles.patientSearchInput}
                  leftIcon={<Ionicons name="search-outline" size={17} color={theme.textMuted} />}
                />
                <View style={styles.patientDropdown}>
                  <SimpleDropdown
                    compact
                    accessibilityLabel="Filtrar agenda por paciente"
                    highlightSelection={false}
                    options={patientFilterOptions}
                    value={editableFilters.patientFilter}
                    onSelect={(value) => setEditableFilter('patientFilter', value)}
                  />
                </View>
                {patientLookupPageInfo?.hasMore ? (
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={handleLoadMorePatientOptions}
                    loading={patientLookupLoadingMore}
                    disabled={patientLookupLoading || patientLookupLoadingMore}
                  >
                    Ver más
                  </Button>
                ) : null}
              </View>
              {patientLookupError ? (
                <View accessibilityRole="alert" style={styles.referenceError}>
                  <Text style={styles.referenceErrorText}>{patientLookupError}</Text>
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={handleRetryPatientLookup}
                    disabled={patientLookupLoading}
                  >
                    Reintentar
                  </Button>
                </View>
              ) : null}
            </View>
          </View>

          <AgendaOriginLegend />

          {agendaRefreshError ? (
            <View accessibilityRole="alert" style={styles.refreshNotice}>
              <Ionicons name="cloud-offline-outline" size={18} color={theme.warning} />
              <Text style={styles.refreshNoticeText}>{agendaRefreshError}</Text>
              <Button variant="ghost" size="small" onPress={handleRetryAgendaRefresh}>
                Reintentar
              </Button>
            </View>
          ) : null}

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
              text="Selecciona un profesional para incorporar sus citas particulares a la vista de coordinación."
            />
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <SessionRow
                  key={session.key}
                  session={session}
                  saving={saving}
                  onCancel={session.origin === 'CLINIC' ? () => {
                    confirmSessionStatusUpdate(session, 'CANCELLED');
                  } : undefined}
                  onOpen={() => {
                    if (session.origin === 'CLINIC') {
                      handleOpenSessionDetail(session.sessionId);
                      return;
                    }

                    setSelectedPrivateSession(session);
                  }}
                />
              ))}
              {agendaPageInfo?.hasMore ? (
                <View style={styles.loadMoreAgenda}>
                  <Button
                    variant="outline"
                    size="medium"
                    onPress={handleLoadMoreSessions}
                    loading={agendaLoadingMore}
                    disabled={agendaLoadingMore}
                  >
                    Cargar más citas
                  </Button>
                </View>
              ) : null}
            </View>
          )}

          <ClinicSessionSchedulerModal
            visible={modalVisible}
            clinicName={clinicName}
            patients={patients}
            patientOptions={patientOptions}
            patientLookupSearch={patientLookupSearch}
            patientLookupLoading={patientLookupLoading}
            patientLookupLoadingMore={patientLookupLoadingMore}
            patientLookupHasMore={Boolean(patientLookupPageInfo?.hasMore)}
            patientLookupError={patientLookupError}
            onLoadMorePatients={handleLoadMorePatientOptions}
            onPatientSearchChange={handlePatientLookupSearchChange}
            onRetryPatientLookup={handleRetryPatientLookup}
            onClose={handleCloseCreateModal}
            onSubmit={handleSubmitSession}
            onCreated={handleSessionCreated}
          />

          <AppointmentDetailSheet
            visible={Boolean(selectedSessionId)}
            mode="clinic-admin"
            clinicSession={selectedDetail}
            loading={selectedSessionDetailLoading}
            error={selectedSessionDetailError}
            processing={saving}
            onClose={handleCloseSessionDetail}
            onRetry={handleRetrySessionDetail}
            onCancel={selectedDetail?.actions.canCancel ? () => {
              confirmSessionStatusUpdate(selectedDetail, 'CANCELLED', true);
            } : undefined}
            onComplete={selectedDetail?.actions.canComplete ? () => {
              confirmSessionStatusUpdate(selectedDetail, 'COMPLETED', true);
            } : undefined}
          />
          <PrivateAgendaDetailModal
            session={selectedPrivateSession}
            onClose={() => setSelectedPrivateSession(null)}
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
  session: clinicService.ClinicAgendaItem;
  saving: boolean;
  onCancel?: () => void;
  onOpen: () => void;
}

function SessionRow({
  session,
  saving,
  onCancel,
  onOpen,
}: SessionRowProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createSessionRowStyles(theme), [theme]);
  const sessionEnded = new Date(session.date).getTime() + session.duration * 60 * 1000 <= Date.now();
  const canAct = !session.readOnly && session.status === 'CONFIRMED' && !sessionEnded;
  const statusPalette = theme.status[CLINIC_SESSION_STATUS_THEME_KEYS[session.status]];
  const originColor = session.origin === 'CLINIC' ? theme.primary : theme.secondaryDark;

  return (
    <View style={styles.row}>
      <View
        pointerEvents="none"
        style={[styles.originAccent, { backgroundColor: originColor }]}
      />
      <AnimatedPressable
      onPress={onOpen}
      hoverLift={false}
      pressScale={0.99}
      style={styles.detailsButton}
       accessibilityLabel={`Ver detalle operativo de cita de ${session.patientName}`}
    >
      <View style={styles.timeBlock}>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        <Text style={styles.time}>{formatTime(session.date)}</Text>
        <Text style={styles.duration}>{session.duration} min</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.titleRow}>
           <Text style={styles.patient} numberOfLines={1}>{session.patientName}</Text>
          <View style={[
            styles.statusPill,
            { backgroundColor: statusPalette.bg, borderColor: statusPalette.border },
          ]}>
            <Text style={[styles.statusText, { color: statusPalette.text }]}>
              {CLINIC_SESSION_STATUS_LABELS[session.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {session.specialist.displayName}
           {session.specialist.professionalTitle ? ` · ${session.specialist.professionalTitle}` : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
           {CLINIC_SESSION_TYPE_LABELS[session.type]} · {session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}
        </Text>
      </View>
      </AnimatedPressable>
      {canAct ? (
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="small"
            onPress={onCancel ?? (() => undefined)}
            disabled={saving}
          >
            Cancelar
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function AgendaOriginLegend(): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createAgendaOriginLegendStyles(theme), [theme]);

  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.label}>Origen de la cita</Text>
      <View style={styles.item}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        <Text style={styles.text}>Clínica</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.dot, { backgroundColor: theme.secondaryDark }]} />
        <Text style={styles.text}>Particular</Text>
      </View>
      <Text style={styles.note}>Las citas particulares son de solo lectura.</Text>
    </View>
  );
}

interface PrivateAgendaDetailModalProps {
  session: clinicService.ClinicAgendaPrivateSession | null;
  onClose: () => void;
}

function PrivateAgendaDetailModal({
  session,
  onClose,
}: PrivateAgendaDetailModalProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createPrivateAgendaDetailStyles(theme), [theme]);

  if (!session) {
    return <></>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Cita particular</Text>
              <Text style={styles.title}>{session.patientName}</Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              style={styles.closeButton}
              hoverLift={false}
              pressScale={0.96}
              accessibilityLabel="Cerrar detalle de cita particular"
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <View style={styles.detailList}>
            <DetailRow label="Fecha" value={formatDate(session.date)} />
            <DetailRow label="Hora" value={formatTime(session.date)} />
            <DetailRow label="Duración" value={`${session.duration} min`} />
            <DetailRow label="Modalidad" value={CLINIC_SESSION_TYPE_LABELS[session.type]} />
            <DetailRow label="Estado" value={CLINIC_SESSION_STATUS_LABELS[session.status]} />
            <DetailRow label="Profesional" value={session.specialist.displayName} />
          </View>
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={16} color={theme.secondaryDark} />
            <Text style={styles.noticeText}>
              Vista operativa de solo lectura. No incluye contacto, notas, documentos ni información económica.
            </Text>
          </View>
          <Button variant="outline" size="medium" onPress={onClose} fullWidth>
            Cerrar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createPrivateAgendaDetailStyles(theme), [theme]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean, isNarrow: boolean) =>
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
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgElevated,
      padding: spacing.lg,
      position: 'relative',
      zIndex: 20,
    },
    filterHeader: {
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    filterHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    filterIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
    },
    filterHeadingCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    filterTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 16,
      lineHeight: 21,
    },
    filterDescription: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    coordinationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.secondaryAlpha12,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
    },
    coordinationBadgeText: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    primaryFilters: {
      flexDirection: isCompact ? 'column' : 'row',
      flexWrap: isCompact ? undefined : 'wrap',
      alignItems: isCompact ? 'stretch' : 'flex-end',
      gap: spacing.md,
    },
    periodFilter: {
      flex: isCompact ? undefined : 1.55,
      minWidth: isCompact ? undefined : 300,
      gap: spacing.xs,
    },
    filterLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 18,
    },
    periodInputs: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    dateInput: {
      flex: 1,
      minWidth: 0,
      marginBottom: 0,
    },
    periodConnector: {
      width: 10,
      height: 1,
      marginBottom: 22,
      backgroundColor: theme.border,
    },
    filterDropdown: {
      flex: isCompact ? undefined : 1,
      minWidth: isCompact ? undefined : 156,
      gap: spacing.xs,
      position: 'relative',
      zIndex: 30,
    },
    professionalFilter: {
      flex: isCompact ? undefined : 1.2,
      minWidth: isCompact ? undefined : 190,
      gap: spacing.xs,
      position: 'relative',
      zIndex: 30,
    },
    filterLabel: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    filterAction: {
      width: isCompact ? '100%' : 184,
      minWidth: isCompact ? undefined : 184,
    },
    patientFilter: {
      gap: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgMuted,
      padding: spacing.md,
      position: 'relative',
      zIndex: 25,
    },
    patientFilterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    patientFilterHint: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
      lineHeight: 16,
    },
    patientFilterControls: {
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'stretch' : 'center',
      gap: spacing.sm,
    },
    patientSearchInput: {
      flex: 1,
      marginBottom: 0,
    },
    patientDropdown: {
      width: isNarrow ? '100%' : 240,
      minWidth: isNarrow ? undefined : 200,
      position: 'relative',
      zIndex: 30,
    },
    referenceError: {
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'stretch' : 'center',
      gap: spacing.xs,
    },
    referenceErrorText: {
      flex: 1,
      color: theme.error,
      fontFamily: theme.fontSansMedium,
      fontSize: 12,
      lineHeight: 17,
    },
    refreshNotice: {
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'stretch' : 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.warning,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.warningBg,
      padding: spacing.md,
    },
    refreshNoticeText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 13,
      lineHeight: 19,
    },
    sessionList: {
      gap: spacing.md,
      position: 'relative',
      zIndex: 1,
    },
    loadMoreAgenda: {
      alignItems: 'center',
      paddingTop: spacing.xs,
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
    originAccent: {
      position: 'absolute',
      top: spacing.sm,
      bottom: spacing.sm,
      left: 0,
      width: 3,
      borderRadius: 999,
    },
    detailsButton: {
      flex: 1,
      minWidth: 260,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.md,
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
    statusText: {
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

const createAgendaOriginLegendStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
      backgroundColor: theme.bgMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 6,
    },
    label: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    text: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: 13,
      lineHeight: 18,
    },
    note: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
      flexShrink: 1,
    },
  });

const createPrivateAgendaDetailStyles = (theme: Theme) =>
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
      maxWidth: 480,
      gap: spacing.lg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    eyebrow: {
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 22,
      lineHeight: 29,
    },
    closeButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: theme.bgMuted,
    },
    detailList: {
      gap: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: spacing.sm,
    },
    detailLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: 13,
      lineHeight: 19,
    },
    detailValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
    },
    notice: {
      flexDirection: 'row',
      gap: spacing.sm,
      borderRadius: 6,
      backgroundColor: theme.secondaryAlpha12,
      padding: spacing.md,
    },
    noticeText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
  });

export default ClinicAgendaScreen;
