export type MetricsSection = 'overview' | 'growth' | 'demand' | 'agenda' | 'economy' | 'operations';
export type MetricUnit = 'count' | 'percent' | 'days' | 'hours' | 'rating' | 'eurCents';
export type MetricState = 'available' | 'partial' | 'empty' | 'notApplicable' | 'restricted' | 'unavailable';
export interface MetricsFilters {
  preset: '7d' | '30d' | 'month' | '12m' | 'custom'; from?: string; to?: string;
  group?: 'day' | 'week' | 'month'; compare: 'true' | 'false'; operatorKey?: string;
}
export interface MetricsRange {
  from: string; to: string; start: string; end: string; previousStart: string; previousEnd: string;
  group: 'day' | 'week' | 'month'; compare: boolean; partial: boolean;
  preset: MetricsFilters['preset']; operatorKey?: string; now: string;
}
export interface MetricDefinition {
  id: string; label: string; unit: MetricUnit; source: string; formula: string;
  timeBasis: 'period' | 'now' | 'cohort'; limitation: string;
}
export interface MetricValue {
  definitionId: string; value: string | null; previous: string | null; state: MetricState; computedAt: string | null; stale: boolean;
}
export interface MetricsBlock {
  id: string; title: string; kind: 'line' | 'bar' | 'table' | 'attention'; state: MetricState;
  columns: string[]; rows: { label: string; values: (string | null)[]; destination?: 'verifications' | 'help' | 'commissions' | 'feedback' }[];
  note: string; computedAt: string | null; stale: boolean;
}
export interface MetricsResponse {
  version: string; section: MetricsSection; enabled: boolean; timeZone: string; scope: string; range: MetricsRange;
  generatedAt: string; mode: 'OFF' | 'SIMULATION' | 'LIVE'; kpis: MetricValue[]; blocks: MetricsBlock[];
  definitions: MetricDefinition[]; operators: { key: string; label: string }[];
}
