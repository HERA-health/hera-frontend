import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DropdownOption } from '../../../components/common/SimpleDropdown';
import { useAppAlert } from '../../../components/common/alert/AppAlertContext';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';
import { useAuth } from '../../../contexts/AuthContext';
import * as clinicService from '../../../services/clinicService';
import type { ClinicGuestConsentAdminResult } from '../../../services/clinicService';
import type { UploadAsset } from '../../../utils/multipartUpload';
import { createSecureRandomUuid } from '../../../utils/secureRandom';
import { useClinicWorkspace } from '../useClinicWorkspace';
import {
  CLINIC_PATIENT_PAGE_LIMIT,
  CLINIC_ASSIGNMENT_HISTORY_PAGE_LIMIT,
  CLINIC_PATIENT_SESSION_PAGE_LIMIT,
  buildPatientSessionRangeIso,
  copyAdministrativeNameToBilling,
  createErrorFeedback,
  createSuccessFeedback,
  EMPTY_ASSIGNMENT_FORM,
  EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO,
  EMPTY_FORM,
  EMPTY_PATIENT_PAGE_INFO,
  getEmptyToNull,
  getValidationErrors,
  clinicPatientBillingFormSchema,
  mapFormToPayload,
  mapBillingFormToPayload,
  mapPatientToForm,
  mapSummaryFormToPayload,
  mergePatientSummaries,
  mergeSummaryIntoDetail,
  restoreClinicPatientBillingFullName,
  toPatientSummary,
  updateClinicPatientFormField,
  clinicPatientFormSchema,
  clinicPatientSummaryFormSchema,
  type AssignmentForm,
  type AssignmentPanelMode,
  type ClinicPatientErrors,
  type ClinicPatientDetailTab,
  type ClinicPatientEditSection,
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

interface ClinicSessionSchedulerContext {
  clinicId: string;
  clinicPatientId: string;
  clinicSpecialistId: string;
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
  const [detailError, setDetailError] = useState('');
  const [patientsError, setPatientsError] = useState('');
  const [statusFilter, setStatusFilter] = useState<clinicService.ClinicPatientStatusFilter>('ACTIVE');
  const [assignmentFilter, setAssignmentFilter] = useState<clinicService.ClinicPatientAssignmentFilter>('ALL');
  const [clinicSpecialistFilter, setClinicSpecialistFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [activeDetailTab, setActiveDetailTab] = useState<ClinicPatientDetailTab>('summary');
  const [editSection, setEditSection] = useState<ClinicPatientEditSection | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentPanelMode>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(EMPTY_ASSIGNMENT_FORM);
  const [form, setForm] = useState<ClinicPatientForm>(EMPTY_FORM);
  const [sameBillingData, setSameBillingData] = useState(false);
  const [errors, setErrors] = useState<ClinicPatientErrors>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [patientConsents, setPatientConsents] = useState<Record<string, clinicService.ClinicPatientConsentDetail>>({});
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState('');
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
  const [sessionSchedulerVisible, setSessionSchedulerVisible] = useState(false);

  const mountedRef = useRef(true);
  const consentViewContextRef = useRef({
    clinicId: workspace.selectedClinicId,
    patientId: selectedPatientId,
  });
  consentViewContextRef.current = {
    clinicId: workspace.selectedClinicId,
    patientId: selectedPatientId,
  };
  const patientsRef = useRef<clinicService.ClinicPatientSummary[]>([]);
  const patientsRequestSeq = useRef(0);
  const detailRequestSeq = useRef(0);
  const consentRequestSeq = useRef(0);
  const assignmentHistoryRequestSeq = useRef(0);
  const specialistsRequestSeq = useRef(0);
  const patientSessionsRequestSeq = useRef(0);
  const sessionDetailRequestSeq = useRef(0);
  const patientSessionsLoadedForIdRef = useRef<string | null>(null);
  const billingFullNameBeforeCopyRef = useRef('');
  const detailTabPatientIdRef = useRef<string | null>(null);
  const sessionSchedulerContextRef = useRef<ClinicSessionSchedulerContext | null>(null);
  const guestConsentIdempotencyKeysRef = useRef(new Map<string, string>());

  const updatePatients = useCallback((nextPatients: clinicService.ClinicPatientSummary[]) => {
    patientsRef.current = nextPatients;
    setPatients(nextPatients);
  }, []);

  const resetBillingCopy = useCallback(() => {
    billingFullNameBeforeCopyRef.current = '';
    setSameBillingData(false);
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

  useEffect(() => {
    if (!sessionSchedulerVisible) return;

    const context = sessionSchedulerContextRef.current;
    const assignment = selectedPatient?.activeAssignment;
    const contextIsCurrent = Boolean(
      context
      && workspace.selectedClinicId === context.clinicId
      && selectedPatient?.id === context.clinicPatientId
      && assignment?.clinicSpecialistId === context.clinicSpecialistId
      && assignment.clinicSpecialistStatus === 'ACTIVE'
      && selectedPatient.status === 'ACTIVE'
    );

    if (contextIsCurrent) return;

    setSessionSchedulerVisible(false);
    sessionSchedulerContextRef.current = null;
    setFeedback({
      type: 'error',
      text: 'La clínica, el paciente o su responsable han cambiado. Abre de nuevo “Nueva cita”.',
    });
  }, [selectedPatient, sessionSchedulerVisible, workspace.selectedClinicId]);

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
    patientSessionsLoadedForIdRef.current = null;
    updatePatients([]);
    setPatientPageInfo(EMPTY_PATIENT_PAGE_INFO);
    setPatientDetails({});
    setSpecialists([]);
    setSpecialistsError('');
    setSelectedPatientId(null);
    setPanelMode('detail');
    setActiveDetailTab('summary');
    setEditSection(null);
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setForm(EMPTY_FORM);
    resetBillingCopy();
    setErrors({});
    setPatientsError('');
    setPatientsLoading(false);
    setPatientsLoadingMore(false);
    setDetailLoading(false);
    setDetailError('');
    setPatientConsents({});
    setConsentLoading(false);
    setConsentError('');
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
    setSessionSchedulerVisible(false);
    sessionSchedulerContextRef.current = null;
    setFeedback(null);
  }, [resetBillingCopy, updatePatients]);

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
    setDetailError('');

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
      const errorFeedback = createErrorFeedback(error, 'No se pudo cargar la ficha del paciente');
      setDetailError(errorFeedback.text);
      setFeedback(null);
      return null;
    } finally {
      if (mountedRef.current && detailRequestSeq.current === requestId) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadPatientConsent = useCallback(async (
    clinicId: string,
    patientId: string,
    options: { preserveFeedbackOnError?: boolean } = {},
  ) => {
    const requestId = consentRequestSeq.current + 1;
    consentRequestSeq.current = requestId;
    setConsentLoading(true);
    setConsentError('');

    try {
      const consent = await clinicService.getClinicPatientConsent(clinicId, patientId);
      if (!mountedRef.current || consentRequestSeq.current !== requestId) return null;

      rememberPatientConsent(consent);
      return consent;
    } catch (error: unknown) {
      if (!mountedRef.current || consentRequestSeq.current !== requestId) return null;
      const errorFeedback = createErrorFeedback(
        error,
        'No se pudo cargar la autorización del paciente',
      );
      setConsentError(errorFeedback.text);
      if (!options.preserveFeedbackOnError) setFeedback(null);
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
      setPatientSessionsLoading(false);
      setPatientSessionsLoadingMore(true);
    } else {
      setPatientSessionsLoadingMore(false);
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
      if (!append) {
        patientSessionsLoadedForIdRef.current = clinicPatientId;
      }
    } catch (error: unknown) {
      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;
      if (!append) {
        setPatientSessions([]);
        setPatientSessionsPageInfo(null);
        patientSessionsLoadedForIdRef.current = null;
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

  const refreshLoadedPatientSessionPages = useCallback(async (
    clinicId: string,
    clinicPatientId: string,
    throughPage: number,
  ) => {
    const requestId = patientSessionsRequestSeq.current + 1;
    patientSessionsRequestSeq.current = requestId;
    setPatientSessionsLoadingMore(false);
    setPatientSessionsLoading(true);
    setPatientSessionsError('');

    try {
      const range = buildPatientSessionRangeIso();
      const pages = await Promise.all(
        Array.from({ length: throughPage }, (_, index) => clinicService.listClinicSessions(
          clinicId,
          {
            clinicPatientId,
            startDate: range.startDate,
            endDate: range.endDate,
            page: index + 1,
            limit: CLINIC_PATIENT_SESSION_PAGE_LIMIT,
          },
        )),
      );
      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;

      const seenIds = new Set<string>();
      setPatientSessions(pages.flatMap((page) => page.items).filter((session) => {
        if (seenIds.has(session.id)) return false;
        seenIds.add(session.id);
        return true;
      }));
      setPatientSessionsPageInfo(pages.at(-1)?.pageInfo ?? null);
      patientSessionsLoadedForIdRef.current = clinicPatientId;
    } catch (error: unknown) {
      if (!mountedRef.current || patientSessionsRequestSeq.current !== requestId) return;
      setPatientSessionsError(error instanceof Error
        ? error.message
        : 'No se pudieron actualizar las citas del paciente');
    } finally {
      if (mountedRef.current && patientSessionsRequestSeq.current === requestId) {
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

  useEffect(() => clinicService.subscribeClinicSessionChanges((change) => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || change.clinicId !== workspace.selectedClinicId
      || change.clinicPatientId !== selectedPatientId
    ) {
      return;
    }

    void loadPatientDetail(workspace.selectedClinicId, selectedPatientId);
    if (patientSessionsLoadedForIdRef.current === selectedPatientId) {
      void refreshLoadedPatientSessionPages(
        workspace.selectedClinicId,
        selectedPatientId,
        patientSessionsPageInfo?.page ?? 1,
      );
    }
  }), [
    loadPatientDetail,
    patientSessionsPageInfo?.page,
    refreshLoadedPatientSessionPages,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

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
    if (detailTabPatientIdRef.current === selectedPatientId) return;
    detailTabPatientIdRef.current = selectedPatientId;
    patientSessionsRequestSeq.current += 1;
    patientSessionsLoadedForIdRef.current = null;
    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsLoading(false);
    setPatientSessionsLoadingMore(false);
    setPatientSessionsError('');
    setSessionSchedulerVisible(false);
    sessionSchedulerContextRef.current = null;
    setActiveDetailTab('summary');
    setEditSection(null);
  }, [selectedPatientId]);

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
    if (!workspace.selectedClinicId || !selectedPatientId) {
      return;
    }

    void loadPatientDetail(workspace.selectedClinicId, selectedPatientId);
  }, [loadPatientDetail, selectedPatientId, workspace.selectedClinicId]);

  useEffect(() => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || !canManage
    ) {
      return;
    }

    void loadPatientConsent(workspace.selectedClinicId, selectedPatientId);
  }, [
    canManage,
    loadPatientConsent,
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
      patientSessionsLoadedForIdRef.current = null;
      setPatientSessions([]);
      setPatientSessionsPageInfo(null);
      setPatientSessionsLoading(false);
      setPatientSessionsLoadingMore(false);
      setPatientSessionsError('');
      return;
    }

    if (
      activeDetailTab !== 'sessions'
      || patientSessionsLoadedForIdRef.current === selectedPatientId
    ) {
      return;
    }

    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsError('');
    void loadPatientSessions(workspace.selectedClinicId, selectedPatientId);
  }, [
    activeDetailTab,
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
    detailRequestSeq.current += 1;
    consentRequestSeq.current += 1;
    setSelectedPatientId(null);
    setPanelMode('create');
    setActiveDetailTab('summary');
    setEditSection(null);
    setAssignmentMode(null);
    setForm(EMPTY_FORM);
    resetBillingCopy();
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setDetailLoading(false);
    setDetailError('');
    setConsentLoading(false);
    setConsentError('');
    patientSessionsRequestSeq.current += 1;
    patientSessionsLoadedForIdRef.current = null;
    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsLoading(false);
    setPatientSessionsLoadingMore(false);
    setPatientSessionsError('');
    setFeedback(null);
  }, [resetBillingCopy]);

  const handleSelectPatient = useCallback((patientId: string) => {
    const isCurrentPatient = selectedPatientId === patientId;
    detailRequestSeq.current += 1;
    consentRequestSeq.current += 1;
    patientSessionsRequestSeq.current += 1;
    patientSessionsLoadedForIdRef.current = null;
    setSelectedPatientId(patientId);
    setPanelMode('detail');
    setActiveDetailTab('summary');
    setEditSection(null);
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    resetBillingCopy();
    setErrors({});
    setDetailLoading(false);
    setDetailError('');
    setConsentLoading(false);
    setConsentError('');
    setPatientSessions([]);
    setPatientSessionsPageInfo(null);
    setPatientSessionsLoading(false);
    setPatientSessionsLoadingMore(false);
    setPatientSessionsError('');
    setFeedback(null);

    if (isCurrentPatient && workspace.selectedClinicId) {
      void loadPatientDetail(workspace.selectedClinicId, patientId);
      if (canManage) {
        void loadPatientConsent(workspace.selectedClinicId, patientId);
      }
    }
  }, [
    canManage,
    loadPatientConsent,
    loadPatientDetail,
    resetBillingCopy,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleEdit = useCallback(async (section: ClinicPatientEditSection) => {
    if (!workspace.selectedClinicId || !selectedPatient) return;

    const patientId = selectedPatient.id;
    const detail = await loadPatientDetail(workspace.selectedClinicId, patientId);

    if (!detail || detail.id !== patientId) return;

    resetBillingCopy();
    setForm(mapPatientToForm(detail));
    setPanelMode('edit');
    setActiveDetailTab(section);
    setEditSection(section);
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, [loadPatientDetail, resetBillingCopy, selectedPatient, workspace.selectedClinicId]);

  const handleRetryDetail = useCallback(() => {
    if (!workspace.selectedClinicId || !selectedPatientId || detailLoading) return;
    setFeedback(null);
    void loadPatientDetail(workspace.selectedClinicId, selectedPatientId);
  }, [detailLoading, loadPatientDetail, selectedPatientId, workspace.selectedClinicId]);

  const handleSelectDetailTab = useCallback((tab: ClinicPatientDetailTab) => {
    setActiveDetailTab(tab);
    if (
      tab === 'consent'
      && workspace.selectedClinicId
      && selectedPatientId
      && canManage
      && !consentLoading
    ) {
      void loadPatientConsent(workspace.selectedClinicId, selectedPatientId);
    }
  }, [
    canManage,
    consentLoading,
    loadPatientConsent,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleRetryConsent = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !selectedPatientId
      || !canManage
      || consentLoading
    ) return;

    setFeedback(null);
    void loadPatientConsent(workspace.selectedClinicId, selectedPatientId);
  }, [
    canManage,
    consentLoading,
    loadPatientConsent,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleChange = useCallback((field: ClinicPatientField, value: string) => {
    setForm((currentForm) => updateClinicPatientFormField(
      currentForm,
      field,
      value,
      sameBillingData,
    ));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors, [field]: undefined };
      if (sameBillingData && (field === 'firstName' || field === 'lastName')) {
        nextErrors.billingFullName = undefined;
      }
      if (field === 'phone' && currentErrors.email === CONTACT_METHOD_REQUIRED_MESSAGE) {
        nextErrors.email = undefined;
      }
      return nextErrors;
    });
    setFeedback(null);
  }, [sameBillingData]);

  const handleToggleSameBillingData = useCallback(() => {
    if (saving) return;

    if (sameBillingData) {
      const previousBillingFullName = billingFullNameBeforeCopyRef.current;
      setForm((currentForm) => restoreClinicPatientBillingFullName(
        currentForm,
        previousBillingFullName,
      ));
      resetBillingCopy();
    } else {
      billingFullNameBeforeCopyRef.current = form.billingFullName;
      setForm((currentForm) => copyAdministrativeNameToBilling(currentForm));
      setSameBillingData(true);
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      billingFullName: undefined,
    }));
    setFeedback(null);
  }, [form.billingFullName, resetBillingCopy, sameBillingData, saving]);

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

  const handleOpenSessionScheduler = useCallback(() => {
    const assignment = selectedPatient?.activeAssignment;
    if (
      !workspace.selectedClinicId
      || !selectedPatient
      || !canManage
      || selectedPatient.status !== 'ACTIVE'
      || !assignment
      || assignment.clinicSpecialistStatus !== 'ACTIVE'
    ) {
      setFeedback(createErrorFeedback(
        new Error('El paciente necesita estar activo y tener un responsable activo.'),
        'No se puede crear una cita para esta ficha.',
      ));
      return;
    }

    sessionSchedulerContextRef.current = {
      clinicId: workspace.selectedClinicId,
      clinicPatientId: selectedPatient.id,
      clinicSpecialistId: assignment.clinicSpecialistId,
    };
    setFeedback(null);
    setSessionSchedulerVisible(true);
  }, [canManage, selectedPatient, workspace.selectedClinicId]);

  const handleCloseSessionScheduler = useCallback(() => {
    setSessionSchedulerVisible(false);
    sessionSchedulerContextRef.current = null;
  }, []);

  const handleSubmitPatientSession = useCallback(async (
    payload: clinicService.CreateClinicSessionPayload,
  ): Promise<clinicService.ClinicSessionSummary> => {
    const context = sessionSchedulerContextRef.current;
    const currentAssignment = selectedPatient?.activeAssignment;
    if (
      !context
      || !workspace.selectedClinicId
      || context.clinicId !== workspace.selectedClinicId
      || context.clinicPatientId !== selectedPatient?.id
      || context.clinicSpecialistId !== currentAssignment?.clinicSpecialistId
      || currentAssignment.clinicSpecialistStatus !== 'ACTIVE'
      || payload.clinicPatientId !== context.clinicPatientId
      || payload.clinicSpecialistId !== context.clinicSpecialistId
      || !canManage
    ) {
      throw new Error('El contexto de clínica o la asignación han cambiado. Cierra y vuelve a abrir el formulario.');
    }

    return clinicService.createClinicSession(context.clinicId, payload);
  }, [canManage, selectedPatient, workspace.selectedClinicId]);

  const handlePatientSessionCreated = useCallback((session: clinicService.ClinicSessionSummary) => {
    const context = sessionSchedulerContextRef.current;
    if (
      !context
      || context.clinicId !== workspace.selectedClinicId
      || context.clinicPatientId !== selectedPatient?.id
      || context.clinicPatientId !== session.patient.id
      || context.clinicSpecialistId !== session.specialist.id
      || !canManage
    ) {
      return;
    }

    setSessionSchedulerVisible(false);
    sessionSchedulerContextRef.current = null;
    setFeedback(createSuccessFeedback('Cita creada y ficha actualizada.'));
  }, [canManage, selectedPatient?.id, workspace.selectedClinicId]);

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
      await clinicService.updateClinicSessionStatus(
        workspace.selectedClinicId,
        session.id,
        { status },
      );
      return true;
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo actualizar la cita'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    canManage,
    saving,
    selectedPatientId,
    workspace.selectedClinicId,
  ]);

  const handleCancelForm = useCallback(() => {
    setPanelMode('detail');
    setEditSection(null);
    setForm(EMPTY_FORM);
    resetBillingCopy();
    setAssignmentMode(null);
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
    setErrors({});
    setFeedback(null);
  }, [resetBillingCopy]);

  const handleSubmit = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage) {
      return;
    }

    const formSchema = panelMode === 'edit'
      ? editSection === 'billing'
        ? clinicPatientBillingFormSchema
        : clinicPatientSummaryFormSchema
      : clinicPatientFormSchema;
    const parsedForm = formSchema.safeParse(form);
    if (!parsedForm.success) {
      setErrors(getValidationErrors(parsedForm.error));
      setFeedback(null);
      return;
    }

    setSaving(true);
    setErrors({});
    setFeedback(null);

    try {
      const savedPatient = panelMode === 'edit' && selectedPatient
        ? await clinicService.updateClinicPatient(
          workspace.selectedClinicId,
          selectedPatient.id,
          editSection === 'billing'
            ? mapBillingFormToPayload(form)
            : mapSummaryFormToPayload(form),
        )
        : await clinicService.createClinicPatient(
          workspace.selectedClinicId,
          mapFormToPayload(form),
        );

      rememberPatientDetail(savedPatient);
      setSelectedPatientId(savedPatient.id);
      setPanelMode('detail');
      setEditSection(null);
      setForm(EMPTY_FORM);
      resetBillingCopy();
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
    editSection,
    form,
    loadPatients,
    panelMode,
    resetBillingCopy,
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
    setActiveDetailTab('summary');
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
    if (
      !workspace.selectedClinicId
      || !selectedPatient
      || !canManage
      || consentError
      || selectedPatientConsent?.digitalConsentChannel !== 'HERA_ACCOUNT_EMAIL'
    ) {
      return;
    }

    const clinicId = workspace.selectedClinicId;
    const patientId = selectedPatient.id;
    const isActionContextCurrent = (): boolean => (
      mountedRef.current
      && consentViewContextRef.current.clinicId === clinicId
      && consentViewContextRef.current.patientId === patientId
    );

    const confirmed = await alert.confirm({
      title: 'Enviar autorización por email',
      message: 'Enviaremos un enlace al email de la cuenta HERA vinculada. El paciente deberá iniciar sesión para revisar la autorización y decidir.',
      confirmLabel: 'Enviar por email',
    });

    if (!confirmed || !isActionContextCurrent()) {
      return;
    }

    setConsentSaving(true);
    setFeedback(null);

    const synchronizeConsent = async (): Promise<void> => {
      if (!isActionContextCurrent()) return;
      const synchronizationSequence = consentRequestSeq.current;

      try {
        const consent = await clinicService.getClinicPatientConsent(clinicId, patientId);
        if (
          !isActionContextCurrent()
          || consentRequestSeq.current !== synchronizationSequence
        ) return;

        rememberPatientConsent(consent);
        setConsentError('');
      } catch (error: unknown) {
        if (
          !isActionContextCurrent()
          || consentRequestSeq.current !== synchronizationSequence
        ) return;

        setConsentError(createErrorFeedback(
          error,
          'No se pudo actualizar la autorización del paciente',
        ).text);
      }
    };

    try {
      try {
        await clinicService.requestClinicPatientConsent(clinicId, patientId);
      } catch (error: unknown) {
        const errorFeedback = createErrorFeedback(
          error,
          'No se pudo enviar la autorización por email',
        );
        if (isActionContextCurrent()) {
          await synchronizeConsent();
        }
        if (isActionContextCurrent()) {
          setFeedback(errorFeedback);
        }
        return;
      }

      if (!isActionContextCurrent()) return;

      await synchronizeConsent();
      if (isActionContextCurrent()) {
        setFeedback(createSuccessFeedback('Autorización enviada por email.'));
      }
    } finally {
      setConsentSaving(false);
    }
  }, [
    alert,
    canManage,
    consentError,
    rememberPatientConsent,
    selectedPatient,
    selectedPatientConsent,
    workspace.selectedClinicId,
  ]);

  const runGuestConsentAdminAction = useCallback(async (input: {
    actionKey: string;
    title: string;
    message: string;
    confirmLabel: string;
    successMessage: string;
    operation: (
      clinicId: string,
      patientId: string,
      idempotencyKey: string
    ) => Promise<ClinicGuestConsentAdminResult>;
  }): Promise<void> => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage || consentError) return;
    const clinicId = workspace.selectedClinicId;
    const patientId = selectedPatient.id;
    const isActionContextCurrent = (): boolean => (
      mountedRef.current
      && consentViewContextRef.current.clinicId === clinicId
      && consentViewContextRef.current.patientId === patientId
    );
    const confirmed = await alert.confirm({
      title: input.title,
      message: input.message,
      confirmLabel: input.confirmLabel,
    });
    if (!confirmed || !isActionContextCurrent()) return;

    const mapKey = `${clinicId}:${patientId}:${input.actionKey}`;
    let idempotencyKey = guestConsentIdempotencyKeysRef.current.get(mapKey);
    if (!idempotencyKey) {
      idempotencyKey = createSecureRandomUuid();
      guestConsentIdempotencyKeysRef.current.set(mapKey, idempotencyKey);
    }
    setConsentSaving(true);
    setFeedback(null);
    try {
      const result = await input.operation(clinicId, patientId, idempotencyKey);
      guestConsentIdempotencyKeysRef.current.delete(mapKey);
      if (!isActionContextCurrent()) return;
      setPatientConsents((currentConsents) => {
        const currentConsent = currentConsents[patientId];
        if (!currentConsent) return currentConsents;
        return {
          ...currentConsents,
          [patientId]: {
            ...currentConsent,
            guestRequest: {
              id: result.requestId,
              requestKind: result.requestKind,
              status: result.status,
              linkDeliveryStatus: result.linkDeliveryStatus,
              expiresAt: result.expiresAt,
              createdAt: result.createdAt,
            },
          },
        };
      });
      let mutationFeedback: FeedbackMessage;
      if (result.linkDeliveryStatus === 'FAILED') {
        mutationFeedback = createErrorFeedback(
          new Error('La solicitud se creó, pero el proveedor rechazó el email y ha quedado cancelada.'),
          'No se pudo entregar el email',
        );
      } else if (result.linkDeliveryStatus === 'UNKNOWN' || result.linkDeliveryStatus === 'PENDING') {
        mutationFeedback = createErrorFeedback(
          new Error('La solicitud se creó, pero el proveedor no confirmó la entrega. Reenvíala para generar credenciales nuevas.'),
          'La entrega del email no está confirmada',
        );
      } else {
        mutationFeedback = createSuccessFeedback(input.successMessage);
      }
      setFeedback(mutationFeedback);
      const refreshed = await loadPatientConsent(clinicId, patientId, {
        preserveFeedbackOnError: true,
      });
      if (!refreshed) {
        if (!isActionContextCurrent()) return;
        setFeedback({
          ...mutationFeedback,
          text: `${mutationFeedback.text} No se pudo actualizar el panel; usa «Reintentar» para sincronizarlo.`,
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof clinicService.ClinicGuestConsentAdminRequestError
        && error.classification !== 'timeout'
        && error.classification !== 'network'
        && error.classification !== 'server'
      ) {
        guestConsentIdempotencyKeysRef.current.delete(mapKey);
      }
      if (isActionContextCurrent()) {
        setFeedback(createErrorFeedback(error, 'No se pudo completar la operación'));
      }
    } finally {
      setConsentSaving(false);
    }
  }, [alert, canManage, consentError, loadPatientConsent, selectedPatient, workspace.selectedClinicId]);

  const handleIssueGuestConsent = useCallback(() => runGuestConsentAdminAction({
    actionKey: 'ISSUE_GRANT',
    title: 'Enviar autorización por email',
    message: 'Enviaremos un enlace personal al email de contacto de la ficha. El paciente verificará ese buzón con un código antes de decidir.',
    confirmLabel: 'Enviar por email',
    successMessage: 'Autorización enviada por email.',
    operation: (clinicId, patientId, key) => clinicService.issueClinicGuestConsent(clinicId, patientId, key),
  }), [runGuestConsentAdminAction]);

  const handleResendGuestConsent = useCallback(() => {
    const requestId = selectedPatientConsent?.guestRequest?.id;
    if (!requestId) return Promise.resolve();
    return runGuestConsentAdminAction({
      actionKey: `RESEND:${requestId}`,
      title: 'Enviar un enlace nuevo por email',
      message: 'Enviaremos al paciente un enlace nuevo por email. El enlace y cualquier código anterior dejarán de funcionar.',
      confirmLabel: 'Enviar por email',
      successMessage: 'Enlace nuevo enviado por email.',
      operation: (clinicId, patientId, key) => clinicService.resendClinicGuestConsent(clinicId, patientId, requestId, key),
    });
  }, [runGuestConsentAdminAction, selectedPatientConsent?.guestRequest?.id]);

  const handleCancelGuestConsent = useCallback(() => {
    const requestId = selectedPatientConsent?.guestRequest?.id;
    if (!requestId) return Promise.resolve();
    return runGuestConsentAdminAction({
      actionKey: `CANCEL:${requestId}`,
      title: 'Cancelar solicitud',
      message: 'El enlace, la sesión y los códigos pendientes dejarán de funcionar. La decisión previa del paciente no se modificará.',
      confirmLabel: 'Cancelar solicitud',
      successMessage: 'Solicitud cancelada.',
      operation: (clinicId, patientId) => clinicService.cancelClinicGuestConsent(clinicId, patientId, requestId),
    });
  }, [runGuestConsentAdminAction, selectedPatientConsent?.guestRequest?.id]);

  const handleRequestGuestWithdrawal = useCallback(() => runGuestConsentAdminAction({
    actionKey: 'ISSUE_WITHDRAWAL',
    title: 'Enviar retirada por email',
    message: 'Enviaremos al paciente una solicitud por email. La autorización actual seguirá vigente hasta que verifique su email y confirme expresamente la retirada.',
    confirmLabel: 'Enviar por email',
    successMessage: 'Retirada enviada por email para su confirmación.',
    operation: (clinicId, patientId, key) => clinicService.issueClinicGuestConsentWithdrawal(clinicId, patientId, key),
  }), [runGuestConsentAdminAction]);

  const handleUploadConsentEvidence = useCallback(async (file: UploadAsset) => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage || consentError) {
      return;
    }

    if (file.mimeType && file.mimeType !== 'application/pdf') {
      setFeedback(createErrorFeedback(
        new Error('Adjunta la autorización firmada en PDF.'),
        'Adjunta la autorización firmada en PDF.',
      ));
      return;
    }

    const confirmed = await alert.confirm({
      title: 'Registrar autorización firmada',
      message: 'El documento se guardará en almacenamiento privado y la autorización quedará registrada como concedida.',
      confirmLabel: 'Registrar documento',
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
      setConsentError('');
      setFeedback(createSuccessFeedback('Autorización firmada registrada.'));
    } catch (error: unknown) {
      setFeedback(createErrorFeedback(error, 'No se pudo registrar la autorización firmada'));
    } finally {
      setConsentSaving(false);
    }
  }, [
    alert,
    canManage,
    consentError,
    rememberPatientConsent,
    selectedPatient,
    workspace.selectedClinicId,
  ]);

  const handleOpenConsentDocument = useCallback(async (
    document: clinicService.ClinicPatientConsentDocument,
  ) => {
    if (!workspace.selectedClinicId || !selectedPatient || !canManage || consentError) {
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
      setFeedback(createErrorFeedback(error, 'No se pudo abrir el documento de autorización'));
    } finally {
      setOpeningConsentDocumentId(null);
    }
  }, [canManage, consentError, selectedPatient, workspace.selectedClinicId]);

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
    sessionSchedulerVisible,
    detailLoading,
    detailError,
    consentLoading,
    consentError,
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
    activeDetailTab,
    editSection,
    assignmentMode,
    assignmentForm,
    form,
    sameBillingData,
    errors,
    saving,
    feedback,
    handleSelectClinic,
    handleRetry,
    handleAdd,
    handleSelectPatient,
    handleEdit,
    handleRetryDetail,
    handleSelectDetailTab,
    handleRetryConsent,
    handleChange,
    handleToggleSameBillingData,
    handleSearchChange,
    handleStatusFilterChange,
    handleAssignmentFilterChange,
    handleSpecialistFilterChange,
    handleLoadMorePatients,
    handleLoadMoreAssignmentHistory,
    handleLoadMorePatientSessions,
    handleRetryAssignmentHistory,
    handleRetryPatientSessions,
    handleOpenSessionScheduler,
    handleCloseSessionScheduler,
    handleSubmitPatientSession,
    handlePatientSessionCreated,
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
    handleIssueGuestConsent,
    handleResendGuestConsent,
    handleCancelGuestConsent,
    handleRequestGuestWithdrawal,
    handleUploadConsentEvidence,
    handleOpenConsentDocument,
  };
}
