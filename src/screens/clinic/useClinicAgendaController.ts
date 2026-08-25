import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import type { DropdownOption } from '../../components/common/SimpleDropdown';
import * as clinicService from '../../services/clinicService';
import {
  addMadridDaysInputValue,
  toMadridDateInputValue,
  toMadridEndOfDayIso,
  toMadridStartOfDayIso,
} from '../../utils/clinicAgendaDateRange';
import { useClinicWorkspace } from './useClinicWorkspace';

export type ClinicAgendaStatusFilter = clinicService.ClinicSessionStatus | 'ALL';
export type ClinicAgendaOriginFilter = clinicService.ClinicAgendaOrigin;

export interface ClinicAgendaFilters {
  startDate: string;
  endDate: string;
  statusFilter: ClinicAgendaStatusFilter;
  originFilter: ClinicAgendaOriginFilter;
  specialistFilter: string;
  patientFilter: string;
}

interface PatientLookupSnapshot {
  clinicId: string;
  search: string;
  patients: clinicService.ClinicPatientSummary[];
  pageInfo: clinicService.ClinicPatientListPageInfo | null;
  error: string;
  wasLoading: boolean;
}

export type ClinicStatusUpdatableSession = Pick<clinicService.ClinicSessionSummary, 'id'>
  | clinicService.ClinicAgendaClinicSession;

