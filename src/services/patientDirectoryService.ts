import { z } from 'zod';
import { api } from './api';
import { cachedGet } from './requestCache';

export const patientActivitySchema = z.object({ activePatients: z.number().int().nonnegative().nullable(), windowDays: z.number().int(),
  cutoff: z.string().nullable(), computedAt: z.string().nullable(), stale: z.boolean(), unavailable: z.boolean(), restricted: z.boolean().optional() });
export type PatientActivitySummary = z.infer<typeof patientActivitySchema>;
export type ActivityFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'NO_SESSIONS';
export interface DirectoryFilters {
  page?: number; limit?: number; q?: string; archive?: 'OPEN' | 'ARCHIVED' | 'ALL'; activity?: ActivityFilter;
  source?: 'REGISTERED' | 'MANAGED' | 'ALL'; provenance?: 'DIRECTORY' | 'OWN' | 'UNDETERMINED' | 'ALL';
}
const patientSchema = z.object({
  id: z.string(), userId: z.string().nullable(), source: z.enum(['REGISTERED', 'MANAGED']),
  firstName: z.string().nullable(), lastName: z.string().nullable(), createdAt: z.string(),
  displayName: z.string(), primaryEmail: z.string().nullable(), primaryPhone: z.string().nullable(), initials: z.string(),
  archivedAt: z.string().nullable(), treatmentConsentStatus: z.enum(['PENDING', 'GRANTED', 'REVOKED']),
  sessionCount: z.number().int(), nextSessionDate: z.string().nullable(), lastValidSessionAt: z.string().nullable(),
  activity: z.enum(['ACTIVE', 'INACTIVE', 'NO_SESSIONS']), heraOrigin: z.object({ origin: z.string() }),
  user: z.object({ id: z.string().nullable(), name: z.string(), email: z.string(), phone: z.string(), avatar: z.string().nullable(), userType: z.string() }),
});
export const directorySchema = z.object({ items: z.array(patientSchema),
  pageInfo: z.object({ page: z.number().int(), limit: z.number().int(), hasMore: z.boolean(), nextPage: z.number().int().nullable() }), computedAt: z.string() });
export type DirectoryPatient = z.infer<typeof patientSchema>;
export async function getPatientDirectory(filters: DirectoryFilters = {}, signal?: AbortSignal) {
  const response = await api.get('/clients/directory', { params: filters, signal });
  return directorySchema.parse(response.data.data);
}
export const getPatientActivity = (force = false) => cachedGet('professional:patient-activity', async () => {
  const response = await api.get('/clients/activity');
  return patientActivitySchema.parse(response.data.data);
}, { force });
export const activityLabels = { ACTIVE: 'Activo · últimos 60 días', INACTIVE: 'Inactivo', NO_SESSIONS: 'Sin primera sesión' };
