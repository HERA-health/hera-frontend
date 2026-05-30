import type { AxiosResponse } from 'axios';
import { buildMultipartFormData } from '../../utils/multipartUpload';
import api from '../api';
import {
  acceptClinicPatientConsentRequest,
  assignClinicPatient,
  cancelClinicInvoice,
  closeClinicPatientAssignment,
  createClinicInvoice,
  createClinicInvoiceFromSession,
  createClinicSettlement,
  createClinicPatient,
  createClinicSpecialist,
  getClinic,
  getClinicBillingConfig,
  getClinicBillingSummary,
  getClinicRevenueShareSummary,
  getClinicInvoice,
  getClinicSettlement,
  getClinicSettlementPreview,
  getClinicDashboard,
  getClinicPatient,
  getClinicPatientConsent,
  getMyProfessionalClinicContexts,
  getProfessionalClinicPatient,
  listClinicPatientConsents,
  listClinicPatients,
  listClinicInvoices,
  listClinicSettlements,
  listClinicSpecialists,
  listProfessionalClinicPatients,
  linkClinicSpecialist,
  lookupClinicProfessionalByEmail,
  markClinicInvoiceAsPaid,
  getMyClinicMemberships,
  listClinicSessions,
  requestClinicPatientConsent,
  resolveClinicPatientConsentRequest,
  sendClinicInvoice,
  uploadClinicPatientConsentEvidence,
  updateClinic,
  updateClinicBillingConfig,
  updateClinicInvoice,
  updateClinicSettlementStatus,
  createClinicSession,
  updateClinicPatient,
  updateClinicPatientStatus,
  updateClinicSessionStatus,
  updateClinicSpecialist,
  updateClinicSpecialistStatus,
  unlinkClinicSpecialist,
  type ClinicDashboard,
  type ClinicDetail,
  type ClinicBillingConfig,
  type ClinicBillingSummary,
  type ClinicRevenueShareSummary,
  type ClinicSettlementDetail,
  type ClinicSettlementListPage,
  type ClinicSettlementPreview,
  type ClinicInvoiceDetail,
  type ClinicInvoiceListPage,
  type ClinicInvoiceSummary,
  type ClinicMembershipSummary,
  type ClinicPatientConsentDetail,
  type ClinicPatientConsentResolution,
  type ClinicPatientConsentSummary,
  type ClinicPatientDetail,
  type ClinicPatientSummary,
  type ClinicSessionListPage,
  type ClinicSessionSummary,
  type ClinicSpecialist,
  type LinkedProfessional,
  type ProfessionalClinicContext,
  type ProfessionalClinicPatientDetail,
  type ProfessionalClinicPatientListPage,
} from '../clinicService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildMultipartFormData: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

