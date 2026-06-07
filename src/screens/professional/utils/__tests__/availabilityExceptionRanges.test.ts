import type { AvailabilityException } from '../../../../services/availabilityService';
import {
  groupAvailabilityExceptionPeriods,
  sortAvailabilityExceptionPeriodsForSidebar,
} from '../availabilityExceptionRanges';

const createException = (
  id: string,
  date: string,
  reason: string | null,
  isAvailable = false
): AvailabilityException => ({
  id,
  specialistId: 'specialist-1',
  date,
  reason,
  isAvailable,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
});

describe('availabilityExceptionRanges', () => {
  it('groups consecutive unavailable exceptions with display and delete reasons', () => {
    const periods = groupAvailabilityExceptionPeriods([
      createException('exception-1', '2026-06-09T00:00:00.000Z', 'Vacaciones'),
      createException('exception-2', '2026-06-10T00:00:00.000Z', 'Vacaciones'),
      createException('exception-3', '2026-06-11T00:00:00.000Z', 'Conferencia'),
      createException('exception-4', '2026-06-12T00:00:00.000Z', 'Vacaciones', true),
    ]);

    expect(periods).toHaveLength(2);
    expect(periods[0]).toEqual(expect.objectContaining({
      dayCount: 2,
      deleteReason: 'Vacaciones',
      displayReason: 'Vacaciones',
      endDate: '2026-06-10',
      startDate: '2026-06-09',
    }));
    expect(periods[1]).toEqual(expect.objectContaining({
      dayCount: 1,
      deleteReason: 'Conferencia',
      displayReason: 'Conferencia',
      endDate: '2026-06-11',
      startDate: '2026-06-11',
    }));
  });

  it('keeps null reasons deletable without losing a readable label', () => {
    const periods = groupAvailabilityExceptionPeriods([
      createException('exception-1', '2026-06-09T00:00:00.000Z', null),
      createException('exception-2', '2026-06-10T00:00:00.000Z', null),
    ]);

    expect(periods).toHaveLength(1);
    expect(periods[0]).toEqual(expect.objectContaining({
      dayCount: 2,
      deleteReason: null,
      displayReason: 'No disponible',
      endDate: '2026-06-10',
      startDate: '2026-06-09',
    }));
  });

  it('preserves legacy reason spacing for exact range deletion', () => {
    const periods = groupAvailabilityExceptionPeriods([
      createException('exception-1', '2026-06-09T00:00:00.000Z', ' Conferencia '),
      createException('exception-2', '2026-06-10T00:00:00.000Z', ' Conferencia '),
    ]);

    expect(periods).toHaveLength(1);
    expect(periods[0]).toEqual(expect.objectContaining({
      dayCount: 2,
      deleteReason: ' Conferencia ',
      displayReason: ' Conferencia ',
      endDate: '2026-06-10',
      startDate: '2026-06-09',
    }));
  });

  it('sorts current and future periods before past periods for the sidebar', () => {
    const periods = groupAvailabilityExceptionPeriods([
      createException('past-old', '2026-04-01T00:00:00.000Z', 'Vacaciones'),
      createException('future', '2026-06-10T00:00:00.000Z', 'Vacaciones'),
      createException('current-1', '2026-06-05T00:00:00.000Z', 'Baja'),
      createException('current-2', '2026-06-06T00:00:00.000Z', 'Baja'),
      createException('past-recent', '2026-05-20T00:00:00.000Z', 'Personal'),
    ]);

    const sortedPeriods = sortAvailabilityExceptionPeriodsForSidebar(periods, '2026-06-06');

    expect(sortedPeriods.map((period) => period.id)).toEqual([
      '2026-06-05_2026-06-06_Baja',
      '2026-06-10_2026-06-10_Vacaciones',
      '2026-05-20_2026-05-20_Personal',
      '2026-04-01_2026-04-01_Vacaciones',
    ]);
  });
});
