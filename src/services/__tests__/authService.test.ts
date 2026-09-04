import type { AxiosResponse } from 'axios';
import api, { setAuthSession } from '../api';
import {
  authenticateWithGoogle,
  login,
  register,
  updateUnverifiedProfessionalEmail,
  type AuthResponse,
} from '../authService';
import type { LegalAcceptanceStatus } from '../legalService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  logoutServerSession: jest.fn(),
  setAuthSession: jest.fn(),
}));

jest.mock('../secureSessionStorage', () => ({
  clearPersistedClinicalAccessSession: jest.fn(),
}));

jest.mock('../specialistsService', () => ({
  invalidateSpecialistsCache: jest.fn(),
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildImageFormData: jest.fn(),
}));

const postMock = api.post as jest.MockedFunction<typeof api.post>;
const patchMock = api.patch as jest.MockedFunction<typeof api.patch>;
const setAuthSessionMock = setAuthSession as jest.MockedFunction<typeof setAuthSession>;

const legalStatus: LegalAcceptanceStatus = {
  documents: [
    {
      key: 'TERMS_OF_SERVICE',
      version: '2026-04-26',
      title: 'Términos y condiciones de HERA',
      publicPath: '/legal/terminos',
    },
  ],
  requiredDocumentKeys: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  acceptedDocuments: [],
  missingDocumentKeys: [],
  requiresAcceptance: false,
};

const authResponse: AuthResponse = {
  token: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User Example',
    userType: 'CLIENT',
    emailVerified: true,
    isAdmin: false,
  },
  legalStatus,
};

const mockSuccessfulAuthResponse = () => {
  postMock.mockResolvedValueOnce({
    data: {
      success: true,
      data: authResponse,
    },
  } as AxiosResponse<{ success: boolean; data: AuthResponse }>);
};

describe('authService legal status hydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthSessionMock.mockResolvedValue(undefined);
  });

  it('preserves legalStatus returned by login', async () => {
    mockSuccessfulAuthResponse();

    const result = await login({ email: 'user@example.com', password: 'Password1' });

    expect(postMock).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ email: 'user@example.com' }),
      expect.objectContaining({ timeout: 30000 })
    );
    expect(setAuthSessionMock).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(result.legalStatus).toBe(legalStatus);
  });

  it('preserves legalStatus returned by register', async () => {
    mockSuccessfulAuthResponse();

    const result = await register({
      email: 'user@example.com',
      password: 'Password1!',
      name: 'User Example',
      userType: 'CLIENT',
      acceptedLegalDocumentKeys: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });

    expect(setAuthSessionMock).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(result.legalStatus).toBe(legalStatus);
  });

  it('sends clinic registration fields through the auth contract', async () => {
    mockSuccessfulAuthResponse();

    await register({
      email: 'clinic@example.com',
      password: 'Password1!',
      name: 'Admin Clinic',
      userType: 'CLINIC',
      clinicCommercialName: 'Clinica Demo',
      acceptedLegalDocumentKeys: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });

    expect(postMock).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({
        email: 'clinic@example.com',
        userType: 'CLINIC',
        clinicCommercialName: 'Clinica Demo',
      }),
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it('preserves legalStatus returned by Google auth', async () => {
    mockSuccessfulAuthResponse();

    const result = await authenticateWithGoogle({
      idToken: 'google-id-token',
      expectedUserType: 'CLIENT',
    });

    expect(setAuthSessionMock).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(result.legalStatus).toBe(legalStatus);
  });

  it('updates a professional email in the current account using its normalized value', async () => {
    patchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          email: 'professional@example.com',
          verificationEmailSent: true,
        },
      },
    } as AxiosResponse);

    const result = await updateUnverifiedProfessionalEmail('  Professional@Example.COM ');

    expect(patchMock).toHaveBeenCalledWith('/auth/me/email', {
      email: 'professional@example.com',
    });
    expect(result).toEqual({
      email: 'professional@example.com',
      verificationEmailSent: true,
    });
  });

  it('sends clinic Google registration fields through the auth contract', async () => {
    mockSuccessfulAuthResponse();

    await authenticateWithGoogle({
      idToken: 'google-id-token',
      userType: 'CLINIC',
      expectedUserType: 'CLINIC',
      acceptedLegalDocumentKeys: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      clinicCommercialName: 'Clínica Demo',
    });

    expect(postMock).toHaveBeenCalledWith(
      '/auth/google',
      expect.objectContaining({
        idToken: 'google-id-token',
        userType: 'CLINIC',
        expectedUserType: 'CLINIC',
        clinicCommercialName: 'Clínica Demo',
      }),
      expect.objectContaining({ timeout: 30000 })
    );
  });
});
