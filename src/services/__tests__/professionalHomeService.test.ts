jest.mock('../api', () => ({
  api: { get: jest.fn() },
}));

import { api } from '../api';
import { dashboardService } from '../dashboardService';
import { getSpecialistContactSummary } from '../specialistContactService';
import { professionalSearchService } from '../professionalSearchService';

const mockedApi = api as jest.Mocked<typeof api>;

const homeSessionPayload = {
  id: 'session-1',
  patient: { id: 'patient-1', displayName: 'Ana Ruiz' },
  startsAt: '2026-08-04T10:00:00.000Z',
  durationMinutes: 60,
  status: 'CONFIRMED',
  type: 'VIDEO_CALL',
  origin: 'PRIVATE',
  clinicName: null,
  inProgress: false,
  canJoinVideo: true,
};

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

  it('coalesces 31 simultaneous forced Home refreshes into one HTTP request', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: homePayload } });
    const results = await Promise.all(Array.from({ length: 31 }, () => dashboardService.getProfessionalHome({ force: true })));
    expect(results).toHaveLength(31);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent support reads without caching a stale summary', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { unreadHelpRequests: 1 } } });
    await Promise.all(Array.from({ length: 31 }, () => getSpecialistContactSummary()));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    mockedApi.get.mockResolvedValue({ data: { data: { unreadHelpRequests: 2 } } });
    await expect(getSpecialistContactSummary()).resolves.toEqual({ unreadHelpRequests: 2 });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
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

  it.each([
    { origin: 'PRIVATE', serviceName: 'Terapia General', clinicName: null },
    { origin: 'CLINIC', serviceName: 'Terapia de pareja', clinicName: 'Clínica de prueba' },
    { origin: 'PRIVATE', serviceName: null, clinicName: null },
  ])('preserves the booked service in the Home DTO: $origin / $serviceName', async (service) => {
    const session = { ...homeSessionPayload, ...service };
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { ...homePayload, nextSession: session } },
    });

    const home = await dashboardService.getProfessionalHome();
    expect(home.nextSession).toEqual(session);
  });

  it('accepts older Home responses without a service name without inventing one', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { ...homePayload, nextSession: homeSessionPayload } },
    });

    const home = await dashboardService.getProfessionalHome();
    expect(home.nextSession?.serviceName).toBeNull();
  });

  it.each([42, '   '])('rejects an invalid service name: %p', async (serviceName) => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { ...homePayload, nextSession: { ...homeSessionPayload, serviceName } } },
    });

    await expect(dashboardService.getProfessionalHome()).rejects.toThrow(
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
