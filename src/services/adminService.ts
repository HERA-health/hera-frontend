import { api } from './api';

// ============================================================================
// EXISTING TYPES (Verification)
// ============================================================================

export interface PendingSpecialist {
  id: string;
  colegiadoNumber: string | null;
  dniPhotoUrl: string | null;
  verificationStatus: string;
  verificationSubmittedAt: string | null;
  verificationResolvedAt: string | null;
  specialization: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

// ============================================================================
// NEW TYPES (Specialist Management)
// ============================================================================

export type VerificationStatusType = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AccountStatusType = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface SpecialistListItem {
  id: string;
  specialization: string;
  verificationStatus: VerificationStatusType;
  createdAt: string;
  sessionCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    accountStatus: AccountStatusType;
    createdAt: string;
  };
}

export interface SpecialistListParams {
  page?: number;
  limit?: number;
  verificationStatus?: VerificationStatusType;
  accountStatus?: AccountStatusType;
  search?: string;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  specialists: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SpecialistFullDetail {
  id: string;
  specialization: string;
  description: string;
  pricePerSession: number;
  rating: number;
  reviewCount: number;
  professionalTitle: string | null;
  licenseNumber: string | null;
  colegiadoNumber: string | null;
  dniPhotoUrl: string | null;
  verificationStatus: VerificationStatusType;
  verificationSubmittedAt: string | null;
  verificationResolvedAt: string | null;
  profileVisible: boolean;
  offersOnline: boolean;
  offersInPerson: boolean;
  officeCity: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    accountStatus: AccountStatusType;
    suspensionReason: string | null;
    deletedAt: string | null;
    createdAt: string;
    emailVerified: boolean;
  };
  sessionStats: {
    total: number;
    completed: number;
    cancelled: number;
    upcoming: number;
  };
}

// ============================================================================
// EXISTING FUNCTIONS (Verification)
// ============================================================================

export const getPendingSpecialists = async (): Promise<PendingSpecialist[]> => {
  const response = await api.get('/admin/specialists/pending');
  return response.data.success ? response.data.data : [];
};

export const resolveVerification = async (
  specialistId: string,
  status: 'VERIFIED' | 'REJECTED'
): Promise<void> => {
  await api.post(`/admin/specialists/${specialistId}/verify`, { status });
};

// ============================================================================
// NEW FUNCTIONS (Specialist Management)
// ============================================================================

export const getSpecialists = async (
  params: SpecialistListParams = {}
): Promise<PaginatedResponse<SpecialistListItem>> => {
  const response = await api.get('/admin/specialists', { params });
  return response.data.data;
};

export const getSpecialistDetail = async (
  specialistId: string
): Promise<SpecialistFullDetail> => {
  const response = await api.get(`/admin/specialists/${specialistId}`);
  return response.data.data;
};

export const suspendSpecialist = async (
  specialistId: string,
  reason: string
): Promise<void> => {
  await api.post(`/admin/specialists/${specialistId}/suspend`, { reason });
};

export const reactivateSpecialist = async (
  specialistId: string
): Promise<void> => {
  await api.post(`/admin/specialists/${specialistId}/reactivate`);
};

export const deleteSpecialist = async (
  specialistId: string
): Promise<void> => {
  await api.delete(`/admin/specialists/${specialistId}/delete`, {
    data: { confirmDelete: true },
  });
};
