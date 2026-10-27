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

it('shares concurrent catalog reads but revalidates after completion or failure', async () => {
  let resolve: (value: { data: { data: typeof offer[] } }) => void = () => { throw new Error('not started'); };
  jest.mocked(api.get).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const first = loadPublicPackageCatalog('specialist');
  const second = loadPublicPackageCatalog('specialist');
  expect(api.get).toHaveBeenCalledTimes(1);
  resolve({ data: { data: [offer] } });
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  jest.mocked(api.get).mockRejectedValueOnce(new Error('temporary failure'));
  await expect(loadPublicPackageCatalog('specialist')).rejects.toThrow('temporary failure');
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: [], acquisitionsEnabled: false } });
  await expect(loadPublicPackageCatalog('specialist')).resolves.toEqual({ offers: [], acquisitionsEnabled: false });
  expect(api.get).toHaveBeenCalledTimes(3);
});
