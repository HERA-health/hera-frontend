import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import type { DropdownOption } from '../../components/common/SimpleDropdown';
import * as clinicService from '../../services/clinicService';
import { useClinicWorkspace } from './useClinicWorkspace';

export type ClinicAgendaStatusFilter = clinicService.ClinicSessionStatus | 'ALL';
export type ClinicAgendaTypeOption = Extract<clinicService.ClinicSessionType, 'IN_PERSON' | 'PHONE_CALL'>;

export interface ClinicAgendaFilters {
  startDate: string;
  endDate: string;
  statusFilter: ClinicAgendaStatusFilter;
  specialistFilter: string;
  patientFilter: string;
}

export interface ClinicAgendaCreateSessionForm {
  clinicPatientId: string;
  date: string;
  time: string;
  duration: string;
  type: ClinicAgendaTypeOption;
}

export type ClinicAgendaCreateSessionErrors = Partial<
  Record<keyof ClinicAgendaCreateSessionForm | 'clinicSpecialistId', string>
>;

export const STATUS_OPTIONS: DropdownOption<ClinicAgendaStatusFilter>[] = [
  { label: 'Todos los estados', value: 'ALL' },
  { label: 'Confirmadas', value: 'CONFIRMED' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

export const TYPE_OPTIONS: DropdownOption<ClinicAgendaTypeOption>[] = [
  { label: 'Presencial', value: 'IN_PERSON' },
  { label: 'Teléfono', value: 'PHONE_CALL' },
];

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;
const CLINIC_REFERENCE_PAGE_LIMIT = 25;
const PATIENT_LOOKUP_DEBOUNCE_MS = 250;

const padDatePart = (value: number): string => value.toString().padStart(2, '0');

export const toLocalDateInputValue = (date = new Date()): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const addLocalDaysInputValue = (days: number, baseDate = new Date()): string => {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + days,
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds(),
  );
  return toLocalDateInputValue(date);
};

const parseLocalDateInput = (value: string): { year: number; month: number; day: number } | null => {
  if (!DATE_INPUT_PATTERN.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const parseLocalTimeInput = (value: string): { hours: number; minutes: number } | null => {
  if (!TIME_INPUT_PATTERN.test(value)) return null;

  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
};

export const toLocalStartOfDayIso = (date: string): string => {
  const parsed = parseLocalDateInput(date);
  if (!parsed) {
    throw new Error('Usa una fecha válida.');
  }

  return new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0).toISOString();
};

export const toLocalEndOfDayIso = (date: string): string => {
  const parsed = parseLocalDateInput(date);
  if (!parsed) {
    throw new Error('Usa una fecha válida.');
  }

  return new Date(parsed.year, parsed.month - 1, parsed.day, 23, 59, 59, 999).toISOString();
};

export const toLocalDateTimeIso = (date: string, time: string): string => {
  const parsedDate = parseLocalDateInput(date);
  const parsedTime = parseLocalTimeInput(time);

  if (!parsedDate || !parsedTime) {
    throw new Error('Usa una fecha y hora válidas.');
  }

  return new Date(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedTime.hours,
    parsedTime.minutes,
    0,
    0,
  ).toISOString();
};

const createInitialFilters = (baseDate = new Date()): ClinicAgendaFilters => ({
  startDate: toLocalDateInputValue(baseDate),
  endDate: addLocalDaysInputValue(30, baseDate),
  statusFilter: 'ALL',
  specialistFilter: 'ALL',
  patientFilter: 'ALL',
});

const createInitialForm = (clinicPatientId = ''): ClinicAgendaCreateSessionForm => ({
  clinicPatientId,
  date: toLocalDateInputValue(),
  time: '10:00',
  duration: '60',
  type: 'IN_PERSON',
});

const createSessionFormSchema = z.object({
  clinicPatientId: z.string().min(1, 'Selecciona un paciente asignado.'),
  date: z.string()
    .regex(DATE_INPUT_PATTERN, 'Usa una fecha válida.')
    .refine((value) => parseLocalDateInput(value) !== null, 'Usa una fecha válida.'),
  time: z.string()
    .regex(TIME_INPUT_PATTERN, 'Usa una hora válida.')
    .refine((value) => parseLocalTimeInput(value) !== null, 'Usa una hora válida.'),
  duration: z.coerce.number().int().min(15).max(180),
  type: z.enum(['IN_PERSON', 'PHONE_CALL']),
});

const getPatientSpecialistId = (
  patients: clinicService.ClinicPatientSummary[],
  clinicPatientId: string,
): string | null =>
  patients.find((patient) => patient.id === clinicPatientId)?.activeAssignment?.clinicSpecialistId ?? null;

export const buildClinicAgendaSessionFilters = (
  filters: ClinicAgendaFilters,
  page = 1,
): clinicService.ClinicSessionListFilters => ({
  startDate: toLocalStartOfDayIso(filters.startDate),
  endDate: toLocalEndOfDayIso(filters.endDate),
  status: filters.statusFilter === 'ALL' ? undefined : filters.statusFilter,
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
  const sessionDetailRequestSeq = useRef(0);

  const [sessions, setSessions] = useState<clinicService.ClinicSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<clinicService.ClinicSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');
  const [pageInfo, setPageInfo] = useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [patients, setPatients] = useState<clinicService.ClinicPatientSummary[]>([]);
  const [patientLookupSearch, setPatientLookupSearch] = useState('');
  const [patientLookupPageInfo, setPatientLookupPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);
  const [patientLookupLoadingMore, setPatientLookupLoadingMore] = useState(false);
  const [specialists, setSpecialists] = useState<clinicService.ClinicSpecialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<ClinicAgendaCreateSessionForm>(() => createInitialForm());
  const [formErrors, setFormErrors] = useState<ClinicAgendaCreateSessionErrors>({});
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
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
    setPageInfo(null);
    setPatients([]);
    setPatientLookupSearch('');
    setPatientLookupPageInfo(null);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);
    setSpecialists([]);
    setLoading(false);
    setLoadingMore(false);
    setError('');
    setSaving(false);
    setModalVisible(false);
    setForm(createInitialForm());
    setFormErrors({});
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

  const selectedFormPatient = useMemo(
    () => patients.find((patient) => patient.id === form.clinicPatientId) ?? null,
    [form.clinicPatientId, patients],
  );

  const setEditableFilter = useCallback(<K extends keyof ClinicAgendaFilters>(
    field: K,
    value: ClinicAgendaFilters[K],
  ) => {
    setEditableFilters((current) => ({ ...current, [field]: value }));
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
      setPatientLookupLoadingMore(true);
    } else {
      setPatientLookupLoading(true);
    }

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

    const specialistItems = await clinicService.listClinicSpecialists(clinicId, {
      status: 'ACTIVE',
    });

    if (!mountedRef.current || specialistsRequestSeq.current !== requestId) return;
    setSpecialists(specialistItems);
  }, []);

  const loadSessions = useCallback(async (
    clinicId: string,
    page: number,
    filters: ClinicAgendaFilters,
  ) => {
    const requestId = sessionsRequestSeq.current + 1;
    sessionsRequestSeq.current = requestId;

    if (page === 1) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await clinicService.listClinicSessions(
        clinicId,
        buildClinicAgendaSessionFilters(filters, page),
      );
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;
      setSessions((current) => (page === 1 ? result.items : [...current, ...result.items]));
      setPageInfo(result.pageInfo);
    } catch (loadError: unknown) {
      if (!mountedRef.current || sessionsRequestSeq.current !== requestId) return;
      const message = loadError instanceof Error
        ? loadError.message
        : 'No se pudo cargar la agenda';
      if (page === 1) {
        setError(message);
        setSessions([]);
        setPageInfo(null);
      } else {
        showAppAlert(appAlert, 'No se pudo cargar más', message);
      }
    } finally {
      if (mountedRef.current && sessionsRequestSeq.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [appAlert]);

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
      loadSessions(workspace.selectedClinicId, 1, filters),
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
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
    setPageInfo(null);
    setPatients([]);
    setPatientLookupSearch('');
    setPatientLookupPageInfo(null);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);
    setSpecialists([]);
    setLoading(false);
    setLoadingMore(false);
    setError('');
    setModalVisible(false);
    setForm(createInitialForm());
    setFormErrors({});
    setEditableFilters(initialFilters);
    setAppliedFilters(initialFilters);
    void Promise.all([
      loadSpecialists(clinicId),
      loadSessions(clinicId, 1, initialFilters),
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
    void loadSessions(workspace.selectedClinicId, 1, nextFilters);
  }, [canManage, editableFilters, loadSessions, workspace.selectedClinicId]);

  const handleLoadMore = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage || !pageInfo?.nextPage) return;

    void loadSessions(workspace.selectedClinicId, pageInfo.nextPage, appliedFilters);
  }, [appliedFilters, canManage, loadSessions, pageInfo?.nextPage, workspace.selectedClinicId]);

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

  const handleOpenCreateModal = useCallback(() => {
    if (!canManage) return;

    if (workspace.selectedClinicId && patients.length === 0 && !patientLookupLoading) {
      void loadPatientLookup(workspace.selectedClinicId, patientLookupSearch, 1, false);
    }

    const firstPatient = patients[0];
    setForm(createInitialForm(firstPatient?.id ?? ''));
    setFormErrors({});
    setModalVisible(true);
  }, [
    canManage,
    loadPatientLookup,
    patientLookupLoading,
    patientLookupSearch,
    patients,
    workspace.selectedClinicId,
  ]);

  const handleChangeForm = useCallback(<K extends keyof ClinicAgendaCreateSessionForm>(
    field: K,
    value: ClinicAgendaCreateSessionForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const handleCreateSession = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage) return;

    const parsed = createSessionFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: ClinicAgendaCreateSessionErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ClinicAgendaCreateSessionForm;
        nextErrors[field] = issue.message;
      });
      setFormErrors(nextErrors);
      return;
    }

    const clinicSpecialistId = getPatientSpecialistId(patients, parsed.data.clinicPatientId);
    if (!clinicSpecialistId) {
      setFormErrors({ clinicSpecialistId: 'El paciente no tiene responsable activo.' });
      return;
    }

    try {
      setSaving(true);
      await clinicService.createClinicSession(workspace.selectedClinicId, {
        clinicPatientId: parsed.data.clinicPatientId,
        clinicSpecialistId,
        date: toLocalDateTimeIso(parsed.data.date, parsed.data.time),
        duration: parsed.data.duration,
        type: parsed.data.type,
      });
      setModalVisible(false);
      showAppAlert(appAlert, 'Cita creada', 'La cita se ha añadido a la agenda.');
      await reloadAgenda();
    } catch (createError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo crear la cita',
        createError instanceof Error ? createError.message : 'Revisa los datos de la cita',
      );
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, form, patients, reloadAgenda, workspace.selectedClinicId]);

  const handleUpdateStatus = useCallback(async (
    session: clinicService.ClinicSessionSummary,
    status: Extract<clinicService.ClinicSessionStatus, 'CANCELLED' | 'COMPLETED'>,
  ): Promise<boolean> => {
    if (!workspace.selectedClinicId || !canManage || saving) return false;

    try {
      setSaving(true);
      await clinicService.updateClinicSessionStatus(workspace.selectedClinicId, session.id, { status });
      await reloadAgenda();
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
  }, [appAlert, canManage, reloadAgenda, saving, workspace.selectedClinicId]);

  return {
    appliedFilters,
    canManage,
    editableFilters,
    error,
    form,
    formErrors,
    handleApplyFilters,
    handleChangeForm,
    handleCreateSession,
    handleLoadMore,
    handleLoadMorePatientOptions,
    handleOpenCreateModal,
    handleOpenSessionDetail,
    handlePatientLookupSearchChange,
    handleRetry,
    handleRetrySessionDetail,
    handleSelectClinic,
    handleUpdateStatus,
    handleCloseSessionDetail,
    loading,
    loadingMore,
    modalVisible,
    pageInfo,
    patientFilterOptions,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupSearch,
    patientOptions,
    patients,
    selectedFormPatient,
    selectedSessionDetail,
    selectedSessionDetailError,
    selectedSessionDetailLoading,
    selectedSessionId,
    sessions,
    setEditableFilter,
    setModalVisible,
    saving,
    specialistFilterOptions,
    workspace,
  };
}
