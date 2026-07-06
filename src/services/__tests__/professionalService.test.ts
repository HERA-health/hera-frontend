jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
  getAuthSessionCacheScope: jest.fn(() => 'auth:test-session'),
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildImageFormData: jest.fn(),
  buildMultipartFormData: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { api } from '../api';
import { buildMultipartFormData } from '../../utils/multipartUpload';
import {
  createManagedClientSession,
  getAgendaPreferences,
  getManagedSessionSlotOptions,
  getProfessionalClients,
  getProfessionalSessionDetail,
  getProfessionalSessions,
  getVerificationStatus,
  isManagedSessionBufferConflictError,
  updateCertificateDocumentMetadata,
  updateComprehensiveProfile,
  uploadCertificateDocument,
} from '../professionalService';
import { clearRequestCache } from '../requestCache';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedBuildMultipartFormData = buildMultipartFormData as jest.MockedFunction<typeof buildMultipartFormData>;

describe('professionalService.getVerificationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('normalizes legacy verification timestamp fields from the backend response', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          verificationStatus: 'VERIFIED',
          colegiadoNumber: 'M-12345',
          verificationSubmittedAt: '2026-04-10T10:00:00.000Z',
          verificationResolvedAt: '2026-04-11T10:00:00.000Z',
        },
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'VERIFIED',
      colegiadoNumber: 'M-12345',
      submittedAt: '2026-04-10T10:00:00.000Z',
      reviewedAt: '2026-04-11T10:00:00.000Z',
      rejectionReason: undefined,
    });
  });

  it('normalizes a pending specialist without submission timestamp as NOT_SUBMITTED', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          verificationStatus: 'PENDING',
          colegiadoNumber: null,
          verificationSubmittedAt: null,
          verificationResolvedAt: null,
        },
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'NOT_SUBMITTED',
      colegiadoNumber: undefined,
      submittedAt: undefined,
      reviewedAt: undefined,
      rejectionReason: undefined,
    });
  });

  it('returns NOT_SUBMITTED when the verification endpoint responds with 404', async () => {
    mockedApi.get.mockRejectedValue({
      response: {
        status: 404,
      },
    });

    await expect(getVerificationStatus()).resolves.toEqual({
      verificationStatus: 'NOT_SUBMITTED',
    });
  });

  it('does not mask non-404 verification errors as NOT_SUBMITTED', async () => {
    const error = {
      response: {
        status: 500,
      },
    };

    mockedApi.get.mockRejectedValue(error);

    await expect(getVerificationStatus()).rejects.toBe(error);
  });
});

describe('professionalService.updateComprehensiveProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('does not send billing-owned fields through the profile endpoint', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          fullName: 'Dra. Prueba',
        },
      },
    });

    await updateComprehensiveProfile({
      fullName: 'Dra. Prueba',
      priceStandard: 95,
      bankIban: 'ES00 0000 0000 0000 0000 0000',
      taxId: '12345678Z',
      applyVat: true,
      showReviewCount: false,
      showLastOnline: true,
      autoConfirmSessionRequests: false,
      emailSessionRequestsEnabled: false,
      emailSessionCancellationsEnabled: true,
      emailSessionReminder24hEnabled: true,
      personalMotto: 'Campo eliminado',
    } as Parameters<typeof updateComprehensiveProfile>[0] & {
      personalMotto: string;
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/specialists/me/profile', {
      fullName: 'Dra. Prueba',
      autoConfirmSessionRequests: false,
      emailSessionRequestsEnabled: false,
      emailSessionCancellationsEnabled: true,
      emailSessionReminder24hEnabled: true,
    });
  });
});

describe('professionalService.getAgendaPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('loads agenda preferences through the minimal endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          autoConfirmSessionRequests: false,
        },
      },
    });

    await expect(getAgendaPreferences()).resolves.toEqual({
      autoConfirmSessionRequests: false,
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/specialists/me/agenda-preferences');
  });
});

