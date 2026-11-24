describe('secureSessionStorage on web', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not persist the refresh token in browser storage', async () => {
    const asyncStorage = {
      setItem: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue('legacy-token'),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };

    const secureStore = {
      setItemAsync: jest.fn().mockResolvedValue(undefined),
      getItemAsync: jest.fn().mockResolvedValue(null),
      deleteItemAsync: jest.fn().mockResolvedValue(undefined),
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    };

    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => asyncStorage);
    jest.doMock('expo-secure-store', () => secureStore);

    let service!: typeof import('../secureSessionStorage');
    jest.isolateModules(() => {
      service = require('../secureSessionStorage');
    });

    await service.persistRefreshToken('secret-refresh-token');
    const value = await service.getPersistedRefreshToken();
    await service.clearPersistedRefreshToken();

    expect(asyncStorage.setItem).not.toHaveBeenCalled();
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('@hera_refresh_token');
    expect(value).toBeNull();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

it.each(['android', 'ios'])('keeps the refresh token in SecureStore on %s with a supported key', async (OS) => {
  jest.resetModules();
  const storage = {
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    getItemAsync: jest.fn().mockResolvedValue('test-session'),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  };
  jest.doMock('react-native', () => ({ Platform: { OS } }));
  jest.doMock('expo-secure-store', () => storage);
  const service: typeof import('../secureSessionStorage') = require('../secureSessionStorage');
  await service.persistRefreshToken('test-session');
  expect(await service.getPersistedRefreshToken()).toBe('test-session');
  await service.clearPersistedRefreshToken();
  const key = storage.getItemAsync.mock.calls[0][0];
  expect(key).toMatch(/^[\w.-]+$/);
  expect(storage.setItemAsync).toHaveBeenCalledWith(key, 'test-session', {
    keychainAccessible: storage.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  expect(storage.deleteItemAsync).toHaveBeenCalledWith(key);
});
