import {
  cachedGet,
  clearRequestCache,
  getCachedValue,
  invalidateRequestCache,
  rotateRequestCacheScope,
} from '../requestCache';

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

  it('keeps authentication scopes separated without exposing tokens', async () => {
    const loader = jest.fn(async () => ['session-1']);

    await cachedGet('professional:sessions', loader);
    rotateRequestCacheScope();
    await cachedGet('professional:sessions', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('keeps explicit cache subscopes inside the authenticated session scope', async () => {
    const loader = jest.fn()
      .mockResolvedValueOnce('account-a-clinical-data')
      .mockResolvedValueOnce('account-b-clinical-data');

    await expect(cachedGet('clinical:workspace', loader, {
      scope: 'general',
      ttlMs: 60_000,
    })).resolves.toBe('account-a-clinical-data');

    rotateRequestCacheScope();

    await expect(cachedGet('clinical:workspace', loader, {
      scope: 'general',
      ttlMs: 60_000,
    })).resolves.toBe('account-b-clinical-data');
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

  it('cannot repopulate the next account scope after a boundary rotation', async () => {
    const accountARequest = createDeferred<string>();
    const accountALoad = cachedGet('professional:home', () => accountARequest.promise);

    rotateRequestCacheScope();
    accountARequest.resolve('account-a-home');
    await expect(accountALoad).resolves.toBe('account-a-home');

    const accountBLoader = jest.fn(async () => 'account-b-home');
    await expect(cachedGet('professional:home', accountBLoader)).resolves.toBe('account-b-home');
    expect(accountBLoader).toHaveBeenCalledTimes(1);
    expect(getCachedValue('professional:home')).toBe('account-b-home');
  });

  it('removes the previous account cache when the authentication scope rotates', async () => {
    await cachedGet('professional:home', async () => 'account-a-home', { ttlMs: 60000 });
    expect(getCachedValue('professional:home')).toBe('account-a-home');

    rotateRequestCacheScope();
    expect(getCachedValue('professional:home')).toBeNull();
    await cachedGet('professional:home', async () => 'account-b-home', { ttlMs: 60000 });
    invalidateRequestCache('professional:home');
    expect(getCachedValue('professional:home')).toBeNull();

  });

  it('keeps cached data across same-session token refreshes', async () => {
    const loader = jest.fn(async () => 'same-account-home');
    await cachedGet('professional:home', loader, { ttlMs: 60000 });
    await cachedGet('professional:home', loader, { ttlMs: 60000 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a scoped response that resolves after targeted invalidation', async () => {
    const staleRequest = createDeferred<string>();
    const loader = jest.fn()
      .mockReturnValueOnce(staleRequest.promise)
      .mockResolvedValueOnce('fresh-home');

    const firstResult = cachedGet('professional:home', loader);
    invalidateRequestCache('professional:home');
    const secondResult = cachedGet('professional:home', loader);
    staleRequest.resolve('stale-home');

    await expect(firstResult).resolves.toBe('stale-home');
    await expect(secondResult).resolves.toBe('fresh-home');
    expect(getCachedValue('professional:home')).toBe('fresh-home');
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
