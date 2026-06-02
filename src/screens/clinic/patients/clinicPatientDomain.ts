import { z } from 'zod';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';
import type {
  ClinicPatientAssignmentFilter,
  ClinicPatientDetail,
  ClinicPatientListPageInfo,
  ClinicPatientPayload,
  ClinicPatientStatusFilter,
  ClinicPatientSummary,
} from '../../../services/clinicService';

export interface ClinicPatientForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingFullName: string;
  billingTaxId: string;
  billingAddress: string;
  billingPostalCode: string;
  billingCity: string;
  billingCountry: string;
}

export type ClinicPatientField = keyof ClinicPatientForm;
export type ClinicPatientErrors = Partial<Record<ClinicPatientField, string>>;
export type PanelMode = 'detail' | 'create' | 'edit';
export type AssignmentPanelMode = 'assign' | 'change' | null;

export type FeedbackMessage = {
  type: 'success' | 'error';
  text: string;
};

export interface PatientsLoadFilters {
  status: ClinicPatientStatusFilter;
  search: string;
  assignment: ClinicPatientAssignmentFilter;
  clinicSpecialistId?: string;
}

export interface AssignmentForm {
  clinicSpecialistId: string;
  reason: string;
}

export interface FieldConfig {
  key: ClinicPatientField;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  helperText?: string;
}

export const DEFAULT_CLINIC_BILLING_COUNTRY = 'España';
export const CLINIC_PATIENT_PAGE_LIMIT = 50;
export const CLINIC_ASSIGNMENT_HISTORY_PAGE_LIMIT = 20;

export const EMPTY_FORM: ClinicPatientForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  billingFullName: '',
  billingTaxId: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: DEFAULT_CLINIC_BILLING_COUNTRY,
};

export const EMPTY_ASSIGNMENT_FORM: AssignmentForm = {
  clinicSpecialistId: '',
  reason: '',
};

export const EMPTY_PATIENT_PAGE_INFO: ClinicPatientListPageInfo = {
  page: 1,
  limit: CLINIC_PATIENT_PAGE_LIMIT,
  hasMore: false,
  nextPage: null,
};

export const EMPTY_ASSIGNMENT_HISTORY_PAGE_INFO: ClinicPatientListPageInfo = {
  page: 1,
  limit: CLINIC_ASSIGNMENT_HISTORY_PAGE_LIMIT,
  hasMore: false,
  nextPage: null,
};

export const STATUS_FILTERS: Array<{
  value: ClinicPatientStatusFilter;
  label: string;
}> = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ALL', label: 'Todos' },
  { value: 'ARCHIVED', label: 'Archivados' },
];

export const ASSIGNMENT_FILTERS: Array<{
  value: ClinicPatientAssignmentFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ASSIGNED', label: 'Asignados' },
  { value: 'UNASSIGNED', label: 'Sin asignar' },
];

export const identityFields: FieldConfig[] = [
  {
    key: 'firstName',
    label: 'Nombre',
    placeholder: 'Lucía',
    autoCapitalize: 'words',
  },
  {
    key: 'lastName',
    label: 'Apellidos',
    placeholder: 'Martín García',
    autoCapitalize: 'words',
  },
  {
    key: 'email',
    label: 'Email administrativo',
    placeholder: 'lucia@example.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    placeholder: '+34 600 000 000',
    keyboardType: 'phone-pad',
  },
];

export const billingFields: FieldConfig[] = [
  {
    key: 'billingFullName',
    label: 'Nombre fiscal',
    placeholder: 'Lucía Martín García',
    autoCapitalize: 'words',
  },
  {
    key: 'billingTaxId',
    label: 'NIF/NIE/CIF',
    placeholder: '00000000T',
    autoCapitalize: 'characters',
  },
  {
    key: 'billingAddress',
    label: 'Dirección fiscal',
    placeholder: 'Calle Norte 1, 2A',
    autoCapitalize: 'sentences',
  },
  {
    key: 'billingPostalCode',
    label: 'Código postal',
    placeholder: '28001',
    autoCapitalize: 'characters',
  },
  {
    key: 'billingCity',
    label: 'Ciudad',
    placeholder: 'Madrid',
    autoCapitalize: 'words',
  },
  {
    key: 'billingCountry',
    label: 'País',
    placeholder: DEFAULT_CLINIC_BILLING_COUNTRY,
    autoCapitalize: 'words',
    helperText: `Por defecto usamos ${DEFAULT_CLINIC_BILLING_COUNTRY} para mantener coherencia fiscal con el mercado actual.`,
  },
];

const optionalTextString = (
  min: number,
  max: number,
  message: string,
) => z.string().trim().max(max, `Máximo ${max} caracteres`).refine((value) => {
  if (!value) return true;
  return value.length >= min;
}, message);

