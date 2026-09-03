import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import api from '../api';
import { cachedGet, invalidateRequestCache } from '../requestCache';
import { getErrorCode, getErrorMessage } from '../../constants/errors';

const isoDateTime = z.iso.datetime({ offset: true });
const nullableIsoDateTime = isoDateTime.nullable();
const apiEnvelope = <T extends z.ZodType>(schema: T) => z.object({
  success: z.literal(true),
  data: schema,
}).strict();

const contextSchema = z.object({
  clinic: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
  }).strict(),
  relationship: z.object({
    clinicSpecialistId: z.string().min(1),
    displayName: z.string().min(1),
    professionalTitle: z.string().nullable(),
  }).strict(),
  attention: z.object({ pendingTaskCount: z.number().int().nonnegative().nullable() }).strict(),
  capabilities: z.object({
    care: z.object({
      canViewAssignedPatients: z.boolean(),
      canContactUsingAvailableData: z.boolean(),
      canOpenClinicalContent: z.literal(false),
    }).strict(),
    scheduling: z.object({
      canView: z.boolean(),
      canConfirm: z.boolean(),
      canComplete: z.boolean(),
      canMarkPatientNoShow: z.boolean(),
      canCancel: z.boolean(),
      canReschedule: z.boolean(),
      canJoinVideo: z.boolean(),
    }).strict(),
    finance: z.object({
      canViewAgreements: z.boolean(),
      canRespondToAgreements: z.boolean(),
      canViewAmountsAndPayments: z.boolean(),
      canManageProfessionalInvoice: z.boolean(),
    }).strict(),
    operations: z.object({
      canViewLocations: z.boolean(),
      canViewCoordination: z.boolean(),
      canViewSchedules: z.boolean(),
      canViewInstructions: z.boolean(),
    }).strict(),
    administration: z.object({ canOpenAdminWorkspace: z.boolean() }).strict(),
  }).strict(),
}).strict();

const accessSchema = z.object({
  hasActiveCareLink: z.boolean(),
}).strict();

const patientSchema = z.object({
  clinicPatientId: z.string().min(1),
  displayName: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  clinic: z.object({ id: z.string(), name: z.string() }).strict(),
  responsible: z.object({ displayName: z.string(), professionalTitle: z.string().nullable() }).strict(),
  assignment: z.object({ id: z.string(), startedAt: isoDateTime, reason: z.string().nullable() }).strict(),
  consent: z.object({
    status: z.enum(['PENDING', 'GRANTED', 'REVOKED']),
    method: z.string().nullable(),
    requestedAt: nullableIsoDateTime,
    grantedAt: nullableIsoDateTime,
    version: z.string().nullable(),
  }).strict(),
}).strict();

const sessionActionsSchema = z.object({
  canConfirm: z.boolean(),
  canCancel: z.boolean(),
  canComplete: z.boolean(),
  canMarkPatientNoShow: z.boolean(),
  canReschedule: z.boolean(),
  canJoinVideo: z.boolean(),
  canOpenClinicalNotes: z.literal(false),
}).strict();

const sessionSchema = z.object({
  id: z.string().min(1),
  origin: z.literal('CLINIC'),
  clinic: z.object({ id: z.string().min(1), displayName: z.string() }).strict(),
  professional: z.object({
    clinicSpecialistId: z.string().nullable(),
    displayName: z.string(),
    professionalTitle: z.string().nullable(),
  }).strict(),
  patient: z.object({
    id: z.string(),
    displayName: z.string(),
    avatar: z.string().nullable(),
    hasHeraAccount: z.boolean(),
  }).strict(),
  service: z.object({ id: z.string().nullable(), name: z.string() }).strict(),
  schedule: z.object({
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    durationMinutes: z.number().int().positive(),
    modality: z.enum(['IN_PERSON', 'PHONE_CALL', 'VIDEO_CALL']),
  }).strict(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  attendanceOutcome: z.enum(['ATTENDED', 'PATIENT_NO_SHOW']).nullable(),
  price: z.object({ amountCents: z.number().int().nonnegative().nullable(), currency: z.string() }).strict(),
  financial: z.object({
    revision: z.number().int().positive(),
    resolutionStatus: z.enum(['RESOLVED', 'BLOCKED_CONFIGURATION']),
    priceCents: z.number().int().nonnegative(),
    currency: z.string(),
    economicBaseCents: z.number().int().nonnegative(),
    shareMethod: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).nullable(),
    professionalShareBps: z.number().int().nullable(),
    professionalFixedCents: z.number().int().nullable(),
    professionalAmountCents: z.number().int().nullable(),
    clinicAmountCents: z.number().int().nullable(),
    settlementCondition: z.enum(['SESSION_COMPLETED', 'PATIENT_COLLECTION']).nullable(),
  }).strict().nullable(),
  actions: sessionActionsSchema,
  cancelledAt: nullableIsoDateTime,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
}).strict();

