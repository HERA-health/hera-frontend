import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AdminDashboardScreen, dashboardDefaultFilters } from '../AdminDashboardScreen';
import { getAdminMetrics } from '../../../services/adminMetricsService';
import type { MetricsResponse } from '../../../services/adminMetricsTypes';
import { metricsCsv } from '../../../utils/adminMetricsFormat';
import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import { SchedulerDateRangeSelector } from '../../../components/scheduling/SchedulerDateRangeSelector';

jest.mock('../../../services/adminMetricsService', () => ({ getAdminMetrics: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('react-native-gifted-charts', () => ({ LineChart: () => null }));
jest.mock('react-native-calendars', () => {
  const { Text } = require('react-native');
  return { Calendar: ({ onDayPress, testID }: { onDayPress: (day: { dateString: string }) => void; testID: string }) =>
    <Text testID={testID} onPress={() => onDayPress({ dateString: testID.includes('start') ? '2026-08-05' : '2026-08-20' })}>Calendario de prueba</Text> };
});
const read = jest.mocked(getAdminMetrics);
const fixture = (section: MetricsResponse['section'], value: string): MetricsResponse => ({
  version: '1', section, enabled: true, timeZone: 'Europe/Madrid', scope: 'Individual', mode: 'LIVE', generatedAt: '2026-09-20T12:00:00Z',
  range: { from: '2026-08-01', to: '2026-08-31', start: '2026-07-31T22:00:00Z', end: '2026-08-31T22:00:00Z', previousStart: '2026-06-30T22:00:00Z', previousEnd: '2026-07-31T22:00:00Z', group: 'day', compare: true, partial: false, preset: '30d', now: '2026-09-20T12:00:00Z' },
  definitions: [{ id: 'signups', label: 'Nuevos especialistas', unit: 'count', source: 'Specialist', formula: 'Altas', timeBasis: 'period', limitation: 'Datos conservados' }],
  kpis: [{ definitionId: 'signups', value, previous: '1', state: 'available', computedAt: '2026-09-20T12:00:00Z', stale: false }], blocks: [], operators: [],
});
beforeEach(() => { read.mockReset(); });

test('invalid ranges never request metrics and can be corrected', async () => {
  const filters = { preset: 'custom' as const, compare: 'true' as const, from: '2025-09-20', to: '2026-09-20', group: 'month' as const };
  const onChange = jest.fn();
  const screen = render(<AdminDashboardScreen section="overview" filters={filters} onChange={onChange} onNavigate={jest.fn()} />);
  await screen.findByText('Corregir intervalo');
  expect(read).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Corregir intervalo'));
  fireEvent.press(screen.getByText('Aplicar intervalo'));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent(screen.UNSAFE_getByType(SchedulerDateRangeSelector), 'onChange', { startDate: '2025-09-21', endDate: '2026-09-20' });
  fireEvent.press(screen.getByText('Aplicar intervalo'));
  expect(onChange).toHaveBeenCalledWith('overview', expect.objectContaining({ from: '2025-09-21', to: '2026-09-20' }));
});

test('server validation errors offer filter correction instead of network retry', async () => {
  read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'VALIDATION_ERROR', message: 'El intervalo debe estar ordenado, no ser futuro y abarcar como máximo 12 meses.' } } });
  const screen = render(<AdminDashboardScreen section="overview" filters={dashboardDefaultFilters} onChange={jest.fn()} onNavigate={jest.fn()} />);
  await screen.findByText('Corregir intervalo');
  expect(screen.queryByText('Reintentar')).toBeNull();
  expect(screen.queryByText(/Revisa la conexión/)).toBeNull();
});
test('grouping preserves the selected period and daily stays disabled for long ranges while loading', async () => {
  const response = fixture('overview', '7');
  response.range.group = 'month';
  read.mockResolvedValue(response);
  const onChange = jest.fn();
  const filters = { ...dashboardDefaultFilters, preset: '12m' as const, group: 'month' as const };
  const screen = render(<AdminDashboardScreen section="overview" filters={filters} onChange={onChange} onNavigate={jest.fn()} />);
  expect(screen.getByLabelText('Agrupar por día').props.accessibilityState.disabled).toBe(true);
  await screen.findByText('7');
  fireEvent.press(screen.getByLabelText('Agrupar por día'));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Agrupar por semana'));
  expect(onChange).toHaveBeenCalledWith('overview', { ...filters, group: 'week' });
  screen.rerender(<AdminDashboardScreen section="overview" filters={{ ...filters, preset: '7d', group: 'day' }} onChange={onChange} onNavigate={jest.fn()} />);
  expect(screen.getByLabelText('Agrupar por día').props.accessibilityState.disabled).toBe(false);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
});
test('custom range selects calendar dates and only applies them on confirmation', async () => {
  read.mockResolvedValue(fixture('overview', '7'));
  const onChange = jest.fn();
  const screen = render(<AdminDashboardScreen section="overview" filters={dashboardDefaultFilters} onChange={onChange} onNavigate={jest.fn()} />);
  await screen.findByText('7');
  fireEvent(screen.UNSAFE_getAllByType(SimpleDropdown)[0], 'onSelect', 'custom');
  expect(screen.queryByLabelText('Fecha desde, año-mes-día')).toBeNull();
  fireEvent.press(screen.getByLabelText('Seleccionar fecha desde'));
  fireEvent.press(screen.getByTestId('metrics-range-start-calendar'));
  fireEvent.press(screen.getByLabelText('Seleccionar fecha hasta'));
  fireEvent.press(screen.getByTestId('metrics-range-end-calendar'));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Aplicar intervalo'));
  expect(onChange).toHaveBeenCalledWith('overview', expect.objectContaining({ preset: 'custom', from: '2026-08-05', to: '2026-08-20', group: 'day' }));
});
test('only requests the active section and ignores late responses after changing filters', async () => {
  let resolveFirst: (response: MetricsResponse) => void = () => { throw new Error('not initialized'); };
  read.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
  read.mockResolvedValueOnce(fixture('growth', '22'));
  const props = { filters: dashboardDefaultFilters, onChange: jest.fn(), onNavigate: jest.fn() };
  const screen = render(<AdminDashboardScreen {...props} section="overview" />);
  expect(read).toHaveBeenCalledTimes(1);
  screen.rerender(<AdminDashboardScreen {...props} section="growth" />);
  await waitFor(() => expect(screen.getByText('22')).toBeTruthy());
  await act(async () => { resolveFirst(fixture('overview', '99')); });
  expect(screen.queryByText('99')).toBeNull();
  expect(read.mock.calls[0][2]?.aborted).toBe(true);
  expect(read).toHaveBeenCalledTimes(2);
});
test('retry recovers from a timeout and metric definition is accessible', async () => {
  read.mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout' }).mockResolvedValueOnce(fixture('overview', '7'));
  const screen = render(<AdminDashboardScreen section="overview" filters={dashboardDefaultFilters} onChange={jest.fn()} onNavigate={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('Reintentar')).toBeTruthy());
  fireEvent.press(screen.getByText('Reintentar'));
  await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Definición: Nuevos especialistas'));
  expect(screen.getByText('Cómo se calcula')).toBeTruthy();
  expect(screen.getByText('Altas')).toBeTruthy();
});

