import { cachedGet, clearRequestCache } from '../requestCache';
import { getAuthSessionCacheScope } from '../api';

jest.mock('../api', () => ({
  getAuthSessionCacheScope: jest.fn(() => 'auth:test-session'),
}));

const getAuthSessionCacheScopeMock = getAuthSessionCacheScope as jest.MockedFunction<typeof getAuthSessionCacheScope>;

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

describe('requestCache.cachedGet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getAuthSessionCacheScopeMock.mockReturnValue('auth:test-session');
  });

  it('coalesces concurrent requests for the same scoped cache key', async () => {
    const loader = jest.fn(async () => ['session-1']);

    const [firstResult, secondResult] = await Promise.all([
      cachedGet('professional:sessions', loader),
      cachedGet('professional:sessions', loader),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(['session-1']);
    expect(secondResult).toEqual(['session-1']);
  });

  it('keeps session scopes separated without exposing tokens', async () => {
    const loader = jest.fn(async () => ['session-1']);

    await cachedGet('professional:sessions', loader);
    getAuthSessionCacheScopeMock.mockReturnValue('auth:next-session');
    await cachedGet('professional:sessions', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not cache a response that resolves after the cache was cleared', async () => {
    const staleRequest = createDeferred<string[]>();
    const loader = jest.fn()
      .mockReturnValueOnce(staleRequest.promise)
      .mockResolvedValueOnce(['fresh-session']);

    const firstResult = cachedGet('professional:sessions', loader);

    clearRequestCache();
    staleRequest.resolve(['stale-session']);

    await expect(firstResult).resolves.toEqual(['stale-session']);
    await expect(cachedGet('professional:sessions', loader)).resolves.toEqual(['fresh-session']);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not let an old request remove a newer in-flight request', async () => {
    const staleRequest = createDeferred<string[]>();
    const freshRequest = createDeferred<string[]>();
    const loader = jest.fn()
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(freshRequest.promise);

    const firstResult = cachedGet('professional:sessions', loader);
    clearRequestCache();
    const secondResult = cachedGet('professional:sessions', loader);

    staleRequest.resolve(['stale-session']);
    await expect(firstResult).resolves.toEqual(['stale-session']);

    const thirdResult = cachedGet('professional:sessions', loader);
    expect(loader).toHaveBeenCalledTimes(2);

    freshRequest.resolve(['fresh-session']);
    await expect(Promise.all([secondResult, thirdResult])).resolves.toEqual([
      ['fresh-session'],
      ['fresh-session'],
    ]);
  });

  it('evicts the oldest cached response when the response cache reaches its limit', async () => {
    for (let index = 0; index <= 100; index += 1) {
      await cachedGet(
        `professional:sessions:${index}`,
        async () => [`session-${index}`],
        { ttlMs: 60000 },
      );
    }

    const evictedLoader = jest.fn(async () => ['fresh-session-0']);
    const retainedLoader = jest.fn(async () => ['unexpected-session-100']);

    await expect(cachedGet(
      'professional:sessions:0',
      evictedLoader,
      { ttlMs: 60000 },
    )).resolves.toEqual(['fresh-session-0']);
    await expect(cachedGet(
      'professional:sessions:100',
      retainedLoader,
      { ttlMs: 60000 },
    )).resolves.toEqual(['session-100']);

    expect(evictedLoader).toHaveBeenCalledTimes(1);
    expect(retainedLoader).not.toHaveBeenCalled();
  });
});
