export type ClinicStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type ClinicMembershipRole = 'OWNER' | 'ADMIN' | 'SPECIALIST';
export type ClinicMembershipStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatus = 'ACTIVE' | 'INACTIVE';
export type ClinicSpecialistStatusFilter = ClinicSpecialistStatus | 'ALL';
export type ClinicPatientStatus = 'ACTIVE' | 'ARCHIVED';
export type ClinicPatientStatusFilter = ClinicPatientStatus | 'ALL';
export type ClinicPatientAssignmentFilter = 'ALL' | 'ASSIGNED' | 'UNASSIGNED';

export interface ClinicSummary {
  id: string;
  commercialName: string;
  legalName: string | null;
  status: ClinicStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDetail extends ClinicSummary {
  email: string | null;
  phone: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
  fiscalPostalCode: string | null;
  fiscalCity: string | null;
  fiscalCountry: string | null;
}

export interface ClinicMembershipSummary {
  id: string;
  role: ClinicMembershipRole;
  status: ClinicMembershipStatus;
  createdAt: string;
  updatedAt: string;
  clinic: ClinicSummary;
}

export type ClinicDashboardMetricKey =
  | 'activeSpecialists'
  | 'activePatients'
  | 'upcomingSessions'
  | 'pendingConsents';

export interface ClinicDashboardMetric {
  key: ClinicDashboardMetricKey;
  label: string;
  value: number | null;
  available: boolean;
  helperText: string;
}

export interface ClinicDashboard {
  clinic: ClinicSummary;
  metrics: ClinicDashboardMetric[];
}

export interface ClinicSpecialist {
  id: string;
  clinicId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  professionalTitle: string | null;
  licenseNumber: string | null;
  specialization: string | null;
  status: ClinicSpecialistStatus;
  baseSessionPrice: number | null;
  revenueSharePercentage: number | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  linkedProfessional: LinkedProfessional | null;
}

export interface LinkedProfessional {
  name: string;
  email: string;
  professionalTitle: string | null;
  specialization: string | null;
  verificationStatus: string;
  accountStatus: string;
}

export interface ClinicPatientAssignmentSummary {
  id: string;
  clinicSpecialistId: string;
  clinicSpecialistDisplayName: string;
  clinicSpecialistProfessionalTitle: string | null;
  clinicSpecialistStatus: ClinicSpecialistStatus;
  startedAt: string;
  reason: string | null;
}

export interface ClinicPatientSummary {
  id: string;
  status: ClinicPatientStatus;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  billingDataComplete: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  activeAssignment: ClinicPatientAssignmentSummary | null;
}

export interface ClinicPatientDetail extends ClinicPatientSummary {
  billingFullName: string | null;
  billingTaxId: string | null;
  billingAddress: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  billingCountry: string | null;
}

export interface UpdateClinicPayload {
  commercialName?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  fiscalAddress?: string | null;
  fiscalPostalCode?: string | null;
  fiscalCity?: string | null;
  fiscalCountry?: string | null;
}

export interface ClinicSpecialistPayload {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  professionalTitle?: string | null;
  licenseNumber?: string | null;
  specialization?: string | null;
  baseSessionPrice?: number | null;
  revenueSharePercentage?: number | null;
}

export type UpdateClinicSpecialistPayload = Partial<ClinicSpecialistPayload>;

export interface ClinicSpecialistListFilters {
  status?: ClinicSpecialistStatusFilter;
  search?: string;
}

export interface ClinicPatientPayload {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  billingFullName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  billingCountry?: string | null;
}

export type UpdateClinicPatientPayload = Partial<ClinicPatientPayload>;

export interface ClinicPatientListFilters {
  status?: ClinicPatientStatusFilter;
  search?: string;
  assignment?: ClinicPatientAssignmentFilter;
  clinicSpecialistId?: string;
  page?: number;
  limit?: number;
}

export interface ClinicPatientListPageInfo {
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage: number | null;
}

export interface ClinicPatientListPage {
  items: ClinicPatientSummary[];
  pageInfo: ClinicPatientListPageInfo;
}

export interface AssignClinicPatientPayload {
  clinicSpecialistId: string;
  reason?: string | null;
}

export interface CloseClinicPatientAssignmentPayload {
  endedReason?: string | null;
}

export interface LinkClinicSpecialistPayload {
  email: string;
}

export interface ProfessionalClinicContext {
  clinic: ClinicSummary;
  responsible: {
    displayName: string;
    professionalTitle: string | null;
  };
}

export interface ProfessionalClinicPatientAssignment {
  id: string;
  startedAt: string;
  reason: string | null;
}

export interface ProfessionalClinicPatientSummary {
  clinicPatientId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: ClinicPatientStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  clinic: {
    id: string;
    name: string;
  };
  responsible: {
    displayName: string;
    professionalTitle: string | null;
  };
  assignment: ProfessionalClinicPatientAssignment;
}

export type ProfessionalClinicPatientDetail = ProfessionalClinicPatientSummary;

export interface ProfessionalClinicPatientListFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProfessionalClinicPatientListPage {
  items: ProfessionalClinicPatientSummary[];
  pageInfo: ClinicPatientListPageInfo;
}
