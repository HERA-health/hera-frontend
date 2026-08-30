import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatedPressable, Button, Input } from '../../components/common';
import type { AnimatedPressableHandle } from '../../components/common/AnimatedPressable';
import { useAppAlert } from '../../components/common/alert';
import { borderRadius, layout, spacing } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import { useClinicWorkspace } from './useClinicWorkspace';
import {
  ClinicServiceEditorPanel,
  type ClinicServiceEditorMode,
} from './services/ClinicServiceEditorPanel';
import {
  EMPTY_CLINIC_SERVICE_FORM,
  clinicServiceToForm,
  formatClinicServicePrice,
  parseClinicServiceForm,
  type ClinicServiceFormErrors,
  type ClinicServiceFormValues,
} from './services/clinicServiceFormDomain';
import { useClinicServiceCatalogGuard } from './services/useClinicServiceCatalogGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ClinicServices'>;
type PanelMode = 'detail' | ClinicServiceEditorMode;

interface EditorContext {
  clinicId: string;
  mode: ClinicServiceEditorMode;
  serviceId: string | null;
  version: number | null;
  originalSpecialistIds: string[];
}

interface WebFocusableNode {
  focus?: () => void;
}

const focusAccessibilityTarget = (
  target: React.ElementRef<typeof View> | AnimatedPressableHandle | null,
): void => {
  if (!target) return;
  try {
    if (Platform.OS === 'web') {
      (target as unknown as WebFocusableNode).focus?.();
      return;
    }
    const reactTag = findNodeHandle(target as unknown as React.Component);
    if (reactTag !== null) AccessibilityInfo.setAccessibilityFocus(reactTag);
  } catch {
    // El destino puede desmontarse entre el cierre del modal y el siguiente tick.
  }
};

const FILTERS: Array<{ value: clinicService.ClinicServiceStatusFilter; label: string }> = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ARCHIVED', label: 'Archivados' },
  { value: 'ALL', label: 'Todos' },
];

const MODALITY_LABELS: Record<clinicService.ClinicServiceModality, string> = {
  IN_PERSON: 'Presencial',
  PHONE_CALL: 'Teléfono',
};

const cloneEmptyForm = (): ClinicServiceFormValues => ({
  ...EMPTY_CLINIC_SERVICE_FORM,
  modalities: [...EMPTY_CLINIC_SERVICE_FORM.modalities],
  clinicSpecialistIds: [],
});

