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
  getExceptionRangeImpact,
  removeExceptionRange,
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
