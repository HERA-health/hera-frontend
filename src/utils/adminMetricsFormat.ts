import type { MetricState, MetricUnit, MetricsResponse } from '../services/adminMetricsTypes';

export const metricStateLabels: Record<MetricState, string> = {
  available: 'Disponible', partial: 'Información incompleta', empty: 'Sin datos en el período', notApplicable: 'No hay datos para calcularlo',
  restricted: 'Acceso pendiente de habilitación', unavailable: 'Temporalmente no disponible',
};
export const metricUnitLabels: Record<MetricUnit, string> = { count: 'Recuento', percent: '%', days: 'días', hours: 'h', rating: '/ 5', eurCents: 'EUR · céntimos' };
export function formatMetric(value: string | null, unit: MetricUnit): string {
  if (value === null) return '—';
  if (unit === 'eurCents') {
    if (!/^-?\d+$/.test(value)) return '—';
    const cents = BigInt(value);
    const absolute = cents < BigInt(0) ? -cents : cents;
    return `${cents < BigInt(0) ? '−' : ''}${(absolute / BigInt(100)).toLocaleString('es-ES')},${String(absolute % BigInt(100)).padStart(2, '0')} €`;
  }
  if (unit === 'count' && /^-?\d+$/.test(value)) return BigInt(value).toLocaleString('es-ES');
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const formatted = number.toLocaleString('es-ES', { maximumFractionDigits: unit === 'count' ? 2 : 1 });
  return `${formatted}${unit === 'percent' ? ' %' : unit === 'days' ? ' días' : unit === 'hours' ? ' h' : unit === 'rating' ? ' / 5' : ''}`;
}
export function metricComparison(current: string | null, previous: string | null, unit: MetricUnit): string {
  if (current === null || previous === null) return 'Sin dato anterior';
  // A rate changes in percentage points, even when its stored value is an integer.
  if (unit === 'percent') {
    const difference = Number(current) - Number(previous);
    if (difference === 0) return 'Sin cambios';
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference).toLocaleString('es-ES', { maximumFractionDigits: 1 })} puntos porcentuales`;
  }
  if (/^-?\d+$/.test(current) && /^-?\d+$/.test(previous)) {
    const c = BigInt(current), p = BigInt(previous), difference = c - p;
    if (difference === BigInt(0)) return 'Sin cambios';
    const delta = `${difference > BigInt(0) ? '+' : ''}${formatMetric(String(difference), unit)}`;
    if (p <= BigInt(0)) return `${delta} · sin porcentaje comparable`;
    const percent = Number(difference * BigInt(1000) / p) / 10;
    return `${delta} (${percent > 0 ? '+' : ''}${percent.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %)`;
  }
  const delta = Number(current) - Number(previous);
  if (delta === 0) return 'Sin cambios';
  return `${delta > 0 ? '+' : ''}${formatMetric(String(delta), unit)}`;
}
export const formatMetricsDate = (iso: string): string => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
export const formatMetricsTime = (iso: string): string => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

export function formatMetricsAxis(iso: string, group: 'day' | 'week' | 'month'): string {
  if (group !== 'month') return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'Europe/Madrid' });
}

const csvCell = (value: string): string => {
  // Excel/Sheets formula injection: allow only known numeric literals to keep signed money usable.
  const trimmed = value.replace(/^[\s\u0000-\u001f]+/, '');
  const safe = /^[=+@-]/.test(trimmed) && !/^-?\d+(\.\d+)?$/.test(trimmed) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function metricsCsv(data: MetricsResponse): string {
  const rows: string[][] = [['sección', 'bloque', 'fila', 'indicador', 'valor', 'anterior', 'unidad', 'estado', 'desde', 'hasta', 'comparación_desde', 'comparación_hasta', 'zona', 'ámbito', 'operador', 'calculado', 'dato_antiguo', 'base_temporal', 'fuente', 'fórmula', 'limitación', 'nota', 'versión']];
  const add = (block: string, label: string, id: string, value: string | null, previous: string | null, state: MetricState, computedAt: string | null, stale: boolean, note = '') => {
    const definition = data.definitions.find(d => d.id === id);
    if (!definition) return;
    rows.push([data.section, block, label, definition.label, value ?? '', previous ?? '', metricUnitLabels[definition.unit], metricStateLabels[state], data.range.from, data.range.to,
      data.range.compare ? data.range.previousStart : '', data.range.compare ? data.range.previousEnd : '', data.timeZone, data.scope, data.range.operatorKey ?? 'Todos', computedAt ?? '', stale ? 'Sí' : 'No',
      definition.timeBasis, definition.source, definition.formula, definition.limitation, note, data.version]);
  };
  for (const kpi of data.kpis) add('Indicadores', '', kpi.definitionId, kpi.value, kpi.previous, kpi.state, kpi.computedAt, kpi.stale);
  for (const block of data.blocks) {
    if (!block.rows.length) for (const id of block.columns) add(block.title, '', id, null, null, block.state, block.computedAt, block.stale, block.note);
    for (const row of block.rows) block.columns.forEach((id, index) => add(block.title, row.label, id, row.values[index] ?? null, null, block.state, block.computedAt, block.stale, block.note));
  }
  return rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