const getMock = api.get as jest.MockedFunction<typeof api.get>;
const postMock = api.post as jest.MockedFunction<typeof api.post>;
const patchMock = api.patch as jest.MockedFunction<typeof api.patch>;
const putMock = api.put as jest.MockedFunction<typeof api.put>;
const deleteMock = api.delete as jest.MockedFunction<typeof api.delete>;
const buildMultipartFormDataMock = buildMultipartFormData as jest.MockedFunction<typeof buildMultipartFormData>;

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
          value: 4,
          available: true,
          helperText: 'Citas futuras no canceladas',
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
        linkedProfessional: null,
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
      linkedProfessional: null,
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
      linkedProfessional: null,
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

  it('looks up and links professional accounts for clinic specialists', async () => {
    const professional: LinkedProfessional = {
      name: 'Ana Ruiz',
      email: 'ana@hera.test',
      professionalTitle: 'Psicóloga sanitaria',
      specialization: 'Ansiedad',
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    };
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
      linkedProfessional: professional,
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: professional,
      },
    } as AxiosResponse<{ success: boolean; data: LinkedProfessional }>);
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialist,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist }>);

    await expect(lookupClinicProfessionalByEmail(
      'clinic-1',
      'ana@hera.test',
    )).resolves.toBe(professional);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/specialists/professional-lookup', {
      params: { email: 'ana@hera.test' },
    });

    await expect(linkClinicSpecialist(
      'clinic-1',
      'clinic-specialist-1',
      { email: 'ana@hera.test' },
    )).resolves.toBe(specialist);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/specialists/clinic-specialist-1/link',
      { email: 'ana@hera.test' },
    );
  });

  it('unlinks professional accounts from clinic specialists', async () => {
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
      linkedProfessional: null,
    };

    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: specialist,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSpecialist }>);

    await expect(unlinkClinicSpecialist(
      'clinic-1',
      'clinic-specialist-1',
    )).resolves.toBe(specialist);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/specialists/clinic-specialist-1/unlink',
    );
  });

  it('lists clinic patients with normalized service filters', async () => {
    const patients: ClinicPatientSummary[] = [
      {
        id: 'clinic-patient-1',
        status: 'ACTIVE',
        displayName: 'Lucia Martin',
        firstName: 'Lucia',
        lastName: 'Martin',
        email: 'lucia@clinic.test',
        phone: null,
        billingDataComplete: false,
        activeAssignment: null,
        createdAt: '2026-05-27T10:00:00.000Z',
        updatedAt: '2026-05-27T10:00:00.000Z',
        archivedAt: null,
      },
    ];
    const page = {
      items: patients,
      pageInfo: {
        page: 2,
        limit: 25,
        hasMore: true,
        nextPage: 3,
      },
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: page,
      },
    } as AxiosResponse<{ success: boolean; data: typeof page }>);

    await expect(listClinicPatients('clinic-1', {
      status: 'ALL',
      search: 'lucia',
      assignment: 'ASSIGNED',
      clinicSpecialistId: 'clinic-specialist-1',
      page: 2,
      limit: 25,
    })).resolves.toBe(page);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/patients', {
      params: {
        status: 'ALL',
        search: 'lucia',
        assignment: 'ASSIGNED',
        clinicSpecialistId: 'clinic-specialist-1',
        page: 2,
        limit: 25,
      },
    });
  });

  it('loads clinic patient detail through the dedicated endpoint', async () => {
    const patient: ClinicPatientDetail = {
      id: 'clinic-patient-1',
      status: 'ACTIVE',
      displayName: 'Lucia Martin',
      firstName: 'Lucia',
      lastName: 'Martin',
      email: 'lucia@clinic.test',
      phone: null,
      billingDataComplete: true,
      activeAssignment: {
        id: 'assignment-1',
        clinicSpecialistId: 'clinic-specialist-1',
        clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
        clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
        clinicSpecialistStatus: 'ACTIVE',
        startedAt: '2026-05-27T10:00:00.000Z',
        reason: null,
      },
      billingFullName: 'Lucia Martin',
      billingTaxId: '00000000T',
      billingAddress: 'Calle Norte 1',
      billingPostalCode: '28001',
      billingCity: 'Madrid',
      billingCountry: 'España',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:00:00.000Z',
      archivedAt: null,
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: patient,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);

    await expect(getClinicPatient('clinic-1', 'clinic-patient-1')).resolves.toBe(patient);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/patients/clinic-patient-1');
  });

  it('creates and updates clinic patients through dedicated endpoints', async () => {
    const patient: ClinicPatientDetail = {
      id: 'clinic-patient-1',
      status: 'ACTIVE',
      displayName: 'Lucia Martin',
      firstName: 'Lucia',
      lastName: 'Martin',
      email: null,
      phone: null,
      billingDataComplete: false,
      activeAssignment: null,
      billingFullName: null,
      billingTaxId: null,
      billingAddress: null,
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:00:00.000Z',
      archivedAt: null,
    };
    const payload = {
      firstName: 'Lucia',
      lastName: 'Martin',
      email: null,
    };

    postMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: patient,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: patient,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);

    await expect(createClinicPatient('clinic-1', payload)).resolves.toBe(patient);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/patients', payload);

    await expect(updateClinicPatient('clinic-1', 'clinic-patient-1', payload)).resolves.toBe(patient);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1',
      payload,
    );
  });

  it('updates clinic patient status through the status endpoint', async () => {
    const patient: ClinicPatientDetail = {
      id: 'clinic-patient-1',
      status: 'ARCHIVED',
      displayName: 'Lucia Martin',
      firstName: 'Lucia',
      lastName: 'Martin',
      email: null,
      phone: null,
      billingDataComplete: false,
      activeAssignment: null,
      billingFullName: null,
      billingTaxId: null,
      billingAddress: null,
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:05:00.000Z',
      archivedAt: '2026-05-27T10:05:00.000Z',
    };

    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: patient,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);

    await expect(updateClinicPatientStatus(
      'clinic-1',
      'clinic-patient-1',
      'ARCHIVED',
    )).resolves.toBe(patient);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/status',
      { status: 'ARCHIVED' },
    );
  });

  it('assigns and removes clinic patient responsibility through dedicated endpoints', async () => {
    const patient: ClinicPatientDetail = {
      id: 'clinic-patient-1',
      status: 'ACTIVE',
      displayName: 'Lucia Martin',
      firstName: 'Lucia',
      lastName: 'Martin',
      email: null,
      phone: null,
      billingDataComplete: false,
      activeAssignment: {
        id: 'assignment-1',
        clinicSpecialistId: 'clinic-specialist-1',
        clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
        clinicSpecialistProfessionalTitle: null,
        clinicSpecialistStatus: 'ACTIVE',
        startedAt: '2026-05-27T10:05:00.000Z',
        reason: 'Derivación interna',
      },
      billingFullName: null,
      billingTaxId: null,
      billingAddress: null,
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:05:00.000Z',
      archivedAt: null,
    };

    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: patient,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...patient, activeAssignment: null },
      },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientDetail }>);

    await expect(assignClinicPatient('clinic-1', 'clinic-patient-1', {
      clinicSpecialistId: 'clinic-specialist-1',
      reason: 'Derivación interna',
    })).resolves.toBe(patient);
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/assignment',
      {
        clinicSpecialistId: 'clinic-specialist-1',
        reason: 'Derivación interna',
      },
    );

    await expect(closeClinicPatientAssignment('clinic-1', 'clinic-patient-1', {
      endedReason: 'Corrección administrativa',
    })).resolves.toEqual({ ...patient, activeAssignment: null });
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/assignment/close',
      { endedReason: 'Corrección administrativa' },
    );
  });

  it('uses dedicated clinic session endpoints for agenda operations', async () => {
    const session: ClinicSessionSummary = {
      id: 'session-1',
      date: '2026-06-01T10:00:00.000Z',
      duration: 60,
      type: 'IN_PERSON',
      status: 'CONFIRMED',
      bookedPrice: 70,
      bookedCurrency: 'EUR',
      cancelledAt: null,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z',
      patient: {
        id: 'clinic-patient-1',
        displayName: 'Lucia Martin',
        email: 'lucia@clinic.test',
        phone: null,
        status: 'ACTIVE',
      },
      specialist: {
        id: 'clinic-specialist-1',
        displayName: 'Dra. Ana Ruiz',
        professionalTitle: 'Psicóloga sanitaria',
        status: 'ACTIVE',
        linkedProfessionalName: 'Ana Ruiz',
      },
    };
    const page: ClinicSessionListPage = {
      items: [session],
      pageInfo: {
        page: 1,
        limit: 50,
        hasMore: false,
        nextPage: null,
      },
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: page,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSessionListPage }>);
    postMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: session,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSessionSummary }>);
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...session, status: 'CANCELLED' },
      },
    } as AxiosResponse<{ success: boolean; data: ClinicSessionSummary }>);

    await expect(listClinicSessions('clinic-1', {
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-30T23:59:59.999Z',
      clinicSpecialistId: 'clinic-specialist-1',
      clinicPatientId: 'clinic-patient-1',
      status: 'CONFIRMED',
      page: 1,
      limit: 50,
    })).resolves.toBe(page);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/sessions', {
      params: {
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
        clinicSpecialistId: 'clinic-specialist-1',
        clinicPatientId: 'clinic-patient-1',
        status: 'CONFIRMED',
        page: 1,
        limit: 50,
      },
    });

    await expect(createClinicSession('clinic-1', {
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      date: '2026-06-01T10:00:00.000Z',
      duration: 60,
      type: 'IN_PERSON',
    })).resolves.toBe(session);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/sessions', {
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      date: '2026-06-01T10:00:00.000Z',
      duration: 60,
      type: 'IN_PERSON',
    });

    await expect(updateClinicSessionStatus('clinic-1', 'session-1', {
      status: 'CANCELLED',
    })).resolves.toEqual({ ...session, status: 'CANCELLED' });
    expect(patchMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/sessions/session-1/status',
      { status: 'CANCELLED' },
    );
  });

  it('maps clinic session errors to stable Spanish messages', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_SESSION_CONFLICT',
          error: 'Internal text',
        },
      },
    });

    await expect(createClinicSession('clinic-1', {
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      date: '2026-06-01T10:00:00.000Z',
      duration: 60,
      type: 'PHONE_CALL',
    })).rejects.toThrow(
      'Ese horario ya no está disponible para el profesional seleccionado.',
    );
  });

  it('uses dedicated clinic billing endpoints without touching private billing routes', async () => {
    const summary: ClinicBillingSummary = {
      totalThisMonth: 140,
      totalThisYear: 560,
      invoiceCountThisMonth: 2,
      pendingCount: 1,
    };
    const config: ClinicBillingConfig = {
      id: 'clinic-1',
      commercialName: 'Clinica Demo',
      legalName: 'Clinica Demo SL',
      email: 'admin@clinic.test',
      taxId: 'B00000000',
      fiscalAddress: 'Calle Demo 1',
      fiscalPostalCode: '28001',
      fiscalCity: 'Madrid',
      fiscalCountry: 'Spain',
      simplifiedInvoicePrefix: 'FSC',
      simplifiedInvoiceNextNumber: 3,
      fullInvoicePrefix: 'FC',
      fullInvoiceNextNumber: 2,
      vatRate: 21,
      applyVat: true,
      vatExemptReason: null,
      bankIban: null,
      paymentConditions: null,
      sendInvoiceCopyTo: null,
      invoiceLogoUrl: null,
      invoiceAccentColor: '#8B9D83',
    };
    const invoice: ClinicInvoiceDetail = {
      id: 'invoice-1',
      clinicId: 'clinic-1',
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      sessionId: 'session-1',
      invoiceNumber: 'FSC-2026-0003',
      invoiceKind: 'SIMPLIFIED',
      subtotal: 57.85,
      vatRate: 21,
      vatAmount: 12.15,
      total: 70,
      ivaIncluded: true,
      baseImponible: 57.85,
      concept: 'Sesion de clinica',
      sessionDate: '2026-06-01T10:00:00.000Z',
      durationMinutes: 60,
      internalNotes: null,
      revenueSharePercentageSnapshot: 60,
      revenueShareBaseAmount: 57.85,
      revenueShareAmount: 34.71,
      revenueShareCalculatedAt: '2026-06-01T10:00:00.000Z',
      status: 'DRAFT',
      sentAt: null,
      paidAt: null,
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
      patient: {
        id: 'clinic-patient-1',
        displayName: 'Lucia Martin',
        email: 'lucia@clinic.test',
        phone: null,
        status: 'ACTIVE',
      },
      specialist: {
        id: 'clinic-specialist-1',
        displayName: 'Dra. Ana Ruiz',
        professionalTitle: 'Psicologa sanitaria',
        status: 'ACTIVE',
      },
      session: {
        id: 'session-1',
        date: '2026-06-01T10:00:00.000Z',
        status: 'COMPLETED',
        duration: 60,
        type: 'IN_PERSON',
      },
    };
    const { internalNotes: _internalNotes, ...invoiceSummary } = invoice;
    void _internalNotes;
    const page: ClinicInvoiceListPage = {
      items: [invoiceSummary],
      pageInfo: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextPage: null,
      },
    };

    getMock
      .mockResolvedValueOnce({ data: { success: true, data: summary } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: config } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: page } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: invoice } } as AxiosResponse);
    patchMock
      .mockResolvedValueOnce({ data: { success: true, data: config } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: { ...invoice, status: 'PAID' } } } as AxiosResponse);
    postMock
      .mockResolvedValueOnce({ data: { success: true, data: invoice } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: invoice } } as AxiosResponse)
      .mockResolvedValueOnce({ data: { success: true, data: { ...invoice, status: 'SENT' } } } as AxiosResponse);
    putMock.mockResolvedValueOnce({ data: { success: true, data: { ...invoice, concept: 'Actualizada' } } } as AxiosResponse);
    deleteMock.mockResolvedValueOnce({ data: { success: true, data: { ...invoice, status: 'CANCELLED' } } } as AxiosResponse);

    await expect(getClinicBillingSummary('clinic-1')).resolves.toBe(summary);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/summary');

    await expect(getClinicBillingConfig('clinic-1')).resolves.toBe(config);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/config');

    await expect(updateClinicBillingConfig('clinic-1', {
      legalName: 'Clinica Demo SL',
      applyVat: true,
    })).resolves.toBe(config);
    expect(patchMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/config', {
      legalName: 'Clinica Demo SL',
      applyVat: true,
    });

    await expect(listClinicInvoices('clinic-1', {
      status: 'DRAFT',
      invoiceKind: 'SIMPLIFIED',
      clinicPatientId: 'clinic-patient-1',
      page: 1,
      limit: 25,
    })).resolves.toBe(page);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices', {
      params: {
        status: 'DRAFT',
        invoiceKind: 'SIMPLIFIED',
        month: undefined,
        year: undefined,
        clinicPatientId: 'clinic-patient-1',
        page: 1,
        limit: 25,
      },
    });

    await expect(createClinicInvoice('clinic-1', {
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      concept: 'Sesion de clinica',
      subtotal: 70,
      vatRate: 21,
    })).resolves.toBe(invoice);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices', {
      clinicPatientId: 'clinic-patient-1',
      clinicSpecialistId: 'clinic-specialist-1',
      concept: 'Sesion de clinica',
      subtotal: 70,
      vatRate: 21,
    });

    await expect(createClinicInvoiceFromSession('clinic-1', 'session-1')).resolves.toBe(invoice);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/sessions/session-1/invoice');

    await expect(getClinicInvoice('clinic-1', 'invoice-1')).resolves.toBe(invoice);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices/invoice-1');

    await expect(updateClinicInvoice('clinic-1', 'invoice-1', {
      concept: 'Actualizada',
    })).resolves.toEqual({ ...invoice, concept: 'Actualizada' });
    expect(putMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices/invoice-1', {
      concept: 'Actualizada',
    });

    await expect(sendClinicInvoice('clinic-1', 'invoice-1')).resolves.toEqual({ ...invoice, status: 'SENT' });
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices/invoice-1/send');

    await expect(markClinicInvoiceAsPaid('clinic-1', 'invoice-1')).resolves.toEqual({ ...invoice, status: 'PAID' });
    expect(patchMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices/invoice-1/paid');

    await expect(cancelClinicInvoice('clinic-1', 'invoice-1')).resolves.toEqual({ ...invoice, status: 'CANCELLED' });
    expect(deleteMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/invoices/invoice-1');
  });

  it('loads clinic revenue share summaries with period filters', async () => {
    const summary: ClinicRevenueShareSummary = {
      period: {
        year: 2026,
        month: 5,
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
        currency: 'EUR',
      },
      totals: {
        paidInvoiceCount: 2,
        shareBaseAmount: 150,
        specialistShareAmount: 75,
        clinicRetainedAmount: 75,
        missingPercentageInvoiceCount: 0,
        missingSpecialistInvoiceCount: 0,
        pendingSnapshotInvoiceCount: 1,
        pendingSnapshotBaseAmount: 25,
      },
      specialists: [
        {
          clinicSpecialistId: 'clinic-specialist-1',
          displayName: 'Dra. Ana Ruiz',
          professionalTitle: 'Psicologa sanitaria',
          status: 'ACTIVE',
          paidInvoiceCount: 2,
          shareBaseAmount: 150,
          specialistShareAmount: 75,
          clinicRetainedAmount: 75,
          effectiveRevenueSharePercentage: 50,
          missingPercentageInvoiceCount: 0,
          pendingSnapshotInvoiceCount: 0,
        },
      ],
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: summary,
      },
    } as AxiosResponse<{ success: boolean; data: ClinicRevenueShareSummary }>);

    await expect(getClinicRevenueShareSummary('clinic-1', {
      year: 2026,
      month: 5,
    })).resolves.toBe(summary);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/revenue-share', {
      params: {
        year: 2026,
        month: 5,
      },
    });
  });

  it('uses dedicated clinic settlement endpoints with period filters and status actions', async () => {
    const preview: ClinicSettlementPreview = {
      period: {
        year: 2026,
        month: 4,
        startDate: '2026-03-31T22:00:00.000Z',
        endDate: '2026-04-30T22:00:00.000Z',
        currency: 'EUR',
        isClosed: true,
      },
      existingSettlement: null,
      canGenerate: true,
      blockers: {
        periodOpen: false,
        noPaidInvoices: false,
        missingSpecialistInvoiceCount: 0,
        pendingSnapshotInvoiceCount: 0,
        alreadySettledInvoiceCount: 0,
        finalizedSettlement: false,
      },
      totals: {
        paidInvoiceCount: 2,
        settledInvoiceCount: 2,
        shareBaseAmount: 150,
        specialistShareAmount: 75,
        clinicRetainedAmount: 75,
        missingPercentageInvoiceCount: 0,
        missingSpecialistInvoiceCount: 0,
        pendingSnapshotInvoiceCount: 0,
        alreadySettledInvoiceCount: 0,
      },
      specialists: [],
    };
    const listPage: ClinicSettlementListPage = {
      items: [
        {
          id: 'settlement-1',
          clinicId: 'clinic-1',
          year: 2026,
          month: 4,
          startDate: '2026-03-31T22:00:00.000Z',
          endDate: '2026-04-30T22:00:00.000Z',
          status: 'PENDING',
          currency: 'EUR',
          paidInvoiceCount: 2,
          settledInvoiceCount: 2,
          shareBaseAmount: 150,
          specialistShareAmount: 75,
          clinicRetainedAmount: 75,
          missingPercentageInvoiceCount: 0,
          missingSpecialistInvoiceCount: 0,
          pendingSnapshotInvoiceCount: 0,
          reviewedAt: null,
          paidAt: null,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
        },
      ],
      pageInfo: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextPage: null,
      },
    };
    const detail: ClinicSettlementDetail = {
      ...listPage.items[0],
      lines: [],
    };

    getMock.mockResolvedValueOnce({
      data: { success: true, data: preview },
    } as AxiosResponse<{ success: boolean; data: ClinicSettlementPreview }>);
    getMock.mockResolvedValueOnce({
      data: { success: true, data: listPage },
    } as AxiosResponse<{ success: boolean; data: ClinicSettlementListPage }>);
    postMock.mockResolvedValueOnce({
      data: { success: true, data: detail },
    } as AxiosResponse<{ success: boolean; data: ClinicSettlementDetail }>);
    getMock.mockResolvedValueOnce({
      data: { success: true, data: detail },
    } as AxiosResponse<{ success: boolean; data: ClinicSettlementDetail }>);
    patchMock.mockResolvedValueOnce({
      data: { success: true, data: { ...detail, status: 'REVIEWED' } },
    } as AxiosResponse<{ success: boolean; data: ClinicSettlementDetail }>);

    await expect(getClinicSettlementPreview('clinic-1', {
      year: 2026,
      month: 4,
    })).resolves.toBe(preview);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/settlements/preview', {
      params: {
        year: 2026,
        month: 4,
      },
    });

    await expect(listClinicSettlements('clinic-1', {
      year: 2026,
      page: 1,
      limit: 12,
    })).resolves.toBe(listPage);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/settlements', {
      params: {
        year: 2026,
        status: undefined,
        page: 1,
        limit: 12,
      },
    });

    await expect(createClinicSettlement('clinic-1', {
      year: 2026,
      month: 4,
    })).resolves.toBe(detail);
    expect(postMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/settlements', {
      year: 2026,
      month: 4,
    });

    await expect(getClinicSettlement('clinic-1', 'settlement-1')).resolves.toBe(detail);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/settlements/settlement-1');

    await expect(updateClinicSettlementStatus('clinic-1', 'settlement-1', {
      status: 'REVIEWED',
    })).resolves.toEqual({ ...detail, status: 'REVIEWED' });
    expect(patchMock).toHaveBeenCalledWith('/clinics/clinic-1/billing/settlements/settlement-1/status', {
      status: 'REVIEWED',
    });
  });

  it('maps clinic billing email failures to a stable Spanish message', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_INVOICE_EMAIL_FAILED',
          error: 'SMTP failed',
        },
      },
    });

    await expect(sendClinicInvoice('clinic-1', 'invoice-1')).rejects.toThrow(
      'No se pudo enviar el email de la factura.',
    );
  });

  it('uses dedicated clinic consent endpoints including multipart evidence', async () => {
    const summaries: ClinicPatientConsentSummary[] = [
      {
        clinicPatientId: 'clinic-patient-1',
        patientDisplayName: 'Lucia Martin',
        patientEmail: 'lucia@clinic.test',
        patientStatus: 'ACTIVE',
        status: 'PENDING',
        method: null,
        requestedAt: null,
        grantedAt: null,
        version: null,
      },
    ];
    const detail: ClinicPatientConsentDetail = {
      ...summaries[0],
      status: 'GRANTED',
      method: 'CLINIC_ADMIN_ATTESTATION',
      requestedAt: '2026-05-28T09:00:00.000Z',
      grantedAt: '2026-05-28T10:00:00.000Z',
      version: 'clinic-v2',
      activeRequest: null,
      documents: [
        {
          id: 'document-1',
          fileName: 'consentimiento.pdf',
          mimeType: 'application/pdf',
          uploadedAt: '2026-05-28T10:00:00.000Z',
          sizeBytes: 1200,
        },
      ],
      events: [],
    };
    const requestResult = {
      requestId: 'request-1',
      status: 'PENDING' as const,
      expiresAt: '2026-06-04T10:00:00.000Z',
      createdAt: '2026-05-28T10:00:00.000Z',
    };
    const uploadAsset = {
      uri: 'file:///consentimiento.pdf',
      mimeType: 'application/pdf',
      fileName: 'consentimiento.pdf',
    };
    const formData = new FormData();

    getMock.mockResolvedValueOnce({
      data: { success: true, data: summaries },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentSummary[] }>);
    getMock.mockResolvedValueOnce({
      data: { success: true, data: detail },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentDetail }>);
    postMock.mockResolvedValueOnce({
      data: { success: true, data: requestResult },
    } as AxiosResponse<{ success: boolean; data: typeof requestResult }>);
    buildMultipartFormDataMock.mockResolvedValueOnce(formData);
    postMock.mockResolvedValueOnce({
      data: { success: true, data: detail },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentDetail }>);

    await expect(listClinicPatientConsents('clinic-1')).resolves.toBe(summaries);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/consents');

    await expect(getClinicPatientConsent(
      'clinic-1',
      'clinic-patient-1',
    )).resolves.toBe(detail);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/patients/clinic-patient-1/consent');

    await expect(requestClinicPatientConsent(
      'clinic-1',
      'clinic-patient-1',
      'clinic-v2',
    )).resolves.toBe(requestResult);
    expect(postMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/consent/request',
      { version: 'clinic-v2' },
      { timeout: 30000 },
    );

    await expect(uploadClinicPatientConsentEvidence(
      'clinic-1',
      'clinic-patient-1',
      uploadAsset,
      'clinic-v2',
    )).resolves.toBe(detail);
    expect(buildMultipartFormDataMock).toHaveBeenCalledWith(
      'document',
      uploadAsset,
      { version: 'clinic-v2' },
      'consentimiento-clinica',
    );
    expect(postMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/consent/evidence',
      formData,
      { timeout: 30000 },
    );
  });

  it('omits clinic consent version when callers do not pass one', async () => {
    const requestResult = {
      requestId: 'request-1',
      status: 'PENDING' as const,
      expiresAt: '2026-06-04T10:00:00.000Z',
      createdAt: '2026-05-28T10:00:00.000Z',
    };
    const detail: ClinicPatientConsentDetail = {
      clinicPatientId: 'clinic-patient-1',
      patientDisplayName: 'Lucia Martin',
      patientEmail: 'lucia@clinic.test',
      patientStatus: 'ACTIVE',
      status: 'GRANTED',
      method: 'CLINIC_ADMIN_ATTESTATION',
      requestedAt: null,
      grantedAt: '2026-05-28T10:00:00.000Z',
      version: 'clinic-v2',
      activeRequest: null,
      documents: [],
      events: [],
    };
    const uploadAsset = {
      uri: 'file:///consentimiento.pdf',
      mimeType: 'application/pdf',
      fileName: 'consentimiento.pdf',
    };
    const formData = new FormData();

    postMock.mockResolvedValueOnce({
      data: { success: true, data: requestResult },
    } as AxiosResponse<{ success: boolean; data: typeof requestResult }>);
    buildMultipartFormDataMock.mockResolvedValueOnce(formData);
    postMock.mockResolvedValueOnce({
      data: { success: true, data: detail },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentDetail }>);

    await expect(requestClinicPatientConsent(
      'clinic-1',
      'clinic-patient-1',
    )).resolves.toBe(requestResult);
    expect(postMock).toHaveBeenCalledWith(
      '/clinics/clinic-1/patients/clinic-patient-1/consent/request',
      {},
      { timeout: 30000 },
    );

    await expect(uploadClinicPatientConsentEvidence(
      'clinic-1',
      'clinic-patient-1',
      uploadAsset,
    )).resolves.toBe(detail);
    expect(buildMultipartFormDataMock).toHaveBeenCalledWith(
      'document',
      uploadAsset,
      {},
      'consentimiento-clinica',
    );
  });

  it('resolves and accepts clinic consent links without exposing the token outside the request body', async () => {
    const resolution: ClinicPatientConsentResolution = {
      id: 'request-1',
      version: 'clinic-v1',
      status: 'PENDING',
      expiresAt: '2026-06-04T10:00:00.000Z',
      createdAt: '2026-05-28T10:00:00.000Z',
      consentStatus: 'PENDING',
      requiresLogin: true,
      alreadyUsed: false,
      clinic: {
        id: 'clinic-1',
        name: 'Clinica Hera',
      },
      patient: {
        displayName: 'Lucia Martin',
      },
    };
    const acceptedResolution: ClinicPatientConsentResolution = {
      ...resolution,
      status: 'ACCEPTED',
      consentStatus: 'GRANTED',
      alreadyUsed: true,
    };

    getMock.mockResolvedValueOnce({
      data: { success: true, data: resolution },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentResolution }>);
    postMock.mockResolvedValueOnce({
      data: { success: true, data: acceptedResolution },
    } as AxiosResponse<{ success: boolean; data: ClinicPatientConsentResolution }>);

    await expect(resolveClinicPatientConsentRequest(
      'request-1',
      'raw-token',
    )).resolves.toBe(resolution);
    expect(getMock).toHaveBeenCalledWith('/clinics/consent/requests/request-1/resolve', {
      params: { token: 'raw-token' },
    });

    await expect(acceptClinicPatientConsentRequest(
      'request-1',
      'raw-token',
    )).resolves.toBe(acceptedResolution);
    expect(postMock).toHaveBeenCalledWith(
      '/clinics/consent/requests/request-1/accept',
      { token: 'raw-token' },
    );
  });

  it('maps clinic consent errors to Spanish by code', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_CONSENT_DIGITAL_UNAVAILABLE',
          error: 'Internal text',
        },
      },
    });

    await expect(requestClinicPatientConsent(
      'clinic-1',
      'clinic-patient-1',
    )).rejects.toThrow(
      'Este paciente necesita una cuenta HERA enlazada para usar el consentimiento digital.',
    );
  });

  it('maps clinic consent email failures separately from linked-account errors', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_CONSENT_EMAIL_FAILED',
          error: 'SMTP failed',
        },
      },
    });

    await expect(requestClinicPatientConsent(
      'clinic-1',
      'clinic-patient-1',
    )).rejects.toThrow(
      'No se pudo enviar el email de consentimiento. Revisa la configuración del correo de la clínica.',
    );
  });

  it('maps clinic patient duplicate email errors to Spanish by code', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_PATIENT_DUPLICATE_EMAIL',
          error: 'Texto técnico que no debe mostrarse',
        },
      },
    });

    await expect(createClinicPatient('clinic-1', {
      firstName: 'Lucia',
      lastName: 'Martin',
      email: 'lucia@clinic.test',
    })).rejects.toThrow('Ya existe un paciente de esta clínica con ese email administrativo.');
  });

  it('maps clinic patient serializable conflicts to Spanish by code', async () => {
    patchMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_PATIENT_CONFLICT',
          error: 'Texto técnico que no debe mostrarse',
        },
      },
    });

    await expect(updateClinicPatient('clinic-1', 'clinic-patient-1', {
      firstName: 'Lucia',
    })).rejects.toThrow(
      'La ficha ha cambiado mientras guardabas. Revisa los datos e inténtalo de nuevo.',
    );
  });

  it('maps clinic patient not found errors to Spanish by code', async () => {
    getMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_PATIENT_NOT_FOUND',
          error: 'Texto técnico que no debe mostrarse',
        },
      },
    });

    await expect(getClinicPatient('clinic-1', 'missing-patient')).rejects.toThrow(
      'No se encontró la ficha del paciente.',
    );
  });

  it('maps clinic assignment errors to Spanish by code', async () => {
    patchMock.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          code: 'CLINIC_ASSIGNMENT_SPECIALIST_INACTIVE',
          error: 'Internal text',
        },
      },
    });

    await expect(assignClinicPatient('clinic-1', 'clinic-patient-1', {
      clinicSpecialistId: 'clinic-specialist-1',
    })).rejects.toThrow('No se puede asignar un especialista inactivo.');
  });

  it('loads professional clinic contexts and assigned clinic patients', async () => {
    const contexts: ProfessionalClinicContext[] = [
      {
        clinic: {
          id: 'clinic-1',
          commercialName: 'Clínica Hera',
          legalName: null,
          status: 'ACTIVE',
          createdAt: '2026-05-27T10:00:00.000Z',
          updatedAt: '2026-05-27T10:00:00.000Z',
        },
        responsible: {
          displayName: 'Dra. Ana Ruiz',
          professionalTitle: 'Psicóloga sanitaria',
        },
      },
    ];
    const page: ProfessionalClinicPatientListPage = {
      items: [
        {
          clinicPatientId: 'clinic-patient-1',
          displayName: 'Lucia Martin',
          firstName: 'Lucia',
          lastName: 'Martin',
          email: 'lucia@clinic.test',
          phone: null,
          status: 'ACTIVE',
          createdAt: '2026-05-27T10:00:00.000Z',
          updatedAt: '2026-05-27T10:00:00.000Z',
          archivedAt: null,
          clinic: {
            id: 'clinic-1',
            name: 'Clínica Hera',
          },
          responsible: {
            displayName: 'Dra. Ana Ruiz',
            professionalTitle: 'Psicóloga sanitaria',
          },
          assignment: {
            id: 'assignment-1',
            startedAt: '2026-05-27T10:05:00.000Z',
            reason: null,
          },
          consent: {
            status: 'PENDING',
            method: null,
            requestedAt: null,
            grantedAt: null,
            version: null,
          },
        },
      ],
      pageInfo: {
        page: 1,
        limit: 50,
        hasMore: false,
        nextPage: null,
      },
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: contexts,
      },
    } as AxiosResponse<{ success: boolean; data: ProfessionalClinicContext[] }>);
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: page,
      },
    } as AxiosResponse<{ success: boolean; data: ProfessionalClinicPatientListPage }>);

    await expect(getMyProfessionalClinicContexts()).resolves.toBe(contexts);
    expect(getMock).toHaveBeenCalledWith('/clinics/specialist/me');

    await expect(listProfessionalClinicPatients('clinic-1', {
      search: 'lucia',
      limit: 100,
    })).resolves.toBe(page);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/specialist/patients', {
      params: {
        search: 'lucia',
        page: undefined,
        limit: 100,
      },
    });
  });

  it('loads professional clinic patient detail through the limited endpoint', async () => {
    const detail: ProfessionalClinicPatientDetail = {
      clinicPatientId: 'clinic-patient-1',
      displayName: 'Lucia Martin',
      firstName: 'Lucia',
      lastName: 'Martin',
      email: 'lucia@clinic.test',
      phone: '+34 600 000 000',
      status: 'ACTIVE',
      createdAt: '2026-05-27T10:00:00.000Z',
      updatedAt: '2026-05-27T10:00:00.000Z',
      archivedAt: null,
      clinic: {
        id: 'clinic-1',
        name: 'Clínica Hera',
      },
      responsible: {
        displayName: 'Dra. Ana Ruiz',
        professionalTitle: 'Psicóloga sanitaria',
      },
      assignment: {
        id: 'assignment-1',
        startedAt: '2026-05-27T10:05:00.000Z',
        reason: 'Derivación interna',
      },
      consent: {
        status: 'GRANTED',
        method: 'DIGITAL_SIGNATURE',
        requestedAt: '2026-05-27T10:10:00.000Z',
        grantedAt: '2026-05-27T10:12:00.000Z',
        version: 'clinic-v1',
      },
    };

    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: detail,
      },
    } as AxiosResponse<{ success: boolean; data: ProfessionalClinicPatientDetail }>);

    const result = await getProfessionalClinicPatient(
      'clinic-1',
      'clinic-patient-1',
    );

    expect(result).toBe(detail);
    expect(result.consent.status).toBe('GRANTED');
    expect('documents' in result.consent).toBe(false);
    expect('clientId' in result).toBe(false);
    expect(getMock).toHaveBeenCalledWith('/clinics/clinic-1/specialist/patients/clinic-patient-1');
  });
});
