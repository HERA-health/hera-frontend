import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AnimatedPressable, Button, useAppAlert } from '../../components/common';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { VisibleScrollView } from '../../components/common/VisibleScrollView';
import {
  FinanceFilterToolbar,
  FinanceSummaryStrip,
  FocusedActionSheet,
  ValidatedTextArea,
} from '../../components/finance';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as financeAdmin from '../../services/adminClinicFinanceService';
import type {
  ActivationChecklistGroup,
  ActivationChecklistStatus,
  ActivationRequestStatus,
  AdminClinicFinanceDetail,
  AdminClinicFinanceListItem,
  AdminClinicFinanceSummary,
  FinancialWorkflowMode,
} from '../../services/adminClinicFinanceService';

interface Props {
  onSummaryChanged?: (summary: AdminClinicFinanceSummary) => void;
}

const MODE_LABELS: Record<FinancialWorkflowMode, string> = {
  OFF: 'Pendiente de preparación',
  SHADOW: 'En comprobación',
  ACTIVE: 'Operativa',
};

const REQUEST_LABELS: Record<ActivationRequestStatus, string> = {
  PENDING_REVIEW: 'Revisión solicitada',
  IN_REVIEW: 'En revisión por HERA',
  CHANGES_REQUIRED: 'Cambios solicitados',
  ACTIVATED: 'Activada',
  CANCELLED: 'Cancelada',
};

const MODE_OPTIONS = [
  { value: 'ALL', label: 'Cualquier situación' },
  { value: 'OFF', label: MODE_LABELS.OFF },
  { value: 'SHADOW', label: MODE_LABELS.SHADOW },
  { value: 'ACTIVE', label: MODE_LABELS.ACTIVE },
] as const;
const REQUEST_OPTIONS = [
  { value: 'ALL', label: 'Cualquier revisión' },
  { value: 'PENDING_REVIEW', label: 'Revisión solicitada' },
  { value: 'IN_REVIEW', label: 'En revisión por HERA' },
] as const;
const READINESS_OPTIONS = [
  { value: 'ALL', label: 'Cualquier preparación' },
  { value: 'READY', label: 'Lista para continuar' },
  { value: 'BLOCKED', label: 'Con acciones pendientes' },
] as const;

const TIMELINE_LABELS: Record<string, string> = {
  ACTIVATION_REQUESTED: 'La clínica solicitó revisión',
  ACTIVATION_REQUEST_CANCELLED: 'La clínica canceló la solicitud',
  ACTIVATION_REVIEW_STARTED: 'HERA inició la revisión y el ensayo',
  ACTIVATION_CHANGES_REQUIRED: 'HERA devolvió cambios',
  SHADOW_RECONCILED: 'Cálculos del ensayo comprobados',
  FISCAL_READINESS_APPROVED: 'Aprobación fiscal registrada',
  STORAGE_READINESS_CHECKED: 'Archivo privado verificado',
  JOURNAL_VERIFIED: 'Integridad del historial verificada',
  WORKFLOW_ACTIVATED: 'Circuito financiero activado',
  WORKFLOW_DEACTIVATED: 'Nuevas operaciones pausadas',
};

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const statusIcon = (status: ActivationChecklistStatus): React.ComponentProps<typeof Ionicons>['name'] => {
  if (status === 'PASS') return 'checkmark-circle';
  if (status === 'BLOCKED') return 'alert-circle';
  if (status === 'WARNING') return 'information-circle';
  return 'ellipse-outline';
};

const statusColor = (status: ActivationChecklistStatus, theme: Theme): string => {
  if (status === 'PASS') return theme.success;
  if (status === 'BLOCKED') return theme.error;
  if (status === 'WARNING') return theme.warning;
  return theme.textMuted;
};

