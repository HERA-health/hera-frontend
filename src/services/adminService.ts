import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
export type InsuranceReviewStatus = 'NOT_UPLOADED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SpecialistAdminCertificate {
  id: string;
  name: string;
  issuer: string;
  validUntil: string | null;
  hasDocument: boolean;
  documentUploadedAt: string | null;
  mimeType: string | null;
}

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
  insuranceUploaded: boolean;
  insuranceReviewStatus: InsuranceReviewStatus;
  insuranceReviewedAt: string | null;
  insuranceRejectedReason: string | null;
  certificates: SpecialistAdminCertificate[];
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

const openBlobDocument = async (blobData: BlobPart, mimeType: string): Promise<void> => {
  const blob = new Blob([blobData], { type: mimeType || 'application/octet-stream' });

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const reader = new FileReader();
  reader.onloadend = async () => {
    const dataUrl = reader.result as string;
    await WebBrowser.openBrowserAsync(dataUrl);
  };
  reader.readAsDataURL(blob);
};

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

export const openSpecialistInsuranceDocument = async (specialistId: string): Promise<void> => {
  const response = await api.get(`/admin/specialists/${specialistId}/insurance/document`, {
    responseType: 'blob',
    timeout: 30000,
  });

  const mimeType =
    typeof response.headers['content-type'] === 'string'
      ? response.headers['content-type']
      : 'application/pdf';

  await openBlobDocument(response.data, mimeType);
};

export const openSpecialistCertificateDocument = async (
  specialistId: string,
  certificateId: string,
  mimeType?: string | null
): Promise<void> => {
  const response = await api.get(
    `/admin/specialists/${specialistId}/certificates/${certificateId}/document`,
    {
      responseType: 'blob',
      timeout: 30000,
    }
  );

  const contentType =
    typeof response.headers['content-type'] === 'string'
      ? response.headers['content-type']
      : mimeType || 'application/octet-stream';

  await openBlobDocument(response.data, contentType);
};

export const reviewSpecialistInsuranceDocument = async (
  specialistId: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string | null
): Promise<void> => {
  await api.post(`/admin/specialists/${specialistId}/insurance/review`, {
    status,
    rejectionReason,
  });
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

export const blockSpecialistForLegalRetention = async (
  specialistId: string
): Promise<void> => {
  await api.delete(`/admin/specialists/${specialistId}/delete`, {
    data: { confirmDelete: true },
  });
};

export const deleteSpecialist = blockSpecialistForLegalRetention;
