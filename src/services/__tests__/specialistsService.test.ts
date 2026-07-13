jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:3000/api',
      headers: {
        common: {},
      },
    },
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

import { api } from '../api';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import {
  addFavoriteSpecialist,
  getFeaturedSpecialists,
  getAllSpecialists,
  getPublicSpecialistDetails,
  getPublicSpecialistDirectory,
  invalidateSpecialistsCache,
  getSpecialistPersonalization,
  mapSpecialistToProfile,
  mapPublicSpecialistToProfile,
  openPublicCertificateDocument,
  removeFavoriteSpecialist,
  resolveSpecialistAvatar,
  resolvePublicSpecialistDocumentUrl,
  type SpecialistData,
  type PublicSpecialistProfileData,
} from '../specialistsService';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedWebBrowser = jest.mocked(WebBrowser);

describe('specialistsService personalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateSpecialistsCache();
  });

  it('loads private specialist personalization from the client endpoint', async () => {
    const payload = {
      primarySpecialist: null,
      favoriteSpecialists: [],
      favoriteSpecialistIds: ['spec-1'],
    };
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: payload,
      },
    });

    await expect(getSpecialistPersonalization()).resolves.toEqual(payload);
    expect(mockedApi.get).toHaveBeenCalledWith('/specialists/me/personalization');
  });

  it('favorites and unfavorites specialists through protected endpoints', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });

    await addFavoriteSpecialist('spec-1');
    await removeFavoriteSpecialist('spec-1');

    expect(mockedApi.post).toHaveBeenCalledWith('/specialists/spec-1/favorite');
    expect(mockedApi.delete).toHaveBeenCalledWith('/specialists/spec-1/favorite');
  });

  it('sends professional type filters to the public specialists endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    await expect(getAllSpecialists({ professionalType: 'PSYCHIATRIST' })).resolves.toEqual([]);

    expect(mockedApi.get).toHaveBeenCalledWith('/specialists?professionalType=PSYCHIATRIST');
  });

  it('loads the compact featured specialist payload without requesting the full directory', async () => {
    const payload = [{
      id: 'featured-1',
      name: 'Dra. Elena',
      avatar: null,
      specialization: 'Psicología sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH' as const,
      professionalTypeLabel: 'Psicóloga sanitaria',
      pricePerSession: 80,
      offersOnline: true,
      offersInPerson: false,
      yearsInPractice: 8,
      gradientId: 'salvia-lavanda',
      rating: 4.8,
      reviewCount: 15,
    }];
    mockedApi.get.mockResolvedValue({ data: { success: true, data: payload } });

    await expect(getFeaturedSpecialists()).resolves.toEqual(payload);

    expect(mockedApi.get).toHaveBeenCalledWith('/specialists/featured');
    expect(mockedApi.get).not.toHaveBeenCalledWith('/specialists');
  });

  it('coalesces identical public requests in flight without caching resolved responses', async () => {
    const payload = {
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    };
    let resolveRequest: ((value: { data: { success: boolean; data: typeof payload } }) => void) | undefined;
    const pendingRequest = new Promise<{ data: { success: boolean; data: typeof payload } }>((resolve) => {
      resolveRequest = resolve;
    });
    mockedApi.get.mockReturnValueOnce(pendingRequest);

    const first = getPublicSpecialistDirectory({ page: 1 });
    const second = getPublicSpecialistDirectory({ page: 1 });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    resolveRequest?.({ data: { success: true, data: payload } });
    await expect(Promise.all([first, second])).resolves.toEqual([payload, payload]);

    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: payload } });
    await expect(getPublicSpecialistDirectory({ page: 1 })).resolves.toEqual(payload);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('loads public details from the visibility-safe endpoint and maps hidden reviews explicitly', async () => {
    const payload: PublicSpecialistProfileData = {
      id: 'public-1',
      isPubliclyListed: false,
      specialization: 'Psicología sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH',
      professionalTypeLabel: 'Psicólogo/a sanitario/a',
      description: 'Perfil profesional',
      pricePerSession: 70,
      rating: null,
      reviewCount: null,
      firstVisitFree: false,
      avatar: 'https://example.com/avatar.jpg',
      user: { name: 'Elena', avatar: null },
      offersOnline: true,
      offersInPerson: false,
      matchingProfile: { specialties: ['anxiety'] },
      reviews: [],
    };
    mockedApi.get.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await getPublicSpecialistDetails('public-1');
    const mapped = mapPublicSpecialistToProfile(result);

    expect(mockedApi.get).toHaveBeenCalledWith('/specialists/public/public-1');
    expect(result).not.toHaveProperty('userId');
    expect(mapped.rating).toBe(0);
    expect(mapped.reviewCount).toBe(0);
    expect(mapped.isPubliclyListed).toBe(false);
  });

  it('requests only the selected public directory page and filters', async () => {
    const payload = {
      items: [],
      page: 2,
      pageSize: 12,
      total: 12,
      hasMore: false,
    };
    mockedApi.get.mockResolvedValue({ data: { success: true, data: payload } });

    await expect(getPublicSpecialistDirectory({
      q: 'ansiedad',
      professionalType: 'PSYCHIATRIST',
      modality: 'ONLINE',
      specialties: ['anxiety', 'depression'],
      approaches: ['cbt', 'emdr'],
      minRating: 4.5,
      maxPrice: 60,
      sort: 'RATING_DESC',
      page: 2,
    })).resolves.toEqual(payload);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/specialists/directory?q=ansiedad&professionalType=PSYCHIATRIST&modality=ONLINE&specialty=anxiety&specialty=depression&approach=cbt&approach=emdr&minRating=4.5&maxPrice=60&sort=RATING_DESC&page=2'
    );
  });

  it('does not invent an online modality when the public profile exposes none', () => {
    const specialist = mapSpecialistToProfile({
      id: 'specialist-1',
      userId: 'user-1',
      specialization: 'Psicología sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH',
      professionalTypeLabel: 'Psicólogo/a sanitario/a',
      description: 'Bio profesional',
      pricePerSession: 80,
      rating: 4.9,
      reviewCount: 12,
      firstVisitFree: false,
      avatar: null,
      user: { name: 'Dra. Elena' },
      offersOnline: false,
      offersInPerson: false,
      matchingProfile: {},
    } satisfies SpecialistData);

    expect(specialist.sessionTypes).toEqual([]);
  });

  it('maps canonical user avatar before the legacy specialist avatar', () => {
    const specialist = mapSpecialistToProfile({
      id: 'specialist-avatar',
      userId: 'user-avatar',
      specialization: 'Psicologia sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH',
      professionalTypeLabel: 'Psicologo/a sanitario/a',
      description: 'Bio profesional',
      pricePerSession: 80,
      rating: 4.9,
      reviewCount: 12,
      firstVisitFree: false,
      avatar: 'https://cdn.example.com/legacy-avatar.jpg',
      user: {
        name: 'Dra. Elena',
        avatar: 'https://cdn.example.com/user-avatar.jpg',
      },
      offersOnline: true,
      offersInPerson: false,
      matchingProfile: {},
    } satisfies SpecialistData);

    expect(specialist.avatar).toBe('https://cdn.example.com/user-avatar.jpg');
  });

  it('falls back to the legacy specialist avatar when user avatar is missing', () => {
    const specialist = {
      id: 'specialist-legacy-avatar',
      userId: 'user-legacy-avatar',
      specialization: 'Psicologia sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH',
      professionalTypeLabel: 'Psicologo/a sanitario/a',
      description: 'Bio profesional',
      pricePerSession: 80,
      rating: 4.9,
      reviewCount: 12,
      firstVisitFree: false,
      avatar: 'https://cdn.example.com/legacy-avatar.jpg',
      user: {
        name: 'Dra. Elena',
        avatar: null,
      },
      offersOnline: true,
      offersInPerson: false,
      matchingProfile: {},
    } satisfies SpecialistData;

    expect(resolveSpecialistAvatar(specialist)).toBe('https://cdn.example.com/legacy-avatar.jpg');
    expect(mapSpecialistToProfile(specialist).avatar).toBe('https://cdn.example.com/legacy-avatar.jpg');
  });

  it('maps public certificate document metadata for the profile experience section', () => {
    const specialist = mapSpecialistToProfile({
      id: 'specialist-certificates',
      userId: 'user-certificates',
      specialization: 'Psicología sanitaria',
      professionalType: 'PSYCHOLOGIST_HEALTH',
      professionalTypeLabel: 'Psicólogo/a sanitario/a',
      description: 'Bio profesional',
      pricePerSession: 80,
      rating: 4.9,
      reviewCount: 12,
      firstVisitFree: false,
      avatar: null,
      user: { name: 'Dra. Elena' },
      offersOnline: true,
      offersInPerson: false,
      matchingProfile: {},
      certificates: [{
        id: 'cert-1',
        name: 'Máster clínico',
        issuer: 'Universidad',
        validUntil: null,
        educationId: 'edu-1',
        mimeType: 'image/png',
        documentUrl: '/api/specialists/specialist-certificates/certificates/cert-1/document',
        previewUrl: '/api/specialists/specialist-certificates/certificates/cert-1/document',
      }],
    } satisfies SpecialistData);

    expect(specialist.certifications).toEqual([{
      id: 'cert-1',
      name: 'Máster clínico',
      issuer: 'Universidad',
      validUntil: null,
      educationId: 'edu-1',
      mimeType: 'image/png',
      documentUrl: 'http://localhost:3000/api/specialists/specialist-certificates/certificates/cert-1/document',
      previewUrl: 'http://localhost:3000/api/specialists/specialist-certificates/certificates/cert-1/document',
    }]);
  });

  it('resolves relative public document URLs against the API origin', () => {
    expect(resolvePublicSpecialistDocumentUrl('/api/specialists/spec-1/certificates/cert-1/document'))
      .toBe('http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document');
  });

  it('opens public certificates directly without downloading them as blobs', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockedWebBrowser.openBrowserAsync.mockResolvedValue(
      { type: 'cancel' } as Awaited<ReturnType<typeof WebBrowser.openBrowserAsync>>
    );

    try {
      await openPublicCertificateDocument(
        'spec-1',
        'cert-1',
        'application/pdf',
        '/api/specialists/spec-1/certificates/cert-1/document'
      );
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    }

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(mockedWebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document'
    );
  });
});
