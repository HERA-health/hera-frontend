import * as Crypto from 'expo-crypto';
import { getErrorMessage } from '../constants/errors';
import { api } from './api';

export type FinancialWorkflowMode = 'OFF' | 'SHADOW' | 'ACTIVE';
export type ActivationRequestStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'CHANGES_REQUIRED' | 'ACTIVATED' | 'CANCELLED';
export type ActivationChecklistStatus = 'PASS' | 'BLOCKED' | 'WARNING' | 'NOT_APPLICABLE';
export type ActivationChecklistGroup = 'CONFIGURATION' | 'AGREEMENTS' | 'TRIAL' | 'FISCAL' | 'INFRASTRUCTURE';

export interface ActivationRequestDto {
  id: string;
  status: ActivationRequestStatus;
  version: number;
  note: string | null;
  resolutionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
}

export interface ActivationChecklistItemDto {
  key: string;
  group: ActivationChecklistGroup;
  status: ActivationChecklistStatus;
  title: string;
  description: string;
  facts?: {
    affectedCount?: number;
    pendingCount?: number;
    failedCount?: number;
  };
}

export interface ActivationReadinessDto {
  clinicId: string;
  mode: FinancialWorkflowMode;
  request: ActivationRequestDto | null;
  checklist: ActivationChecklistItemDto[];
  blockers: string[];
  warnings: string[];
  lastReconciliation: {
    performedAt: string;
    inspectedCount: number;
    resolvedCount: number;
    blockedCount: number;
    mismatchCount: number;
  } | null;
  capabilities: {
    canRequestReview: boolean;
    canCancelRequest: boolean;
    canStartShadow: boolean;
    canReconcile: boolean;
    canApproveFiscalReadiness: boolean;
    canActivate: boolean;
    canReturnChanges: boolean;
    canVerifyJournal: boolean;
    canTurnOff: boolean;
  };
}

export interface AdminClinicFinanceSummary {
  modes: Record<FinancialWorkflowMode, number>;
  pendingRequests: number;
  inReviewRequests: number;
  incidents: number;
}

export interface AdminClinicFinanceListItem {
  id: string;
  commercialName: string;
  mode: FinancialWorkflowMode;
  request: ActivationRequestDto | null;
  blockerCount: number;
  warningCount: number;
  lastReconciliation: ActivationReadinessDto['lastReconciliation'];
  updatedAt: string;
}

export interface AdminClinicFinanceDetail {
  clinic: {
    id: string;
    commercialName: string;
    mode: FinancialWorkflowMode;
    shadowStartedAt: string | null;
    activatedAt: string | null;
    fiscalApprovedAt: string | null;
    fiscalReviewReference: string | null;
  };
  readiness: ActivationReadinessDto;
  requestHistory: ActivationRequestDto[];
  timeline: Array<{
    id: string;
    action: string;
    occurredAt: string;
  }>;
}

interface ListInput {
  cursor?: string;
  limit?: number;
  search?: string;
  mode?: FinancialWorkflowMode;
  requestStatus?: ActivationRequestStatus;
  readiness?: 'ALL' | 'READY' | 'BLOCKED';
}

const request = async <T>(operation: () => Promise<{ data: { data: T } }>, fallback: string): Promise<T> => {
  try {
    return (await operation()).data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, fallback));
  }
};

export const createActivationCommandKey = (): string => Crypto.randomUUID();

const commandHeaders = (idempotencyKey: string) => ({ 'Idempotency-Key': idempotencyKey });

export const getAdminClinicFinanceSummary = (): Promise<AdminClinicFinanceSummary> =>
  request(() => api.get('/admin/clinic-finance/summary'), 'No se pudo cargar el resumen de clínicas.');

export const listAdminClinicFinance = (input: ListInput) =>
  request<{ items: AdminClinicFinanceListItem[]; nextCursor: string | null }>(
    () => api.get('/admin/clinic-finance/clinics', { params: input }),
    'No se pudo cargar la cola de clínicas.',
  );

export const getAdminClinicFinanceDetail = (clinicId: string): Promise<AdminClinicFinanceDetail> =>
  request(() => api.get(`/admin/clinic-finance/clinics/${clinicId}`), 'No se pudo cargar la preparación de la clínica.');

const postAdminCommand = <T>(
  clinicId: string,
  action: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  fallback: string,
): Promise<T> => request(
  () => api.post(`/admin/clinic-finance/clinics/${clinicId}/${action}`, payload, { headers: commandHeaders(idempotencyKey) }),
  fallback,
);

export const startShadow = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode; expectedRequestStatus: ActivationRequestStatus; expectedRequestVersion: number },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'shadow', payload, idempotencyKey, 'No se pudo iniciar el ensayo.');

export const reconcileShadow = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode; expectedRequestStatus: ActivationRequestStatus; expectedRequestVersion: number },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'reconcile', payload, idempotencyKey, 'No se pudo reconciliar el ensayo.');

export const approveFiscalReadiness = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode; expectedRequestStatus: ActivationRequestStatus; expectedRequestVersion: number; reviewReference: string },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'fiscal-readiness', payload, idempotencyKey, 'No se pudo registrar la aprobación fiscal.');

export const activateWorkflow = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode; expectedRequestStatus: ActivationRequestStatus; expectedRequestVersion: number },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'activate', payload, idempotencyKey, 'No se pudo activar la clínica.');

export const requireChanges = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode; expectedRequestStatus: ActivationRequestStatus; expectedRequestVersion: number; reason: string },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'changes-required', payload, idempotencyKey, 'No se pudo devolver la solicitud.');

export const verifyJournal = (
  clinicId: string,
  payload: { expectedMode: FinancialWorkflowMode },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'verify-journal', payload, idempotencyKey, 'No se pudo verificar el historial.');

export const turnOff = (
  clinicId: string,
  payload: { expectedMode: 'SHADOW' | 'ACTIVE'; reason: string; confirmed: true },
  idempotencyKey: string,
) => postAdminCommand(clinicId, 'off', payload, idempotencyKey, 'No se pudo pasar la clínica a OFF.');
