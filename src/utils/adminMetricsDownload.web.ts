import type { MetricsResponse } from '../services/adminMetricsTypes';
import { metricsCsv } from './adminMetricsFormat';
export const metricsDownloadSupported = true;
export function downloadMetrics(data: MetricsResponse): void {
  const url = URL.createObjectURL(new Blob([metricsCsv(data)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `hera-${data.section}-${data.range.from}-${data.range.to}.csv`;
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