test('weekday table and CSV preserve absent weekdays as null and real zeros as zero', async () => {
  const response = fixture('growth', '0');
  response.definitions.push({ id: 'weekdayMean', label: 'Media diaria', unit: 'count', source: 'Specialist', formula: 'Altas / apariciones', timeBasis: 'period', limitation: 'Días incluidos' });
  response.blocks = [{ id: 'signupsWeekday', title: 'Altas por día de la semana', kind: 'table', columns: ['signups', 'weekdayMean'], state: 'partial', computedAt: response.generatedAt, stale: false,
    note: '— indica que ese día de la semana no está incluido en el intervalo.', rows: [{ label: 'Lunes', values: ['0', '0'] }, { label: 'Martes', values: ['0', null] }] }];
  read.mockResolvedValue(response);
  const screen = render(<AdminDashboardScreen section="growth" filters={dashboardDefaultFilters} onChange={jest.fn()} onNavigate={jest.fn()} />);
  await screen.findByText('Martes');
  expect(screen.getByText('—')).toBeTruthy();
  expect(screen.getByText(response.blocks[0].note)).toBeTruthy();
  const csv = metricsCsv(response).split('\r\n');
  expect(csv.find(row => row.includes('"Martes";"Media diaria"'))).toContain(';"";"";"Recuento";');
  expect(csv.find(row => row.includes('"Lunes";"Media diaria"'))).toContain(';"0";"";"Recuento";');
});

