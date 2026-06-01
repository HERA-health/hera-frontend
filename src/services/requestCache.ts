import { getAuthSessionCacheScope } from './api';

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

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

const getScopedCacheKey = (cacheKey: string, scope?: string): string =>
  `${scope ?? getAuthSessionCacheScope()}:${cacheKey}`;

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
  let request: Promise<T>;

  request = Promise.resolve()
    .then(loader)
    .then((data) => {
      if (requestGeneration === cacheGeneration) {
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
