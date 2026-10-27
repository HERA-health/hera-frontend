import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { api } from '../api';
jest.mock('../../config/api', () => ({ __esModule: true, default: () => ({ apiUrl: 'http://diagnostic.invalid/api' }) }));
import {
  GeneralRateLimitError, getGeneralRateLimitRetryAt, isGeneralRead,
  PublicDiscoveryRateLimitError, isPublicDiscoveryRequest, isDiscoveryRequest, recordGeneralRateLimit,
  parseRetryAfter, resetGeneralRateLimit,
} from '../generalRateLimit';

jest.mock('../secureSessionStorage', () => ({
  clearPersistedRefreshToken: jest.fn(), getPersistedRefreshToken: jest.fn(), persistRefreshToken: jest.fn(),
}));

describe('general rate limit transport recovery', () => {
  const originalAdapter = api.defaults.adapter;
  beforeEach(() => { jest.useFakeTimers(); resetGeneralRateLimit(); });
  afterEach(() => {
    resetGeneralRateLimit();
    api.defaults.adapter = originalAdapter;
    jest.useRealTimers();
  });

  it('parses seconds and HTTP dates, rejecting invalid values', () => {
    const now = Date.parse('2026-09-06T10:00:00Z');
    expect(parseRetryAfter('30', now)).toBe(now + 30_000);
    expect(parseRetryAfter(30, now)).toBe(now + 30_000);
    expect(parseRetryAfter('Sun, 06 Sep 2026 10:01:00 GMT', now)).toBe(now + 60_000);
    for (const value of [-1, '', null, {}, Infinity, 'invalid']) expect(parseRetryAfter(value, now)).toBeNull();
  });

  it('blocks affected reads until expiry without replaying writes or blocking auth', async () => {
    let blocked = true;
    const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async (config) => {
      if (blocked && config.url === '/dashboard/home') {
        throw new AxiosError('limited', 'ERR_BAD_REQUEST', config, undefined, {
          config, status: 429, statusText: 'Too Many Requests', headers: new AxiosHeaders(),
          data: { limiter: 'general', retryAfter: '30' },
        });
      }
      return { config, status: 200, statusText: 'OK', headers: new AxiosHeaders(), data: {} };
    });
    api.defaults.adapter = adapter;
    await expect(api.get('/dashboard/home')).rejects.toBeInstanceOf(GeneralRateLimitError);
    await expect(api.get('/specialists/me/clients')).rejects.toBeInstanceOf(GeneralRateLimitError);
    expect(adapter).toHaveBeenCalledTimes(1);
    await api.post('/sessions', {});
    await api.get('/auth/me');
    expect(adapter).toHaveBeenCalledTimes(3);
    blocked = false;
    jest.advanceTimersByTime(30_000);
    expect(adapter).toHaveBeenCalledTimes(3);
    await api.get('/dashboard/home');
    expect(adapter).toHaveBeenCalledTimes(4);
  });

  it.each([
    [{ message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.' }, '20', 20],
    [{ limiter: 'general', retryAfter: 'invalid' }, undefined, 60],
    [{ limiter: 'clinical-access', retryAfter: 20 }, undefined, 0],
  ])('supports legacy responses and isolates other limiters', async (data, header, seconds) => {
    const now = Date.now();
    api.defaults.adapter = async (config) => {
      throw new AxiosError('limited', 'ERR_BAD_REQUEST', config, undefined, {
        config, status: 429, statusText: 'Too Many Requests', headers: new AxiosHeaders(header ? { 'retry-after': header } : {}), data,
      });
    };
    await expect(api.get('/dashboard/home')).rejects.toThrow();
    expect(getGeneralRateLimitRetryAt()).toBe(seconds ? now + seconds * 1000 : 0);
  });

  it('ignores late 429 responses from a previous authentication scope', async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    api.defaults.adapter = async (config) => {
      await pending;
      throw new AxiosError('limited', 'ERR_BAD_REQUEST', config, undefined, {
        config, status: 429, statusText: 'Too Many Requests', headers: new AxiosHeaders(),
        data: { limiter: 'general', retryAfter: 60 },
      });
    };
    const request = api.get('/dashboard/home');
    await Promise.resolve();
    await Promise.resolve();
    resetGeneralRateLimit();
    release?.();
    await expect(request).rejects.toThrow();
    expect(getGeneralRateLimitRetryAt()).toBe(0);
  });

  it('only gates reads, never authentication or writes', () => {
    expect(isGeneralRead('/billing/summary')).toBe(true);
    expect(isGeneralRead('/dashboard?range=week')).toBe(true);
    expect(isGeneralRead('/auth/me')).toBe(false);
    expect(isGeneralRead('/sessions', 'post')).toBe(false);
  });

  const publicRoutes = [
    ['/specialists', 'get'], ['/specialists/featured', 'get'],
    ['/specialists/directory/?page=2', 'get'], ['/specialists/profile-options', 'get'],
    ['/specialists/public/public-slug', 'get'], ['/specialists/id/available-slots?date=2026-10-27', 'get'],
    ['/specialists/id/packages', 'get'], ['/specialists/id/certificates/cert/document', 'get'],
    ['/reviews/specialist/id', 'get'], ['/hera-commissions/directory-entry/public-slug', 'get'],
    ['/specialists/search', 'post'], ['/specialists/directory/search', 'post'],
  ];

  it.each(publicRoutes)('allows %s despite an unrelated general cooldown', async (url, method) => {
    recordGeneralRateLimit(900, undefined);
    const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async config =>
      ({ config, status: 200, statusText: 'OK', headers: new AxiosHeaders(), data: {} }));
    api.defaults.adapter = adapter;
    expect(isPublicDiscoveryRequest(url, method)).toBe(true);
    expect(isGeneralRead(url, method)).toBe(false);
    await expect(api.request({ url, method })).resolves.toMatchObject({ status: 200 });
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each(['public-discovery', 'general'])('isolates a public %s 429, preserves Retry-After and permits recovery', async limiter => {
    const now = Date.now();
    let blocked = true;
    api.defaults.adapter = async config => {
      if (blocked && config.url === '/specialists/featured') throw new AxiosError('limited', 'ERR_BAD_REQUEST', config, undefined, {
        config, status: 429, statusText: 'Too Many Requests', headers: new AxiosHeaders({ 'retry-after': '30' }),
        data: { limiter },
      });
      return { config, status: 200, statusText: 'OK', headers: new AxiosHeaders(), data: {} };
    };
    await expect(api.get('/specialists/featured')).rejects.toMatchObject({
      name: 'PublicDiscoveryRateLimitError', status: 429, retryAt: now + 30_000,
    });
    expect(getGeneralRateLimitRetryAt()).toBe(0);
    await expect(api.get('/dashboard/home')).resolves.toMatchObject({ status: 200 });
    blocked = false;
    jest.advanceTimersByTime(30_000);
    await expect(api.get('/specialists/featured')).resolves.toMatchObject({ status: 200 });
  });

  it('does not classify private resources or mutations as public discovery', () => {
    for (const path of ['/specialists/me/profile', '/specialists/id', '/specialists/id/favorite',
      '/specialists/id/certificates/cert', '/reviews/specialist/id/can-review',
      '/hera-commissions/configuration', '/patient-packages/id/available-slots', '/public/patient-packages/id/payment']) {
      expect(isPublicDiscoveryRequest(path)).toBe(false);
    }
    expect(isPublicDiscoveryRequest('/specialists/featured', 'delete')).toBe(false);
    expect(isPublicDiscoveryRequest('/hera-commissions/public-requests', 'post')).toBe(false);
    expect(isDiscoveryRequest('/hera-commissions/directory-intents', 'post')).toBe(false);
    expect(new PublicDiscoveryRateLimitError(undefined, undefined).retryAt).toBe(Date.now() + 60_000);
  });

  it.each(['/specialists/specialist-id', '/specialists/matched/for-me', '/specialists/me/personalization'])(
    'allows authenticated discovery %s during an unrelated workspace cooldown', async url => {
      recordGeneralRateLimit(900, undefined);
      const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async config =>
        ({ config, status: 200, statusText: 'OK', headers: new AxiosHeaders(), data: {} }));
      api.defaults.adapter = adapter;
      expect(isDiscoveryRequest(url)).toBe(true);
      expect(isPublicDiscoveryRequest(url)).toBe(false);
      await expect(api.get(url)).resolves.toMatchObject({ status: 200 });
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(adapter.mock.calls[0][0].headers.has('X-Hera-Discovery-Visitor')).toBe(false);
    },
  );
});