export function AdminClinicFinanceScreen({ onSummaryChanged }: Props): React.ReactElement {
  const { theme, isDark } = useTheme();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);
  const [summary, setSummary] = useState<AdminClinicFinanceSummary | null>(null);
  const [items, setItems] = useState<AdminClinicFinanceListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminClinicFinanceDetail | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<FinancialWorkflowMode | 'ALL'>('ALL');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'IN_REVIEW'>('PENDING_REVIEW');
  const [readinessFilter, setReadinessFilter] = useState<'ALL' | 'READY' | 'BLOCKED'>('ALL');
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fiscalReference, setFiscalReference] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const commandReservations = useRef(new Map<string, { key: string; payload: string }>());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSummary = useCallback(async () => {
    try {
      const next = await financeAdmin.getAdminClinicFinanceSummary();
      setSummary(next);
      onSummaryChanged?.(next);
    } catch {
      // The queue remains usable if the compact counters cannot refresh.
    }
  }, [onSummaryChanged]);

  const loadList = useCallback(async (append = false) => {
    const generation = listGeneration.current + 1;
    listGeneration.current = generation;
    setListLoading(true);
    setListError(null);
    try {
      const page = await financeAdmin.listAdminClinicFinance({
        cursor: append ? nextCursor ?? undefined : undefined,
        limit: 20,
        search: debouncedSearch || undefined,
        mode: modeFilter === 'ALL' ? undefined : modeFilter,
        requestStatus: requestFilter === 'ALL' ? undefined : requestFilter,
        readiness: readinessFilter,
      });
      if (listGeneration.current !== generation) return;
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      if (!append) {
        const nextSelection = isDesktop
          ? page.items.some((item) => item.id === selectedClinicId)
            ? selectedClinicId
            : page.items[0]?.id ?? null
          : null;
        setSelectedClinicId(nextSelection);
      }
    } catch (error: unknown) {
      if (listGeneration.current !== generation) return;
      setListError(error instanceof Error ? error.message : 'No se pudo cargar la cola.');
      if (!append) setItems([]);
    } finally {
      if (listGeneration.current === generation) setListLoading(false);
    }
  }, [debouncedSearch, isDesktop, modeFilter, nextCursor, readinessFilter, requestFilter, selectedClinicId]);

  const loadDetail = useCallback(async (clinicId: string) => {
    const generation = detailGeneration.current + 1;
    detailGeneration.current = generation;
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    setFiscalReference('');
    setResolutionReason('');
    try {
      const next = await financeAdmin.getAdminClinicFinanceDetail(clinicId);
      if (detailGeneration.current !== generation) return;
      setDetail(next);
      setFiscalReference(next.clinic.fiscalReviewReference ?? '');
    } catch (error: unknown) {
      if (detailGeneration.current !== generation) return;
      setDetailError(error instanceof Error ? error.message : 'No se pudo cargar el detalle.');
    } finally {
      if (detailGeneration.current === generation) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadSummary(), loadList(false)]);
  }, [debouncedSearch, modeFilter, readinessFilter, requestFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedClinicId) void loadDetail(selectedClinicId);
    else {
      detailGeneration.current += 1;
      setDetail(null);
    }
  }, [loadDetail, selectedClinicId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedClinicId) void loadDetail(selectedClinicId);
    }, 60_000);
    return () => clearInterval(timer);
  }, [loadDetail, selectedClinicId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadList(false),
      selectedClinicId ? loadDetail(selectedClinicId) : Promise.resolve(),
    ]);
  }, [loadDetail, loadList, loadSummary, selectedClinicId]);

  const runCommand = useCallback(async (
    action: string,
    payload: Record<string, unknown>,
    operation: (idempotencyKey: string) => Promise<unknown>,
  ): Promise<void> => {
    if (!selectedClinicId || actionLoading) return;
    const serializedPayload = JSON.stringify(payload);
    const reservationKey = `${selectedClinicId}:${action}`;
    const existing = commandReservations.current.get(reservationKey);
    const reservation = existing?.payload === serializedPayload
      ? existing
      : { key: financeAdmin.createActivationCommandKey(), payload: serializedPayload };
    commandReservations.current.set(reservationKey, reservation);
    setActionLoading(action);
    setActionError(null);
    try {
      await operation(reservation.key);
      commandReservations.current.delete(reservationKey);
      await refreshAll();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo completar la acción.');
    } finally {
      setActionLoading(null);
    }
  }, [actionLoading, refreshAll, selectedClinicId]);

  const reviewPayload = useMemo(() => {
    const request = detail?.readiness.request;
    if (!detail || !request) return null;
    return {
      expectedMode: detail.clinic.mode,
      expectedRequestStatus: request.status,
      expectedRequestVersion: request.version,
    };
  }, [detail]);

  const selectClinic = useCallback((clinicId: string) => {
    if (clinicId === selectedClinicId) return;
    detailGeneration.current += 1;
    setDetail(null);
    setDetailError(null);
    setActionError(null);
    setFiscalReference('');
    setResolutionReason('');
    setSelectedClinicId(clinicId);
  }, [selectedClinicId]);

  const confirmAndRun = useCallback(async (options: {
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    action: string;
    payload: Record<string, unknown>;
    operation: (idempotencyKey: string) => Promise<unknown>;
  }) => {
    const confirmed = await appAlert.confirm({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      cancelLabel: 'Cancelar',
      destructive: options.destructive,
      tone: options.destructive ? 'danger' : 'warning',
      dismissible: true,
    });
    if (confirmed) await runCommand(options.action, options.payload, options.operation);
  }, [appAlert, runCommand]);

  const handleStartShadow = useCallback(() => {
    if (!detail || !reviewPayload) return;
    void confirmAndRun({
      title: '¿Iniciar la revisión?',
      message: `${detail.clinic.commercialName} entrará en comprobación. Durante esta fase no se emitirán documentos ni se ejecutarán cobros reales.`,
      confirmLabel: 'Iniciar comprobación',
      action: 'shadow',
      payload: reviewPayload,
      operation: (key) => financeAdmin.startShadow(detail.clinic.id, reviewPayload, key),
    });
  }, [confirmAndRun, detail, reviewPayload]);

  const handleReconcile = useCallback(() => {
    if (!detail || !reviewPayload) return;
    void runCommand('reconcile', reviewPayload, (key) => financeAdmin.reconcileShadow(detail.clinic.id, reviewPayload, key));
  }, [detail, reviewPayload, runCommand]);

  const handleApproveFiscal = useCallback(() => {
    if (!detail || !reviewPayload || fiscalReference.trim().length < 3) return;
    const payload = { ...reviewPayload, reviewReference: fiscalReference.trim() };
    void confirmAndRun({
      title: '¿Registrar la aprobación fiscal?',
      message: 'La referencia quedará vinculada a esta clínica como evidencia administrativa. No activa todavía el circuito.',
      confirmLabel: 'Registrar aprobación',
      action: 'fiscal-readiness',
      payload,
      operation: (key) => financeAdmin.approveFiscalReadiness(detail.clinic.id, payload, key),
    });
  }, [confirmAndRun, detail, fiscalReference, reviewPayload]);

  const handleActivate = useCallback(() => {
    if (!detail || !reviewPayload) return;
    void confirmAndRun({
      title: `¿Activar ${detail.clinic.commercialName}?`,
      message: 'A partir de este momento, las nuevas sesiones de clínica entrarán en la operativa financiera. Las comprobaciones internas se ejecutarán antes del cambio.',
      confirmLabel: 'Activar clínica',
      action: 'activate',
      payload: reviewPayload,
      operation: (key) => financeAdmin.activateWorkflow(detail.clinic.id, reviewPayload, key),
    });
  }, [confirmAndRun, detail, reviewPayload]);

  const handleRequireChanges = useCallback(() => {
    if (!detail || !reviewPayload || resolutionReason.trim().length < 10) return;
    const payload = { ...reviewPayload, reason: resolutionReason.trim() };
    void confirmAndRun({
      title: '¿Devolver la solicitud?',
      message: 'La clínica verá el motivo y podrá corregir la configuración antes de solicitar una nueva revisión.',
      confirmLabel: 'Solicitar cambios',
      action: 'changes-required',
      payload,
      operation: (key) => financeAdmin.requireChanges(detail.clinic.id, payload, key),
    });
  }, [confirmAndRun, detail, resolutionReason, reviewPayload]);

  const handleVerifyJournal = useCallback(() => {
    if (!detail) return;
    const payload = { expectedMode: detail.clinic.mode };
    void runCommand('verify-journal', payload, (key) => financeAdmin.verifyJournal(detail.clinic.id, payload, key));
  }, [detail, runCommand]);

  const handleTurnOff = useCallback(() => {
    if (!detail || detail.clinic.mode === 'OFF' || resolutionReason.trim().length < 10) return;
    const payload = { expectedMode: detail.clinic.mode, reason: resolutionReason.trim(), confirmed: true as const };
    void confirmAndRun({
      title: '¿Pausar las nuevas operaciones?',
      message: 'Se detendrán las nuevas operaciones financieras. Los movimientos, documentos y el historial ya creados se conservarán íntegros.',
      confirmLabel: 'Pausar operaciones',
      destructive: true,
      action: 'off',
      payload,
      operation: (key) => financeAdmin.turnOff(detail.clinic.id, payload, key),
    });
  }, [confirmAndRun, detail, resolutionReason]);

  return (
    <View style={styles.root}>
      <SummaryBand summary={summary} styles={styles} />
      <FinanceFilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar clínica"
        hasActiveFilters={Boolean(search || modeFilter !== 'ALL' || requestFilter !== 'ALL' || readinessFilter !== 'ALL')}
        onClear={() => { setSearch(''); setModeFilter('ALL'); setRequestFilter('ALL'); setReadinessFilter('ALL'); }}
      >
        <View style={styles.filterControl}><Text style={styles.filterLabel}>Situación</Text><SimpleDropdown options={MODE_OPTIONS} value={modeFilter} onSelect={setModeFilter} compact presentation="portal" accessibilityLabel="Situación" /></View>
        <View style={styles.filterControl}><Text style={styles.filterLabel}>Revisión</Text><SimpleDropdown options={REQUEST_OPTIONS} value={requestFilter} onSelect={setRequestFilter} compact presentation="portal" accessibilityLabel="Estado de la revisión" /></View>
        <View style={styles.filterControl}><Text style={styles.filterLabel}>Preparación</Text><SimpleDropdown options={READINESS_OPTIONS} value={readinessFilter} onSelect={setReadinessFilter} compact presentation="portal" accessibilityLabel="Preparación" /></View>
      </FinanceFilterToolbar>

      <View style={styles.workspace}>
        {isDesktop || !selectedClinicId ? <View style={styles.masterPane}>
          <View style={styles.paneHeading}>
            <View>
              <Text style={styles.eyebrow}>COLA OPERATIVA</Text>
              <Text style={styles.paneTitle}>Clínicas</Text>
            </View>
            <Button variant="ghost" size="small" onPress={() => void loadList(false)} disabled={listLoading}>Actualizar</Button>
          </View>
          {listError ? <InlineError message={listError} onRetry={() => void loadList(false)} styles={styles} /> : null}
          <VisibleScrollView
            style={styles.masterScroll}
            contentContainerStyle={styles.masterContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {items.map((item) => (
              <ClinicRow
                key={item.id}
                item={item}
                selected={selectedClinicId === item.id}
                onPress={() => selectClinic(item.id)}
                styles={styles}
                theme={theme}
              />
            ))}
            {listLoading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
            {!listLoading && items.length === 0 ? (
              <Text style={styles.emptyText}>No hay clínicas con estos filtros.</Text>
            ) : null}
            {nextCursor && !listLoading ? (
              <Button variant="outline" size="small" onPress={() => void loadList(true)}>Cargar más</Button>
            ) : null}
          </VisibleScrollView>
        </View> : null}

        {isDesktop || selectedClinicId ? <View style={styles.detailPane}>
          {detailLoading ? (
            <View style={styles.centerState}><ActivityIndicator color={theme.primary} /><Text style={styles.stateText}>Comprobando preparación…</Text></View>
          ) : detailError ? (
            <InlineError message={detailError} onRetry={() => selectedClinicId && void loadDetail(selectedClinicId)} styles={styles} />
          ) : detail ? (
            <VisibleScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {!isDesktop ? (
                <Button variant="ghost" size="small" onPress={() => setSelectedClinicId(null)}>
                  Volver a clínicas
                </Button>
              ) : null}
              <DetailHeader detail={detail} styles={styles} theme={theme} />
              {actionError ? <InlineError message={actionError} onRetry={() => selectedClinicId && void loadDetail(selectedClinicId)} styles={styles} /> : null}
              <Checklist detail={detail} styles={styles} theme={theme} />
              <ActionPanel
                detail={detail}
                fiscalReference={fiscalReference}
                resolutionReason={resolutionReason}
                actionLoading={actionLoading}
                onFiscalReferenceChange={setFiscalReference}
                onResolutionReasonChange={setResolutionReason}
                onStartShadow={handleStartShadow}
                onReconcile={handleReconcile}
                onApproveFiscal={handleApproveFiscal}
                onActivate={handleActivate}
                onRequireChanges={handleRequireChanges}
                onVerifyJournal={handleVerifyJournal}
                onTurnOff={handleTurnOff}
                styles={styles}
                theme={theme}
              />
              <Timeline detail={detail} styles={styles} theme={theme} />
            </VisibleScrollView>
          ) : (
            <View style={styles.centerState}><Ionicons name="business-outline" size={30} color={theme.textMuted} /><Text style={styles.stateText}>Selecciona una clínica para revisar su preparación.</Text></View>
          )}
        </View> : null}
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function SummaryBand({ summary }: { summary: AdminClinicFinanceSummary | null; styles: Styles }) {
  return <FinanceSummaryStrip loading={!summary} items={[
    { key: 'off', label: MODE_LABELS.OFF, value: summary?.modes.OFF ?? 0 },
    { key: 'shadow', label: MODE_LABELS.SHADOW, value: summary?.modes.SHADOW ?? 0, tone: 'warning' },
    { key: 'active', label: MODE_LABELS.ACTIVE, value: summary?.modes.ACTIVE ?? 0, tone: 'success' },
    { key: 'requests', label: 'Solicitudes pendientes', value: summary?.pendingRequests ?? 0 },
    { key: 'incidents', label: 'Necesitan atención', value: summary?.incidents ?? 0, tone: summary?.incidents ? 'danger' : 'default' },
  ]} />;
}

function ClinicRow({ item, selected, onPress, styles, theme }: { item: AdminClinicFinanceListItem; selected: boolean; onPress: () => void; styles: Styles; theme: Theme }) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.clinicRow, selected && styles.clinicRowSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
      <View style={styles.rowTop}>
        <Text style={styles.clinicName} numberOfLines={1}>{item.commercialName}</Text>
        <ModePill mode={item.mode} styles={styles} />
      </View>
      <Text style={styles.rowMeta}>{item.request ? REQUEST_LABELS[item.request.status] : 'Sin solicitud abierta'}</Text>
      <View style={styles.rowHealth}>
        <Ionicons name={item.blockerCount ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={15} color={item.blockerCount ? theme.error : theme.success} />
        <Text style={styles.rowHealthText}>{item.blockerCount ? `${item.blockerCount} bloqueos` : 'Sin bloqueos base'}</Text>
      </View>
    </AnimatedPressable>
  );
}

function DetailHeader({ detail, styles, theme }: { detail: AdminClinicFinanceDetail; styles: Styles; theme: Theme }) {
  return <View style={styles.detailHeader}><View style={styles.detailTitleRow}><View style={styles.detailIcon}><Ionicons name="business" size={21} color={theme.primary} /></View><View style={styles.detailHeadingCopy}><Text style={styles.detailTitle}>{detail.clinic.commercialName}</Text><Text style={styles.detailSubtitle}>Supervisión operativa · sin datos financieros ni pacientes</Text></View><ModePill mode={detail.clinic.mode} styles={styles} /></View>{detail.readiness.request ? <View style={styles.requestNotice}><Text style={styles.requestNoticeTitle}>{REQUEST_LABELS[detail.readiness.request.status]}</Text><Text style={styles.requestNoticeText}>{detail.readiness.request.resolutionReason ?? detail.readiness.request.note ?? `Solicitada ${formatDateTime(detail.readiness.request.requestedAt)}`}</Text></View> : null}</View>;
}

function Checklist({ detail, styles, theme }: { detail: AdminClinicFinanceDetail; styles: Styles; theme: Theme }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = detail.readiness.checklist.filter((item) => item.status !== 'PASS' && item.status !== 'NOT_APPLICABLE');
  const completed = detail.readiness.checklist.filter((item) => item.status === 'PASS');
  const stages = [
    { title: 'Preparación de la clínica', groups: ['CONFIGURATION', 'AGREEMENTS'] as ActivationChecklistGroup[] },
    { title: 'Comprobaciones de HERA', groups: ['TRIAL', 'FISCAL'] as ActivationChecklistGroup[] },
    { title: 'Operativa', groups: ['INFRASTRUCTURE'] as ActivationChecklistGroup[] },
  ];
  return <View style={styles.sectionCard}>
    <Text style={styles.sectionEyebrow}>PREPARACIÓN</Text>
    <Text style={styles.sectionTitle}>{pending.length ? `${pending.length} acciones antes de continuar` : 'Todo listo para el siguiente paso'}</Text>
    {stages.map((stage) => {
      const entries = pending.filter((item) => stage.groups.includes(item.group));
      if (!entries.length) return null;
      return <View key={stage.title} style={styles.checkGroup}><Text style={styles.checkGroupTitle}>{stage.title}</Text>{entries.map((item) => <View key={item.key} style={styles.checkRow}><Ionicons name={statusIcon(item.status)} size={19} color={statusColor(item.status, theme)} /><View style={styles.checkCopy}><Text style={styles.checkTitle}>{item.title}</Text><Text style={styles.checkDescription}>{item.description}</Text></View></View>)}</View>;
    })}
    {completed.length ? <Button variant="ghost" size="small" onPress={() => setShowCompleted((current) => !current)}>{showCompleted ? 'Ocultar requisitos completados' : `Ver ${completed.length} requisitos completados`}</Button> : null}
    {showCompleted ? <View style={styles.checkGroup}>{completed.map((item) => <View key={item.key} style={styles.checkRow}><Ionicons name="checkmark-circle" size={19} color={theme.success} /><View style={styles.checkCopy}><Text style={styles.checkTitle}>{item.title}</Text></View></View>)}</View> : null}
  </View>;
}

interface ActionPanelProps {
  detail: AdminClinicFinanceDetail;
  fiscalReference: string;
  resolutionReason: string;
  actionLoading: string | null;
  onFiscalReferenceChange: (value: string) => void;
  onResolutionReasonChange: (value: string) => void;
  onStartShadow: () => void;
  onReconcile: () => void;
  onApproveFiscal: () => void;
  onActivate: () => void;
  onRequireChanges: () => void;
  onVerifyJournal: () => void;
  onTurnOff: () => void;
  styles: Styles;
  theme: Theme;
}

function ActionPanel(props: ActionPanelProps) {
  const { capabilities } = props.detail.readiness;
  const [dialog, setDialog] = useState<'fiscal' | 'changes' | 'off' | null>(null);
  const primary = capabilities.canStartShadow
    ? { label: 'Iniciar comprobación', loading: 'shadow', action: props.onStartShadow }
    : capabilities.canReconcile
      ? { label: 'Comprobar cálculos', loading: 'reconcile', action: props.onReconcile }
      : capabilities.canApproveFiscalReadiness
        ? { label: 'Registrar aprobación', loading: 'fiscal-readiness', action: () => setDialog('fiscal') }
        : capabilities.canActivate
          ? { label: 'Activar operativa', loading: 'activate', action: props.onActivate }
          : null;
  return <View style={props.styles.sectionCard}>
    <Text style={props.styles.sectionEyebrow}>SIGUIENTE PASO</Text>
    <Text style={props.styles.sectionTitle}>Acción recomendada</Text>
    <Text style={props.styles.sectionIntro}>Cada cambio se revisa por separado y queda registrado.</Text>
    {primary ? <Button loading={props.actionLoading === primary.loading} disabled={Boolean(props.actionLoading)} onPress={primary.action} fullWidth>{primary.label}</Button> : <Text style={props.styles.emptyText}>No hay acciones principales disponibles ahora mismo.</Text>}
    <View style={props.styles.secondaryActions}>
      {capabilities.canReturnChanges ? <Button variant="ghost" size="small" onPress={() => setDialog('changes')}>Solicitar cambios</Button> : null}
      {capabilities.canVerifyJournal ? <Button variant="ghost" size="small" loading={props.actionLoading === 'verify-journal'} onPress={props.onVerifyJournal}>Comprobar integridad del historial</Button> : null}
      {capabilities.canTurnOff ? <Button variant="ghost" size="small" onPress={() => setDialog('off')}>Pausar nuevas operaciones</Button> : null}
    </View>
    <FocusedActionSheet visible={dialog === 'fiscal'} title="Registrar aprobación fiscal" description="Añade la referencia verificable de la revisión. Esta acción todavía no activa la clínica." onClose={() => setDialog(null)}>
      <ValidatedTextArea label="Referencia" value={props.fiscalReference} onChangeText={props.onFiscalReferenceChange} singleLine maxLength={200} minLength={3} privacyWarning={false} placeholder="Expediente, acta o referencia" />
      <Button loading={props.actionLoading === 'fiscal-readiness'} disabled={Boolean(props.actionLoading) || props.fiscalReference.trim().length < 3} onPress={props.onApproveFiscal} fullWidth>Registrar aprobación</Button>
    </FocusedActionSheet>
    <FocusedActionSheet visible={dialog === 'changes'} title="Solicitar cambios a la clínica" description="Explica de forma concreta qué debe corregirse antes de continuar." onClose={() => setDialog(null)}>
      <ValidatedTextArea label="Motivo" value={props.resolutionReason} onChangeText={props.onResolutionReasonChange} maxLength={500} minLength={10} placeholder="Indica las acciones pendientes" />
      <Button variant="outline" loading={props.actionLoading === 'changes-required'} disabled={Boolean(props.actionLoading) || props.resolutionReason.trim().length < 10} onPress={props.onRequireChanges} fullWidth>Solicitar cambios</Button>
    </FocusedActionSheet>
    <FocusedActionSheet visible={dialog === 'off'} title="Pausar nuevas operaciones" description="La evidencia existente se conserva. Indica el motivo operativo de la pausa." onClose={() => setDialog(null)}>
      <ValidatedTextArea label="Motivo" value={props.resolutionReason} onChangeText={props.onResolutionReasonChange} maxLength={500} minLength={10} placeholder="Motivo de la pausa" />
      <Button variant="danger" loading={props.actionLoading === 'off'} disabled={Boolean(props.actionLoading) || props.resolutionReason.trim().length < 10} onPress={props.onTurnOff} fullWidth>Pausar operaciones</Button>
    </FocusedActionSheet>
  </View>;
}

function Timeline({ detail, styles, theme }: { detail: AdminClinicFinanceDetail; styles: Styles; theme: Theme }) {
  return <View style={styles.sectionCard}><Text style={styles.sectionEyebrow}>TRAZABILIDAD</Text><Text style={styles.sectionTitle}>Actividad administrativa</Text>{detail.timeline.length ? detail.timeline.map((entry, index) => <View key={entry.id} style={styles.timelineRow}><View style={styles.timelineRail}><View style={styles.timelineDot}>{<Ionicons name="ellipse" size={8} color={theme.primary} />}</View>{index < detail.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{TIMELINE_LABELS[entry.action] ?? 'Actividad financiera administrativa'}</Text><Text style={styles.timelineDate}>{formatDateTime(entry.occurredAt)}</Text></View></View>) : <Text style={styles.emptyText}>Todavía no hay actividad de activación.</Text>}</View>;
}

function ModePill({ mode, styles }: { mode: FinancialWorkflowMode; styles: Styles }) {
  return <View style={[styles.modePill, mode === 'ACTIVE' ? styles.modeActive : mode === 'SHADOW' ? styles.modeShadow : styles.modeOff]}><Text style={styles.modeText}>{MODE_LABELS[mode]}</Text></View>;
}

function InlineError({ message, onRetry, styles }: { message: string; onRetry: () => void; styles: Styles }) {
  return <View style={styles.errorBox}><Text style={styles.errorText}>{message}</Text><Button variant="ghost" size="small" onPress={onRetry}>Reintentar</Button></View>;
}

const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean) => StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', gap: spacing.md, width: '100%', maxWidth: isDesktop ? 1180 : undefined, alignSelf: 'center', paddingHorizontal: isDesktop ? spacing.lg : spacing.md, paddingBottom: spacing.lg },
  summaryBand: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryCard: { minWidth: isDesktop ? 130 : 104, flexGrow: 1, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: isDark ? theme.bgElevated : theme.bgCard, borderWidth: 1, borderColor: theme.border },
  summaryValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: theme.textPrimary },
  summaryLabel: { marginTop: 2, fontSize: typography.fontSizes.xs, color: theme.textSecondary },
  toolbar: { gap: spacing.sm },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: isDark ? theme.bgElevated : theme.bgCard },
  searchInput: { flex: 1, minHeight: 42, color: theme.textPrimary, fontSize: typography.fontSizes.sm, outlineStyle: 'none' } as never,
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
  filterChipActive: { borderColor: theme.primaryAlpha20, backgroundColor: theme.primaryAlpha12 },
  filterText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium, color: theme.textSecondary },
  filterTextActive: { color: theme.primary, fontWeight: typography.fontWeights.semibold },
  filterControl: { minWidth: isDesktop ? 168 : 146, gap: 4 },
  filterLabel: { fontSize: 10, color: theme.textMuted, fontWeight: typography.fontWeights.semibold },
  workspace: { flex: 1, minHeight: 0, flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md },
  masterPane: { flex: isDesktop ? undefined : 1, width: isDesktop ? 340 : '100%', minHeight: 0, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: theme.border, backgroundColor: isDark ? theme.bgElevated : theme.bgCard, overflow: 'hidden' },
  detailPane: { flex: 1, minHeight: 0, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: theme.border, backgroundColor: isDark ? theme.bgElevated : theme.bgCard, overflow: 'hidden' },
  paneHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: typography.fontWeights.bold, color: theme.primary },
  paneTitle: { marginTop: 3, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: theme.textPrimary },
  masterScroll: { flex: 1, minHeight: 0 },
  masterContent: { padding: spacing.sm, gap: spacing.xs },
  clinicRow: { padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent' },
  clinicRowSelected: { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clinicName: { flex: 1, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: theme.textPrimary },
  rowMeta: { marginTop: 5, fontSize: typography.fontSizes.xs, color: theme.textSecondary },
  rowHealth: { marginTop: spacing.sm, flexDirection: 'row', gap: 5, alignItems: 'center' },
  rowHealthText: { fontSize: 11, color: theme.textSecondary },
  modePill: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.full, borderWidth: 1 },
  modeOff: { backgroundColor: theme.bgMuted, borderColor: theme.border },
  modeShadow: { backgroundColor: theme.warningBg, borderColor: theme.warning },
  modeActive: { backgroundColor: theme.status.confirmed.bg, borderColor: theme.status.confirmed.border },
  modeText: { fontSize: 10, fontWeight: typography.fontWeights.bold, color: theme.textPrimary },
  loader: { padding: spacing.lg },
  emptyText: { paddingVertical: spacing.md, fontSize: typography.fontSizes.sm, lineHeight: 20, color: theme.textSecondary, textAlign: 'center' },
  detailScroll: { flex: 1, minHeight: 0 },
  detailContent: { padding: isDesktop ? spacing.xl : spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  detailHeader: { gap: spacing.md },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: theme.primaryAlpha12 },
  detailHeadingCopy: { flex: 1 },
  detailTitle: { fontSize: isDesktop ? typography.fontSizes.xxl : typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: theme.textPrimary },
  detailSubtitle: { marginTop: 3, fontSize: typography.fontSizes.xs, color: theme.textSecondary },
  requestNotice: { padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: theme.primaryAlpha12, borderWidth: 1, borderColor: theme.primaryAlpha20 },
  requestNoticeTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: theme.primary },
  requestNoticeText: { marginTop: 4, fontSize: typography.fontSizes.sm, lineHeight: 20, color: theme.textSecondary },
  sectionCard: { gap: spacing.md, padding: isDesktop ? spacing.xl : spacing.md, borderRadius: borderRadius.xl, backgroundColor: isDark ? theme.bg : theme.bgMuted, borderWidth: 1, borderColor: theme.border },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: typography.fontWeights.bold, color: theme.primary },
  sectionTitle: { marginTop: -spacing.sm, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: theme.textPrimary },
  sectionIntro: { marginTop: -spacing.xs, fontSize: typography.fontSizes.sm, lineHeight: 20, color: theme.textSecondary },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: theme.border },
  checkGroup: { gap: spacing.sm },
  checkGroupTitle: { paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.border, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkCopy: { flex: 1 },
  checkTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: theme.textPrimary },
  checkDescription: { marginTop: 2, fontSize: typography.fontSizes.xs, lineHeight: 18, color: theme.textSecondary },
  fieldLabel: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold, color: theme.textSecondary },
  textArea: { minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard, color: theme.textPrimary, fontSize: typography.fontSizes.sm, outlineStyle: 'none' } as never,
  reasonArea: { minHeight: 86, textAlignVertical: 'top' },
  timelineRow: { flexDirection: 'row', minHeight: 54 },
  timelineRail: { width: 24, alignItems: 'center' },
  timelineDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryAlpha12 },
  timelineLine: { flex: 1, width: 1, backgroundColor: theme.border },
  timelineCopy: { flex: 1, paddingBottom: spacing.md },
  timelineTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: theme.textPrimary },
  timelineDate: { marginTop: 3, fontSize: typography.fontSizes.xs, color: theme.textMuted },
  centerState: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  stateText: { maxWidth: 360, textAlign: 'center', fontSize: typography.fontSizes.sm, color: theme.textSecondary },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: theme.errorBg, borderWidth: 1, borderColor: theme.error },
  errorText: { flex: 1, fontSize: typography.fontSizes.sm, color: theme.error },
});
