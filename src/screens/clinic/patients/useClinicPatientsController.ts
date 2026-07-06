import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DropdownOption } from '../../../components/common/SimpleDropdown';
import { useAppAlert } from '../../../components/common/alert/AppAlertContext';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';
import { useAuth } from '../../../contexts/AuthContext';
import * as clinicService from '../../../services/clinicService';
import type { UploadAsset } from '../../../utils/multipartUpload';
import { useClinicWorkspace } from '../useClinicWorkspace';
import {
  CLINIC_PATIENT_PAGE_LIMIT,
  CLINIC_ASSIGNMENT_HISTORY_PAGE_LIMIT,
  CLINIC_PATIENT_SESSION_PAGE_LIMIT,
  buildPatientSessionRangeIso,
  createErrorFeedback,
  createSuccessFeedback,
  EMPTY_ASSIGNMENT_FORM,
  EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO,
  EMPTY_FORM,
  EMPTY_PATIENT_PAGE_INFO,
  getEmptyToNull,
  getValidationErrors,
  hasPatientDetail,
  mapFormToPayload,
  mapPatientToForm,
  mergePatientSummaries,
  mergeSummaryIntoDetail,
  toPatientSummary,
  clinicPatientFormSchema,
  type AssignmentForm,
  type AssignmentPanelMode,
  type ClinicPatientErrors,
  type ClinicPatientField,
  type ClinicPatientForm,
  type FeedbackMessage,
  type PanelMode,
  type PatientsLoadFilters,
} from './clinicPatientDomain';

interface LoadPatientsOptions {
  page?: number;
  append?: boolean;
}

interface LoadAssignmentHistoryOptions {
  page?: number;
  append?: boolean;
}

interface LoadPatientSessionsOptions {
  page?: number;
  append?: boolean;
}

