import type { MetricsResponse } from '../services/adminMetricsTypes';
export const metricsDownloadSupported = false;
export function downloadMetrics(_data: MetricsResponse): void {
  throw new Error('La exportación está disponible en la versión web.');
}
