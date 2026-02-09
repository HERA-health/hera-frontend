import { api } from './api';

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
  };
}

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