const sessionPageSchema = z.object({
  items: z.array(sessionSchema),
  pageInfo: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    nextPage: z.number().int().positive().nullable(),
  }).strict(),
}).strict();

const coordinationSchema = z.object({
  coordinationName: z.string().nullable(),
  operationalEmail: z.string().nullable(),
  operationalPhone: z.string().nullable(),
  supportChannel: z.string().nullable(),
  generalInstructions: z.string().nullable(),
}).strict().nullable();

const informationSchema = z.object({
  clinic: z.object({ displayName: z.string() }).strict(),
  coordination: coordinationSchema,
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    addressLine: z.string(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    weeklySchedule: z.record(z.string(), z.array(z.object({ start: z.string(), end: z.string() }).strict())),
    instructions: z.string().nullable(),
    isPrimary: z.boolean(),
  }).strict()),
  timeZone: z.literal('Europe/Madrid'),
}).strict();

const homeSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    type: z.enum(['AGREEMENT_RESPONSE', 'SESSION_OUTCOME', 'CONSENT', 'FINANCE']),
    title: z.string(),
    section: z.enum(['agreement', 'agenda', 'patients', 'finance']),
    focusId: z.string(),
    dueAt: nullableIsoDateTime,
  }).strict()),
  appointments: z.object({ today: z.array(sessionSchema), upcoming: z.array(sessionSchema) }).strict(),
  patientsRequiringAdministrativeAttention: z.array(z.object({
    clinicPatientId: z.string(),
    displayName: z.string(),
    consentStatus: z.enum(['PENDING', 'GRANTED', 'REVOKED']),
  }).strict()),
  financialUpdates: z.array(z.object({
    id: z.string(),
    status: z.string(),
    currency: z.string(),
    closedBaseCents: z.number().int(),
  }).strict()),
  operationalContact: coordinationSchema,
  clinicalContentAvailable: z.literal(false),
}).strict();

const agreementSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: z.string(),
  relationship: z.enum(['SELF_EMPLOYED_COLLABORATOR', 'EMPLOYEE']),
  share: z.object({
    method: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.number().int().nullable(),
    currency: z.string().nullable(),
  }).strict(),
  settlementCondition: z.enum(['SESSION_COMPLETED', 'PATIENT_COLLECTION']),
  validFrom: isoDateTime,
  validUntil: nullableIsoDateTime,
  scope: z.object({
    type: z.string(),
    service: z.object({ id: z.string(), name: z.string() }).strict().nullable(),
    label: z.literal('Excepción por paciente').nullable(),
  }).strict(),
  response: z.object({
    decision: z.enum(['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED']),
    reason: z.string().nullable(),
    respondedAt: isoDateTime,
  }).strict().nullable(),
  explanation: z.object({
    formula: z.string(),
    collectionRecipient: z.literal('CLINIC'),
    patientInvoiceIssuer: z.literal('CLINIC'),
  }).strict(),
  createdAt: isoDateTime,
}).strict();

