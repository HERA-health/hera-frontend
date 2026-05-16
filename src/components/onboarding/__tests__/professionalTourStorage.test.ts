import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearProfessionalTourSeen,
  getProfessionalTourStorageKey,
  hasSeenProfessionalTour,
  markProfessionalTourSeen,
} from '../professionalTourStorage';
import { getProfessionalTourDefinition } from '../professionalTourDefinitions';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('professionalTourStorage', () => {
  const definition = getProfessionalTourDefinition('professional_home_v1');
  const userId = 'professional-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it('creates a per-user, per-version key', () => {
    expect(getProfessionalTourStorageKey(userId, definition)).toBe(
      '@hera/professional_tour:professional-1:professional_home_v1:v1',
    );
  });

  it('returns false until a tour has been marked as seen', async () => {
    await expect(hasSeenProfessionalTour(userId, definition)).resolves.toBe(false);
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
      '@hera/professional_tour:professional-1:professional_home_v1:v1',
    );
  });

  it('persists skipped and completed tours with non-sensitive metadata', async () => {
    await markProfessionalTourSeen(userId, definition, 'skipped');

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, rawPayload] = mockedAsyncStorage.setItem.mock.calls[0];
    const payload = JSON.parse(rawPayload) as {
      status: string;
      tourId: string;
      updatedAt: string;
      version: number;
    };

    expect(payload).toMatchObject({
      status: 'skipped',
      tourId: 'professional_home_v1',
      version: 1,
    });
    expect(payload.updatedAt).toEqual(expect.any(String));
  });

  it('clears the same versioned key', async () => {
    await clearProfessionalTourSeen(userId, definition);

    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(
      '@hera/professional_tour:professional-1:professional_home_v1:v1',
    );
  });
});
