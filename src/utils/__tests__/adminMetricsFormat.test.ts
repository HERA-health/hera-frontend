import { formatMetric, metricComparison, metricsCsv } from '../adminMetricsFormat';
import type { MetricsResponse } from '../../services/adminMetricsTypes';
import { dashboardDefaultFilters, parseDashboardFilters, serializeDashboardFilters } from '../adminMetricsFilters';

export const metricFixture = (): MetricsResponse => ({
  version: '1', section: 'overview', enabled: true, timeZone: 'Europe/Madrid', scope: 'Agenda individual · economía HERA LIVE',
  range: { from: '2026-08-01', to: '2026-08-31', start: '2026-07-31T22:00:00Z', end: '2026-08-31T22:00:00Z', previousStart: '2026-06-30T22:00:00Z', previousEnd: '2026-07-31T22:00:00Z', group: 'day', compare: true, partial: false, preset: 'custom', now: '2026-09-20T12:00:00Z' },
  generatedAt: '2026-09-20T12:00:00Z', mode: 'LIVE', operators: [],
  definitions: [{ id: 'cash', label: 'Cobros', unit: 'eurCents', source: 'Libro de caja', formula: 'Suma firmada', timeBasis: 'period', limitation: 'No es conciliación bancaria.' }],
  kpis: [{ definitionId: 'cash', value: '-200', previous: '100', state: 'available', computedAt: '2026-09-20T12:00:00Z', stale: false }],
  blocks: [{ id: 'cashSeries', title: 'Caja', kind: 'table', columns: ['cash'], state: 'partial', note: 'Cobertura parcial', computedAt: '2026-09-20T12:00:00Z', stale: true, rows: [{ label: '=HYPERLINK("bad")', values: [null] }, { label: 'Real', values: ['-100'] }] }],
});
test('formats money exactly beyond the safe integer range and keeps signed cents', () => {
  expect(formatMetric('9007199254740993123', 'eurCents')).toBe('90.071.992.547.409.931,23 €');
  expect(formatMetric('-1', 'eurCents')).toBe('−0,01 €');
  expect(formatMetric('0', 'eurCents')).toBe('0,00 €');
  expect(formatMetric(null, 'count')).toBe('—');
  expect(formatMetric('50.50', 'percent')).toBe('50,5 %');
});
test('zero and negative comparison bases never produce infinite growth', () => {
  expect(metricComparison('100', '0', 'count')).toContain('sin porcentaje comparable');
  expect(metricComparison('200', '-100', 'eurCents')).toContain('sin porcentaje comparable');
  expect(metricComparison('300', '200', 'count')).toContain('+50 %');
});

test('comparisons distinguish unchanged values, missing data and percentage points', () => {
  expect(metricComparison('1', '1', 'count')).toBe('Sin cambios');
  expect(metricComparison('0', '0', 'count')).toBe('Sin cambios');
  expect(metricComparison('1', null, 'count')).toBe('Sin dato anterior');
  expect(metricComparison('50', '40', 'percent')).toBe('+10 puntos porcentuales');
  expect(metricComparison('40.5', '50', 'percent')).toBe('−9,5 puntos porcentuales');
  expect(metricComparison('9007199254740993124', '9007199254740993123', 'eurCents')).toContain('+0,01 €');
});
test('CSV preserves exact values, dates, definitions, null suppression and formula protection', () => {
  const csv = metricsCsv(metricFixture());
  expect(csv).toContain('"-200"');
  expect(csv).toContain('"-100"');
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('Europe/Madrid');
  expect(csv).toContain('Suma firmada');
  expect(csv).toContain('Cobertura parcial');
  expect(csv).toContain('"Sí"');
  expect(csv).not.toContain('undefined');
});

test('dashboard filters survive links and malformed links use the documented default', () => {
  const filters = { preset: 'custom' as const, compare: 'true' as const, from: '2026-08-01', to: '2026-08-31', group: 'week' as const, operatorKey: 'operator' };
  expect(parseDashboardFilters(serializeDashboardFilters(filters))).toEqual(filters);
  expect(parseDashboardFilters('{broken')).toEqual(dashboardDefaultFilters);
  expect(parseDashboardFilters('{"preset":"custom","compare":"true"}')).toEqual({ preset: 'custom', compare: 'true' });
});
