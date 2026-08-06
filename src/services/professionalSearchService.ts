import { z } from 'zod';
import { api } from './api';
import { getErrorMessage } from '../constants/errors';

const resultSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  initials: z.string().min(1).max(2),
}).strict();

const responseSchema = z.array(resultSchema).max(10);
const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.number().int().min(1).max(10),
}).strict();

export type ProfessionalPatientSearchResult = z.infer<typeof resultSchema>;

export const professionalSearchService = {
  async searchPatients(query: string, limit = 8): Promise<ProfessionalPatientSearchResult[]> {
    const parsedQuery = querySchema.safeParse({ q: query, limit });
    if (!parsedQuery.success) return [];

    try {
      const response = await api.get('/clients/search', {
        params: parsedQuery.data,
      });
      return responseSchema.parse(response.data.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('No se pudo buscar pacientes');
      }
      throw new Error(getErrorMessage(error, 'No se pudo buscar pacientes'));
    }
  },
};
