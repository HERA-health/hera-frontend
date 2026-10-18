import { z } from 'zod';
import { api } from './api';
import { getErrorMessage } from '../constants/errors';

export type StatisticsPeriod = { period: 'month'; year: number; month: number } | { period: 'year'; year: number };
const count = z.number().int().nonnegative();
const kpis = z.object({ income: z.number(), completed: count, newPatients: count, activePatients: count }).strict();
export const statisticsSchema = z.object({
  period: z.object({ period: z.enum(['month', 'year']), year: z.number().int(), month: z.number().int().min(1).max(12).optional(),
    timeZone: z.literal('Europe/Madrid'), start: z.iso.datetime(), end: z.iso.datetime(), previousStart: z.iso.datetime(), previousEnd: z.iso.datetime(),
    inProgress: z.boolean(), generatedAt: z.iso.datetime(), currentYear: z.number().int() }).strict(),
  current: kpis, previous: kpis,
  series: z.array(z.object({ key: z.string(), income: z.number(), completed: count, newPatients: count, recurrentPatients: count }).strict()),
  origins: z.object({ directory: count, own: count, referrals: count, other: count }).strict(),
  activity: z.object({ completed: count, pending: count, cancelled: count, noShow: count }).strict(),
  weekdays: z.array(z.object({ day: z.number().int().min(1).max(7), count }).strict()).length(7),
  reviews: z.object({ total: count, average: z.number().min(0).max(5), breakdown: z.array(z.object({ stars: z.number().int().min(1).max(5), count }).strict()).length(5) }).strict(),
}).strict();
export type StatisticsData = z.infer<typeof statisticsSchema>;

export async function getStatistics(period: StatisticsPeriod): Promise<StatisticsData> {
  try {
    const response = await api.get('/dashboard/statistics', { params: period });
    return statisticsSchema.parse(response.data.data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) throw new Error('No se pudieron interpretar las estadísticas. Vuelve a intentarlo.');
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las estadísticas'));
  }
}
