jest.mock('../api', () => ({
  api: { get: jest.fn() },
}));

import { api } from '../api';
import { dashboardService } from '../dashboardService';
import { professionalSearchService } from '../professionalSearchService';

const mockedApi = api as jest.Mocked<typeof api>;

const homePayload = {
  generatedAt: '2026-08-02T22:30:00.000Z',
  timeZone: 'Europe/Madrid',
  nextSession: null,
  today: { date: '2026-08-03', bookedMinutes: 0, sessions: [] },
  week: {
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    totalSessions: 0,
    bookedMinutes: 0,
    completedSessions: 0,
    pendingSessions: 0,
    days: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 3).padStart(2, '0')}`,
      sessions: 0,
      bookedMinutes: 0,
    })),
  },
  availabilityConfiguredDays: 5,
  pendingRequests: { total: 0, items: [] },
  draftInvoices: 0,
  automation: {
    sessionConfirmation: true,
    invoiceGeneration: true,
    invoiceDelivery: true,
  },
};

describe('professional home and patient search contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService.clearProfessionalHomeCache();
  });

  it('validates and caches the minimal professional home DTO', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: homePayload } });

    await expect(dashboardService.getProfessionalHome()).resolves.toEqual(homePayload);
    await expect(dashboardService.getProfessionalHome()).resolves.toEqual(homePayload);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/dashboard/home');
  });

  it('rejects a home response that includes an invalid Madrid week shape', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { ...homePayload, week: { ...homePayload.week, days: [] } } },
    });

    await expect(dashboardService.getProfessionalHome({ force: true })).rejects.toThrow(
      'No se pudo cargar el inicio profesional',
    );
  });

  it('rejects unexpected patient fields in the Home DTO', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...homePayload,
          nextSession: {
            id: 'session-1',
            patient: { id: 'patient-1', displayName: 'Ana Ruiz', email: 'private@example.com' },
            startsAt: '2026-08-04T10:00:00.000Z',
            durationMinutes: 60,
            status: 'CONFIRMED',
            type: 'VIDEO_CALL',
            origin: 'PRIVATE',
            clinicName: null,
            inProgress: false,
            canJoinVideo: true,
          },
        },
      },
    });

    await expect(dashboardService.getProfessionalHome({ force: true })).rejects.toThrow(
      'No se pudo cargar el inicio profesional',
    );
  });

  it('does not send short patient queries and validates minimal results', async () => {
    await expect(professionalSearchService.searchPatients('a')).resolves.toEqual([]);
    expect(mockedApi.get).not.toHaveBeenCalled();

    mockedApi.get.mockResolvedValue({
      data: { success: true, data: [{ id: 'patient-1', displayName: 'Ana Ruiz', initials: 'AR' }] },
    });
    await expect(professionalSearchService.searchPatients('ana')).resolves.toEqual([
      { id: 'patient-1', displayName: 'Ana Ruiz', initials: 'AR' },
    ]);
    expect(mockedApi.get).toHaveBeenCalledWith('/clients/search', {
      params: { q: 'ana', limit: 8 },
    });
  });

  it('normalizes patient queries and rejects invalid limits before the request', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: [] } });

    await expect(professionalSearchService.searchPatients('  ana  ', 10)).resolves.toEqual([]);
    expect(mockedApi.get).toHaveBeenCalledWith('/clients/search', {
      params: { q: 'ana', limit: 10 },
    });

    mockedApi.get.mockClear();
    await expect(professionalSearchService.searchPatients('ana', 11)).resolves.toEqual([]);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });
});
