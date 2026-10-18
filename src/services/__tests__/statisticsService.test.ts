import { api } from '../api';
import { getStatistics, statisticsSchema } from '../statisticsService';
jest.mock('../api', () => ({ api: { get: jest.fn() } }));

it('passes the single selected period to the API and rejects malformed aggregates', async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { current: { income: 50 } } } });
  await expect(getStatistics({ period: 'month', year: 2026, month: 10 })).rejects.toThrow('No se pudieron interpretar las estadísticas');
  expect(api.get).toHaveBeenCalledWith('/dashboard/statistics', { params: { period: 'month', year: 2026, month: 10 } });
});

it('does not accept patient records or silently replace failures with zeroes', async () => {
  expect(statisticsSchema.safeParse({ patients: [{ name: 'Private', id: 'patient' }] }).success).toBe(false);
  jest.mocked(api.get).mockRejectedValueOnce(new Error('Sin conexión'));
  await expect(getStatistics({ period: 'year', year: 2026 })).rejects.toThrow();
});
