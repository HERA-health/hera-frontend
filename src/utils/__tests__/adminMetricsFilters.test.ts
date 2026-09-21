import { dashboardDefaultFilters, validateDashboardFilters, dashboardMaxRangeDays, parseDashboardFilters } from '../adminMetricsFilters';
import type { MetricsFilters } from '../../services/adminMetricsTypes';
import cases from './fixtures/adminMetricsRanges.json';

test.each(cases)('calendar contract: $from to $to / $group', ({ from, to, group, valid }) => {
  if (group !== 'day' && group !== 'week' && group !== 'month') throw new Error('Invalid fixture');
  expect(validateDashboardFilters({ preset: 'custom', compare: 'true', from, to, group }, '2026-12-01') === null).toBe(valid);
});

test('calendar maximum follows the backend month-clamping rule', () => {
  expect(dashboardMaxRangeDays('2025-09-20')).toBe(365);
  expect(dashboardMaxRangeDays('2023-03-01')).toBe(366);
  expect(dashboardMaxRangeDays('2024-02-29')).toBe(365);
});

test('readable links retain invalid dates for correction without silently changing the interval', () => {
  const filters: MetricsFilters = { preset: 'custom', compare: 'true', from: '2025-09-20', to: '2026-09-20', group: 'month' };
  expect(parseDashboardFilters(JSON.stringify(filters))).toEqual(filters);
  expect(validateDashboardFilters(parseDashboardFilters(JSON.stringify(filters)), '2026-12-01')).not.toBeNull();
  expect(parseDashboardFilters(JSON.stringify({ ...filters, from: '2025-09-21' }))).toEqual({ ...filters, from: '2025-09-21' });
  expect(parseDashboardFilters('not JSON')).toEqual(dashboardDefaultFilters);
});
