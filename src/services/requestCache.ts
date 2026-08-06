const DEFAULT_CACHE_TTL_MS = 5000;
const MAX_RESPONSE_CACHE_ENTRIES = 100;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface CachedGetOptions {
  ttlMs?: number;
  scope?: string;
}

interface CachedValueOptions extends CachedGetOptions {
  includeExpired?: boolean;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const scopedKeyGenerations = new Map<string, number>();
let cacheGeneration = 0;
let authenticationScopeGeneration = 0;

const getAuthenticationScope = (): string => `session:${authenticationScopeGeneration}`;

const getScopedCacheKey = (cacheKey: string, scope?: string): string =>
  `${getAuthenticationScope()}:${scope ?? 'default'}:${cacheKey}`;

const pruneExpiredResponseCache = (now: number): void => {
  responseCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      responseCache.delete(key);
    }
  });
};

const enforceResponseCacheLimit = (): void => {
  while (responseCache.size > MAX_RESPONSE_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (typeof oldestKey !== 'string') {
      return;
    }

    responseCache.delete(oldestKey);
  }
};

export const clearRequestCache = (): void => {
  cacheGeneration += 1;
  responseCache.clear();
  inFlightRequests.clear();
  scopedKeyGenerations.clear();
};

/**
 * Starts an isolated cache namespace at an authentication boundary.
 * Existing responses and in-flight loaders are invalidated before the next
 * account can render, while access-token refreshes within the same session do
 * not call this function.
 */
export const rotateRequestCacheScope = (): void => {
  authenticationScopeGeneration += 1;
  clearRequestCache();
};

export const invalidateRequestCache = (
  cacheKey: string,
  options: Pick<CachedGetOptions, 'scope'> = {},
): void => {
  const scopedKey = getScopedCacheKey(cacheKey, options.scope);
  responseCache.delete(scopedKey);
  inFlightRequests.delete(scopedKey);
  scopedKeyGenerations.set(scopedKey, (scopedKeyGenerations.get(scopedKey) ?? 0) + 1);
};

export const getCachedValue = <T>(
  cacheKey: string,
  options: CachedValueOptions = {},
): T | null => {
  const entry = responseCache.get(getScopedCacheKey(cacheKey, options.scope));
  if (!entry) return null;
  if (!options.includeExpired && entry.expiresAt <= Date.now()) return null;
  return entry.data as T;
};

export const cachedGet = async <T>(
  cacheKey: string,
  loader: () => Promise<T>,
  options: CachedGetOptions = {},
): Promise<T> => {
  const scopedKey = getScopedCacheKey(cacheKey, options.scope);
  const now = Date.now();
  pruneExpiredResponseCache(now);

  const cached = responseCache.get(scopedKey);

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  if (cached) {
    responseCache.delete(scopedKey);
  }

  const inFlight = inFlightRequests.get(scopedKey);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const requestGeneration = cacheGeneration;
  const requestScopedGeneration = scopedKeyGenerations.get(scopedKey) ?? 0;
  let request: Promise<T>;

  request = Promise.resolve()
    .then(loader)
    .then((data) => {
      if (
        requestGeneration === cacheGeneration
        && requestScopedGeneration === (scopedKeyGenerations.get(scopedKey) ?? 0)
      ) {
        const nextExpiresAt = Date.now() + (options.ttlMs ?? DEFAULT_CACHE_TTL_MS);
        responseCache.set(scopedKey, {
          data,
          expiresAt: nextExpiresAt,
        });
        pruneExpiredResponseCache(Date.now());
        enforceResponseCacheLimit();
      }

      return data;
    })
    .finally(() => {
      if (inFlightRequests.get(scopedKey) === request) {
        inFlightRequests.delete(scopedKey);
      }
    });

  inFlightRequests.set(scopedKey, request);
  return request;
};