describe('professionalService cached professional GETs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('coalesces concurrent professional session loads', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'session-1',
            clientId: 'client-1',
            specialistId: 'specialist-1',
            date: '2026-06-01T10:00:00.000Z',
            duration: 60,
            status: 'CONFIRMED',
            type: 'VIDEO_CALL',
          },
        ],
      },
    });

    const [firstResult, secondResult] = await Promise.all([
      getProfessionalSessions(),
      getProfessionalSessions(),
    ]);

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/professional');
    expect(firstResult).toHaveLength(1);
    expect(secondResult).toHaveLength(1);
  });

  it('loads professional session detail without using the cached list endpoint', async () => {
    const detail = {
      id: 'session-1',
      clientId: 'client-1',
      specialistId: 'specialist-1',
      date: '2026-06-01T10:00:00.000Z',
      duration: 60,
      status: 'CONFIRMED',
      type: 'VIDEO_CALL',
      origin: 'CLINIC',
      clinicContext: {
        clinicId: 'clinic-1',
        clinicName: 'Clínica Hera',
        clinicSpecialistId: 'clinic-specialist-1',
        displayName: 'Dra. Ana Ruiz',
        professionalTitle: 'Psicóloga sanitaria',
      },
      price: {
        amount: 70,
        currency: 'EUR',
        tariffName: 'Sesión estándar',
      },
      professional: {
        id: 'specialist-1',
        displayName: 'Dra. Ana Ruiz',
        professionalTitle: 'Psicóloga sanitaria',
      },
      clinicalTarget: {
        clientId: 'client-1',
        sessionId: 'session-1',
      },
      actions: {
        canConfirm: false,
        canCancel: false,
        canComplete: false,
        canModifySchedule: false,
        canJoinVideo: false,
        canOpenClinicalNotes: true,
      },
    };

    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: detail,
      },
    });

    await expect(getProfessionalSessionDetail('session-1')).resolves.toBe(detail);
    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/professional/session-1');
  });

  it('loads professional sessions with optional clinic filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
      },
    });

    await expect(getProfessionalSessions({
      origin: 'CLINIC',
      clinicId: 'clinic-1',
      clientId: 'client-1',
    })).resolves.toEqual([]);

    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/professional', {
      params: {
        origin: 'CLINIC',
        clinicId: 'clinic-1',
        clientId: 'client-1',
      },
    });
  });

  it('coalesces concurrent professional client loads with the same filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
      },
    });

    await Promise.all([
      getProfessionalClients({ source: 'ALL', lifecycle: 'ACTIVE' }),
      getProfessionalClients({ source: 'ALL', lifecycle: 'ACTIVE' }),
    ]);

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/clients', {
      params: {
        source: 'ALL',
        lifecycle: 'ACTIVE',
      },
    });
  });
});

describe('professionalService certificate documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('uploads certificate visibility and education metadata with the document', async () => {
    const file = {
      uri: 'file:///certificate.pdf',
      name: 'certificate.pdf',
      fileName: 'certificate.pdf',
      mimeType: 'application/pdf',
    };
    const formData = new FormData();

    mockedBuildMultipartFormData.mockResolvedValue(formData);
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'cert-1',
          name: 'Máster clínico',
          issuer: 'Universidad',
          validUntil: null,
          publicVisible: true,
          educationId: 'edu-1',
        },
      },
    });

    await expect(uploadCertificateDocument({
      file,
      name: 'Máster clínico',
      issuer: 'Universidad',
      validUntil: null,
      publicVisible: true,
      educationId: 'edu-1',
    })).resolves.toMatchObject({
      id: 'cert-1',
      publicVisible: true,
      educationId: 'edu-1',
    });

    expect(mockedBuildMultipartFormData).toHaveBeenCalledWith(
      'document',
      file,
      {
        name: 'Máster clínico',
        issuer: 'Universidad',
        publicVisible: 'true',
        educationId: 'edu-1',
      },
      'certificado'
    );
    expect(mockedApi.post).toHaveBeenCalledWith('/specialists/me/certificates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
  });

  it('patches certificate public metadata without re-uploading the file', async () => {
    mockedApi.patch.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'cert-1',
          name: 'Máster clínico',
          issuer: 'Universidad',
          validUntil: null,
          publicVisible: false,
          educationId: null,
        },
      },
    });

    await expect(updateCertificateDocumentMetadata('cert-1', {
      publicVisible: false,
      educationId: null,
    })).resolves.toMatchObject({
      id: 'cert-1',
      publicVisible: false,
      educationId: null,
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/specialists/me/certificates/cert-1', {
      publicVisible: false,
      educationId: null,
    });
  });
});

describe('professionalService.createManagedClientSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('preserves buffer conflict code and minutes for the scheduler modal', async () => {
    mockedApi.post.mockRejectedValue({
      response: {
        data: {
          success: false,
          code: 'BUFFER_CONFLICT_REQUIRES_OVERRIDE',
          error: 'La cita incumple el descanso configurado entre sesiones.',
          data: { bufferMinutes: 15 },
        },
      },
    });

    await expect(
      createManagedClientSession({
        clientId: 'client-1',
        date: '2026-06-15T10:00:00.000Z',
        duration: 60,
        type: 'VIDEO_CALL',
      })
    ).rejects.toMatchObject({
      code: 'BUFFER_CONFLICT_REQUIRES_OVERRIDE',
      bufferMinutes: 15,
    });

    try {
      await createManagedClientSession({
        clientId: 'client-1',
        date: '2026-06-15T10:00:00.000Z',
        duration: 60,
        type: 'VIDEO_CALL',
      });
    } catch (error: unknown) {
      expect(isManagedSessionBufferConflictError(error)).toBe(true);
    }
  });
});

describe('professionalService.getManagedSessionSlotOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('loads private managed slot states with minimal query params', async () => {
    const response = {
      date: '2026-07-07',
      duration: 60,
      bufferMinutes: 15,
      slots: [
        {
          startTime: '10:15',
          endTime: '11:15',
          status: 'AVAILABLE' as const,
          selectable: true,
        },
      ],
    };

    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: response,
      },
    });

    await expect(getManagedSessionSlotOptions({
      date: '2026-07-07',
      duration: 60,
      sessionId: 'session-1',
    })).resolves.toBe(response);

    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/professional/managed-slot-options', {
      params: {
        date: '2026-07-07',
        duration: 60,
        sessionId: 'session-1',
      },
    });
  });
});
