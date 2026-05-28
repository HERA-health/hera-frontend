import type { AxiosResponse } from 'axios';
import { buildMultipartFormData } from '../../utils/multipartUpload';
import api from '../api';
import {
  acceptClinicPatientConsentRequest,
  assignClinicPatient,
  closeClinicPatientAssignment,
  createClinicPatient,
  createClinicSpecialist,
  getClinic,
  getClinicDashboard,
  getClinicPatient,
  getClinicPatientConsent,
  getMyProfessionalClinicContexts,
  getProfessionalClinicPatient,
  listClinicPatientConsents,
  listClinicPatients,
  listClinicSpecialists,
  listProfessionalClinicPatients,
  linkClinicSpecialist,
  lookupClinicProfessionalByEmail,
  getMyClinicMemberships,
  requestClinicPatientConsent,
  resolveClinicPatientConsentRequest,
  uploadClinicPatientConsentEvidence,
  updateClinic,
  updateClinicPatient,
  updateClinicPatientStatus,
  updateClinicSpecialist,
  updateClinicSpecialistStatus,
  unlinkClinicSpecialist,
  type ClinicDashboard,
  type ClinicDetail,
  type ClinicMembershipSummary,
  type ClinicPatientConsentDetail,
  type ClinicPatientConsentResolution,
  type ClinicPatientConsentSummary,
  type ClinicPatientDetail,
  type ClinicPatientSummary,
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
          value: null,
          available: false,
          helperText: 'No disponible',
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
