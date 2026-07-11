import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import type { DropdownOption } from '../../components/common/SimpleDropdown';
import * as clinicService from '../../services/clinicService';
import { useClinicWorkspace } from './useClinicWorkspace';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';

export type ClinicBillingStatusFilter = clinicService.ClinicInvoiceStatus | 'ALL';
export type ClinicBillingKindFilter = clinicService.ClinicInvoiceKind | 'ALL';

export interface ClinicBillingFilters {
  statusFilter: ClinicBillingStatusFilter;
  invoiceKindFilter: ClinicBillingKindFilter;
  patientFilter: string;
}

export interface ClinicRevenueShareFilters {
  month: number;
  year: number;
}

export interface ClinicSettlementFilters {
  month: number;
  year: number;
}

export interface ClinicBillingConfigForm {
  legalName: string;
  taxId: string;
  fiscalAddress: string;
  fiscalPostalCode: string;
  fiscalCity: string;
  fiscalCountry: string;
  simplifiedInvoicePrefix: string;
  simplifiedInvoiceNextNumber: string;
  fullInvoicePrefix: string;
  fullInvoiceNextNumber: string;
  applyVat: boolean;
  vatRate: string;
  vatExemptReason: string;
  bankIban: string;
  paymentConditions: string;
  sendInvoiceCopyTo: string;
}

export interface ClinicBillingInvoiceForm {
  clinicPatientId: string;
  invoiceKind: clinicService.ClinicInvoiceKind;
  concept: string;
  subtotal: string;
  vatRate: string;
  sessionDate: string;
  durationMinutes: string;
  internalNotes: string;
}

export type ClinicBillingConfigErrors = Partial<Record<keyof ClinicBillingConfigForm, string>>;
export type ClinicBillingInvoiceErrors = Partial<
  Record<keyof ClinicBillingInvoiceForm | 'clinicSpecialistId', string>
>;

export const STATUS_OPTIONS: DropdownOption<ClinicBillingStatusFilter>[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Borradores', value: 'DRAFT' },
  { label: 'Enviadas', value: 'SENT' },
  { label: 'Pagadas', value: 'PAID' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

export const KIND_OPTIONS: DropdownOption<ClinicBillingKindFilter>[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Simplificada', value: 'SIMPLIFIED' },
  { label: 'Completa', value: 'FULL' },
];

export const CREATE_KIND_OPTIONS: DropdownOption<clinicService.ClinicInvoiceKind>[] = [
  { label: 'Simplificada', value: 'SIMPLIFIED' },
  { label: 'Completa', value: 'FULL' },
];

export const REVENUE_SHARE_MONTH_OPTIONS: DropdownOption<number>[] = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
];

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VAT_OPTIONS = new Set(['0', '10', '21']);
const CLINIC_REFERENCE_PAGE_LIMIT = 25;
const CLINIC_SESSION_LOOKUP_PAGE_LIMIT = 25;
const PATIENT_LOOKUP_DEBOUNCE_MS = 250;

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const createInitialFilters = (): ClinicBillingFilters => ({
  statusFilter: 'ALL',
  invoiceKindFilter: 'ALL',
  patientFilter: 'ALL',
});

const createRevenueShareFilters = (): ClinicRevenueShareFilters => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

const getMadridYearMonth = (): { year: number; month: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: getPart('year'),
    month: getPart('month'),
  };
};

const createSettlementFilters = (): ClinicSettlementFilters => {
  const { year: currentYear, month: currentMonth } = getMadridYearMonth();

  return currentMonth === 1
    ? { month: 12, year: currentYear - 1 }
    : { month: currentMonth - 1, year: currentYear };
};

const createConfigForm = (config?: clinicService.ClinicBillingConfig | null): ClinicBillingConfigForm => ({
  legalName: config?.legalName ?? '',
  taxId: config?.taxId ?? '',
  fiscalAddress: config?.fiscalAddress ?? '',
  fiscalPostalCode: config?.fiscalPostalCode ?? '',
  fiscalCity: config?.fiscalCity ?? '',
  fiscalCountry: config?.fiscalCountry ?? 'Spain',
  simplifiedInvoicePrefix: config?.simplifiedInvoicePrefix ?? 'FSC',
  simplifiedInvoiceNextNumber: String(config?.simplifiedInvoiceNextNumber ?? 1),
  fullInvoicePrefix: config?.fullInvoicePrefix ?? 'FC',
  fullInvoiceNextNumber: String(config?.fullInvoiceNextNumber ?? 1),
  applyVat: config?.applyVat ?? false,
  vatRate: String(config?.vatRate ?? 21),
  vatExemptReason: config?.vatExemptReason ?? '',
  bankIban: config?.bankIban ?? '',
  paymentConditions: config?.paymentConditions ?? '',
  sendInvoiceCopyTo: config?.sendInvoiceCopyTo ?? '',
});