export function useClinicPatientsController() {
  const { logout } = useAuth();
  const alert = useAppAlert();
  const workspace = useClinicWorkspace();

  const [patients, setPatients] = useState<clinicService.ClinicPatientSummary[]>([]);
  const [patientPageInfo, setPatientPageInfo] = useState(EMPTY_PATIENT_PAGE_INFO);
  const [patientDetails, setPatientDetails] = useState<Record<string, clinicService.ClinicPatientDetail>>({});
  const [specialists, setSpecialists] = useState<clinicService.ClinicSpecialist[]>([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(false);
  const [specialistsError, setSpecialistsError] = useState('');
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsLoadingMore, setPatientsLoadingMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [statusFilter, setStatusFilter] = useState<clinicService.ClinicPatientStatusFilter>('ACTIVE');
  const [assignmentFilter, setAssignmentFilter] = useState<clinicService.ClinicPatientAssignmentFilter>('ALL');
  const [clinicSpecialistFilter, setClinicSpecialistFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentPanelMode>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(EMPTY_ASSIGNMENT_FORM);
  const [form, setForm] = useState<ClinicPatientForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ClinicPatientErrors>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [patientConsents, setPatientConsents] = useState<Record<string, clinicService.ClinicPatientConsentDetail>>({});
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [openingConsentDocumentId, setOpeningConsentDocumentId] = useState<string | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<clinicService.ClinicPatientAssignmentHistoryItem[]>([]);
  const [assignmentHistoryPageInfo, setAssignmentHistoryPageInfo] = useState(EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO);
  const [assignmentHistoryLoading, setAssignmentHistoryLoading] = useState(false);
  const [assignmentHistoryLoadingMore, setAssignmentHistoryLoadingMore] = useState(false);
  const [assignmentHistoryError, setAssignmentHistoryError] = useState('');
  const [patientSessions, setPatientSessions] = useState<clinicService.ClinicSessionSummary[]>([]);
  const [patientSessionsPageInfo, setPatientSessionsPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [patientSessionsLoading, setPatientSessionsLoading] = useState(false);
  const [patientSessionsLoadingMore, setPatientSessionsLoadingMore] = useState(false);
  const [patientSessionsError, setPatientSessionsError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<clinicService.ClinicSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');

  const mountedRef = useRef(true);
  const patientsRef = useRef<clinicService.ClinicPatientSummary[]>([]);
  const patientsRequestSeq = useRef(0);
  const detailRequestSeq = useRef(0);
  const consentRequestSeq = useRef(0);
  const assignmentHistoryRequestSeq = useRef(0);
  const specialistsRequestSeq = useRef(0);
  const patientSessionsRequestSeq = useRef(0);
  const sessionDetailRequestSeq = useRef(0);

  const updatePatients = useCallback((nextPatients: clinicService.ClinicPatientSummary[]) => {
    patientsRef.current = nextPatients;
    setPatients(nextPatients);
  }, []);

  const canManage = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';

  const selectedPatientSummary = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;

    const detail = patientDetails[selectedPatientId];
    if (detail && selectedPatientSummary) {
      return mergeSummaryIntoDetail(detail, selectedPatientSummary);
    }

    return detail ?? selectedPatientSummary;
  }, [patientDetails, selectedPatientId, selectedPatientSummary]);

  const selectedPatientConsent = useMemo(() => {
    if (!selectedPatientId) return null;
    return patientConsents[selectedPatientId] ?? null;
  }, [patientConsents, selectedPatientId]);

  const specialistOptions = useMemo<DropdownOption<string>[]>(
    () => specialists.map((specialist) => ({
      label: specialist.displayName,
      value: specialist.id,
      subtitle: specialist.professionalTitle ?? specialist.specialization ?? 'Especialista de clínica',
    })),
    [specialists],
  );

  const specialistFilterOptions = useMemo<DropdownOption<string>[]>(
    () => [
      { label: 'Todos los especialistas', value: 'ALL' },
      ...specialistOptions,
    ],
    [specialistOptions],
  );

  const getCurrentFilters = useCallback((): PatientsLoadFilters => ({
    status: statusFilter,
    search,
    assignment: assignmentFilter,
    clinicSpecialistId: clinicSpecialistFilter ?? undefined,
  }), [assignmentFilter, clinicSpecialistFilter, search, statusFilter]);

  const resetClinicState = useCallback(() => {
    patientsRequestSeq.current += 1;
    detailRequestSeq.current += 1;
    consentRequestSeq.current += 1;
    assignmentHistoryRequestSeq.current += 1;
    specialistsRequestSeq.current += 1;
    patientSessionsRequestSeq.current += 1;
    sessionDetailRequestSeq.current += 1;
    updatePatients([]);
    setPatientPageInfo(EMPTY_PATIENT_PAGE_INFO);
    setPatientDetails({});
    setSpecialists([]);
    setSpecialistsError('');
    setSelectedPatientId(null);
    setPanelMode('detail');
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setForm(EMPTY_FORM);
    setErrors({});
    setPatientsError('');
    setPatientsLoading(false);
    setPatientsLoadingMore(false);
    setDetailLoading(false);
    setPatientConsents({});
    setConsentLoading(false);
    setConsentSaving(false);
    setOpeningConsentDocumentId(null);
    setAssignmentHistory([]);
    setAssignmentHistoryPageInfo(EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO);
    setAssignmentHistoryLoading(false);
    setAssignmentHistoryLoadingMore(false);
    setAssignmentHistoryError('');
    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsLoading(false);
    setPatientSessionsLoadingMore(false);
    setPatientSessionsError('');
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
    setFeedback(null);
  }, [updatePatients]);

  const reconcileDetailCache = useCallback((summaries: clinicService.ClinicPatientSummary[]) => {
    setPatientDetails((currentDetails) => {
      let changed = false;
      const nextDetails = { ...currentDetails };

      summaries.forEach((summary) => {
        const cachedDetail = currentDetails[summary.id];
        if (cachedDetail) {
          nextDetails[summary.id] = mergeSummaryIntoDetail(cachedDetail, summary);
          changed = true;
        }
      });

      return changed ? nextDetails : currentDetails;
    });
  }, []);

  const rememberPatientDetail = useCallback((detail: clinicService.ClinicPatientDetail) => {
    const summary = toPatientSummary(detail);

    setPatientDetails((currentDetails) => ({
      ...currentDetails,
      [detail.id]: detail,
    }));
    updatePatients(patientsRef.current.map((patient) => (
      patient.id === detail.id ? summary : patient
    )));
  }, [updatePatients]);

  const rememberPatientConsent = useCallback((consent: clinicService.ClinicPatientConsentDetail) => {
    setPatientConsents((currentConsents) => ({
      ...currentConsents,
      [consent.clinicPatientId]: consent,
    }));
  }, []);

  const loadSpecialists = useCallback(async (clinicId: string) => {
    const requestId = specialistsRequestSeq.current + 1;
    specialistsRequestSeq.current = requestId;
    setSpecialistsLoading(true);
    setSpecialistsError('');

    try {
      const nextSpecialists = await clinicService.listClinicSpecialists(clinicId, {
        status: 'ACTIVE',
      });
      if (!mountedRef.current || specialistsRequestSeq.current !== requestId) return;
      setSpecialists(nextSpecialists);
    } catch (error: unknown) {
      if (!mountedRef.current || specialistsRequestSeq.current !== requestId) return;
      setSpecialists([]);
      setSpecialistsError(error instanceof Error ? error.message : 'No se pudo cargar el equipo activo');
    } finally {
      if (mountedRef.current && specialistsRequestSeq.current === requestId) {
        setSpecialistsLoading(false);
      }
    }
  }, []);

  const loadPatientDetail = useCallback(async (clinicId: string, patientId: string) => {
    const requestId = detailRequestSeq.current + 1;
    detailRequestSeq.current = requestId;
    setDetailLoading(true);

    try {
      const detail = await clinicService.getClinicPatient(clinicId, patientId);
      if (!mountedRef.current || detailRequestSeq.current !== requestId) return null;

      const latestSummary = patientsRef.current.find((patient) => patient.id === detail.id);
      const reconciledDetail = latestSummary
        ? mergeSummaryIntoDetail(detail, latestSummary)
        : detail;
      setPatientDetails((currentDetails) => ({
        ...currentDetails,
        [reconciledDetail.id]: reconciledDetail,
      }));
      return reconciledDetail;
    } catch (error: unknown) {
      if (!mountedRef.current || detailRequestSeq.current !== requestId) return null;
      setFeedback(createErrorFeedback(error, 'No se pudo cargar la ficha del paciente'));
      return null;
    } finally {
      if (mountedRef.current && detailRequestSeq.current === requestId) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadPatientConsent = useCallback(async (clinicId: string, patientId: string) => {
    const requestId = consentRequestSeq.current + 1;
    consentRequestSeq.current = requestId;
    setConsentLoading(true);

    try {
      const consent = await clinicService.getClinicPatientConsent(clinicId, patientId);
      if (!mountedRef.current || consentRequestSeq.current !== requestId) return null;

      rememberPatientConsent(consent);
      return consent;
    } catch (error: unknown) {
      if (!mountedRef.current || consentRequestSeq.current !== requestId) return null;
      setFeedback(createErrorFeedback(error, 'No se pudo cargar el consentimiento del paciente'));
      return null;
    } finally {
      if (mountedRef.current && consentRequestSeq.current === requestId) {
        setConsentLoading(false);
      }
    }
  }, [rememberPatientConsent]);

  const loadAssignmentHistory = useCallback(async (
    clinicId: string,
    patientId: string,
    options: LoadAssignmentHistoryOptions = {},
  ) => {
    const append = options.append === true;
    const page = options.page ?? 1;
    const requestId = assignmentHistoryRequestSeq.current + 1;
    assignmentHistoryRequestSeq.current = requestId;

    if (append) {
      setAssignmentHistoryLoadingMore(true);
      setAssignmentHistoryError('');
    } else {
      setAssignmentHistoryLoading(true);
      setAssignmentHistoryError('');
    }

    try {
      const pageResult = await clinicService.listClinicPatientAssignmentHistory(clinicId, patientId, {
        page,
        limit: CLINIC_ASSIGNMENT_HISTORY_PAGE_LIMIT,
      });
      if (!mountedRef.current || assignmentHistoryRequestSeq.current !== requestId) return;

      setAssignmentHistory((currentHistory) => {
        if (!append) {
          return pageResult.items;
        }

        const currentIds = new Set(currentHistory.map((item) => item.id));
        const nextItems = pageResult.items.filter((item) => !currentIds.has(item.id));
        return [...currentHistory, ...nextItems];
      });
      setAssignmentHistoryPageInfo(pageResult.pageInfo);
      setAssignmentHistoryError('');
    } catch (error: unknown) {
      if (!mountedRef.current || assignmentHistoryRequestSeq.current !== requestId) return;
      if (!append) {
        setAssignmentHistory([]);
        setAssignmentHistoryPageInfo(EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO);
      }
      setAssignmentHistoryError(error instanceof Error
        ? error.message
        : 'No se pudo cargar el historial de responsables');
    } finally {
      if (!mountedRef.current || assignmentHistoryRequestSeq.current !== requestId) return;
      if (append) {
        setAssignmentHistoryLoadingMore(false);
      } else {
        setAssignmentHistoryLoading(false);
      }
    }
  }, []);

  const loadPatientSessions = useCallback(async (
    clinicId: string,
    clinicPatientId: string,
    options: LoadPatientSessionsOptions = {},
  ) => {
    const append = options.append === true;
    const page = options.page ?? 1;
    const requestId = patientSessionsRequestSeq.current + 1;
    patientSessionsRequestSeq.current = requestId;

    if (append) {
      setPatientSessionsLoadingMore(true);
    } else {
      setPatientSessionsLoading(true);
      setPatientSessionsError('');
    }

    try {
      const range = buildPatientSessionRangeIso();
      const pageResult = await clinicService.listClinicSessions(clinicId, {
        clinicPatientId,
        startDate: range.startDate,
        endDate: range.endDate,
        page,
        limit: CLINIC_PATIENT_SESSION_PAGE_LIMIT,
      });

      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;

      setPatientSessions((currentSessions) => {
        if (!append) return pageResult.items;

        const currentIds = new Set(currentSessions.map((session) => session.id));
        const nextItems = pageResult.items.filter((session) => !currentIds.has(session.id));
        return [...currentSessions, ...nextItems];
      });
      setPatientSessionsPageInfo(pageResult.pageInfo);
      setPatientSessionsError('');
    } catch (error: unknown) {
      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;
      if (!append) {
        setPatientSessions([]);
        setPatientSessionsPageInfo(null);
      }
      setPatientSessionsError(error instanceof Error
        ? error.message
        : 'No se pudieron cargar las citas del paciente');
    } finally {
      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;
      if (append) {
        setPatientSessionsLoadingMore(false);
      } else {
        setPatientSessionsLoading(false);
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
    } catch (error: unknown) {
      if (!mountedRef.current || sessionDetailRequestSeq.current !== requestId) return;
      setSelectedSessionDetail(null);
      setSelectedSessionDetailError(error instanceof Error
        ? error.message
        : 'No se pudo cargar el detalle de la cita');
    } finally {
      if (mountedRef.current && sessionDetailRequestSeq.current === requestId) {
        setSelectedSessionDetailLoading(false);
      }
    }
  }, []);

  const loadPatients = useCallback(async (
    clinicId: string,
    filters?: PatientsLoadFilters,
    preferredPatientId?: string,
    options: LoadPatientsOptions = {},
  ) => {
    const append = options.append === true;
    const page = options.page ?? 1;
    const requestId = patientsRequestSeq.current + 1;
    patientsRequestSeq.current = requestId;

    if (append) {
      setPatientsLoadingMore(true);
    } else {
      setPatientsLoading(true);
      setPatientsError('');
    }

    const effectiveFilters = filters ?? getCurrentFilters();

    try {
      const pageResult = await clinicService.listClinicPatients(clinicId, {
        status: effectiveFilters.status,
        search: effectiveFilters.search.trim() || undefined,
        assignment: effectiveFilters.assignment,
        clinicSpecialistId: effectiveFilters.clinicSpecialistId,
        page,
        limit: CLINIC_PATIENT_PAGE_LIMIT,
      });
      if (!mountedRef.current || patientsRequestSeq.current !== requestId) return;

      const nextPatients = append
        ? mergePatientSummaries(patientsRef.current, pageResult.items)
        : pageResult.items;

      updatePatients(nextPatients);
      setPatientPageInfo(pageResult.pageInfo);
      reconcileDetailCache(pageResult.items);
      setSelectedPatientId((currentId) => {
        if (preferredPatientId && nextPatients.some((patient) => patient.id === preferredPatientId)) {
          return preferredPatientId;
        }

        return currentId && nextPatients.some((patient) => patient.id === currentId)
          ? currentId
          : nextPatients[0]?.id ?? null;
      });
    } catch (error: unknown) {
      if (!mountedRef.current || patientsRequestSeq.current !== requestId) return;
      if (!append) {
        updatePatients([]);
        setSelectedPatientId(null);
        setPatientPageInfo(EMPTY_PATIENT_PAGE_INFO);
      }
      setPatientsError(error instanceof Error ? error.message : 'No se pudo cargar el listado de pacientes');
    } finally {
      if (!mountedRef.current || patientsRequestSeq.current !== requestId) return;
      if (append) {
        setPatientsLoadingMore(false);
      } else {
        setPatientsLoading(false);
      }
    }
  }, [getCurrentFilters, reconcileDetailCache, updatePatients]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      patientsRequestSeq.current += 1;
      detailRequestSeq.current += 1;
      consentRequestSeq.current += 1;
      assignmentHistoryRequestSeq.current += 1;
      specialistsRequestSeq.current += 1;
      patientSessionsRequestSeq.current += 1;
      sessionDetailRequestSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId) {
      resetClinicState();
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      void loadPatients(clinicId);
    }, search.trim() ? 250 : 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadPatients, resetClinicState, search, workspace.selectedClinicId]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId) return;

    void loadSpecialists(clinicId);
  }, [loadSpecialists, workspace.selectedClinicId]);

  useEffect(() => {
    if (!workspace.selectedClinicId || !selectedPatientId || patientDetails[selectedPatientId]) {
      return;
    }

    void loadPatientDetail(workspace.selectedClinicId, selectedPatientId);
  }, [loadPatientDetail, patientDetails, selectedPatientId, workspace.selectedClinicId]);

  useEffect(() => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || !canManage
      || patientConsents[selectedPatientId]
    ) {
      return;
    }

    void loadPatientConsent(workspace.selectedClinicId, selectedPatientId);
  }, [
    canManage,
    loadPatientConsent,
    patientConsents,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    if (!workspace.selectedClinicId || !selectedPatientId || !canManage) {
      assignmentHistoryRequestSeq.current += 1;
      setAssignmentHistory([]);
      setAssignmentHistoryPageInfo(EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO);
      setAssignmentHistoryLoading(false);
      setAssignmentHistoryLoadingMore(false);
      setAssignmentHistoryError('');
      return;
    }

    setAssignmentHistory([]);
    setAssignmentHistoryPageInfo(EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO);
    setAssignmentHistoryError('');
    void loadAssignmentHistory(workspace.selectedClinicId, selectedPatientId);
  }, [
    canManage,
    loadAssignmentHistory,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    if (!workspace.selectedClinicId || !selectedPatientId || !canManage) {
      patientSessionsRequestSeq.current += 1;
      setPatientSessions([]);
      setPatientSessionsPageInfo(null);
      setPatientSessionsLoading(false);
      setPatientSessionsLoadingMore(false);
      setPatientSessionsError('');
      return;
    }

    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsError('');
    void loadPatientSessions(workspace.selectedClinicId, selectedPatientId);
  }, [
    canManage,
    loadPatientSessions,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    setStatusFilter('ACTIVE');
    setAssignmentFilter('ALL');
    setClinicSpecialistFilter(null);
    setSearch('');
    resetClinicState();
    void workspace.selectClinic(clinicId);
  }, [resetClinicState, workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    if (workspace.selectedClinicId) {
      void loadPatients(workspace.selectedClinicId);
    }
  }, [loadPatients, workspace]);

  const handleAdd = useCallback(() => {
    setSelectedPatientId(null);
    setPanelMode('create');
    setAssignmentMode(null);
    setForm(EMPTY_FORM);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, []);

  const handleSelectPatient = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
    setPanelMode('detail');
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, []);

  const handleEdit = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedPatient) return;

    const patientId = selectedPatient.id;
    const detail = hasPatientDetail(selectedPatient)
      ? selectedPatient
      : await loadPatientDetail(workspace.selectedClinicId, patientId);

    if (!detail) return;

    setForm(mapPatientToForm(detail));
    setPanelMode('edit');
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, [loadPatientDetail, selectedPatient, workspace.selectedClinicId]);

  const handleChange = useCallback((field: ClinicPatientField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors, [field]: undefined };
      if (field === 'phone' && currentErrors.email === CONTACT_METHOD_REQUIRED_MESSAGE) {
        nextErrors.email = undefined;
      }
      return nextErrors;
    });
    setFeedback(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setFeedback(null);
  }, []);

  const handleStatusFilterChange = useCallback((value: clinicService.ClinicPatientStatusFilter) => {
    setStatusFilter(value);
    setFeedback(null);
  }, []);

  const handleAssignmentFilterChange = useCallback((value: clinicService.ClinicPatientAssignmentFilter) => {
    setAssignmentFilter(value);
    if (value !== 'ASSIGNED') {
      setClinicSpecialistFilter(null);
    }
    setFeedback(null);
  }, []);

  const handleSpecialistFilterChange = useCallback((value: string) => {
    if (value === 'ALL') {
      setClinicSpecialistFilter(null);
      setFeedback(null);
      return;
    }

    setClinicSpecialistFilter(value);
    setAssignmentFilter('ASSIGNED');
    setFeedback(null);
  }, []);

  const handleLoadMorePatients = useCallback(() => {
    if (!workspace.selectedClinicId || !patientPageInfo.hasMore || !patientPageInfo.nextPage) {
      return;
    }

    void loadPatients(
      workspace.selectedClinicId,
      getCurrentFilters(),
      selectedPatientId ?? undefined,
      { page: patientPageInfo.nextPage, append: true },
    );
  }, [
    getCurrentFilters,
    loadPatients,
    patientPageInfo.hasMore,
    patientPageInfo.nextPage,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleLoadMoreAssignmentHistory = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || !assignmentHistoryPageInfo.hasMore
      || !assignmentHistoryPageInfo.nextPage
      || assignmentHistoryLoadingMore
    ) {
      return;
    }

    void loadAssignmentHistory(
      workspace.selectedClinicId,
      selectedPatientId,
      {
        page: assignmentHistoryPageInfo.nextPage,
        append: true,
      },
    );
  }, [
    assignmentHistoryLoadingMore,
    assignmentHistoryPageInfo.hasMore,
    assignmentHistoryPageInfo.nextPage,
    loadAssignmentHistory,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleRetryAssignmentHistory = useCallback(() => {
    if (!workspace.selectedClinicId || !selectedPatientId) {
      return;
    }

    void loadAssignmentHistory(workspace.selectedClinicId, selectedPatientId);
  }, [loadAssignmentHistory, selectedPatientId, workspace.selectedClinicId]);

  const handleLoadMorePatientSessions = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || !patientSessionsPageInfo?.hasMore
      || !patientSessionsPageInfo.nextPage
      || patientSessionsLoadingMore
    ) {
      return;
    }

    void loadPatientSessions(
      workspace.selectedClinicId,
      selectedPatientId,
      {
        page: patientSessionsPageInfo.nextPage,
        append: true,
      },
    );
  }, [
    loadPatientSessions,
    patientSessionsLoadingMore,
    patientSessionsPageInfo?.hasMore,
    patientSessionsPageInfo?.nextPage,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleRetryPatientSessions = useCallback(() => {
    if (!workspace.selectedClinicId || !selectedPatientId) {
      return;
    }

    void loadPatientSessions(workspace.selectedClinicId, selectedPatientId);
  }, [loadPatientSessions, selectedPatientId, workspace.selectedClinicId]);

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

  const handleUpdateSessionStatus = useCallback(async (
    session: clinicService.ClinicSessionSummary,
    status: Extract<clinicService.ClinicSessionStatus, 'CANCELLED' | 'COMPLETED'>,
  ): Promise<boolean> => {
    if (!workspace.selectedClinicId || !selectedPatientId || !canManage || saving) return false;

    setSaving(true);
    setFeedback(null);

    try {
      await clinicService.updateClinicSessionStatus(workspace.selectedClinicId, session.id, { status });
      await loadPatientSessions(workspace.selectedClinicId, selectedPatientId);
      return true;
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo actualizar la cita'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    canManage,
    loadPatientSessions,
    saving,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleCancelForm = useCallback(() => {
    setPanelMode('detail');
    setForm(EMPTY_FORM);
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage) {
      return;
    }

    const parsedForm = clinicPatientFormSchema.safeParse(form);
    if (!parsedForm.success) {
      setErrors(getValidationErrors(parsedForm.error));
      setFeedback(null);
      return;
    }

    setSaving(true);
    setErrors({});
    setFeedback(null);

    try {
      const payload = mapFormToPayload(parsedForm.data);
      const savedPatient = panelMode === 'edit' && selectedPatient
        ? await clinicService.updateClinicPatient(
          workspace.selectedClinicId,
          selectedPatient.id,
          payload,
        )
        : await clinicService.createClinicPatient(workspace.selectedClinicId, payload);

      rememberPatientDetail(savedPatient);
      setSelectedPatientId(savedPatient.id);
      setPanelMode('detail');
      setForm(EMPTY_FORM);
      setFeedback(createSuccessFeedback(
        panelMode === 'edit' ? 'Ficha actualizada.' : 'Paciente añadido a la clínica.',
      ));

      if (panelMode === 'create') {
        setStatusFilter('ACTIVE');
        setAssignmentFilter('ALL');
        setClinicSpecialistFilter(null);
        setSearch('');
        await loadPatients(workspace.selectedClinicId, {
          status: 'ACTIVE',
          search: '',
          assignment: 'ALL',
        }, savedPatient.id);
        return;
      }

      await loadPatients(workspace.selectedClinicId, undefined, savedPatient.id);
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo guardar la ficha'));
    } finally {
      setSaving(false);
    }
  }, [
    canManage,
    form,
    loadPatients,
    panelMode,
    rememberPatientDetail,
    selectedPatient,
    workspace.selectedClinicId,
  ]);

  const handleStatusChange = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage) {
      return;
    }

    const nextStatus: clinicService.ClinicPatientStatus = selectedPatient.status === 'ACTIVE'
      ? 'ARCHIVED'
      : 'ACTIVE';
    const confirmed = await alert.confirm({
      title: nextStatus === 'ARCHIVED' ? 'Archivar paciente' : 'Reactivar paciente',
      message: nextStatus === 'ARCHIVED'
        ? 'El paciente dejará de aparecer como activo, pero su ficha administrativa se conservará para trazabilidad.'
        : 'El paciente volverá a estar disponible en el listado activo de la clínica.',
      confirmLabel: nextStatus === 'ARCHIVED' ? 'Archivar' : 'Reactivar',
      destructive: nextStatus === 'ARCHIVED',
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const updatedPatient = await clinicService.updateClinicPatientStatus(
        workspace.selectedClinicId,
        selectedPatient.id,
        nextStatus,
      );
      rememberPatientDetail(updatedPatient);
      setSelectedPatientId(updatedPatient.id);
      setFeedback(createSuccessFeedback(
        nextStatus === 'ARCHIVED' ? 'Paciente archivado.' : 'Paciente reactivado.',
      ));

      const nextFilters = statusFilter === nextStatus || statusFilter === 'ALL'
        ? { status: statusFilter, search, assignment: 'ALL' as const }
        : { status: 'ALL' as const, search, assignment: 'ALL' as const };

      if (nextFilters.status !== statusFilter) {
        setStatusFilter(nextFilters.status);
      }
      if (assignmentFilter !== 'ALL') {
        setAssignmentFilter('ALL');
      }
      if (clinicSpecialistFilter) {
        setClinicSpecialistFilter(null);
      }

      await loadPatients(workspace.selectedClinicId, nextFilters, updatedPatient.id);
      await loadAssignmentHistory(workspace.selectedClinicId, updatedPatient.id);
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo actualizar el estado'));
    } finally {
      setSaving(false);
    }
  }, [
    alert,
    assignmentFilter,
    canManage,
    clinicSpecialistFilter,
    loadAssignmentHistory,
    loadPatients,
    rememberPatientDetail,
    search,
    selectedPatient,
    statusFilter,
    workspace.selectedClinicId,
  ]);

  const handleStartAssignment = useCallback(() => {
    if (!selectedPatient || selectedPatient.status !== 'ACTIVE') {
      return;
    }

    setPanelMode('detail');
    setAssignmentMode(selectedPatient.activeAssignment ? 'change' : 'assign');
    setAssignmentForm({
      clinicSpecialistId: selectedPatient.activeAssignment?.clinicSpecialistId
        ?? specialists[0]?.id
        ?? '',
      reason: '',
    });
    setFeedback(null);
  }, [selectedPatient, specialists]);

  const handleCancelAssignment = useCallback(() => {
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setFeedback(null);
  }, []);

  const handleAssignmentSpecialistChange = useCallback((clinicSpecialistId: string) => {
    setAssignmentForm((currentForm) => ({
      ...currentForm,
      clinicSpecialistId,
    }));
    setFeedback(null);
  }, []);

  const handleAssignmentReasonChange = useCallback((reason: string) => {
    setAssignmentForm((currentForm) => ({
      ...currentForm,
      reason,
    }));
    setFeedback(null);
  }, []);

  const handleSubmitAssignment = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage) {
      return;
    }

    const clinicSpecialistId = assignmentForm.clinicSpecialistId.trim();
    if (!clinicSpecialistId) {
      setFeedback(createErrorFeedback(
        new Error('Selecciona un especialista activo antes de guardar.'),
        'Selecciona un especialista activo antes de guardar.',
      ));
      return;
    }

    const currentAssignment = selectedPatient.activeAssignment;
    if (
      currentAssignment
      && currentAssignment.clinicSpecialistId !== clinicSpecialistId
    ) {
      const confirmed = await alert.confirm({
        title: 'Cambiar responsable',
        message: `El responsable asistencial pasará de ${currentAssignment.clinicSpecialistDisplayName} al especialista seleccionado.`,
        confirmLabel: 'Cambiar',
      });

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);
    setFeedback(null);

    try {
      const updatedPatient = await clinicService.assignClinicPatient(
        workspace.selectedClinicId,
        selectedPatient.id,
        {
          clinicSpecialistId,
          reason: getEmptyToNull(assignmentForm.reason),
        },
      );

      rememberPatientDetail(updatedPatient);
      setSelectedPatientId(updatedPatient.id);
      setAssignmentMode(null);
      setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
      setAssignmentFilter('ALL');
      setClinicSpecialistFilter(null);
      setFeedback(createSuccessFeedback('Responsable asistencial actualizado.'));
      await loadPatients(workspace.selectedClinicId, {
        status: statusFilter,
        search,
        assignment: 'ALL',
      }, updatedPatient.id);
      await loadAssignmentHistory(workspace.selectedClinicId, updatedPatient.id);
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo asignar el responsable asistencial'));
    } finally {
      setSaving(false);
    }
  }, [
    alert,
    assignmentForm,
    canManage,
    loadAssignmentHistory,
    loadPatients,
    rememberPatientDetail,
    search,
    selectedPatient,
    statusFilter,
    workspace.selectedClinicId,
  ]);

  const handleRequestConsent = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage) {
      return;
    }

    const confirmed = await alert.confirm({
      title: 'Solicitar consentimiento digital',
      message: 'Se enviará un enlace al paciente si su ficha está vinculada a una cuenta HERA de paciente.',
      confirmLabel: 'Solicitar',
    });

    if (!confirmed) {
      return;
    }

    setConsentSaving(true);
    setFeedback(null);

    try {
      await clinicService.requestClinicPatientConsent(
        workspace.selectedClinicId,
        selectedPatient.id,
      );
      const consent = await clinicService.getClinicPatientConsent(
        workspace.selectedClinicId,
        selectedPatient.id,
      );
      rememberPatientConsent(consent);
      setFeedback(createSuccessFeedback('Solicitud de consentimiento enviada.'));
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo solicitar el consentimiento digital'));
    } finally {
      setConsentSaving(false);
    }
  }, [alert, canManage, rememberPatientConsent, selectedPatient, workspace.selectedClinicId]);

  const handleUploadConsentEvidence = useCallback(async (file: UploadAsset) => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage) {
      return;
    }

    if (file.mimeType && file.mimeType !== 'application/pdf') {
      setFeedback(createErrorFeedback(
        new Error('Adjunta el consentimiento firmado en PDF.'),
        'Adjunta el consentimiento firmado en PDF.',
      ));
      return;
    }

    const confirmed = await alert.confirm({
      title: 'Registrar PDF firmado',
      message: 'Se guardará la evidencia en almacenamiento privado y el consentimiento quedará marcado como concedido.',
      confirmLabel: 'Subir PDF',
    });

    if (!confirmed) {
      return;
    }

    setConsentSaving(true);
    setFeedback(null);

    try {
      const consent = await clinicService.uploadClinicPatientConsentEvidence(
        workspace.selectedClinicId,
        selectedPatient.id,
        file,
      );
      rememberPatientConsent(consent);
      setFeedback(createSuccessFeedback('Consentimiento firmado registrado.'));
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo subir el consentimiento firmado'));
    } finally {
      setConsentSaving(false);
    }
  }, [alert, canManage, rememberPatientConsent, selectedPatient, workspace.selectedClinicId]);

  const handleOpenConsentDocument = useCallback(async (
    document: clinicService.ClinicPatientConsentDocument,
  ) => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage) {
      return;
    }

    setOpeningConsentDocumentId(document.id);
    setFeedback(null);

    try {
      await clinicService.openClinicPatientConsentDocument(
        workspace.selectedClinicId,
        selectedPatient.id,
        document.id,
        document.fileName,
        document.mimeType,
      );
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo abrir el documento de consentimiento'));
    } finally {
      setOpeningConsentDocumentId(null);
    }
  }, [canManage, selectedPatient, workspace.selectedClinicId]);

  const handleCloseAssignment = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedPatient?.activeAssignment || !canManage) {
      return;
    }

    const confirmed = await alert.confirm({
      title: 'Quitar responsable',
      message: 'El paciente quedará sin responsable asistencial activo hasta que asignes uno nuevo.',
      confirmLabel: 'Quitar',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const updatedPatient = await clinicService.closeClinicPatientAssignment(
        workspace.selectedClinicId,
        selectedPatient.id,
        { endedReason: 'Responsable retirado desde gestión de clínica' },
      );

      rememberPatientDetail(updatedPatient);
      setSelectedPatientId(updatedPatient.id);
      setAssignmentMode(null);
      setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
      setAssignmentFilter('UNASSIGNED');
      setClinicSpecialistFilter(null);
      setFeedback(createSuccessFeedback('Responsable asistencial retirado.'));
      await loadPatients(workspace.selectedClinicId, {
        status: statusFilter,
        search,
        assignment: 'UNASSIGNED',
      }, updatedPatient.id);
      await loadAssignmentHistory(workspace.selectedClinicId, updatedPatient.id);
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo retirar el responsable asistencial'));
    } finally {
      setSaving(false);
    }
  }, [
    alert,
    canManage,
    loadAssignmentHistory,
    loadPatients,
    rememberPatientDetail,
    search,
    selectedPatient,
    statusFilter,
    workspace.selectedClinicId,
  ]);

  return {
    workspace,
    logout,
    canManage,
    patients,
    patientPageInfo,
    patientsLoading,
    patientsLoadingMore,
    patientsError,
    selectedPatientId,
    selectedPatient,
    selectedPatientConsent,
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
    selectedSessionId,
    selectedSessionDetail,
    selectedSessionDetailLoading,
    selectedSessionDetailError,
    detailLoading,
    consentLoading,
    consentSaving,
    openingConsentDocumentId,
    specialistsLoading,
    specialistsError,
    specialistOptions,
    specialistFilterOptions,
    statusFilter,
    assignmentFilter,
    clinicSpecialistFilter,
    search,
    panelMode,
    assignmentMode,
    assignmentForm,
    form,
    errors,
    saving,
    feedback,
    handleSelectClinic,
    handleRetry,
    handleAdd,
    handleSelectPatient,
    handleEdit,
    handleChange,
    handleSearchChange,
    handleStatusFilterChange,
    handleAssignmentFilterChange,
    handleSpecialistFilterChange,
    handleLoadMorePatients,
    handleLoadMoreAssignmentHistory,
    handleLoadMorePatientSessions,
    handleRetryAssignmentHistory,
    handleRetryPatientSessions,
    handleOpenSessionDetail,
    handleCloseSessionDetail,
    handleRetrySessionDetail,
    handleUpdateSessionStatus,
    handleCancelForm,
    handleSubmit,
    handleStatusChange,
    handleStartAssignment,
    handleCancelAssignment,
    handleAssignmentSpecialistChange,
    handleAssignmentReasonChange,
    handleSubmitAssignment,
    handleCloseAssignment,
    handleRequestConsent,
    handleUploadConsentEvidence,
    handleOpenConsentDocument,
  };
}