export type ProfessionalClinicContext = z.infer<typeof contextSchema>;
export type ProfessionalClinicAccess = z.infer<typeof accessSchema>;
export type ProfessionalClinicPatient = z.infer<typeof patientSchema>;
export type ProfessionalClinicSession = z.infer<typeof sessionSchema>;
export type ProfessionalClinicSessionPage = z.infer<typeof sessionPageSchema>;
export type ProfessionalClinicWorkspaceHome = z.infer<typeof homeSchema>;
export type ProfessionalClinicInformation = z.infer<typeof informationSchema>;
export type ProfessionalClinicAgreement = z.infer<typeof agreementSchema>;
export type ProfessionalClinicWorkspaceSection = 'home' | 'agenda' | 'patients' | 'agreement' | 'finance' | 'info';

const errorMessages: Partial<Record<string, string>> = {
  CLINIC_PROFESSIONAL_ACCESS_DENIED: 'Ya no tienes acceso a esta clínica.',
  CLINIC_PROFESSIONAL_RESOURCE_NOT_FOUND: 'Ya no tienes acceso a este recurso.',
  CLINIC_PROFESSIONAL_ACTION_CONFLICT: 'La información cambió. Actualiza la vista e inténtalo de nuevo.',
  CLINIC_PROFESSIONAL_SCHEDULE_CONFLICT: 'Ese horario ya no está disponible.',
  CLINIC_PROFESSIONAL_VIDEO_UNAVAILABLE: 'La videollamada no está disponible en este momento.',
};

const messageFor = (error: unknown, fallback: string): string => {
  const code = getErrorCode(error);
  return (code && errorMessages[code]) || getErrorMessage(error, fallback);
};

const parse = <T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> => schema.parse(payload);
const parseEnvelopeData = <T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> => {
  const envelope = apiEnvelope(z.unknown()).parse(payload);
  return schema.parse(envelope.data);
};
const scopeFor = (userId: string, clinicId?: string): string =>
  clinicId ? `professional-clinic:${userId}:${clinicId}` : `professional-clinic:${userId}`;

export const createProfessionalClinicCommandKey = (): string => Crypto.randomUUID();

export const getProfessionalClinicContexts = async (
  userId: string,
  force = false,
): Promise<ProfessionalClinicContext[]> => {
  const cacheKey = 'contexts';
  const scope = scopeFor(userId);
  if (force) invalidateRequestCache(cacheKey, { scope });
  try {
    return await cachedGet(cacheKey, async () => {
      const response = await api.get('/clinics/specialist/me');
      return parse(apiEnvelope(z.array(contextSchema)), response.data).data;
    }, { scope, ttlMs: 30_000 });
  } catch (error: unknown) {
    throw new Error(messageFor(error, 'No se pudieron cargar tus clínicas.'));
  }
};

export const getProfessionalClinicAccess = async (
  userId: string,
  force = false,
): Promise<ProfessionalClinicAccess> => {
  const cacheKey = 'access';
  const scope = scopeFor(userId);
  if (force) invalidateRequestCache(cacheKey, { scope });
  try {
    return await cachedGet(cacheKey, async () => {
      const response = await api.get('/clinics/specialist/access');
      return parseEnvelopeData(accessSchema, response.data);
    }, { scope, ttlMs: 30_000 });
  } catch (error: unknown) {
    throw new Error(messageFor(error, 'No se pudo comprobar tu acceso a clínicas.'));
  }
};

const cachedClinicGet = async <T extends z.ZodType>(
  userId: string,
  clinicId: string,
  key: string,
  url: string,
  schema: T,
  force = false,
): Promise<z.infer<T>> => {
  const scope = scopeFor(userId, clinicId);
  if (force) invalidateRequestCache(key, { scope });
  return cachedGet(key, async () => {
    const response = await api.get(url);
    return parseEnvelopeData(schema, response.data);
  }, { scope, ttlMs: 10_000 });
};

export const getWorkspaceHome = (
  userId: string,
  clinicId: string,
  force = false,
): Promise<ProfessionalClinicWorkspaceHome> => cachedClinicGet(
  userId,
  clinicId,
  'home',
  `/clinics/${clinicId}/specialist/workspace`,
  homeSchema,
  force,
);

