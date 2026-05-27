import type { AxiosResponse } from 'axios';
import api from '../api';
import {
  createClinicSpecialist,
  getClinic,
  getClinicDashboard,
  listClinicSpecialists,
  getMyClinicMemberships,
  updateClinic,
  updateClinicSpecialist,
  updateClinicSpecialistStatus,
  type ClinicDashboard,
  type ClinicDetail,
  type ClinicMembershipSummary,
  type ClinicSpecialist,
} from '../clinicService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const getMock = api.get as jest.MockedFunction<typeof api.get>;
const postMock = api.post as jest.MockedFunction<typeof api.post>;
const patchMock = api.patch as jest.MockedFunction<typeof api.patch>;

describe('clinicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the minimal clinic membership DTO', async () => {
    const memberships: ClinicMembershipSummary[] = [
      {
        id: 'membership-1',
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: '2026-05-27T10:00:00.000Z',
        updatedAt: '2026-05-27T10:00:00.000Z',
        clinic: {
          id: 'clinic-1',
          commercialName: 'Clinica Demo',
          legalName: null,
          status: 'ACTIVE',
          createdAt: '2026-05-27T10:00:00.000Z',
          updatedAt: '2026-05-27T10:00:00.000Z',
        },
      },
    ];

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: memberships,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicMembershipSummary[] }>);

    await expect(getMyClinicMemberships()).resolves.toBe(memberships);
    expect(getMock).toHaveBeenCalledWith('/clinics/me');
  });

  it('loads editable clinic detail through the clinic endpoint', async () => {
    const clinic: ClinicDetail = {
      id: 'clinic-1',
      commercialName: 'Clinica Demo',
      legalName: 'Clinica Demo SL',
      email: 'admin@clinic.test',
      phone: null,
      taxId: 'B00000000',
      fiscalAddress: null,
      fiscalPostalCode: null,
      fiscalCity: 'Madrid',
      fiscalCountry: 'España',
      status: 'ACTIVE',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:00:00.000Z',
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: clinic,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicDetail }>);

    await expect(getClinic('clinic-1')).resolves.toBe(clinic);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1');
  });

  it('updates clinic data through a normalized service method', async () => {
    const clinic: ClinicDetail = {
      id: 'clinic-1',
      commercialName: 'Clinica Actualizada',
      legalName: null,
      email: null,
      phone: null,
      taxId: null,
      fiscalAddress: null,
      fiscalPostalCode: null,
      fiscalCity: null,
      fiscalCountry: null,
      status: 'ACTIVE',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:05:00.000Z',
    };
    const payload = {
      commercialName: 'Clinica Actualizada',
      email: null,
    };

    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: clinic,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicDetail }>);

    await expect(updateClinic('clinic-1', payload)).resolves.toBe(clinic);
    expect(patchMock).toHaveBeenCalledWith('/clinics/clinic-1', payload);
  });

  it('loads dashboard metrics without simulating unavailable modules', async () => {
    const dashboard: ClinicDashboard = {
      clinic: {
        id: 'clinic-1',
        commercialName: 'Clinica Demo',
        legalName: null,
        status: 'ACTIVE',
        createdAt: '2026-05-27T10:00:00.000Z',
        updatedAt: '2026-05-27T10:00:00.000Z',
      },
      metrics: [
        {
          key: 'activeSpecialists',
          label: 'Especialistas activos',
          value: 2,
          available: true,
          helperText: 'Conteo real',
        },
        {
          key: 'upcomingSessions',
          label: 'Sesiones próximas',
          value: null,
          available: false,
          helperText: 'No disponible todavía',
        },
      ],
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: dashboard,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicDashboard }>);

    await expect(getClinicDashboard('clinic-1')).resolves.toBe(dashboard);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/dashboard');
  });

  it('lists clinic specialists with normalized service filters', async () => {
    const specialists: ClinicSpecialist[] = [
      {
        id: 'clinic-specialist-1',
        clinicId: 'clinic-1',
        displayName: 'Dra. Ana Ruiz',
        email: 'ana@clinic.test',
        phone: null,
        professionalTitle: 'Psicóloga sanitaria',
        licenseNumber: null,
        specialization: 'Ansiedad',
        status: 'ACTIVE',
        baseSessionPrice: 60,
        revenueSharePercentage: 65,
        createdAt: '2026-05-27T10:00:00.000Z',
        updatedAt: '2026-05-27T10:00:00.000Z',
        deactivatedAt: null,
      },
    ];

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialists,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist[] }>);

    await expect(listClinicSpecialists('clinic-1', {
      status: 'ALL',
      search: 'ana',
    })).resolves.toBe(specialists);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/specialists', {
      params: {
        status: 'ALL',
        search: 'ana',
      },
    });
  });

  it('creates and updates clinic specialists through dedicated endpoints', async () => {
    const specialist: ClinicSpecialist = {
      id: 'clinic-specialist-1',
      clinicId: 'clinic-1',
      displayName: 'Dra. Ana Ruiz',
      email: null,
      phone: null,
      professionalTitle: null,
      licenseNumber: null,
      specialization: null,
      status: 'ACTIVE',
      baseSessionPrice: null,
      revenueSharePercentage: null,
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:00:00.000Z',
      deactivatedAt: null,
    };
    const payload = {
      displayName: 'Dra. Ana Ruiz',
      revenueSharePercentage: 60,
    };

    postMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialist,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist }>);
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialist,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist }>);

    await expect(createClinicSpecialist('clinic-1', payload)).resolves.toBe(specialist);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/specialists', payload);

    await expect(updateClinicSpecialist('clinic-1', 'clinic-specialist-1', payload)).resolves.toBe(specialist);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/specialists/clinic-specialist-1',
      payload,
    );
  });

  it('updates clinic specialist status through the status endpoint', async () => {
    const specialist: ClinicSpecialist = {
      id: 'clinic-specialist-1',
      clinicId: 'clinic-1',
      displayName: 'Dra. Ana Ruiz',
      email: null,
      phone: null,
      professionalTitle: null,
      licenseNumber: null,
      specialization: null,
      status: 'INACTIVE',
      baseSessionPrice: null,
      revenueSharePercentage: null,
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:05:00.000Z',
      deactivatedAt: '2026-05-27T10:05:00.000Z',
    };

    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialist,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist }>);

    await expect(updateClinicSpecialistStatus(
      'clinic-1',
      'clinic-specialist-1',
      'INACTIVE',
    )).resolves.toBe(specialist);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/specialists/clinic-specialist-1/status',
      { status: 'INACTIVE' },
    );
  });
});
