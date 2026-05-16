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
  getMyExceptions,
  getMyWeeklySchedule,
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
});