export const getClinicInformation = (
  userId: string,
  clinicId: string,
  force = false,
): Promise<ProfessionalClinicInformation> => cachedClinicGet(
  userId,
  clinicId,
  'information',
  `/clinics/${clinicId}/specialist/information`,
  informationSchema,
  force,
);

export const listClinicPatients = async (
  userId: string,
  clinicId: string,
  filters: { search?: string; page?: number; limit?: number } = {},
) => {
  const response = await api.get(`/clinics/${clinicId}/specialist/patients`, { params: filters });
  return parse(apiEnvelope(z.object({
    items: z.array(patientSchema),
    pageInfo: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      hasMore: z.boolean(),
      nextPage: z.number().int().nullable(),
    }).strict(),
  }).strict()), response.data).data;
};

export const getClinicPatient = async (clinicId: string, clinicPatientId: string) => {
  const response = await api.get(`/clinics/${clinicId}/specialist/patients/${clinicPatientId}`);
  return parse(apiEnvelope(patientSchema), response.data).data;
};

export const listClinicSessions = async (
  clinicId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    clinicPatientId?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<ProfessionalClinicSessionPage> => {
  const response = await api.get(`/clinics/${clinicId}/specialist/sessions`, { params: filters });
  return parse(apiEnvelope(sessionPageSchema), response.data).data;
};

export const getClinicSession = async (
  clinicId: string,
  sessionId: string,
): Promise<ProfessionalClinicSession> => {
  const response = await api.get(`/clinics/${clinicId}/specialist/sessions/${sessionId}`);
  return parse(apiEnvelope(sessionSchema), response.data).data;
};

export const actOnClinicSession = async (
  clinicId: string,
  sessionId: string,
  payload:
    | { action: 'CONFIRM' | 'COMPLETE' | 'MARK_PATIENT_NO_SHOW'; expectedUpdatedAt: string }
    | { action: 'CANCEL'; expectedUpdatedAt: string; reasonCode: string },
): Promise<ProfessionalClinicSession> => {
  const response = await api.post(
    `/clinics/${clinicId}/specialist/sessions/${sessionId}/actions`,
    payload,
    { headers: { 'Idempotency-Key': createProfessionalClinicCommandKey() } },
  );
  return parse(apiEnvelope(sessionSchema), response.data).data;
};

export const rescheduleClinicSession = async (
  clinicId: string,
  sessionId: string,
  payload: { startsAt: string; expectedUpdatedAt: string },
): Promise<ProfessionalClinicSession> => {
  const response = await api.patch(
    `/clinics/${clinicId}/specialist/sessions/${sessionId}/schedule`,
    payload,
    { headers: { 'Idempotency-Key': createProfessionalClinicCommandKey() } },
  );
  return parse(apiEnvelope(sessionSchema), response.data).data;
};

export const getClinicMeetingLink = async (clinicId: string, sessionId: string) => {
  const response = await api.get(`/clinics/${clinicId}/specialist/sessions/${sessionId}/meeting-link`);
  return parse(apiEnvelope(z.object({ meetingLink: z.url(), availableUntil: isoDateTime }).strict()), response.data).data;
};

export const listClinicAgreements = async (clinicId: string): Promise<ProfessionalClinicAgreement[]> => {
  const response = await api.get(`/clinics/${clinicId}/specialist/agreements`);
  return parse(apiEnvelope(z.object({ items: z.array(agreementSchema) }).strict()), response.data).data.items;
};

export const respondToClinicAgreement = async (
  clinicId: string,
  agreementVersionId: string,
  payload: {
    decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED';
    reason?: string;
    expectedVersion: number;
  },
) => {
  const response = await api.post(
    `/clinics/${clinicId}/specialist/agreements/${agreementVersionId}/responses`,
    payload,
    { headers: { 'Idempotency-Key': createProfessionalClinicCommandKey() } },
  );
  return parse(apiEnvelope(z.object({
    decision: z.enum(['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED']),
    reason: z.string().nullable(),
    respondedAt: isoDateTime,
  }).strict()), response.data).data;
};
