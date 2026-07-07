jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { api } from '../api';
import {
  addExceptionRange,
  getMyExceptions,
  getMyWeeklySchedule,
  getMyWeeklyScheduleSnapshot,
  getExceptionRangeImpact,
  removeExceptionRange,
  updateWeeklySchedule,
  type WeeklySchedule,
} from '../availabilityService';

const mockedApi = api as jest.Mocked<typeof api>;

const emptyWeeklySchedule: WeeklySchedule = {
  friday: null,
  monday: null,
  saturday: null,
  sunday: null,
  thursday: null,
  tuesday: null,
  wednesday: null,
};

describe('availabilityService private professional reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the authenticated professional schedule through the private endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: emptyWeeklySchedule,
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).resolves.toEqual(emptyWeeklySchedule);

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/availability/schedule/me');
  });

  it('normalizes legacy single-range schedules from the private endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: {
            ...emptyWeeklySchedule,
            monday: { start: '08:00', end: '14:00' },
          },
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).resolves.toEqual({
      ...emptyWeeklySchedule,
      monday: [{ start: '08:00', end: '14:00' }],
    });
  });

  it('accepts canonical v2 multi-range schedules from the private endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: {
            ...emptyWeeklySchedule,
            monday: [
              { start: '08:00', end: '14:00' },
              { start: '16:00', end: '20:00' },
            ],
          },
          scheduleVersion: 2,
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).resolves.toEqual({
      ...emptyWeeklySchedule,
      monday: [
        { start: '08:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    });
  });

  it('loads a v2 weekly schedule snapshot with revision', async () => {
    const schedule = {
      ...emptyWeeklySchedule,
      monday: [
        { start: '08:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    };
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule,
          scheduleRevision: 'rev-current',
          scheduleVersion: 2,
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklyScheduleSnapshot()).resolves.toEqual({
      schedule,
      scheduleRevision: 'rev-current',
    });
  });

  it('keeps snapshot reads compatible with legacy schedule payloads', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: emptyWeeklySchedule,
      },
    });

    await expect(getMyWeeklyScheduleSnapshot()).resolves.toEqual({
      schedule: emptyWeeklySchedule,
      scheduleRevision: null,
    });
  });

  it('fails with a controlled error when the schedule payload is invalid', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: {
            ...emptyWeeklySchedule,
            monday: { start: '08:15', end: '14:00' },
          },
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).rejects.toThrow('Formato de disponibilidad no válido');
  });

  it('fails with a controlled error when schedule ranges exceed the weekly bounds', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: {
            ...emptyWeeklySchedule,
            monday: [{ start: '06:30', end: '08:00' }],
          },
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).rejects.toThrow('Formato de disponibilidad no válido');
  });

  it('fails with a controlled error when schedule ranges overlap or are unordered', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          schedule: {
            ...emptyWeeklySchedule,
            monday: [
              { start: '10:00', end: '12:00' },
              { start: '09:00', end: '10:00' },
            ],
          },
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyWeeklySchedule()).rejects.toThrow('Formato de disponibilidad no válido');
  });

  it('updates the weekly schedule with the current revision and returns the new snapshot', async () => {
    const schedule = {
      ...emptyWeeklySchedule,
      monday: [
        { start: '08:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    };
    mockedApi.put.mockResolvedValue({
      data: {
        data: {
          schedule,
          scheduleRevision: 'rev-next',
          scheduleVersion: 2,
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(updateWeeklySchedule(schedule, 'rev-current')).resolves.toEqual({
      schedule,
      scheduleRevision: 'rev-next',
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/availability/schedule', {
      schedule,
      scheduleRevision: 'rev-current',
    });
  });

  it('loads authenticated professional exceptions through the private endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          exceptions: [],
          specialistId: 'specialist-1',
        },
      },
    });

    await expect(getMyExceptions('2026-05-01', '2026-05-31')).resolves.toEqual([]);

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/availability/exceptions/me?startDate=2026-05-01&endDate=2026-05-31',
    );
  });

  it('loads exception range impact through the protected range endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          activeSessionCount: 2,
        },
      },
    });

    await expect(getExceptionRangeImpact('2026-06-09', '2026-06-16')).resolves.toEqual({
      activeSessionCount: 2,
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/availability/exceptions/range-impact?startDate=2026-06-09&endDate=2026-06-16',
    );
  });

  it('creates an exception range with a typed absence reason', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          activeSessionCount: 0,
          createdCount: 8,
          dayCount: 8,
          endDate: '2026-06-16',
          reason: 'Formación',
          startDate: '2026-06-09',
          updatedCount: 0,
        },
      },
    });

    await expect(addExceptionRange('2026-06-09', '2026-06-16', 'Formación')).resolves.toEqual({
      activeSessionCount: 0,
      createdCount: 8,
      dayCount: 8,
      endDate: '2026-06-16',
      reason: 'Formación',
      startDate: '2026-06-09',
      updatedCount: 0,
    });

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/availability/exceptions/range', {
      endDate: '2026-06-16',
      reason: 'Formación',
      startDate: '2026-06-09',
    });
  });

  it('removes an exception range through a DELETE request body', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        data: {
          deletedCount: 8,
        },
      },
    });

    await expect(removeExceptionRange('2026-06-09', '2026-06-16', 'Vacaciones')).resolves.toEqual({
      deletedCount: 8,
    });

    expect(mockedApi.delete).toHaveBeenCalledTimes(1);
    expect(mockedApi.delete).toHaveBeenCalledWith('/availability/exceptions/range', {
      data: {
        endDate: '2026-06-16',
        reason: 'Vacaciones',
        startDate: '2026-06-09',
      },
    });
  });

  it('removes a legacy exception range label through the range endpoint', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        data: {
          deletedCount: 2,
        },
      },
    });

    await expect(removeExceptionRange('2026-06-09', '2026-06-10', 'Conferencia')).resolves.toEqual({
      deletedCount: 2,
    });

    expect(mockedApi.delete).toHaveBeenCalledTimes(1);
    expect(mockedApi.delete).toHaveBeenCalledWith('/availability/exceptions/range', {
      data: {
        endDate: '2026-06-10',
        reason: 'Conferencia',
        startDate: '2026-06-09',
      },
    });
  });

  it('keeps legacy exception range labels with spaces in the DELETE request body', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        data: {
          deletedCount: 2,
        },
      },
    });

    await expect(removeExceptionRange('2026-06-09', '2026-06-10', ' Conferencia ')).resolves.toEqual({
      deletedCount: 2,
    });

    expect(mockedApi.delete).toHaveBeenCalledTimes(1);
    expect(mockedApi.delete).toHaveBeenCalledWith('/availability/exceptions/range', {
      data: {
        endDate: '2026-06-10',
        reason: ' Conferencia ',
        startDate: '2026-06-09',
      },
    });
  });

  it('removes an exception range without a stored reason', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        data: {
          deletedCount: 1,
        },
      },
    });

    await expect(removeExceptionRange('2026-06-09', '2026-06-09', null)).resolves.toEqual({
      deletedCount: 1,
    });

    expect(mockedApi.delete).toHaveBeenCalledTimes(1);
    expect(mockedApi.delete).toHaveBeenCalledWith('/availability/exceptions/range', {
      data: {
        endDate: '2026-06-09',
        reason: null,
        startDate: '2026-06-09',
      },
    });
  });
});