const createInvoiceForm = (clinicPatientId = ''): ClinicBillingInvoiceForm => ({
  clinicPatientId,
  invoiceKind: 'SIMPLIFIED',
  concept: 'Sesión de clínica',
  subtotal: '',
  vatRate: '0',
  sessionDate: '',
  durationMinutes: '',
  internalNotes: '',
});

const configFormSchema = z.object({
  legalName: z.string().max(160),
  taxId: z.string().max(40),
  fiscalAddress: z.string().max(240),
  fiscalPostalCode: z.string().max(20),
  fiscalCity: z.string().max(120),
  fiscalCountry: z.string().max(80),
  simplifiedInvoicePrefix: z.string().trim().min(1).max(10),
  simplifiedInvoiceNextNumber: z.coerce.number().int().min(1),
  fullInvoicePrefix: z.string().trim().min(1).max(10),
  fullInvoiceNextNumber: z.coerce.number().int().min(1),
  applyVat: z.boolean(),
  vatRate: z.string().refine((value) => VAT_OPTIONS.has(value), 'IVA 0, 10 o 21.'),
  vatExemptReason: z.string().max(240),
  bankIban: z.string().max(64),
  paymentConditions: z.string().max(500),
  sendInvoiceCopyTo: z.string().email('Email no válido.').or(z.literal('')),
});

const invoiceFormSchema = z.object({
  clinicPatientId: z.string().min(1, 'Selecciona un paciente.'),
  invoiceKind: z.enum(['SIMPLIFIED', 'FULL']),
  concept: z.string().trim().min(1, 'El concepto es obligatorio.').max(500),
  subtotal: z.coerce.number().min(0.01, 'El importe debe ser mayor que cero.'),
  vatRate: z.string().refine((value) => VAT_OPTIONS.has(value), 'IVA 0, 10 o 21.'),
  sessionDate: z.string()
    .regex(DATE_INPUT_PATTERN, 'Usa formato YYYY-MM-DD.')
    .or(z.literal('')),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional().or(z.literal('')),
  internalNotes: z.string().max(1000),
});

const getPatientSpecialistId = (
  patients: clinicService.ClinicPatientSummary[],
  clinicPatientId: string,
): string | null =>
  patients.find((patient) => patient.id === clinicPatientId)?.activeAssignment?.clinicSpecialistId ?? null;

const toSessionLookupRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 180);
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const buildInvoiceFilters = (
  filters: ClinicBillingFilters,
  page = 1,
): clinicService.ClinicInvoiceListFilters => ({
  status: filters.statusFilter === 'ALL' ? undefined : filters.statusFilter,
  invoiceKind: filters.invoiceKindFilter === 'ALL' ? undefined : filters.invoiceKindFilter,
  clinicPatientId: filters.patientFilter === 'ALL' ? undefined : filters.patientFilter,
  page,
  limit: 25,
});

