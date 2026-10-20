jest.mock('../api', () => ({ api: { get: jest.fn() } }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
import { api } from '../api';
import { loadPublicPackageCatalog } from '../packageService';
import { offer } from '../../components/packages/testing/packageFixtures';

beforeEach(() => jest.clearAllMocks());

it('keeps published offers and the disabled acquisition state as separate information', async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: [offer], acquisitionsEnabled: false } });
  expect(await loadPublicPackageCatalog('specialist')).toEqual({ offers: [offer], acquisitionsEnabled: false });
});

it.each([true, undefined])('keeps acquisition enabled for supported and legacy responses: %s', async enabled => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: [offer], acquisitionsEnabled: enabled } });
  expect(await loadPublicPackageCatalog('specialist')).toEqual({ offers: [offer], acquisitionsEnabled: true });
});

it('propagates a catalog error instead of reporting an empty catalog', async () => {
  jest.mocked(api.get).mockRejectedValue(new Error('Network failure'));
  await expect(loadPublicPackageCatalog('specialist')).rejects.toThrow('Network failure');
});