test('comparison presentation uses previous duration and hides it when comparison is disabled', async () => {
  const response = fixture('operations', '4');
  response.definitions = [{ id: 'responseMedian', label: 'Primera respuesta', unit: 'hours', source: 'Support', formula: 'Mediana', timeBasis: 'period', limitation: '' }];
  response.kpis = [{ ...response.kpis[0], definitionId: 'responseMedian', previous: '8' }];
  read.mockResolvedValueOnce(response).mockResolvedValueOnce({ ...response, range: { ...response.range, compare: false }, kpis: [{ ...response.kpis[0], previous: null }] });
  const props = { section: 'operations' as const, onChange: jest.fn(), onNavigate: jest.fn() };
  const screen = render(<AdminDashboardScreen {...props} filters={dashboardDefaultFilters} />);
  await screen.findByText('Anterior: 8 h');
  expect(screen.getByText(/50 %/)).toBeTruthy();
  screen.rerender(<AdminDashboardScreen {...props} filters={{ ...dashboardDefaultFilters, compare: 'false' }} />);
  await screen.findByText('4 h');
  expect(screen.queryByText('Anterior: 8 h')).toBeNull();
});
test('disabled rollout shows an explicit state without pretending to have zero data', async () => {
  read.mockResolvedValue({ ...fixture('overview', '0'), enabled: false, kpis: [] });
  const screen = render(<AdminDashboardScreen section="overview" filters={dashboardDefaultFilters} onChange={jest.fn()} onNavigate={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('Dashboard pendiente de activación')).toBeTruthy());
  expect(screen.queryByText('0')).toBeNull();
});

test('attendance bands render as counts and suppressed cells stay blank in CSV', async () => {
  const response = fixture('demand', '7');
  const labels = ['1 sesión', '2 sesiones', '3–5 sesiones', '6–10 sesiones', 'Más de 10 sesiones'];
  const ids = ['sessions1', 'sessions2', 'sessions3to5', 'sessions6to10', 'sessions11plus'];
  response.definitions.push(...ids.map((id, index) => ({ id, label: labels[index], unit: 'count' as const, source: 'Session', formula: 'Personas por mes', timeBasis: 'period' as const, limitation: 'Grupos pequeños ocultos' })));
  response.blocks = [{ id: 'sessionDistribution', title: 'Personas por número de asistencias', kind: 'table', state: 'partial', columns: ids, rows: [
    { label: '2026-05', values: ['5', '5', '5', '5', '5'] }, { label: '2026-06', values: [null, null, null, null, null] },
  ], computedAt: response.generatedAt, stale: false, note: 'Meses completos' }];
  read.mockResolvedValue(response);
  const screen = render(<AdminDashboardScreen section="demand" filters={dashboardDefaultFilters} onChange={jest.fn()} onNavigate={jest.fn()} />);
  await screen.findByText('Personas por número de asistencias');
  expect(screen.getAllByText('5')).toHaveLength(5);
  expect(screen.getAllByText('—')).toHaveLength(5);
  fireEvent.press(screen.getByLabelText('Definición: Personas por número de asistencias'));
  expect(screen.getByText('Cómo se calcula')).toBeTruthy();
  const suppressed = metricsCsv(response).split('\r\n').filter(line => line.includes('"2026-06"'));
  expect(suppressed).toHaveLength(5);
  expect(suppressed.every(line => line.includes(';"";"";"Recuento";"Información incompleta";'))).toBe(true);
});
