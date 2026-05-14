jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

import { api } from '../api';
import {
  addFavoriteSpecialist,
  getAllSpecialists,
  getSpecialistPersonalization,
  mapSpecialistToProfile,
  removeFavoriteSpecialist,
  type SpecialistData,
} from '../specialistsService';

const mockedApi = api as jest.Mocked<typeof api>;

describe('specialistsService personalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
