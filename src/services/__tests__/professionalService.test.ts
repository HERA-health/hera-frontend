jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
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
  getProfessionalAgenda,
  getAgendaPreferences,
  getManagedSessionSlotOptions,
  getPublicProfileSlugAvailability,
  getProfessionalClients,
  getProfessionalSessionDetail,
  getProfessionalSessions,
  getVerificationStatus,
  getProfessionalProfileUpdateErrorMessage,
  isManagedSessionBufferConflictError,
  updateCertificateDocumentMetadata,
  updateComprehensiveProfile,
  updatePublicProfileSlug,
  uploadCertificateDocument,
} from '../professionalService';
import { clearRequestCache } from '../requestCache';
import { subscribeProfessionalHomeChanges } from '../dashboardService';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedBuildMultipartFormData = buildMultipartFormData as jest.MockedFunction<typeof buildMultipartFormData>;

describe('professionalService public profile slug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks availability through the protected professional endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          slug: 'ruben-vallejo-jara',
          available: true,
          ownedByCurrentSpecialist: false,
          wouldUseChange: true,
          changeLimitReached: false,
          remainingChanges: 2,
        },
      },
    });

    await expect(
      getPublicProfileSlugAvailability('ruben-vallejo-jara')
    ).resolves.toEqual({
      slug: 'ruben-vallejo-jara',
      available: true,
      ownedByCurrentSpecialist: false,
      wouldUseChange: true,
      changeLimitReached: false,
      remainingChanges: 2,
    });
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/specialists/me/public-slug/availability',
      { params: { slug: 'ruben-vallejo-jara' } }
    );
  });

  it('updates the slug without sending unrelated profile fields', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          publicSlug: 'ruben-vallejo-jara',
          publicProfilePath: '/especialista/ruben-vallejo-jara',
          remainingChanges: 1,
        },
      },
    });

    await expect(updatePublicProfileSlug('ruben-vallejo-jara')).resolves.toEqual({
      publicSlug: 'ruben-vallejo-jara',
      publicProfilePath: '/especialista/ruben-vallejo-jara',
      remainingChanges: 1,
    });
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/specialists/me/public-slug',
      { slug: 'ruben-vallejo-jara' }
    );
  });

  it.each([
    [
      'PUBLIC_PROFILE_SLUG_TAKEN',
      'Esta dirección ya no está disponible. Prueba con otra.',
    ],
    [
      'PUBLIC_PROFILE_SLUG_CHANGE_LIMIT_REACHED',
      'Has alcanzado el límite de 3 cambios. Puedes volver a usar una de tus direcciones anteriores.',
    ],
    [
      'PUBLIC_PROFILE_SLUG_VERIFICATION_REQUIRED',
      'Podrás personalizar tu URL cuando aprobemos la verificación de tu perfil profesional.',
    ],
    [
      'PUBLIC_PROFILE_SLUG_ACCOUNT_INACTIVE',
      'No puedes cambiar la URL mientras tu cuenta esté desactivada. Si crees que es un error, contacta con soporte.',
    ],
    [
      'SPECIALIST_PROFILE_NOT_FOUND',
      'No hemos encontrado tu perfil profesional. Actualiza la página o contacta con soporte.',
    ],
    [
      'VALIDATION_ERROR',
      'La dirección no tiene un formato válido. Usa letras, números y guiones.',
    ],
    [
      'RATE_LIMIT_EXCEEDED',
      'Has hecho demasiados intentos seguidos. Espera un momento y vuelve a probar.',
    ],
  ])('maps %s to a clear specialist message', async (code, expectedMessage) => {
    mockedApi.put.mockRejectedValue({
      response: {
        status: 409,
        data: { code, error: 'Raw backend message' },
      },
    });

    await expect(updatePublicProfileSlug('direccion-de-prueba')).rejects.toMatchObject({
      message: expectedMessage,
      retryable: code === 'RATE_LIMIT_EXCEEDED',
    });
  });

  it('does not expose technical server errors while checking availability', async () => {
    mockedApi.get.mockRejectedValue({
      response: {
        status: 500,
        data: { error: 'PrismaClientKnownRequestError' },
      },
    });

    await expect(
      getPublicProfileSlugAvailability('elena-martin-terapia')
    ).rejects.toMatchObject({
      message: 'No hemos podido comprobar la URL. Revisa tu conexión y pulsa Reintentar.',
      retryable: true,
    });
  });

  it('keeps the session-expired guidance instead of replacing it with a generic error', async () => {
    mockedApi.put.mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Invalid or expired token' },
      },
    });

    await expect(updatePublicProfileSlug('elena-martin-terapia')).rejects.toMatchObject({
      message: 'Tu sesión ya no está activa. Vuelve a iniciar sesión para continuar.',
      retryable: false,
    });
  });

  it('shows a clear connection error when the request never reaches the API', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network Error'));

    await expect(
      getPublicProfileSlugAvailability('elena-martin-terapia')
    ).rejects.toMatchObject({
      message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      retryable: true,
    });
  });

  it('uses a non-retryable safe fallback for an unknown client error', async () => {
    mockedApi.get.mockRejectedValue({
      response: {
        status: 403,
        data: { error: 'Unexpected internal permission detail' },
      },
    });

    await expect(
      getPublicProfileSlugAvailability('elena-martin-terapia')
    ).rejects.toMatchObject({
      message: 'No hemos podido comprobar la URL. Actualiza la página o contacta con soporte si el problema continúa.',
      retryable: false,
    });
  });

  it('offers a direct save retry after an unknown server error', async () => {
    mockedApi.put.mockRejectedValue({
      response: {
        status: 503,
        data: { error: 'Database unavailable' },
      },
    });

    await expect(updatePublicProfileSlug('elena-martin-terapia')).rejects.toMatchObject({
      message: 'No hemos podido guardar la URL. Revisa tu conexión y pulsa Volver a guardar.',
      retryable: true,
    });
  });
});

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

  it('hides technical language validation paths behind a safe fallback', async () => {
    mockedApi.put.mockRejectedValue({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          error: 'Validation failed',
          message: 'El valor de "languages.0" no es válido',
        },
      },
    });

    await expect(updateComprehensiveProfile({ languages: ['spanish'] })).rejects.toThrow(
      'Revisa los campos señalados del perfil y vuelve a intentarlo.',
    );
  });

  it('preserves a reviewed user-facing validation message from the backend', () => {
    expect(getProfessionalProfileUpdateErrorMessage({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Selecciona una opción válida en Idiomas.',
        },
      },
    })).toBe('Selecciona una opción válida en Idiomas.');
  });

  it('uses a safe generic message for unknown technical validation errors', () => {
    expect(getProfessionalProfileUpdateErrorMessage({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        },
      },
    })).toBe('Revisa los campos señalados del perfil y vuelve a intentarlo.');
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
      bookedServiceName: 'Seguimiento emocional',
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
    expect(detail.bookedServiceName).toBe('Seguimiento emocional');
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

