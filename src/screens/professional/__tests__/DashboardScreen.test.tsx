import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { DashboardScreen } from '../DashboardScreen';
import { getStatistics, StatisticsData } from '../../../services/statisticsService';
import { integerChartAxis } from '../../../components/professional/statistics/StatisticsCharts';
import { notifyProfessionalHomeChanged } from '../../../services/dashboardService';

it('uses distinct integer ticks that cover small, fractional and negative monetary values', () => {
  for (const values of [[0, 50], [0, .3], [-25.5, 50.2], [0, 0], [1, 2]]) {
    const axis = integerChartAxis(values);
    expect(axis.min).toBeLessThanOrEqual(Math.min(0, ...values));
    expect(axis.max).toBeGreaterThanOrEqual(Math.max(...values));
    expect(axis.ticks.every(Number.isInteger)).toBe(true);
    expect(new Set(axis.ticks).size).toBe(axis.ticks.length);
  }
  expect(integerChartAxis([0, 50]).ticks).toEqual([0, 20, 40, 60]);
});

jest.mock('@react-navigation/native', () => ({ useFocusEffect: (effect: () => void | (() => void)) => {
  const ReactModule = jest.requireActual<typeof React>('react'); ReactModule.useEffect(effect, [effect]);
} }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../components/common/alert', () => ({ useAppAlertState: () => ({ isVisible: false }) }));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({ useProfessionalTourAutoStart: jest.fn(), useProfessionalTourStepPreparation: jest.fn() }));
jest.mock('../../../components/onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../../components/onboarding/useProfessionalTourScrollPreparation', () => ({ useProfessionalTourScrollPreparation: () => ({ scrollRef: { current: null }, scrollProps: {}, prepareTarget: jest.fn() }) }));
jest.mock('../../../hooks/useGeneralRateLimit', () => ({ useFocusedRateLimitRecovery: jest.fn() }));
jest.mock('../../../hooks/useBillingRefresh', () => ({ useBillingRefresh: jest.fn() }));
jest.mock('../../../services/dashboardService', () => {
  const listeners = new Set<() => void>();
  return {
    subscribeProfessionalHomeChanges: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notifyProfessionalHomeChanged: () => listeners.forEach(listener => listener()),
  };
});
jest.mock('../../../services/statisticsService', () => ({ getStatistics: jest.fn() }));

const fixture: StatisticsData = {
  period: { period: 'month', year: 2026, month: 10, timeZone: 'Europe/Madrid', start: '2026-09-30T22:00:00Z', end: '2026-10-31T23:00:00Z',
    previousStart: '2026-08-31T22:00:00Z', previousEnd: '2026-09-30T22:00:00Z', inProgress: true, generatedAt: '2026-10-18T12:00:00Z', currentYear: 2026 },
  current: { income: 1240, completed: 18, newPatients: 6, activePatients: 24 },
  previous: { income: 1000, completed: 15, newPatients: 4, activePatients: 22 },
  series: [{ key: '2026-10-01', income: 80, completed: 2, newPatients: 1, recurrentPatients: 1 }],
  origins: { directory: 2, own: 2, referrals: 1, other: 1 }, activity: { completed: 18, pending: 4, cancelled: 2, noShow: 1 },
  weekdays: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, count: day === 7 ? 2 : 0 })),
  reviews: { total: 0, average: 0, breakdown: [5, 4, 3, 2, 1].map(stars => ({ stars, count: 0 })) },
};
beforeEach(() => { jest.mocked(getStatistics).mockReset().mockResolvedValue(fixture); });

it('renders all planned blocks and preserves secondary information', async () => {
  const view = render(<DashboardScreen />);
  await waitFor(() => expect(view.getByText('Ingresos cobrados')).toBeTruthy());
  for (const label of ['Pacientes nuevos', 'Pacientes activos', 'Ingresos y sesiones', 'Origen de tus pacientes', 'Actividad de sesiones', 'Evolución de pacientes', 'Valoraciones', 'Sesiones por día', 'Domingo', 'No asistidas']) expect(view.getByText(label)).toBeTruthy();
  expect(view.getByText('Sin reseñas en este periodo.')).toBeTruthy();
  expect(view.getByText('↗ +24%')).toBeTruthy();
  fireEvent.press(view.getByLabelText('1 de octubre: 80,00 € cobrados · 2 sesiones completadas'));
  expect(view.getByText('1 de octubre · 80,00 € cobrados · 2 sesiones completadas')).toBeTruthy();
});

it('keeps filters available on failure and retries the selected period', async () => {
  jest.mocked(getStatistics).mockRejectedValueOnce(new Error('Sin conexión'));
  const view = render(<DashboardScreen />);
  await waitFor(() => expect(view.getByText('Sin conexión')).toBeTruthy());
  expect(view.getByLabelText('Vista anual')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Reintentar estadísticas'));
  await waitFor(() => expect(view.getByText('Ingresos cobrados')).toBeTruthy());
  expect(getStatistics).toHaveBeenCalledTimes(2);
});

it('ignores a late response from the old filter and updates every block together', async () => {
  let resolveOld: (data: StatisticsData) => void = () => {};
  jest.mocked(getStatistics).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const year = { ...fixture, period: { ...fixture.period, period: 'year' as const }, current: { ...fixture.current, income: 555 }, reviews: { ...fixture.reviews, total: 1, average: 4 } };
  jest.mocked(getStatistics).mockResolvedValueOnce(year);
  const view = render(<DashboardScreen />);
  fireEvent.press(view.getByLabelText('Vista anual'));
  await waitFor(() => expect(view.getByText('555,00 €')).toBeTruthy());
  expect(getStatistics).toHaveBeenLastCalledWith(expect.objectContaining({ period: 'year' }));
  expect(view.getByText('1 reseña')).toBeTruthy();
  await act(async () => resolveOld(fixture));
  expect(view.getByText('555,00 €')).toBeTruthy();
  expect(view.queryByText('Sin reseñas en este periodo.')).toBeNull();
});

it('refreshes the selected period after workspace changes and unsubscribes on unmount', async () => {
  const view = render(<DashboardScreen />);
  await waitFor(() => expect(view.getByText('Ingresos cobrados')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Vista anual'));
  await waitFor(() => expect(getStatistics).toHaveBeenCalledTimes(2));
  const selected = jest.mocked(getStatistics).mock.calls[1][0];
  jest.mocked(getStatistics).mockResolvedValueOnce({ ...fixture, current: { ...fixture.current, income: 777 } });
  await act(async () => { notifyProfessionalHomeChanged(); });
  await waitFor(() => expect(view.getByText('777,00 €')).toBeTruthy());
  expect(getStatistics).toHaveBeenLastCalledWith(selected);
  view.unmount();
  notifyProfessionalHomeChanged();
  expect(getStatistics).toHaveBeenCalledTimes(3);
});
