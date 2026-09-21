import { z } from 'zod';
import type { MetricsFilters } from '../services/adminMetricsTypes';
import { getMadridDateKey } from './madridTime';

export const dashboardDefaultFilters: MetricsFilters = { preset: '30d', compare: 'true' };
const filterSchema = z.object({
  preset: z.enum(['7d', '30d', 'month', '12m', 'custom']), compare: z.enum(['true', 'false']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  group: z.enum(['day', 'week', 'month']).optional(), operatorKey: z.string().min(1).max(100).optional(),
}).strict();

const validDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const addDays = (value: string, days: number): string => new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const previousYear = (value: string): string => {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 12);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return `${date.toISOString().slice(0, 7)}-${String(Math.min(Number(value.slice(8)), lastDay)).padStart(2, '0')}`;
};

// Mirrors the server calendar contract, not a rolling 366-day approximation.
export function validateDashboardFilters(filters: MetricsFilters, today = getMadridDateKey()): string | null {
  if (!filterSchema.safeParse(filters).success) return 'Revisa los filtros del dashboard.';
  if (filters.preset !== 'custom') {
    if (filters.from || filters.to) return 'Las fechas requieren un intervalo personalizado.';
    return filters.preset === '12m' && filters.group === 'day' ? 'Para más de 90 días, agrupa por semana o mes.' : null;
  }
  const { from, to } = filters;
  if (!from || !to) return 'Indica ambas fechas.';
  if (!validDate(from) || !validDate(to)) return 'Introduce una fecha válida.';
  if (from > to || to > today || from < previousYear(addDays(to, 1))) {
    return 'El intervalo debe estar ordenado, no ser futuro y abarcar como máximo 12 meses.';
  }
  if (filters.group === 'day' && (Date.parse(to) - Date.parse(from)) / 86400000 >= 90) return 'Para más de 90 días, agrupa por semana o mes.';
  return null;
}

export function dashboardMaxRangeDays(from: string): number {
  if (!validDate(from)) return 365;
  return from >= previousYear(addDays(from, 366)) ? 366 : 365;
}
export function parseDashboardFilters(value: string): MetricsFilters {
  try {
    const parsed = filterSchema.safeParse(JSON.parse(value));
    // Keep a readable link intact: the screen uses validateDashboardFilters and
    // offers correction before requesting data, rather than changing its dates.
    if (parsed.success) return parsed.data;
  } catch { /* A malformed deep link opens the documented default view. */ }
  return dashboardDefaultFilters;
}
export const serializeDashboardFilters = (value: MetricsFilters): string => JSON.stringify(value);