export function useClinicBillingController() {
  const appAlert = useAppAlert();
  const { refresh: refreshCompletion } = useProfileCompletion();
  const workspace = useClinicWorkspace();
  const mountedRef = useRef(true);
  const invoicesRequestSeq = useRef(0);
  const summaryRequestSeq = useRef(0);
  const revenueShareRequestSeq = useRef(0);
  const settlementRequestSeq = useRef(0);
  const settlementDetailRequestSeq = useRef(0);
  const referenceRequestSeq = useRef(0);
  const patientLookupRequestSeq = useRef(0);
  const sessionLookupRequestSeq = useRef(0);

  const [summary, setSummary] = useState<clinicService.ClinicBillingSummary | null>(null);
  const [revenueShareSummary, setRevenueShareSummary] =
    useState<clinicService.ClinicRevenueShareSummary | null>(null);
  const [settlementPreview, setSettlementPreview] =
    useState<clinicService.ClinicSettlementPreview | null>(null);
  const [settlements, setSettlements] = useState<clinicService.ClinicSettlementPeriod[]>([]);
  const [selectedSettlementDetail, setSelectedSettlementDetail] =
    useState<clinicService.ClinicSettlementDetail | null>(null);
  const [settlementPageInfo, setSettlementPageInfo] =
    useState<clinicService.ClinicSettlementListPage['pageInfo'] | null>(null);
  const [config, setConfig] = useState<clinicService.ClinicBillingConfig | null>(null);
  const [invoices, setInvoices] = useState<clinicService.ClinicInvoiceSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<clinicService.ClinicInvoiceListPage['pageInfo'] | null>(null);
  const [patients, setPatients] = useState<clinicService.ClinicPatientSummary[]>([]);
  const [patientLookupSearch, setPatientLookupSearch] = useState('');
  const [patientLookupPageInfo, setPatientLookupPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);
  const [patientLookupLoadingMore, setPatientLookupLoadingMore] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<clinicService.ClinicSessionSummary[]>([]);
  const [completedSessionPageInfo, setCompletedSessionPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo | null>(null);
  const [completedSessionLoading, setCompletedSessionLoading] = useState(false);
  const [completedSessionLoadingMore, setCompletedSessionLoadingMore] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [revenueShareError, setRevenueShareError] = useState('');
  const [revenueShareLoading, setRevenueShareLoading] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementDetailLoading, setSettlementDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState<ClinicBillingConfigForm>(() => createConfigForm());
  const [configErrors, setConfigErrors] = useState<ClinicBillingConfigErrors>({});
  const [invoiceForm, setInvoiceForm] = useState<ClinicBillingInvoiceForm>(() => createInvoiceForm());
  const [invoiceErrors, setInvoiceErrors] = useState<ClinicBillingInvoiceErrors>({});
  const [editableFilters, setEditableFilters] = useState<ClinicBillingFilters>(() => createInitialFilters());
  const [appliedFilters, setAppliedFilters] = useState<ClinicBillingFilters>(() => createInitialFilters());
  const [revenueShareFilters, setRevenueShareFilters] =
    useState<ClinicRevenueShareFilters>(() => createRevenueShareFilters());
  const [settlementFilters, setSettlementFilters] =
    useState<ClinicSettlementFilters>(() => createSettlementFilters());

  const canManage = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';

  const invalidateBillingRequests = useCallback(() => {
    invoicesRequestSeq.current += 1;
    summaryRequestSeq.current += 1;
    revenueShareRequestSeq.current += 1;
    settlementRequestSeq.current += 1;
    settlementDetailRequestSeq.current += 1;
    referenceRequestSeq.current += 1;
    patientLookupRequestSeq.current += 1;
    sessionLookupRequestSeq.current += 1;
  }, []);

  const resetBillingContextState = useCallback((
    nextFilters = createInitialFilters(),
    nextRevenueShareFilters = createRevenueShareFilters(),
    nextSettlementFilters = createSettlementFilters(),
  ) => {
    invalidateBillingRequests();
    setSummary(null);
    setRevenueShareSummary(null);
    setRevenueShareError('');
    setRevenueShareLoading(false);
    setSettlementPreview(null);
    setSettlements([]);
    setSelectedSettlementDetail(null);
    setSettlementPageInfo(null);
    setSettlementError('');
    setSettlementLoading(false);
    setSettlementDetailLoading(false);
    setConfig(null);
    setConfigForm(createConfigForm());
    setConfigErrors({});
    setInvoices([]);
    setPageInfo(null);
    setPatients([]);
    setPatientLookupSearch('');
    setPatientLookupPageInfo(null);
    setPatientLookupLoading(false);
    setPatientLookupLoadingMore(false);
    setCompletedSessions([]);
    setCompletedSessionPageInfo(null);
    setCompletedSessionLoading(false);
    setCompletedSessionLoadingMore(false);
    setSelectedSessionId('');
    setInvoiceForm(createInvoiceForm());
    setInvoiceErrors({});
    setLoading(false);
    setLoadingMore(false);
    setError('');
    setSaving(false);
    setEditableFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setRevenueShareFilters(nextRevenueShareFilters);
    setSettlementFilters(nextSettlementFilters);
  }, [invalidateBillingRequests]);

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

  const completedSessionOptions = useMemo<DropdownOption<string>[]>(
    () => completedSessions.map((session) => ({
      label: `${session.patient.displayName} · ${new Date(session.date).toLocaleDateString('es-ES')}`,
      value: session.id,
      subtitle: session.specialist.displayName,
    })),
    [completedSessions],
  );

  const revenueShareYearOptions = useMemo<DropdownOption<number>[]>(() => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: currentYear + 1 - 2020 + 1 },
      (_, index) => currentYear + 1 - index,
    ).map((year) => ({
      label: String(year),
      value: year,
    }));
  }, []);

  const setEditableFilter = useCallback(<K extends keyof ClinicBillingFilters>(
    field: K,
    value: ClinicBillingFilters[K],
  ) => {
    setEditableFilters((current) => ({ ...current, [field]: value }));
  }, []);

  const setConfigField = useCallback(<K extends keyof ClinicBillingConfigForm>(
    field: K,
    value: ClinicBillingConfigForm[K],
  ) => {
    setConfigForm((current) => ({ ...current, [field]: value }));
    setConfigErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const setInvoiceField = useCallback(<K extends keyof ClinicBillingInvoiceForm>(
    field: K,
    value: ClinicBillingInvoiceForm[K],
  ) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
    setInvoiceErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const loadInvoices = useCallback(async (
    clinicId: string,
    page: number,
    filters: ClinicBillingFilters,
  ) => {
    const requestId = invoicesRequestSeq.current + 1;
    invoicesRequestSeq.current = requestId;

    if (page === 1) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await clinicService.listClinicInvoices(
        clinicId,
        buildInvoiceFilters(filters, page),
      );
      if (!mountedRef.current || invoicesRequestSeq.current !== requestId) return;
      setInvoices((current) => (page === 1 ? result.items : [...current, ...result.items]));
      setPageInfo(result.pageInfo);
    } catch (loadError: unknown) {
      if (!mountedRef.current || invoicesRequestSeq.current !== requestId) return;
      const message = loadError instanceof Error
        ? loadError.message
        : 'No se pudieron cargar las facturas';
      if (page === 1) {
        setError(message);
        setInvoices([]);
        setPageInfo(null);
      } else {
        showAppAlert(appAlert, 'No se pudo cargar más', message);
      }
    } finally {
      if (mountedRef.current && invoicesRequestSeq.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [appAlert]);

  const loadSummary = useCallback(async (clinicId: string) => {
    const requestId = summaryRequestSeq.current + 1;
    summaryRequestSeq.current = requestId;

    const summaryResult = await clinicService.getClinicBillingSummary(clinicId);
    if (!mountedRef.current || summaryRequestSeq.current !== requestId) return;
    setSummary(summaryResult);
  }, []);

  const loadRevenueShareSummary = useCallback(async (
    clinicId: string,
    filters: ClinicRevenueShareFilters,
  ) => {
    const requestId = revenueShareRequestSeq.current + 1;
    revenueShareRequestSeq.current = requestId;

    try {
      setRevenueShareLoading(true);
      setRevenueShareError('');
      const revenueShareResult = await clinicService.getClinicRevenueShareSummary(clinicId, filters);
      if (!mountedRef.current || revenueShareRequestSeq.current !== requestId) return;
      setRevenueShareSummary(revenueShareResult);
    } catch (loadError: unknown) {
      if (!mountedRef.current || revenueShareRequestSeq.current !== requestId) return;
      setRevenueShareSummary(null);
      setRevenueShareError(loadError instanceof Error
        ? loadError.message
        : 'No se pudo cargar el resumen de reparto');
    } finally {
      if (mountedRef.current && revenueShareRequestSeq.current === requestId) {
        setRevenueShareLoading(false);
      }
    }
  }, []);

  const loadSettlementData = useCallback(async (
    clinicId: string,
    filters: ClinicSettlementFilters,
  ) => {
    const requestId = settlementRequestSeq.current + 1;
    settlementRequestSeq.current = requestId;

    try {
      setSettlementLoading(true);
      setSettlementError('');
      const [previewResult, listResult] = await Promise.all([
        clinicService.getClinicSettlementPreview(clinicId, filters),
        clinicService.listClinicSettlements(clinicId, {
          year: filters.year,
          page: 1,
          limit: 12,
        }),
      ]);
      if (!mountedRef.current || settlementRequestSeq.current !== requestId) return;
      setSettlementPreview(previewResult);
      setSettlements(listResult.items);
      setSettlementPageInfo(listResult.pageInfo);
    } catch (loadError: unknown) {
      if (!mountedRef.current || settlementRequestSeq.current !== requestId) return;
      setSettlementPreview(null);
      setSettlements([]);
      setSelectedSettlementDetail(null);
      setSettlementPageInfo(null);
      setSettlementError(loadError instanceof Error
        ? loadError.message
        : 'No se pudieron cargar las liquidaciones');
    } finally {
      if (mountedRef.current && settlementRequestSeq.current === requestId) {
        setSettlementLoading(false);
      }
    }
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
      setInvoiceForm((current) => (
        current.clinicPatientId ? current : createInvoiceForm(patientPage.items[0]?.id ?? '')
      ));
    } finally {
      if (mountedRef.current && patientLookupRequestSeq.current === requestId) {
        setPatientLookupLoading(false);
        setPatientLookupLoadingMore(false);
      }
    }
  }, []);

  const loadCompletedSessionLookup = useCallback(async (
    clinicId: string,
    clinicPatientId: string,
    page = 1,
    append = false,
  ) => {
    const requestId = sessionLookupRequestSeq.current + 1;
    sessionLookupRequestSeq.current = requestId;

    if (!clinicPatientId) {
      setCompletedSessions([]);
      setCompletedSessionPageInfo(null);
      setSelectedSessionId('');
      return;
    }

    const sessionRange = toSessionLookupRange();
    if (append) {
      setCompletedSessionLoadingMore(true);
    } else {
      setCompletedSessionLoading(true);
    }

    try {
      const sessionPage = await clinicService.listClinicSessions(clinicId, {
        ...sessionRange,
        clinicPatientId,
        status: 'COMPLETED',
        page,
        limit: CLINIC_SESSION_LOOKUP_PAGE_LIMIT,
      });

      if (!mountedRef.current || sessionLookupRequestSeq.current !== requestId) return;

      setCompletedSessions((currentSessions) => {
        if (!append) return sessionPage.items;

        const currentIds = new Set(currentSessions.map((session) => session.id));
        const nextItems = sessionPage.items.filter((session) => !currentIds.has(session.id));
        return [...currentSessions, ...nextItems];
      });
      setCompletedSessionPageInfo(sessionPage.pageInfo);
      setSelectedSessionId((current) => (
        current && (append || sessionPage.items.some((session) => session.id === current))
          ? current
          : sessionPage.items[0]?.id ?? ''
      ));
    } finally {
      if (mountedRef.current && sessionLookupRequestSeq.current === requestId) {
        setCompletedSessionLoading(false);
        setCompletedSessionLoadingMore(false);
      }
    }
  }, []);

  const loadReferenceData = useCallback(async (clinicId: string) => {
    const requestId = referenceRequestSeq.current + 1;
    referenceRequestSeq.current = requestId;

    const configResult = await clinicService.getClinicBillingConfig(clinicId);
    if (!mountedRef.current || referenceRequestSeq.current !== requestId) return;
    setConfig(configResult);
    setConfigForm(createConfigForm(configResult));
  }, []);

  const reloadInvoicesAndSummary = useCallback(async (filters = appliedFilters) => {
    if (!workspace.selectedClinicId || !canManage) return;

    await Promise.all([
      loadSummary(workspace.selectedClinicId),
      loadRevenueShareSummary(workspace.selectedClinicId, revenueShareFilters),
      loadSettlementData(workspace.selectedClinicId, settlementFilters),
      loadInvoices(workspace.selectedClinicId, 1, filters),
    ]);
  }, [
    appliedFilters,
    canManage,
    loadInvoices,
    loadRevenueShareSummary,
    loadSettlementData,
    loadSummary,
    revenueShareFilters,
    settlementFilters,
    workspace.selectedClinicId,
  ]);

  const reloadBilling = useCallback(async (filters = appliedFilters) => {
    if (!workspace.selectedClinicId || !canManage) return;

    await Promise.all([
      loadSummary(workspace.selectedClinicId),
      loadRevenueShareSummary(workspace.selectedClinicId, revenueShareFilters),
      loadSettlementData(workspace.selectedClinicId, settlementFilters),
      loadReferenceData(workspace.selectedClinicId),
      loadPatientLookup(workspace.selectedClinicId, patientLookupSearch, 1, false),
      loadInvoices(workspace.selectedClinicId, 1, filters),
    ]);
  }, [
    appliedFilters,
    canManage,
    loadInvoices,
    loadPatientLookup,
    loadReferenceData,
    loadRevenueShareSummary,
    loadSettlementData,
    loadSummary,
    patientLookupSearch,
    revenueShareFilters,
    settlementFilters,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId || !canManage) {
      resetBillingContextState();
      return;
    }

    const initialFilters = createInitialFilters();
    const initialRevenueShareFilters = createRevenueShareFilters();
    const initialSettlementFilters = createSettlementFilters();
    resetBillingContextState(initialFilters, initialRevenueShareFilters, initialSettlementFilters);
    void Promise.all([
      loadSummary(clinicId),
      loadRevenueShareSummary(clinicId, initialRevenueShareFilters),
      loadSettlementData(clinicId, initialSettlementFilters),
      loadReferenceData(clinicId),
      loadInvoices(clinicId, 1, initialFilters),
    ]);
  }, [
    canManage,
    loadInvoices,
    loadReferenceData,
    loadRevenueShareSummary,
    loadSettlementData,
    loadSummary,
    resetBillingContextState,
    workspace.selectedClinicId,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateBillingRequests();
    };
  }, [invalidateBillingRequests]);

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
    const clinicId = workspace.selectedClinicId;
    const clinicPatientId = invoiceForm.clinicPatientId;

    if (!clinicId || !canManage || !clinicPatientId) {
      setCompletedSessions([]);
      setCompletedSessionPageInfo(null);
      setSelectedSessionId('');
      return;
    }

    void loadCompletedSessionLookup(clinicId, clinicPatientId, 1, false);
  }, [
    canManage,
    invoiceForm.clinicPatientId,
    loadCompletedSessionLookup,
    workspace.selectedClinicId,
  ]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    void reloadBilling();
  }, [reloadBilling, workspace]);

  const handleApplyFilters = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage) return;
    const nextFilters = editableFilters;
    setAppliedFilters(nextFilters);
    void loadInvoices(workspace.selectedClinicId, 1, nextFilters);
  }, [canManage, editableFilters, loadInvoices, workspace.selectedClinicId]);

  const handleLoadMore = useCallback(() => {
    if (!workspace.selectedClinicId || !canManage || !pageInfo?.nextPage) return;
    void loadInvoices(workspace.selectedClinicId, pageInfo.nextPage, appliedFilters);
  }, [appliedFilters, canManage, loadInvoices, pageInfo?.nextPage, workspace.selectedClinicId]);

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

  const handleLoadMoreCompletedSessions = useCallback(() => {
    if (
      !workspace.selectedClinicId
      || !canManage
      || !invoiceForm.clinicPatientId
      || !completedSessionPageInfo?.nextPage
      || completedSessionLoadingMore
    ) {
      return;
    }

    void loadCompletedSessionLookup(
      workspace.selectedClinicId,
      invoiceForm.clinicPatientId,
      completedSessionPageInfo.nextPage,
      true
    );
  }, [
    canManage,
    completedSessionLoadingMore,
    completedSessionPageInfo?.nextPage,
    invoiceForm.clinicPatientId,
    loadCompletedSessionLookup,
    workspace.selectedClinicId,
  ]);

  const setRevenueShareFilter = useCallback(<K extends keyof ClinicRevenueShareFilters>(
    field: K,
    value: ClinicRevenueShareFilters[K],
  ) => {
    const nextFilters = {
      ...revenueShareFilters,
      [field]: value,
    };
    setRevenueShareFilters(nextFilters);
    if (workspace.selectedClinicId && canManage) {
      void loadRevenueShareSummary(workspace.selectedClinicId, nextFilters);
    }
  }, [canManage, loadRevenueShareSummary, revenueShareFilters, workspace.selectedClinicId]);

  const setSettlementFilter = useCallback(<K extends keyof ClinicSettlementFilters>(
    field: K,
    value: ClinicSettlementFilters[K],
  ) => {
    const nextFilters = {
      ...settlementFilters,
      [field]: value,
    };
    setSettlementFilters(nextFilters);
    setSelectedSettlementDetail(null);
    if (workspace.selectedClinicId && canManage) {
      void loadSettlementData(workspace.selectedClinicId, nextFilters);
    }
  }, [canManage, loadSettlementData, settlementFilters, workspace.selectedClinicId]);

  const handleViewSettlementDetail = useCallback(async (
    settlement: clinicService.ClinicSettlementPeriod,
  ) => {
    if (!workspace.selectedClinicId || !canManage) return;

    const requestId = settlementDetailRequestSeq.current + 1;
    settlementDetailRequestSeq.current = requestId;

    try {
      setSettlementDetailLoading(true);
      const detail = await clinicService.getClinicSettlement(
        workspace.selectedClinicId,
        settlement.id,
      );
      if (!mountedRef.current || settlementDetailRequestSeq.current !== requestId) return;
      setSelectedSettlementDetail(detail);
    } catch (detailError: unknown) {
      if (!mountedRef.current || settlementDetailRequestSeq.current !== requestId) return;
      showAppAlert(
        appAlert,
        'No se pudo cargar',
        detailError instanceof Error ? detailError.message : 'Inténtalo de nuevo',
      );
    } finally {
      if (mountedRef.current && settlementDetailRequestSeq.current === requestId) {
        setSettlementDetailLoading(false);
      }
    }
  }, [appAlert, canManage, workspace.selectedClinicId]);

  const handleGenerateSettlement = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage || saving) return;

    try {
      setSaving(true);
      await clinicService.createClinicSettlement(workspace.selectedClinicId, settlementFilters);
      showAppAlert(
        appAlert,
        'Liquidación generada',
        'El registro interno queda preparado para revisión.'
      );
      await loadSettlementData(workspace.selectedClinicId, settlementFilters);
    } catch (createError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo generar',
        createError instanceof Error ? createError.message : 'Revisa las facturas del periodo',
      );
    } finally {
      setSaving(false);
    }
  }, [
    appAlert,
    canManage,
    loadSettlementData,
    saving,
    settlementFilters,
    workspace.selectedClinicId,
  ]);

  const handleSettlementAction = useCallback(async (
    settlement: clinicService.ClinicSettlementPeriod,
    status: Extract<clinicService.ClinicSettlementStatus, 'REVIEWED' | 'PAID'>,
  ) => {
    if (!workspace.selectedClinicId || !canManage || saving) return;

    try {
      setSaving(true);
      const updatedSettlement = await clinicService.updateClinicSettlementStatus(
        workspace.selectedClinicId,
        settlement.id,
        { status },
      );
      setSelectedSettlementDetail(updatedSettlement);
      showAppAlert(
        appAlert,
        status === 'REVIEWED' ? 'Liquidación revisada' : 'Liquidación registrada',
        status === 'REVIEWED'
          ? 'La liquidación queda lista para registrar el pago interno.'
          : 'Se ha marcado como pagada a nivel administrativo.'
      );
      await loadSettlementData(workspace.selectedClinicId, settlementFilters);
    } catch (actionError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo actualizar',
        actionError instanceof Error ? actionError.message : 'Inténtalo de nuevo',
      );
    } finally {
      setSaving(false);
    }
  }, [
    appAlert,
    canManage,
    loadSettlementData,
    saving,
    settlementFilters,
    workspace.selectedClinicId,
  ]);

  const handleSaveConfig = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage) return;

    const parsed = configFormSchema.safeParse(configForm);
    if (!parsed.success) {
      const nextErrors: ClinicBillingConfigErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ClinicBillingConfigForm;
        nextErrors[field] = issue.message;
      });
      setConfigErrors(nextErrors);
      return;
    }

    try {
      setSaving(true);
      const updated = await clinicService.updateClinicBillingConfig(workspace.selectedClinicId, {
        legalName: emptyToNull(parsed.data.legalName),
        taxId: emptyToNull(parsed.data.taxId),
        fiscalAddress: emptyToNull(parsed.data.fiscalAddress),
        fiscalPostalCode: emptyToNull(parsed.data.fiscalPostalCode),
        fiscalCity: emptyToNull(parsed.data.fiscalCity),
        fiscalCountry: emptyToNull(parsed.data.fiscalCountry),
        simplifiedInvoicePrefix: parsed.data.simplifiedInvoicePrefix,
        simplifiedInvoiceNextNumber: parsed.data.simplifiedInvoiceNextNumber,
        fullInvoicePrefix: parsed.data.fullInvoicePrefix,
        fullInvoiceNextNumber: parsed.data.fullInvoiceNextNumber,
        applyVat: parsed.data.applyVat,
        vatRate: Number(parsed.data.vatRate),
        vatExemptReason: emptyToNull(parsed.data.vatExemptReason),
        bankIban: emptyToNull(parsed.data.bankIban),
        paymentConditions: emptyToNull(parsed.data.paymentConditions),
        sendInvoiceCopyTo: emptyToNull(parsed.data.sendInvoiceCopyTo),
      });
      setConfig(updated);
      setConfigForm(createConfigForm(updated));
      await refreshCompletion();
      showAppAlert(appAlert, 'Configuración guardada', 'La facturación de clínica se ha actualizado.');
    } catch (saveError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo guardar',
        saveError instanceof Error ? saveError.message : 'Revisa la configuración fiscal',
      );
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, configForm, refreshCompletion, workspace.selectedClinicId]);

  const handleCreateInvoice = useCallback(async (): Promise<boolean> => {
    if (!workspace.selectedClinicId || !canManage) return false;

    const parsed = invoiceFormSchema.safeParse(invoiceForm);
    if (!parsed.success) {
      const nextErrors: ClinicBillingInvoiceErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ClinicBillingInvoiceForm;
        nextErrors[field] = issue.message;
      });
      setInvoiceErrors(nextErrors);
      return false;
    }

    const clinicSpecialistId = getPatientSpecialistId(patients, parsed.data.clinicPatientId);
    if (!clinicSpecialistId) {
      setInvoiceErrors({ clinicSpecialistId: 'El paciente no tiene responsable activo.' });
      return false;
    }

    try {
      setSaving(true);
      await clinicService.createClinicInvoice(workspace.selectedClinicId, {
        clinicPatientId: parsed.data.clinicPatientId,
        clinicSpecialistId,
        invoiceKind: parsed.data.invoiceKind,
        concept: parsed.data.concept.trim(),
        subtotal: parsed.data.subtotal,
        vatRate: Number(parsed.data.vatRate),
        sessionDate: parsed.data.sessionDate ? `${parsed.data.sessionDate}T00:00:00.000Z` : null,
        durationMinutes: typeof parsed.data.durationMinutes === 'number'
          ? parsed.data.durationMinutes
          : null,
        ivaIncluded: true,
        internalNotes: emptyToNull(parsed.data.internalNotes),
      });
      setInvoiceForm(createInvoiceForm(patients[0]?.id ?? ''));
      showAppAlert(appAlert, 'Factura creada', 'La factura queda en borrador hasta que la envíes.');
      await reloadInvoicesAndSummary();
      return true;
    } catch (createError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo crear',
        createError instanceof Error ? createError.message : 'Revisa los datos de la factura',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, invoiceForm, patients, reloadInvoicesAndSummary, workspace.selectedClinicId]);

  const handleCreateFromSession = useCallback(async (): Promise<boolean> => {
    if (!workspace.selectedClinicId || !canManage || !selectedSessionId) return false;

    try {
      setSaving(true);
      await clinicService.createClinicInvoiceFromSession(workspace.selectedClinicId, selectedSessionId);
      showAppAlert(appAlert, 'Factura creada', 'La cita completada ya tiene una factura en borrador.');
      await reloadInvoicesAndSummary();
      return true;
    } catch (createError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo facturar la cita',
        createError instanceof Error ? createError.message : 'Revisa el estado de la cita',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, reloadInvoicesAndSummary, selectedSessionId, workspace.selectedClinicId]);

  const handleInvoiceAction = useCallback(async (
    invoice: clinicService.ClinicInvoiceSummary,
    action: 'send' | 'paid' | 'cancel' | 'pdf',
  ) => {
    if (!workspace.selectedClinicId || !canManage || saving) return;

    try {
      setSaving(true);
      if (action === 'send') {
        await clinicService.sendClinicInvoice(workspace.selectedClinicId, invoice.id);
      } else if (action === 'paid') {
        await clinicService.markClinicInvoiceAsPaid(workspace.selectedClinicId, invoice.id);
      } else if (action === 'cancel') {
        await clinicService.cancelClinicInvoice(workspace.selectedClinicId, invoice.id);
      } else {
        await clinicService.openClinicInvoicePdf(workspace.selectedClinicId, invoice.id);
        return;
      }
      await reloadInvoicesAndSummary();
    } catch (actionError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo completar la acción',
        actionError instanceof Error ? actionError.message : 'Inténtalo de nuevo',
      );
    } finally {
      setSaving(false);
    }
  }, [appAlert, canManage, reloadInvoicesAndSummary, saving, workspace.selectedClinicId]);

  return {
    canManage,
    completedSessionLoading,
    completedSessionLoadingMore,
    completedSessionOptions,
    completedSessionPageInfo,
    config,
    configErrors,
    configForm,
    editableFilters,
    error,
    handleApplyFilters,
    handleCreateFromSession,
    handleCreateInvoice,
    handleInvoiceAction,
    handleLoadMore,
    handleLoadMoreCompletedSessions,
    handleLoadMorePatientOptions,
    handlePatientLookupSearchChange,
    handleRetry,
    handleSaveConfig,
    handleSelectClinic,
    invoiceErrors,
    invoiceForm,
    invoices,
    loading,
    loadingMore,
    pageInfo,
    patientFilterOptions,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupSearch,
    patientOptions,
    revenueShareFilters,
    revenueShareError,
    revenueShareLoading,
    revenueShareSummary,
    revenueShareYearOptions,
    saving,
    selectedSessionId,
    selectedSettlementDetail,
    settlementError,
    settlementDetailLoading,
    settlementFilters,
    settlementLoading,
    settlementPageInfo,
    settlementPreview,
    settlements,
    setConfigField,
    setEditableFilter,
    setInvoiceField,
    setRevenueShareFilter,
    setSettlementFilter,
    setSelectedSessionId,
    summary,
    workspace,
    handleGenerateSettlement,
    handleSettlementAction,
    handleViewSettlementDetail,
  };
}
