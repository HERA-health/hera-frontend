import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { api } from '../api';
jest.mock('../../config/api', () => ({ __esModule: true, default: () => ({ apiUrl: 'http://diagnostic.invalid/api' }) }));
import {
  GeneralRateLimitError, getGeneralRateLimitRetryAt, isGeneralRead,
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
});