export const STATUS_OPTIONS: DropdownOption<ClinicAgendaStatusFilter>[] = [
  { label: 'Todos los estados', value: 'ALL' },
  { label: 'Confirmadas', value: 'CONFIRMED' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

export const ORIGIN_OPTIONS: DropdownOption<ClinicAgendaOriginFilter>[] = [
  { label: 'Todas las citas', value: 'ALL' },
  { label: 'Solo clínica', value: 'CLINIC' },
  { label: 'Solo particulares', value: 'PRIVATE' },
];

const CLINIC_REFERENCE_PAGE_LIMIT = 25;
const PATIENT_LOOKUP_DEBOUNCE_MS = 250;

const createInitialFilters = (baseDate = new Date()): ClinicAgendaFilters => ({
  startDate: toMadridDateInputValue(baseDate),
  endDate: addMadridDaysInputValue(30, baseDate),
  statusFilter: 'ALL',
  originFilter: 'ALL',
  specialistFilter: 'ALL',
  patientFilter: 'ALL',
});

export const buildClinicAgendaSessionFilters = (
  filters: ClinicAgendaFilters,
  page = 1,
): clinicService.ClinicSessionListFilters => ({
  startDate: toMadridStartOfDayIso(filters.startDate),
  endDate: toMadridEndOfDayIso(filters.endDate),
  status: filters.statusFilter === 'ALL' ? undefined : filters.statusFilter,
  clinicSpecialistId: filters.specialistFilter === 'ALL' ? undefined : filters.specialistFilter,
  clinicPatientId: filters.patientFilter === 'ALL' ? undefined : filters.patientFilter,
  page,
  limit: 50,
});

export const buildClinicAgendaFilters = (
  filters: ClinicAgendaFilters,
  page = 1,
): clinicService.ClinicAgendaFilters => ({
  startDate: toMadridStartOfDayIso(filters.startDate),
  endDate: toMadridEndOfDayIso(filters.endDate),
  status: filters.statusFilter === 'ALL' ? undefined : filters.statusFilter,
  origin: filters.originFilter,
  clinicSpecialistId: filters.specialistFilter === 'ALL' ? undefined : filters.specialistFilter,
  clinicPatientId: filters.patientFilter === 'ALL' ? undefined : filters.patientFilter,
  page,
  limit: 50,
});

export function useClinicAgendaController() {
  const appAlert = useAppAlert();
  const workspace = useClinicWorkspace();
  const mountedRef = useRef(true);
  const sessionsRequestSeq = useRef(0);
  const specialistsRequestSeq = useRef(0);
  const patientLookupRequestSeq = useRef(0);
  const skipNextPatientLookupEffectRef = useRef(false);
  const sessionDetailRequestSeq = useRef(0);
  const sessionCreationContextRef = useRef<{
    clinicId: string;
    clinicPatientId?: string;
    clinicSpecialistId?: string;
  } | null>(null);
  const patientLookupBeforeSchedulerRef = useRef<PatientLookupSnapshot | null>(null);

  const [sessions, setSessions] = useState<clinicService.ClinicAgendaItem[]>([]);
  const [agendaPageInfo, setAgendaPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [agendaLoadingMore, setAgendaLoadingMore] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<clinicService.ClinicSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');
  const [patients, setPatients] = useState<clinicService.ClinicPatientSummary[]>([]);
  const [patientLookupSearch, setPatientLookupSearch] = useState('');
  const [patientLookupPageInfo, setPatientLookupPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);
  const [patientLookupLoadingMore, setPatientLookupLoadingMore] = useState(false);
  const [patientLookupError, setPatientLookupError] = useState('');
  const [specialists, setSpecialists] = useState<clinicService.ClinicSpecialist[]>([]);
  const [specialistsError, setSpecialistsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agendaRefreshError, setAgendaRefreshError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editableFilters, setEditableFilters] = useState<ClinicAgendaFilters>(() => createInitialFilters());
  const [appliedFilters, setAppliedFilters] = useState<ClinicAgendaFilters>(() => createInitialFilters());

  const canManage = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';

  const invalidateAgendaRequests = useCallback(() => {
    sessionsRequestSeq.current += 1;
    specialistsRequestSeq.current += 1;
    patientLookupRequestSeq.current += 1;
    sessionDetailRequestSeq.current += 1;
  }, []);

  const resetAgendaState = useCallback(() => {
    const initialFilters = createInitialFilters();

    invalidateAgendaRequests();
    setSessions([]);
    setAgendaPageInfo(null);
    setAgendaLoadingMore(false);
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
    setPatients([]);
    setPatientLookupSearch('');
    setPatientLookupPageInfo(null);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);
    setPatientLookupError('');
    setSpecialists([]);
    setSpecialistsError('');
    setLoading(false);
    setError('');
    setAgendaRefreshError('');
    setSaving(false);
    setModalVisible(false);
    sessionCreationContextRef.current = null;
    patientLookupBeforeSchedulerRef.current = null;
    skipNextPatientLookupEffectRef.current = false;
    setEditableFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, [invalidateAgendaRequests]);

  const patientOptions = useMemo<DropdownOption<string>[]>(
    () => patients.map((patient) => ({
      label: patient.displayName,
      value: patient.id,
      subtitle: patient.activeAssignment?.clinicSpecialistDisplayName ?? 'Sin responsable',
    })),
    [patients],
  );

  const patientFilterOptions = useMemo<DropdownOption<string>[]>(
    () => [
      { label: 'Todos los pacientes', value: 'ALL' },
      ...patientOptions,
    ],
    [patientOptions],
  );

  const specialistFilterOptions = useMemo<DropdownOption<string>[]>(
    () => [
      { label: 'Todo el equipo', value: 'ALL' },
      ...specialists.map((specialist) => ({
        label: specialist.displayName,
        value: specialist.id,
        subtitle: specialist.professionalTitle ?? undefined,
      })),
    ],
    [specialists],
  );

  const setEditableFilter = useCallback(<K extends keyof ClinicAgendaFilters>(
    field: K,
    value: ClinicAgendaFilters[K],
  ) => {
    setEditableFilters((current) => {
      if (
        field === 'specialistFilter'
        && value === 'ALL'
        && current.originFilter === 'PRIVATE'
      ) {
        return {
          ...current,
          specialistFilter: 'ALL',
          originFilter: 'ALL',
        };
      }

      return { ...current, [field]: value };
    });
  }, []);

  const loadPatientLookup = useCallback(async (
    clinicId: string,
    search: string,
    page = 1,
    append = false,
  ) => {
    const requestId = patientLookupRequestSeq.current + 1;
    patientLookupRequestSeq.current = requestId;

    if (append) {
      setPatientLookupLoading(false);
      setPatientLookupLoadingMore(true);
    } else {
      setPatientLookupLoadingMore(false);
      setPatientLookupLoading(true);
    }
    setPatientLookupError('');

    try {
      const patientPage = await clinicService.listClinicPatients(clinicId, {
        status: 'ACTIVE',
        assignment: 'ASSIGNED',
        search: search.trim() || undefined,
        page,
        limit: CLINIC_REFERENCE_PAGE_LIMIT,
      });

      if (!mountedRef.current || patientLookupRequestSeq.current !== requestId) return;

      setPatients((currentPatients) => {
        if (!append) return patientPage.items;

        const currentIds = new Set(currentPatients.map((patient) => patient.id));
        const nextItems = patientPage.items.filter((patient) => !currentIds.has(patient.id));
        return [...currentPatients, ...nextItems];
      });
      setPatientLookupPageInfo(patientPage.pageInfo);
    } catch (lookupError: unknown) {
      if (!mountedRef.current || patientLookupRequestSeq.current !== requestId) return;
      setPatientLookupError(lookupError instanceof Error
        ? lookupError.message
        : 'No se pudieron actualizar los pacientes disponibles.');
      if (!append) {
        setPatientLookupPageInfo(null);
      }
    } finally {
      if (mountedRef.current && patientLookupRequestSeq.current === requestId) {
        setPatientLookupLoading(false);
        setPatientLookupLoadingMore(false);
      }
    }
  }, []);

  const loadSpecialists = useCallback(async (clinicId: string) => {
    const requestId = specialistsRequestSeq.current + 1;
    specialistsRequestSeq.current = requestId;
    setSpecialistsError('');

    try {
      const specialistItems = await clinicService.listClinicSpecialists(clinicId, {
        status: 'ACTIVE',
      });

      if (!mountedRef.current || specialistsRequestSeq.current !== requestId) return;
      setSpecialists(specialistItems);
    } catch (specialistsLoadError: unknown) {
      if (!mountedRef.current || specialistsRequestSeq.current !== requestId) return;
      setSpecialistsError(specialistsLoadError instanceof Error
        ? specialistsLoadError.message
        : 'No se pudo actualizar el equipo activo.');
    }
  }, []);

  const loadSessions = useCallback(async (
    clinicId: string,
    filters: ClinicAgendaFilters,
    page = 1,
    append = false,
  ) => {
    const requestId = sessionsRequestSeq.current + 1;
    sessionsRequestSeq.current = requestId;

    if (append) {
      setLoading(false);
      setAgendaLoadingMore(true);
    } else {
      setAgendaLoadingMore(false);
      setLoading(true);
      setError('');
      setAgendaRefreshError('');
    }

    try {
      const result = await clinicService.getClinicAgenda(
        clinicId,
        buildClinicAgendaFilters(filters, page),
      );
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;
      setSessions((currentSessions) => {
        if (!append) return result.items;

        const currentKeys = new Set(currentSessions.map((session) => session.key));
        const nextItems = result.items.filter((session) => !currentKeys.has(session.key));
        return [...currentSessions, ...nextItems];
      });
      setAgendaPageInfo(result.pageInfo);
    } catch (loadError: unknown) {
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;
      const message = loadError instanceof Error
        ? loadError.message
        : 'No se pudo cargar la agenda';
      setError(message);
      if (!append) {
        setSessions([]);
        setAgendaPageInfo(null);
      }
    } finally {
      if (mountedRef.current && sessionsRequestSeq.current === requestId) {
        setLoading(false);
        setAgendaLoadingMore(false);
      }
    }
  }, []);

  const refreshLoadedAgendaPages = useCallback(async (
    clinicId: string,
    filters: ClinicAgendaFilters,
    throughPage: number,
  ) => {
    const requestId = sessionsRequestSeq.current + 1;
    sessionsRequestSeq.current = requestId;
    setAgendaRefreshError('');

    try {
      const pages = await Promise.all(
        Array.from({ length: Math.max(1, throughPage) }, (_, index) => (
          clinicService.getClinicAgenda(
            clinicId,
            buildClinicAgendaFilters(filters, index + 1),
          )
        )),
      );
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;

      const seenKeys = new Set<string>();
      setSessions(pages.flatMap((page) => page.items).filter((session) => {
        if (seenKeys.has(session.key)) return false;
        seenKeys.add(session.key);
        return true;
      }));
      setAgendaPageInfo(pages.at(-1)?.pageInfo ?? null);
    } catch (refreshError: unknown) {
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;
      setAgendaRefreshError(refreshError instanceof Error
        ? refreshError.message
        : 'No se pudo actualizar la agenda. Las citas visibles no han cambiado.');
    } finally {
      if (mountedRef.current && sessionsRequestSeq.current === requestId) {
        setLoading(false);
        setAgendaLoadingMore(false);
      }
    }
  }, []);

  const loadSessionDetail = useCallback(async (clinicId: string, sessionId: string) => {
    const requestId = sessionDetailRequestSeq.current + 1;
    sessionDetailRequestSeq.current = requestId;
    setSelectedSessionDetailLoading(true);
    setSelectedSessionDetailError('');

    try {
      const detail = await clinicService.getClinicSessionDetail(clinicId, sessionId);
      if (!mountedRef.current || sessionDetailRequestSeq.current !== requestId) return;
      setSelectedSessionDetail(detail);
    } catch (detailError: unknown) {
      if (!mountedRef.current || sessionDetailRequestSeq.current !== requestId) return;
      setSelectedSessionDetail(null);
      setSelectedSessionDetailError(detailError instanceof Error
        ? detailError.message
        : 'No se pudo cargar el detalle de la cita');
    } finally {
      if (mountedRef.current && sessionDetailRequestSeq.current === requestId) {
        setSelectedSessionDetailLoading(false);
      }
    }
  }, []);

  const reloadAgenda = useCallback(async (filters = appliedFilters) => {
    if (!workspace.selectedClinicId || !canManage) return;
    await Promise.all([
      loadPatientLookup(workspace.selectedClinicId, patientLookupSearch, 1, false),
      loadSpecialists(workspace.selectedClinicId),
      loadSessions(workspace.selectedClinicId, filters),
    ]);
  }, [
    appliedFilters,
    canManage,
    loadPatientLookup,
    loadSessions,
    loadSpecialists,
    patientLookupSearch,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || !canManage) {
      resetAgendaState();
      return;
    }

    const initialFilters = createInitialFilters();
    invalidateAgendaRequests();
    setSessions([]);
    setAgendaPageInfo(null);
    setAgendaLoadingMore(false);
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
    setPatients([]);
    setPatientLookupSearch('');
    setPatientLookupPageInfo(null);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);
    setPatientLookupError('');
    setSpecialists([]);
    setSpecialistsError('');
    setLoading(false);
    setError('');
    setAgendaRefreshError('');
    setModalVisible(false);
    sessionCreationContextRef.current = null;
    patientLookupBeforeSchedulerRef.current = null;
    skipNextPatientLookupEffectRef.current = false;
    setEditableFilters(initialFilters);
    setAppliedFilters(initialFilters);
    void Promise.all([
      loadSpecialists(clinicId),
      loadSessions(clinicId, initialFilters),
    ]);
  }, [
    canManage,
    invalidateAgendaRequests,
    loadSessions,
    loadSpecialists,
    resetAgendaState,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || !canManage) {
      return undefined;
    }

    if (skipNextPatientLookupEffectRef.current) {
      skipNextPatientLookupEffectRef.current = false;
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      void loadPatientLookup(clinicId, patientLookupSearch, 1, false);
    }, patientLookupSearch.trim() ? PATIENT_LOOKUP_DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    canManage,
    loadPatientLookup,
    patientLookupSearch,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateAgendaRequests();
    };
  }, [invalidateAgendaRequests]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    void reloadAgenda();
  }, [reloadAgenda, workspace]);

  const handleOpenSessionDetail = useCallback((sessionId: string) => {
    if (!workspace.selectedClinicId || !canManage) return;

    setSelectedSessionId(sessionId);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailError('');
    void loadSessionDetail(workspace.selectedClinicId, sessionId);
  }, [canManage, loadSessionDetail, workspace.selectedClinicId]);

  const handleCloseSessionDetail = useCallback(() => {
    sessionDetailRequestSeq.current += 1;
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
  }, []);

  const handleRetrySessionDetail = useCallback(() => {
    if (!workspace.selectedClinicId || !selectedSessionId) return;
    void loadSessionDetail(workspace.selectedClinicId, selectedSessionId);
  }, [loadSessionDetail, selectedSessionId, workspace.selectedClinicId]);

  const handleApplyFilters = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage) return;

    const nextFilters = editableFilters;
    setAppliedFilters(nextFilters);
    void loadSessions(workspace.selectedClinicId, nextFilters);
  }, [canManage, editableFilters, loadSessions, workspace.selectedClinicId]);

  const handlePatientLookupSearchChange = useCallback((search: string) => {
    setPatientLookupSearch(search);
  }, []);

  const handleLoadMorePatientOptions = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !canManage
      || !patientLookupPageInfo?.nextPage
      || patientLookupLoadingMore
    ) {
      return;
    }

    void loadPatientLookup(
      workspace.selectedClinicId,
      patientLookupSearch,
      patientLookupPageInfo.nextPage,
      true
    );
  }, [
    canManage,
    loadPatientLookup,
    patientLookupLoadingMore,
    patientLookupPageInfo?.nextPage,
    patientLookupSearch,
    workspace.selectedClinicId,
  ]);

  const handleLoadMoreSessions = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !canManage
      || !agendaPageInfo?.nextPage
      || agendaLoadingMore
    ) {
      return;
    }

    void loadSessions(
      workspace.selectedClinicId,
      appliedFilters,
      agendaPageInfo.nextPage,
      true
    );
  }, [
    agendaLoadingMore,
    agendaPageInfo?.nextPage,
    appliedFilters,
    canManage,
    loadSessions,
    workspace.selectedClinicId,
  ]);

  const handleRetryPatientLookup = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage || patientLookupLoading) return;
    void loadPatientLookup(workspace.selectedClinicId, patientLookupSearch, 1, false);
  }, [
    canManage,
    loadPatientLookup,
    patientLookupLoading,
    patientLookupSearch,
    workspace.selectedClinicId,
  ]);

  const handleRetrySpecialists = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage) return;
    void loadSpecialists(workspace.selectedClinicId);
  }, [canManage, loadSpecialists, workspace.selectedClinicId]);

  useEffect(() => clinicService.subscribeClinicSessionChanges((change) => {
    if (
      !workspace.selectedClinicId
      || change.clinicId !== workspace.selectedClinicId
      || !canManage
    ) {
      return;
    }

    void refreshLoadedAgendaPages(
      workspace.selectedClinicId,
      appliedFilters,
      agendaPageInfo?.page ?? 1,
    );
  }), [
    agendaPageInfo?.page,
    appliedFilters,
    canManage,
    refreshLoadedAgendaPages,
    workspace.selectedClinicId,
  ]);

  const handleRetryAgendaRefresh = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage) return;
    void refreshLoadedAgendaPages(
      workspace.selectedClinicId,
      appliedFilters,
      agendaPageInfo?.page ?? 1,
    );
  }, [
    agendaPageInfo?.page,
    appliedFilters,
    canManage,
    refreshLoadedAgendaPages,
    workspace.selectedClinicId,
  ]);

  const handleOpenCreateModal = useCallback(() => {
    if (!canManage || !workspace.selectedClinicId) return;

    patientLookupBeforeSchedulerRef.current = {
      clinicId: workspace.selectedClinicId,
      search: patientLookupSearch,
      patients,
      pageInfo: patientLookupPageInfo,
      error: patientLookupError,
      wasLoading: patientLookupLoading || patientLookupLoadingMore,
    };
    sessionCreationContextRef.current = {
      clinicId: workspace.selectedClinicId,
    };

    if (workspace.selectedClinicId && patients.length === 0 && !patientLookupLoading) {
      void loadPatientLookup(workspace.selectedClinicId, patientLookupSearch, 1, false);
    }

    setModalVisible(true);
  }, [
    canManage,
    loadPatientLookup,
    patientLookupError,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupSearch,
    patients,
    workspace.selectedClinicId,
  ]);

  const restorePatientLookupBeforeScheduler = useCallback(() => {
    const snapshot = patientLookupBeforeSchedulerRef.current;
    patientLookupBeforeSchedulerRef.current = null;
    if (!snapshot || snapshot.clinicId !== workspace.selectedClinicId) return;

    patientLookupRequestSeq.current += 1;
    skipNextPatientLookupEffectRef.current = snapshot.search !== patientLookupSearch;
    setPatients(snapshot.patients);
    setPatientLookupSearch(snapshot.search);
    setPatientLookupPageInfo(snapshot.pageInfo);
    setPatientLookupError(snapshot.error);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);

    if (snapshot.wasLoading && canManage) {
      void loadPatientLookup(snapshot.clinicId, snapshot.search, 1, false);
    }
  }, [canManage, loadPatientLookup, patientLookupSearch, workspace.selectedClinicId]);

  const handleCloseCreateModal = useCallback(() => {
    setModalVisible(false);
    sessionCreationContextRef.current = null;
    restorePatientLookupBeforeScheduler();
  }, [restorePatientLookupBeforeScheduler]);

  const handleLoadSessionSlotOptions = useCallback((
    input: clinicService.GetClinicSessionSlotOptionsInput,
  ): Promise<clinicService.ClinicSessionSlotOptionsResult> => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || !canManage) {
      return Promise.reject(new Error('Ya no tienes acceso para consultar esta agenda.'));
    }

    return clinicService.getClinicSessionSlotOptions(clinicId, input);
  }, [canManage, workspace.selectedClinicId]);

  const handleSubmitSession = useCallback(async (
    payload: clinicService.CreateClinicSessionPayload,
  ): Promise<clinicService.ClinicSessionSummary> => {
    const clinicId = workspace.selectedClinicId;
    const context = sessionCreationContextRef.current;
    if (!clinicId || !canManage || context?.clinicId !== clinicId) {
      throw new Error('Ya no tienes acceso para crear citas en esta clínica.');
    }

    sessionCreationContextRef.current = {
      clinicId,
      clinicPatientId: payload.clinicPatientId,
      clinicSpecialistId: payload.clinicSpecialistId,
    };
    return clinicService.createClinicSession(clinicId, payload);
  }, [canManage, workspace.selectedClinicId]);

  const handleSessionCreated = useCallback((session: clinicService.ClinicSessionSummary) => {
    const context = sessionCreationContextRef.current;
    if (
      !context
      || context.clinicId !== workspace.selectedClinicId
      || context.clinicPatientId !== session.patient.id
      || context.clinicSpecialistId !== session.specialist.id
      || !canManage
    ) {
      return;
    }

    setModalVisible(false);
    sessionCreationContextRef.current = null;
    restorePatientLookupBeforeScheduler();
    showAppAlert(appAlert, 'Cita creada', 'La cita se ha añadido a la agenda.');
  }, [appAlert, canManage, restorePatientLookupBeforeScheduler, workspace.selectedClinicId]);

  const handleUpdateStatus = useCallback(async (
    session: ClinicStatusUpdatableSession,
    status: Extract<clinicService.ClinicSessionStatus, 'CANCELLED' | 'COMPLETED'>,
  ): Promise<boolean> => {
    if (!workspace.selectedClinicId || !canManage || saving) return false;

    const sessionId = 'sessionId' in session ? session.sessionId : session.id;

    try {
      setSaving(true);
      await clinicService.updateClinicSessionStatus(workspace.selectedClinicId, sessionId, { status });
      return true;
    } catch (updateError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo actualizar',
        updateError instanceof Error ? updateError.message : 'No se pudo actualizar la cita',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, saving, workspace.selectedClinicId]);

  return {
    agendaRefreshError,
    agendaLoadingMore,
    agendaPageInfo,
    appliedFilters,
    canManage,
    editableFilters,
    error,
    handleApplyFilters,
    handleCloseCreateModal,
    handleLoadMoreSessions,
    handleLoadMorePatientOptions,
    handleLoadSessionSlotOptions,
    handleOpenCreateModal,
    handleOpenSessionDetail,
    handlePatientLookupSearchChange,
    handleRetry,
    handleRetryAgendaRefresh,
    handleRetryPatientLookup,
    handleRetrySessionDetail,
    handleRetrySpecialists,
    handleSelectClinic,
    handleSessionCreated,
    handleSubmitSession,
    handleUpdateStatus,
    handleCloseSessionDetail,
    loading,
    modalVisible,
    originFilterOptions: editableFilters.specialistFilter === 'ALL'
      ? ORIGIN_OPTIONS.filter((option) => option.value !== 'PRIVATE')
      : ORIGIN_OPTIONS,
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
  };
}