describe('professionalService.getProfessionalAgenda', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates the minimal paginated Agenda response', async () => {
    const response = {
      items: [{
        id: 'session-1',
        client: { id: 'client-1', displayName: 'Ana Ruiz', avatar: null },
        startsAt: '2026-08-04T10:00:00.000Z',
        durationMinutes: 60,
        status: 'CONFIRMED',
        type: 'VIDEO_CALL',
        hasInvoice: false,
        origin: 'PRIVATE',
        clinicContext: null,
        actions: {
          canConfirm: false,
          canCancel: true,
          canComplete: false,
          canModifySchedule: true,
          canJoinVideo: true,
          canOpenClinicalNotes: true,
        },
      }],
      summary: { today: 1, week: 2, pending: 0 },
      nextCursor: 'cursor-1',
    };
    mockedApi.get.mockResolvedValue({ data: { success: true, data: response } });

    await expect(getProfessionalAgenda({
      view: 'list',
      origin: 'PRIVATE',
      limit: 50,
    })).resolves.toEqual(response);
    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/professional/agenda', {
      params: { view: 'list', origin: 'PRIVATE', limit: 50 },
    });
  });

  it('rejects an Agenda response containing unmodelled sensitive fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{
            id: 'session-1',
            client: {
              id: 'client-1',
              displayName: 'Ana Ruiz',
              avatar: null,
              email: 'private@example.test',
            },
            startsAt: '2026-08-04T10:00:00.000Z',
            durationMinutes: 60,
            status: 'CONFIRMED',
            type: 'VIDEO_CALL',
            hasInvoice: false,
            origin: 'PRIVATE',
            clinicContext: null,
            actions: {
              canConfirm: false,
              canCancel: true,
              canComplete: false,
              canModifySchedule: true,
              canJoinVideo: true,
              canOpenClinicalNotes: true,
            },
          }],
          summary: { today: 1, week: 1, pending: 0 },
          nextCursor: null,
        },
      },
    });

    await expect(getProfessionalAgenda({ view: 'list' })).rejects.toThrow(
      'No se pudo validar la información de la Agenda',
    );
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

  it('notifies the shared professional summary after creating a session', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id: 'session-1' } } });
    const listener = jest.fn();
    const unsubscribe = subscribeProfessionalHomeChanges(listener);

    try {
      await createManagedClientSession({
        clientId: 'client-1',
        date: '2026-06-15T10:00:00.000Z',
        duration: 60,
        type: 'VIDEO_CALL',
      });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
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