export const clinicPatientFormSchema = z.object({
  firstName: z.string().trim().min(2, 'Indica el nombre').max(120, 'Máximo 120 caracteres'),
  lastName: z.string().trim().min(2, 'Indica los apellidos').max(160, 'Máximo 160 caracteres'),
  email: z.string().trim().max(180, 'Máximo 180 caracteres'),
  phone: optionalTextString(4, 40, 'Introduce un teléfono válido'),
  billingFullName: optionalTextString(3, 160, 'Introduce el nombre fiscal completo'),
  billingTaxId: optionalTextString(3, 40, 'Introduce un identificador fiscal válido'),
  billingAddress: optionalTextString(3, 240, 'Introduce una dirección fiscal válida'),
  billingPostalCode: optionalTextString(2, 20, 'Introduce un código postal válido'),
  billingCity: optionalTextString(2, 120, 'Introduce una ciudad válida'),
  billingCountry: optionalTextString(2, 80, 'Introduce un país válido'),
}).superRefine((form, context) => {
  if (!form.email && !form.phone) {
    context.addIssue({
      code: 'custom',
      path: ['email'],
      message: CONTACT_METHOD_REQUIRED_MESSAGE,
    });
  }

  if (form.email && !z.string().email().safeParse(form.email).success) {
    context.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Introduce un email válido',
    });
  }
});

export const getEmptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const hasPatientDetail = (
  patient: ClinicPatientSummary | ClinicPatientDetail | null,
): patient is ClinicPatientDetail =>
  Boolean(patient && 'billingFullName' in patient);

export const mapPatientToForm = (
  patient: ClinicPatientDetail,
): ClinicPatientForm => ({
  firstName: patient.firstName ?? '',
  lastName: patient.lastName ?? '',
  email: patient.email ?? '',
  phone: patient.phone ?? '',
  billingFullName: patient.billingFullName ?? '',
  billingTaxId: patient.billingTaxId ?? '',
  billingAddress: patient.billingAddress ?? '',
  billingPostalCode: patient.billingPostalCode ?? '',
  billingCity: patient.billingCity ?? '',
  billingCountry: patient.billingCountry ?? DEFAULT_CLINIC_BILLING_COUNTRY,
});

export const mapFormToPayload = (form: ClinicPatientForm): ClinicPatientPayload => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  email: getEmptyToNull(form.email),
  phone: getEmptyToNull(form.phone),
  billingFullName: getEmptyToNull(form.billingFullName),
  billingTaxId: getEmptyToNull(form.billingTaxId),
  billingAddress: getEmptyToNull(form.billingAddress),
  billingPostalCode: getEmptyToNull(form.billingPostalCode),
  billingCity: getEmptyToNull(form.billingCity),
  billingCountry: getEmptyToNull(form.billingCountry) ?? DEFAULT_CLINIC_BILLING_COUNTRY,
});

export const toPatientSummary = (patient: ClinicPatientDetail): ClinicPatientSummary => ({
  id: patient.id,
  status: patient.status,
  displayName: patient.displayName,
  firstName: patient.firstName,
  lastName: patient.lastName,
  email: patient.email,
  phone: patient.phone,
  billingDataComplete: patient.billingDataComplete,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
  archivedAt: patient.archivedAt,
  activeAssignment: patient.activeAssignment,
});

export const mergeSummaryIntoDetail = (
  detail: ClinicPatientDetail,
  summary: ClinicPatientSummary,
): ClinicPatientDetail => ({
  ...detail,
  ...summary,
});

export const mergePatientSummaries = (
  currentPatients: ClinicPatientSummary[],
  nextPatients: ClinicPatientSummary[],
): ClinicPatientSummary[] => {
  const byId = new Map(currentPatients.map((patient) => [patient.id, patient]));
  nextPatients.forEach((patient) => {
    byId.set(patient.id, patient);
  });
  return Array.from(byId.values());
};

export const createErrorFeedback = (
  error: unknown,
  fallbackText: string,
): FeedbackMessage => ({
  type: 'error',
  text: error instanceof Error ? error.message : fallbackText,
});

export const createSuccessFeedback = (text: string): FeedbackMessage => ({
  type: 'success',
  text,
});

export const getValidationErrors = (
  error: z.ZodError<ClinicPatientForm>,
): ClinicPatientErrors => {
  const nextErrors: ClinicPatientErrors = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === 'string' && field in EMPTY_FORM) {
      nextErrors[field as ClinicPatientField] = issue.message;
    }
  });

  return nextErrors;
};

export const formatDate = (value: string | null): string => {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatDateTime = (value: string | null): string => {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const getPatientSubtitle = (patient: ClinicPatientSummary): string =>
  patient.email ?? patient.phone ?? 'Paciente administrativo de clínica';

export const getAssignmentSubtitle = (patient: ClinicPatientSummary): string =>
  patient.activeAssignment
    ? `Responsable: ${patient.activeAssignment.clinicSpecialistDisplayName}`
    : 'Sin responsable asignado';
