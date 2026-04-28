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
  removeFavoriteSpecialist,
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
});
