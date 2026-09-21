import { api } from './api';
import type { MetricsFilters, MetricsResponse, MetricsSection } from './adminMetricsTypes';

export const getAdminMetrics = async (section: MetricsSection, filters: MetricsFilters, signal?: AbortSignal): Promise<MetricsResponse> => {
  const params = { ...filters, operatorKey: section === 'economy' ? filters.operatorKey : undefined };
  const response = await api.get<{ success: true; data: MetricsResponse }>(section === 'overview' ? '/admin/metrics/overview' : `/admin/metrics/sections/${section}`, {
    params, signal, timeout: 15000,
  });
  return response.data.data;
};
