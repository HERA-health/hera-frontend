import { z } from 'zod';
import { getErrorMessage } from '../constants/errors';
import { api } from './api';

export const profileCompletionCodeSchema = z.enum([
  'PROFILE_IDENTITY',
  'PROFILE_BIO',
  'PROFILE_MATCHING',
  'PROFILE_MODALITY',
  'PROFILE_LOCATION',
  'PROFESSIONAL_VERIFICATION',
  'PROFESSIONAL_INSURANCE',
  'PROFESSIONAL_BILLING',
  'CLINIC_CONTACT',
  'CLINIC_BILLING',
]);

const profileCompletionItemSchema = z.object({
  code: profileCompletionCodeSchema,
  state: z.enum(['ACTION_REQUIRED', 'WAITING_REVIEW']),
  severity: z.enum(['WARNING', 'CRITICAL', 'INFO']),
});

const profileCompletionSnapshotSchema = z.object({
  role: z.enum(['PROFESSIONAL', 'CLINIC']),
  scopeId: z.string().min(1),
  items: z.array(profileCompletionItemSchema),
});

const profileCompletionResponseSchema = z.object({
  success: z.literal(true),
  data: profileCompletionSnapshotSchema,
});

export type ProfileCompletionCode = z.infer<typeof profileCompletionCodeSchema>;
export type ProfileCompletionItem = z.infer<typeof profileCompletionItemSchema>;
export type ProfileCompletionSnapshot = z.infer<typeof profileCompletionSnapshotSchema>;

const parseResponse = (value: unknown): ProfileCompletionSnapshot =>
  profileCompletionResponseSchema.parse(value).data;

export const getProfessionalCompletion = async (): Promise<ProfileCompletionSnapshot> => {
  try {
    const response = await api.get('/specialists/me/completion');
    return parseResponse(response.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo comprobar el estado del perfil'));
  }
};
export const getClinicCompletion = async (
  clinicId: string
): Promise<ProfileCompletionSnapshot> => {
  try {
    const response = await api.get(`/clinics/${clinicId}/completion`);
    return parseResponse(response.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo comprobar el estado de la clínica'));
  }
};