export function ClinicServicesScreen({ navigation }: Props): React.ReactElement {
  const { theme } = useTheme();
  const alert = useAppAlert();
  const workspace = useClinicWorkspace();
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const guard = useClinicServiceCatalogGuard(workspace.selectedClinicId);
  const createButtonRef = useRef<AnimatedPressableHandle>(null);
  const editButtonRef = useRef<AnimatedPressableHandle>(null);
  const reactivateButtonRef = useRef<AnimatedPressableHandle>(null);
  const archiveButtonRef = useRef<AnimatedPressableHandle>(null);
  const compactHeadingRef = useRef<React.ElementRef<typeof View>>(null);
  const editorReturnFocusRef = useRef<AnimatedPressableHandle | null>(null);
  const compactReturnFocusRef = useRef<AnimatedPressableHandle | null>(null);
  const archiveReturnFocusRef = useRef<AnimatedPressableHandle | null>(null);
  const archiveReturnToDetailRef = useRef(false);
  const conflictRequestSequenceRef = useRef(0);
  const serviceCardRefs = useRef(new Map<string, AnimatedPressableHandle | null>());
  const [catalog, setCatalog] = useState<clinicService.ClinicServiceCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [statusFilter, setStatusFilter] = useState<clinicService.ClinicServiceStatusFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorContext, setEditorContext] = useState<EditorContext | null>(null);
  const [form, setForm] = useState<ClinicServiceFormValues>(cloneEmptyForm);
  const [formErrors, setFormErrors] = useState<ClinicServiceFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [latestEditorService, setLatestEditorService] = useState<clinicService.ClinicServiceCatalogItem | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictRecoveryError, setConflictRecoveryError] = useState('');
  const [optimisticSelected, setOptimisticSelected] = useState<clinicService.ClinicServiceCatalogItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<clinicService.ClinicServiceCatalogItem | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [archiveReplacementOptions, setArchiveReplacementOptions] = useState<clinicService.ClinicServiceCatalogItem[]>([]);
  const [compactDetailVisible, setCompactDetailVisible] = useState(false);
  const editorContextRef = useRef<EditorContext | null>(editorContext);
  editorContextRef.current = editorContext;

  const canManage = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';
  const mode: PanelMode = editorContext?.mode ?? 'detail';
  const interactionLocked = busy || editorContext !== null || archiveTarget !== null;
  const services = catalog?.services ?? [];
  const selectedService = (optimisticSelected?.id === selectedId ? optimisticSelected : null)
    ?? services.find((service) => service.id === selectedId)
    ?? null;

  const loadCatalog = useCallback(async (
    clinicId: string,
    options?: {
      status?: clinicService.ClinicServiceStatusFilter;
      search?: string;
      quiet?: boolean;
      preferredId?: string;
    },
  ): Promise<clinicService.ClinicServiceCatalog | null> => {
    const token = guard.beginRequest(clinicId);
    if (!guard.isCurrentClinic(clinicId)) return null;
    if (!options?.quiet) setCatalogLoading(true);
    setCatalogError('');
    try {
      const next = await clinicService.listClinicServices(clinicId, {
        status: options?.status ?? statusFilter,
        search: options?.search ?? search.trim(),
      });
      if (!guard.accepts(token)) return null;
      setCatalog(next);
      setSelectedId((current) => {
        if (options?.preferredId && next.services.some((service) => service.id === options.preferredId)) {
          return options.preferredId;
        }
        if (current && next.services.some((service) => service.id === current)) return current;
        return next.services[0]?.id ?? null;
      });
      setOptimisticSelected(null);
      return next;
    } catch (error: unknown) {
      if (!guard.accepts(token)) return null;
      setCatalogError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.');
      return null;
    } finally {
      if (guard.accepts(token)) setCatalogLoading(false);
    }
  }, [guard, search, statusFilter]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || !canManage) {
      guard.invalidateRequests();
      setCatalog(null);
      setCatalogLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      void loadCatalog(clinicId);
    }, search.trim() ? 240 : 0);
    return () => clearTimeout(timer);
  }, [canManage, loadCatalog, search, statusFilter, workspace.selectedClinicId]);

  useLayoutEffect(() => {
    guard.invalidateRequests();
    setCatalog(null);
    setCatalogError('');
    setCatalogLoading(false);
    setSelectedId(null);
    setEditorContext(null);
    setFormErrors({});
    setStale(false);
    setLatestEditorService(null);
    setConflictLoading(false);
    conflictRequestSequenceRef.current += 1;
    setConflictRecoveryError('');
    setOptimisticSelected(null);
    setArchiveTarget(null);
    setArchiveError('');
    setArchiveReplacementOptions([]);
    setReplacementId(null);
    setCompactDetailVisible(false);
  }, [guard, workspace.selectedClinicId]);

  const refreshAfterMutation = useCallback(async (
    clinicId: string,
    options?: {
      preferredId?: string;
      status?: clinicService.ClinicServiceStatusFilter;
      search?: string;
    },
  ): Promise<clinicService.ClinicServiceCatalog | null> => {
    if (!guard.isCurrentClinic(clinicId)) return null;
    return loadCatalog(clinicId, { ...options, quiet: true });
  }, [guard, loadCatalog]);

  const openCreate = (): void => {
    if (!workspace.selectedClinicId || interactionLocked) return;
    editorReturnFocusRef.current = createButtonRef.current;
    compactReturnFocusRef.current = createButtonRef.current;
    setForm(cloneEmptyForm());
    setFormErrors({});
    setStale(false);
    setLatestEditorService(null);
    setConflictRecoveryError('');
    setEditorContext({
      clinicId: workspace.selectedClinicId,
      mode: 'create',
      serviceId: null,
      version: null,
      originalSpecialistIds: [],
    });
    setCompactDetailVisible(compact);
  };

  const openEdit = (service: clinicService.ClinicServiceCatalogItem): void => {
    if (!workspace.selectedClinicId || interactionLocked) return;
    setSelectedId(service.id);
    setForm(clinicServiceToForm(service));
    setFormErrors({});
    setStale(false);
    setLatestEditorService(null);
    setConflictRecoveryError('');
    setEditorContext({
      clinicId: workspace.selectedClinicId,
      mode: 'edit',
      serviceId: service.id,
      version: service.version,
      originalSpecialistIds: [...service.clinicSpecialistIds],
    });
  };

  const openReactivate = (service: clinicService.ClinicServiceCatalogItem): void => {
    if (!workspace.selectedClinicId || interactionLocked) return;
    setSelectedId(service.id);
    setForm(clinicServiceToForm(service));
    setFormErrors({});
    setStale(false);
    setLatestEditorService(null);
    setConflictRecoveryError('');
    setEditorContext({
      clinicId: workspace.selectedClinicId,
      mode: 'reactivate',
      serviceId: service.id,
      version: service.version,
      originalSpecialistIds: [...service.clinicSpecialistIds],
    });
  };

  const closeEditor = (): void => {
    if (busy) return;
    const closingContext = editorContext;
    setEditorContext(null);
    setFormErrors({});
    setStale(false);
    setLatestEditorService(null);
    setConflictRecoveryError('');
    if (compact && closingContext?.mode === 'create') setCompactDetailVisible(false);
    setTimeout(() => focusAccessibilityTarget(editorReturnFocusRef.current), 0);
  };

  const handleCompactRequestClose = (): void => {
    if (busy) return;
    if (editorContext) {
      closeEditor();
      return;
    }
    setCompactDetailVisible(false);
    setTimeout(() => focusAccessibilityTarget(compactReturnFocusRef.current), 0);
  };

  useEffect(() => {
    if (!compact || !compactDetailVisible || archiveTarget) return undefined;
    const timer = setTimeout(() => focusAccessibilityTarget(compactHeadingRef.current), 0);
    return () => clearTimeout(timer);
  }, [archiveTarget, compact, compactDetailVisible, editorContext]);

  const handleFormChange = <TField extends keyof ClinicServiceFormValues>(
    field: TField,
    value: ClinicServiceFormValues[TField],
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const recoverConflict = useCallback(async (context: EditorContext): Promise<void> => {
    if (!context.serviceId || !guard.isCurrentClinic(context.clinicId)) return;
    const sequence = conflictRequestSequenceRef.current + 1;
    conflictRequestSequenceRef.current = sequence;
    setConflictLoading(true);
    setConflictRecoveryError('');
    try {
      const next = await clinicService.listClinicServices(context.clinicId, {
        status: 'ALL',
        search: '',
      });
      if (
        conflictRequestSequenceRef.current !== sequence
        || !guard.isCurrentClinic(context.clinicId)
        || editorContextRef.current?.serviceId !== context.serviceId
      ) return;
      const latest = next.services.find((service) => service.id === context.serviceId) ?? null;
      if (!latest) {
        setConflictRecoveryError('El servicio ya no está disponible en este catálogo.');
        return;
      }
      setLatestEditorService(latest);
    } catch (error: unknown) {
      if (
        conflictRequestSequenceRef.current === sequence
        && guard.isCurrentClinic(context.clinicId)
      ) {
        setConflictRecoveryError(
          error instanceof Error ? error.message : 'No se pudo cargar la versión actual.',
        );
      }
    } finally {
      if (conflictRequestSequenceRef.current === sequence) setConflictLoading(false);
    }
  }, [guard]);

  const retryConflictRecovery = async (): Promise<void> => {
    const context = editorContext;
    if (!context || conflictLoading || !guard.beginMutation()) return;
    try {
      await recoverConflict(context);
    } finally {
      guard.endMutation();
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const context = editorContext;
    if (busy || stale || !context || !guard.isCurrentClinic(context.clinicId)) return;
    const parsed = parseClinicServiceForm(form);
    if (!parsed.success) {
      setFormErrors(parsed.errors);
      return;
    }
    if ((context.mode === 'edit' || context.mode === 'reactivate')
      && (!context.serviceId || context.version === null)) return;
    const activeSpecialistIds = new Set(
      (catalog?.specialistOptions ?? [])
        .filter((specialist) => specialist.status === 'ACTIVE')
        .map((specialist) => specialist.id),
    );
    const hasActiveSpecialist = parsed.payload.clinicSpecialistIds.some((id) => activeSpecialistIds.has(id));
    const previousIds = [...context.originalSpecialistIds].sort();
    const nextIds = [...parsed.payload.clinicSpecialistIds].sort();
    const associationsChanged = previousIds.length !== nextIds.length
      || previousIds.some((id, index) => id !== nextIds[index]);
    if (!hasActiveSpecialist && (context.mode !== 'edit' || associationsChanged)) {
      setFormErrors((errors) => ({
        ...errors,
        clinicSpecialistIds: 'Asocia al menos un profesional activo.',
      }));
      return;
    }

    if (!guard.beginMutation()) return;
    const modeAtSubmit = context.mode;
    setBusy(true);
    try {
      let saved: clinicService.ClinicServiceCatalogItem;
      if (context.mode === 'create') {
        saved = await clinicService.createClinicService(context.clinicId, parsed.payload);
      } else if (context.mode === 'edit' && context.serviceId && context.version !== null) {
        saved = await clinicService.updateClinicService(context.clinicId, context.serviceId, {
          ...parsed.payload,
          version: context.version,
        });
      } else if (context.serviceId && context.version !== null) {
        saved = await clinicService.updateClinicServiceStatus(context.clinicId, context.serviceId, {
          status: 'ACTIVE',
          version: context.version,
          clinicSpecialistIds: parsed.payload.clinicSpecialistIds,
        });
      } else {
        return;
      }
      if (!guard.isCurrentClinic(context.clinicId)) return;
      setSearch('');
      setStatusFilter(saved.status);
      setSelectedId(saved.id);
      setOptimisticSelected(saved);
      setEditorContext(null);
      setStale(false);
      setLatestEditorService(null);
      setCompactDetailVisible(compact);
      await refreshAfterMutation(context.clinicId, {
        preferredId: saved.id,
        status: saved.status,
        search: '',
      });
      if (!guard.isCurrentClinic(context.clinicId)) return;
      await alert.success({
        title: modeAtSubmit === 'create' ? 'Servicio creado' : modeAtSubmit === 'reactivate' ? 'Servicio reactivado' : 'Cambios guardados',
        message: 'El catálogo ya muestra la versión actual.',
      });
    } catch (error: unknown) {
      if (!guard.isCurrentClinic(context.clinicId)) return;
      if (context.mode !== 'create'
        && error instanceof clinicService.ClinicServiceRequestError
        && error.code === 'CLINIC_SERVICE_CONFLICT') {
        setStale(true);
        setLatestEditorService(null);
        await recoverConflict(context);
      } else if (
        error instanceof clinicService.ClinicServiceRequestError
        && error.field
        && error.field !== 'replacementDefaultServiceId'
      ) {
        setFormErrors((current) => ({ ...current, [error.field as keyof ClinicServiceFormValues]: error.message }));
      } else {
        await alert.error({
          title: 'No se pudo guardar',
          message: error instanceof Error ? error.message : 'Revisa los datos e inténtalo de nuevo.',
        });
      }
    } finally {
      setBusy(false);
      guard.endMutation();
    }
  };

  const loadCurrentVersion = (): void => {
    if (!latestEditorService || !editorContext) {
      void retryConflictRecovery();
      return;
    }
    setForm(clinicServiceToForm(latestEditorService));
    setFormErrors({});
    setStale(false);
    setConflictRecoveryError('');
    setEditorContext({
      ...editorContext,
      version: latestEditorService.version,
      originalSpecialistIds: [...latestEditorService.clinicSpecialistIds],
    });
    setLatestEditorService(null);
  };

  const handleDefault = async (service: clinicService.ClinicServiceCatalogItem): Promise<void> => {
    const clinicId = workspace.selectedClinicId;
    if (busy || !clinicId || service.isDefault || !guard.beginMutation()) return;
    setBusy(true);
    try {
      const confirmed = await alert.confirm({
        title: 'Cambiar servicio predeterminado',
        message: `“${service.name}” será la opción principal del catálogo.`,
        confirmLabel: 'Marcar como predeterminado',
      });
      if (!confirmed || !guard.isCurrentClinic(clinicId)) return;
      await clinicService.setDefaultClinicService(clinicId, service.id, service.version);
      await refreshAfterMutation(clinicId, { preferredId: service.id });
    } catch (error: unknown) {
      if (!guard.isCurrentClinic(clinicId)) return;
      if (error instanceof clinicService.ClinicServiceRequestError
        && error.code === 'CLINIC_SERVICE_CONFLICT') {
        await refreshAfterMutation(clinicId);
      }
      await alert.error({ title: 'No se pudo cambiar', message: error instanceof Error ? error.message : 'Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
      guard.endMutation();
    }
  };

  const openArchive = async (service: clinicService.ClinicServiceCatalogItem): Promise<void> => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || busy || !guard.beginMutation()) return;
    setBusy(true);
    try {
      const fullCatalog = await clinicService.listClinicServices(clinicId, {
        status: 'ACTIVE',
        search: '',
      });
      if (!guard.isCurrentClinic(clinicId)) return;
      setArchiveReplacementOptions(fullCatalog.services.filter((candidate) => candidate.id !== service.id));
      setArchiveTarget(fullCatalog.services.find((candidate) => candidate.id === service.id) ?? service);
      setReplacementId(null);
      setArchiveError('');
      archiveReturnToDetailRef.current = compact && compactDetailVisible;
      if (compact) setCompactDetailVisible(false);
    } catch (error: unknown) {
      if (!guard.isCurrentClinic(clinicId)) return;
      await alert.error({
        title: 'No se pudo preparar el archivo',
        message: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      });
    } finally {
      setBusy(false);
      guard.endMutation();
    }
  };

  const closeArchive = (): void => {
    if (busy) return;
    setArchiveTarget(null);
    setReplacementId(null);
    setArchiveError('');
    if (archiveReturnToDetailRef.current && compact) setCompactDetailVisible(true);
    archiveReturnToDetailRef.current = false;
    setTimeout(() => focusAccessibilityTarget(archiveReturnFocusRef.current), 0);
  };

  const confirmArchive = async (): Promise<void> => {
    const target = archiveTarget;
    const clinicId = workspace.selectedClinicId;
    if (!target || !clinicId || busy) return;
    const requiresReplacement = target.isDefault && archiveReplacementOptions.length > 0;
    if (requiresReplacement && !replacementId) return;
    if (!guard.beginMutation()) return;
    setBusy(true);
    setArchiveError('');
    try {
      await clinicService.updateClinicServiceStatus(clinicId, target.id, {
        status: 'ARCHIVED',
        version: target.version,
        replacementDefaultServiceId: replacementId ?? undefined,
      });
      if (!guard.isCurrentClinic(clinicId)) return;
      setArchiveTarget(null);
      setReplacementId(null);
      setEditorContext(null);
      setCompactDetailVisible(false);
      archiveReturnToDetailRef.current = false;
      await refreshAfterMutation(clinicId);
    } catch (error: unknown) {
      if (!guard.isCurrentClinic(clinicId)) return;
      if (error instanceof clinicService.ClinicServiceRequestError
        && error.code === 'CLINIC_SERVICE_CONFLICT') {
        setArchiveTarget(null);
        setReplacementId(null);
        setCompactDetailVisible(false);
        archiveReturnToDetailRef.current = false;
        await refreshAfterMutation(clinicId);
        await alert.error({
          title: 'El catálogo ha cambiado',
          message: 'Revisa la versión actual y vuelve a confirmar el archivado.',
        });
      } else if (error instanceof clinicService.ClinicServiceRequestError
        && error.field === 'replacementDefaultServiceId') {
        setArchiveError(error.message);
      } else {
        await alert.error({ title: 'No se pudo archivar', message: error instanceof Error ? error.message : 'Inténtalo de nuevo.' });
      }
    } finally {
      setBusy(false);
      guard.endMutation();
    }
  };

  const selectService = (service: clinicService.ClinicServiceCatalogItem): void => {
    if (interactionLocked) return;
    setSelectedId(service.id);
    setOptimisticSelected(null);
    compactReturnFocusRef.current = serviceCardRefs.current.get(service.id) ?? null;
    setEditorContext(null);
    setCompactDetailVisible(compact);
  };

  const editor = (
    <ClinicServiceEditorPanel
      mode={mode === 'detail' ? 'edit' : mode}
      values={form}
      errors={formErrors}
      specialistOptions={catalog?.specialistOptions ?? []}
      busy={busy}
      stale={stale}
      conflictLoading={conflictLoading}
      conflictRecoveryError={conflictRecoveryError}
      onChange={handleFormChange}
      onSubmit={() => { void handleSubmit(); }}
      onCancel={closeEditor}
      onLoadCurrent={loadCurrentVersion}
    />
  );

  return (
    <ClinicWorkspaceScaffold
      title="Servicios"
      contextLabel={workspace.selectedMembership?.clinic.commercialName}
      subtitle="Define el catálogo interno, sus duraciones, modalidades y profesionales disponibles."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={(id) => { void workspace.selectClinic(id); }}
      onRetry={() => { void workspace.reload(); }}
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
            onPress={openCreate}
            disabled={!canManage || interactionLocked}
            focusRef={createButtonRef}
            icon={<Ionicons name="add-circle-outline" size={18} color={theme.actionPrimaryText} />}
          >
            Nuevo servicio
          </Button>
        </View>
      ) : undefined}
    >
      {!canManage ? (
        <View style={styles.statePanel}>
          <Ionicons name="lock-closed-outline" size={28} color={theme.warning} />
          <Text style={styles.stateTitle}>Gestión reservada</Text>
          <Text style={styles.stateText}>Solo propietarios y administradores pueden configurar el catálogo.</Text>
        </View>
      ) : (
        <View style={styles.workspace}>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={21} color={theme.primary} />
            <Text style={styles.infoText}>
              Los servicios activos ya se aplican a «Nueva cita»: determinan de forma segura el precio, la duración y las modalidades disponibles.
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.listPanel}>
              <View style={styles.panelHeading}>
                <View>
                  <Text style={styles.panelTitle}>Catálogo</Text>
                  <Text style={styles.panelMeta}>
                    {catalogLoading ? 'Actualizando…' : `${services.length} servicios visibles`}
                  </Text>
                </View>
                {catalogLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
              </View>
              <Input
                label="Buscar"
                value={search}
                placeholder="Nombre del servicio"
                autoCapitalize="none"
                editable={!interactionLocked}
                leftIcon={<Ionicons name="search-outline" size={18} color={theme.textMuted} />}
                onChangeText={setSearch}
              />
              <View style={styles.filters} accessibilityRole="tablist">
                {FILTERS.map((filter) => {
                  const selected = filter.value === statusFilter;
                  return (
                    <AnimatedPressable
                      key={filter.value}
                      style={[styles.filter, selected ? styles.filterSelected : null]}
                      onPress={() => setStatusFilter(filter.value)}
                      disabled={interactionLocked}
                      accessibilityRole="tab"
                      accessibilityState={{ selected, disabled: interactionLocked }}
                    >
                      <Text style={[styles.filterText, selected ? styles.filterTextSelected : null]}>{filter.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {catalogError ? (
                <View style={styles.statePanel}>
                  <Ionicons name="alert-circle-outline" size={25} color={theme.warning} />
                  <Text style={styles.stateTitle}>No se pudo cargar el catálogo</Text>
                  <Text style={styles.stateText}>{catalogError}</Text>
                  <Button variant="outline" size="medium" onPress={() => {
                    if (workspace.selectedClinicId) void loadCatalog(workspace.selectedClinicId);
                  }}>Reintentar</Button>
                </View>
              ) : !catalogLoading && services.length === 0 ? (
                <View style={styles.statePanel}>
                  <Ionicons name="pricetags-outline" size={28} color={theme.textMuted} />
                  <Text style={styles.stateTitle}>No hay servicios en esta vista</Text>
                  <Text style={styles.stateText}>Crea el primero o cambia el filtro para revisar los archivados.</Text>
                  <Button variant="primary" size="medium" onPress={openCreate} disabled={interactionLocked}>Crear servicio</Button>
                </View>
              ) : (
                <View style={styles.serviceList}>
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={service.id === selectedId}
                      disabled={interactionLocked}
                      focusRef={(target) => {
                        if (target) serviceCardRefs.current.set(service.id, target);
                        else serviceCardRefs.current.delete(service.id);
                      }}
                      onPress={() => selectService(service)}
                    />
                  ))}
                </View>
              )}
            </View>

            {!compact ? (
              <View style={styles.detailPanel}>
                {mode !== 'detail' ? editor : selectedService ? (
                  <ServiceDetail
                    service={selectedService}
                    busy={busy}
                    editFocusRef={editButtonRef}
                    reactivateFocusRef={reactivateButtonRef}
                    archiveFocusRef={archiveButtonRef}
                    onEdit={() => {
                      editorReturnFocusRef.current = editButtonRef.current;
                      openEdit(selectedService);
                    }}
                    onDefault={() => { void handleDefault(selectedService); }}
                    onArchive={() => {
                      archiveReturnFocusRef.current = archiveButtonRef.current;
                      void openArchive(selectedService);
                    }}
                    onReactivate={() => {
                      editorReturnFocusRef.current = reactivateButtonRef.current;
                      openReactivate(selectedService);
                    }}
                  />
                ) : (
                  <View style={styles.statePanel}>
                    <Ionicons name="albums-outline" size={29} color={theme.textMuted} />
                    <Text style={styles.stateTitle}>Selecciona un servicio</Text>
                    <Text style={styles.stateText}>Aquí podrás revisar y actualizar todos sus detalles.</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>
      )}

      {compact ? (
        <Modal
          testID="clinic-services-compact-modal"
          visible={mode !== 'detail' || compactDetailVisible}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={handleCompactRequestClose}
          onShow={() => focusAccessibilityTarget(compactHeadingRef.current)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalSheet} role="dialog" accessibilityViewIsModal aria-modal>
                <View style={styles.modalHeader}>
                  <Button variant="ghost" size="small" onPress={handleCompactRequestClose} disabled={busy} icon={<Ionicons name="arrow-back-outline" size={18} color={theme.primary} />}>
                    Volver al catálogo
                  </Button>
                  <View
                    ref={compactHeadingRef}
                    accessible
                    accessibilityRole="header"
                    tabIndex={-1}
                    style={styles.modalHeading}
                  >
                    <Text style={styles.modalHeadingText} numberOfLines={1}>
                      {mode === 'create' ? 'Nuevo servicio' : mode === 'edit' ? 'Editar servicio' : mode === 'reactivate' ? 'Reactivar servicio' : selectedService?.name ?? 'Servicio'}
                    </Text>
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                  {mode !== 'detail' ? editor : selectedService ? (
                    <ServiceDetail
                      service={selectedService}
                      busy={busy}
                      editFocusRef={editButtonRef}
                      reactivateFocusRef={reactivateButtonRef}
                      archiveFocusRef={archiveButtonRef}
                      onEdit={() => {
                        editorReturnFocusRef.current = editButtonRef.current;
                        openEdit(selectedService);
                      }}
                      onDefault={() => { void handleDefault(selectedService); }}
                      onArchive={() => {
                        archiveReturnFocusRef.current = archiveButtonRef.current;
                        void openArchive(selectedService);
                      }}
                      onReactivate={() => {
                        editorReturnFocusRef.current = reactivateButtonRef.current;
                        openReactivate(selectedService);
                      }}
                    />
                  ) : null}
                </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}

      <ArchiveServiceModal
        target={archiveTarget}
        replacements={archiveReplacementOptions}
        replacementId={replacementId}
        busy={busy}
        error={archiveError}
        onSelectReplacement={(id) => {
          setReplacementId(id);
          setArchiveError('');
        }}
        onCancel={closeArchive}
        onConfirm={() => { void confirmArchive(); }}
      />
    </ClinicWorkspaceScaffold>
  );
}

interface ServiceCardProps {
  service: clinicService.ClinicServiceCatalogItem;
  selected: boolean;
  disabled: boolean;
  focusRef: React.Ref<AnimatedPressableHandle>;
  onPress: () => void;
}

function ServiceCard({ service, selected, disabled, focusRef, onPress }: ServiceCardProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);
  return (
    <AnimatedPressable
      style={[styles.serviceCard, selected ? styles.serviceCardSelected : null]}
      onPress={onPress}
      disabled={disabled}
      focusRef={focusRef}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${service.name}, ${formatClinicServicePrice(service.price)}, ${service.durationMinutes} minutos`}
    >
      <View style={styles.serviceCardTop}>
        <Text style={styles.serviceName} numberOfLines={2}>{service.name}</Text>
        <Ionicons name="chevron-forward" size={18} color={selected ? theme.primary : theme.textMuted} />
      </View>
      <View style={styles.badges}>
        {service.isDefault ? <Badge label="Predeterminado" tone="primary" /> : null}
        <Badge label={service.status === 'ACTIVE' ? 'Activo' : 'Archivado'} tone={service.status === 'ACTIVE' ? 'success' : 'muted'} />
      </View>
      <Text style={styles.serviceMeta}>{formatClinicServicePrice(service.price)} · {service.durationMinutes} min</Text>
      <Text style={styles.serviceModes}>{service.modalities.map((value) => MODALITY_LABELS[value]).join(' · ')}</Text>
      {service.activeSpecialistCount === 0 ? (
        <View style={styles.orphanNotice}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.warning} />
          <Text style={styles.orphanText}>Sin profesionales activos</Text>
        </View>
      ) : (
        <Text style={styles.providerCount}>{service.activeSpecialistCount} {service.activeSpecialistCount === 1 ? 'profesional activo' : 'profesionales activos'}</Text>
      )}
    </AnimatedPressable>
  );
}

interface ServiceDetailProps {
  service: clinicService.ClinicServiceCatalogItem;
  busy: boolean;
  editFocusRef: React.Ref<AnimatedPressableHandle>;
  reactivateFocusRef: React.Ref<AnimatedPressableHandle>;
  archiveFocusRef: React.Ref<AnimatedPressableHandle>;
  onEdit: () => void;
  onDefault: () => void;
  onArchive: () => void;
  onReactivate: () => void;
}

function ServiceDetail({
  service,
  busy,
  editFocusRef,
  reactivateFocusRef,
  archiveFocusRef,
  onEdit,
  onDefault,
  onArchive,
  onReactivate,
}: ServiceDetailProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);
  return (
    <View style={styles.detail}>
      <View style={styles.detailTop}>
        <View style={styles.detailCopy}>
          <Text style={styles.detailEyebrow}>{service.status === 'ACTIVE' ? 'Servicio activo' : 'Servicio archivado'}</Text>
          <Text style={styles.detailTitle}>{service.name}</Text>
          {service.description ? <Text style={styles.detailDescription}>{service.description}</Text> : null}
        </View>
        {service.isDefault ? <Badge label="Predeterminado" tone="primary" /> : null}
      </View>
      <View style={styles.metrics}>
        <Metric icon="cash-outline" label="Precio" value={formatClinicServicePrice(service.price)} />
        <Metric icon="time-outline" label="Duración" value={`${service.durationMinutes} min`} />
        <Metric icon="people-outline" label="Equipo activo" value={String(service.activeSpecialistCount)} />
      </View>
      <View style={styles.detailSection}>
        <Text style={styles.sectionLabel}>Modalidades</Text>
        <View style={styles.badges}>{service.modalities.map((value) => <Badge key={value} label={MODALITY_LABELS[value]} tone="muted" />)}</View>
      </View>
      {service.activeSpecialistCount === 0 ? (
        <View style={styles.detailWarning} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
          <Text style={styles.detailWarningText}>Este servicio sigue activo, pero ahora mismo no tiene profesionales activos asociados.</Text>
        </View>
      ) : null}
      <View style={styles.detailActions}>
        {service.status === 'ACTIVE' ? (
          <>
            <Button variant="primary" size="medium" onPress={onEdit} disabled={busy} focusRef={editFocusRef}>Editar</Button>
            {!service.isDefault ? <Button variant="outline" size="medium" onPress={onDefault} disabled={busy}>Hacer predeterminado</Button> : null}
            <Button variant="danger" size="medium" onPress={onArchive} disabled={busy} focusRef={archiveFocusRef}>Archivar</Button>
          </>
        ) : (
          <Button variant="primary" size="medium" onPress={onReactivate} disabled={busy} focusRef={reactivateFocusRef}>Reactivar</Button>
        )}
      </View>
      <Text style={styles.versionText}>Versión {service.version}</Text>
    </View>
  );
}

function Metric({ icon, label, value }: { icon: 'cash-outline' | 'time-outline' | 'people-outline'; label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);
  return <View style={styles.metric}><Ionicons name={icon} size={19} color={theme.primary} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'success' | 'muted' }): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);
  return <View style={[styles.badge, tone === 'primary' ? styles.badgePrimary : tone === 'success' ? styles.badgeSuccess : styles.badgeMuted]}><Text style={styles.badgeText}>{label}</Text></View>;
}

interface ArchiveServiceModalProps {
  target: clinicService.ClinicServiceCatalogItem | null;
  replacements: clinicService.ClinicServiceCatalogItem[];
  replacementId: string | null;
  busy: boolean;
  error: string;
  onSelectReplacement: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function ArchiveServiceModal({ target, replacements, replacementId, busy, error, onSelectReplacement, onCancel, onConfirm }: ArchiveServiceModalProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, true), [theme]);
  const needsReplacement = Boolean(target?.isDefault && replacements.length > 0);
  const headingRef = useRef<React.ElementRef<typeof View>>(null);
  return (
    <Modal
      testID="clinic-service-archive-modal"
      visible={Boolean(target)}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={() => focusAccessibilityTarget(headingRef.current)}
    >
      <SafeAreaView style={styles.confirmSafeArea}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard} role="alertdialog" accessibilityViewIsModal aria-modal>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmIcon}><Ionicons name="archive-outline" size={24} color={theme.warning} /></View>
              <View ref={headingRef} accessible accessibilityRole="header" tabIndex={-1}>
                <Text style={styles.confirmTitle}>Archivar {target?.name}</Text>
              </View>
              <Text style={styles.confirmText}>
                {needsReplacement
                  ? 'Este es el servicio predeterminado. Elige cuál ocupará su lugar antes de archivarlo.'
                  : 'El servicio dejará de estar disponible para la operativa interna, pero conservará su historial y podrá reactivarse.'}
              </Text>
            </View>
            {needsReplacement ? (
              <View style={styles.replacementRegion} role="radiogroup">
                <Text style={styles.replacementLabel}>Servicio sustituto</Text>
                <ScrollView
                  style={styles.replacementsScroll}
                  contentContainerStyle={styles.replacements}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  testID="clinic-service-archive-replacements-scroll"
                >
                  {replacements.map((service) => {
                    const selected = replacementId === service.id;
                    const disabled = service.activeSpecialistCount === 0;
                    return (
                      <AnimatedPressable
                        key={service.id}
                        style={[styles.replacement, selected ? styles.replacementSelected : null]}
                        onPress={() => onSelectReplacement(service.id)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled }}
                      >
                        <View style={[styles.radio, selected ? styles.radioSelected : null]} />
                        <View style={styles.replacementCopy}>
                          <Text style={styles.replacementName}>{service.name}</Text>
                          <Text style={styles.replacementMeta}>
                            {disabled
                              ? 'Sin profesionales activos · no puede ser predeterminado'
                              : `${formatClinicServicePrice(service.price)} · ${service.durationMinutes} min`}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            {error ? <Text style={styles.archiveError} accessibilityRole="alert">{error}</Text> : null}
            <View style={styles.confirmActions}>
              <Button variant="ghost" size="medium" onPress={onCancel} disabled={busy}>Cancelar</Button>
              <Button variant="danger" size="medium" onPress={onConfirm} loading={busy} disabled={needsReplacement && !replacementId}>Archivar</Button>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme, compact: boolean) => StyleSheet.create({
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  workspace: { gap: spacing.lg },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: borderRadius.lg, backgroundColor: theme.primaryMuted },
  infoText: { flex: 1, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 20 },
  grid: { flexDirection: compact ? 'column' : 'row', alignItems: 'flex-start', gap: spacing.lg },
  listPanel: { width: compact ? '100%' : 410, minWidth: 0, gap: spacing.md, padding: compact ? spacing.md : spacing.lg, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
  detailPanel: { flex: 1, minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
  panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  panelTitle: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 20 },
  panelMeta: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12, marginTop: 2 },
  filters: { flexDirection: 'row', padding: 4, borderRadius: borderRadius.lg, backgroundColor: theme.bgMuted },
  filter: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: borderRadius.md },
  filterSelected: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderStrong, shadowColor: theme.shadowCard, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 5, elevation: 1 },
  filterText: { color: theme.textMuted, fontFamily: theme.fontSansMedium, fontSize: 13 },
  filterTextSelected: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
  serviceList: { gap: spacing.sm },
  serviceCard: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgElevated },
  serviceCardSelected: { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
  serviceCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  serviceName: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16, lineHeight: 21 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgePrimary: { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
  badgeSuccess: { backgroundColor: theme.successBg, borderColor: theme.secondary },
  badgeMuted: { backgroundColor: theme.bgMuted, borderColor: theme.border },
  badgeText: { color: theme.textPrimary, fontFamily: theme.fontSansMedium, fontSize: 11 },
  serviceMeta: { color: theme.textPrimary, fontFamily: theme.fontSansMedium, fontSize: 14 },
  serviceModes: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 },
  providerCount: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12 },
  orphanNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  orphanText: { color: theme.warning, fontFamily: theme.fontSansSemiBold, fontSize: 12 },
  statePanel: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
  stateTitle: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 17, textAlign: 'center' },
  stateText: { maxWidth: 480, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  detail: { gap: spacing.xl },
  detailTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  detailCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  detailEyebrow: { color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 12, textTransform: 'uppercase' },
  detailTitle: { color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 31, lineHeight: 37 },
  detailDescription: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22, marginTop: spacing.xs },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: 130, gap: spacing.xs, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: theme.bgMuted },
  metricLabel: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 11, textTransform: 'uppercase' },
  metricValue: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 },
  detailSection: { gap: spacing.sm },
  sectionLabel: { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 13 },
  detailWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: theme.warningBg },
  detailWarningText: { flex: 1, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 20 },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border },
  versionText: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 11 },
  modalSafeArea: { flex: 1, backgroundColor: theme.overlay },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: theme.overlay },
  modalSheet: { width: '100%', maxWidth: layout.contentMaxWidth, maxHeight: '96%', minHeight: '70%', backgroundColor: theme.bg, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bgCard },
  modalHeading: { flex: 1, minWidth: 0 },
  modalHeadingText: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 },
  modalBody: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  confirmSafeArea: { flex: 1, backgroundColor: theme.overlay },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.overlay },
  confirmCard: { width: '100%', maxWidth: 560, maxHeight: '92%', minHeight: 0, gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.xl, backgroundColor: theme.bgCard, shadowColor: theme.shadowStrong, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 1, shadowRadius: 32, elevation: 12, overflow: 'hidden' },
  confirmHeader: { flexShrink: 0, gap: spacing.sm },
  confirmIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.warningBg },
  confirmTitle: { color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 26, lineHeight: 32 },
  confirmText: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 },
  replacementRegion: { flexShrink: 1, minHeight: 0, gap: spacing.sm },
  replacementLabel: { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 13 },
  replacementsScroll: { flexShrink: 1, minHeight: 0, maxHeight: 320 },
  replacements: { gap: spacing.sm, paddingRight: spacing.xs },
  replacement: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 58, padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgElevated },
  replacementSelected: { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.borderStrong },
  radioSelected: { borderWidth: 6, borderColor: theme.primary },
  replacementCopy: { flex: 1 },
  replacementName: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 },
  replacementMeta: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12, marginTop: 2 },
  archiveError: { color: theme.error, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 },
  confirmActions: { flexShrink: 0, flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: theme.border },
});

export default ClinicServicesScreen;
