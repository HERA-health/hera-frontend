import { z } from 'zod';
import {
  GuestConsentHttpError,
  requestGuestConsentJson,
} from '../guestConsentHttpClient';

describe('guest consent HTTP client', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the timeout active while the response body is being consumed', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    } as Response));

    const request = requestGuestConsentJson({
      url: 'https://example.test/guest',
      schema: z.object({ success: z.literal(true) }),
      timeoutMs: 25,
    });
    const expectation = expect(request).rejects.toMatchObject<Partial<GuestConsentHttpError>>({
      failure: 'TIMEOUT',
    });
    await jest.advanceTimersByTimeAsync(30);

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a domain OTP validation response without exposing its body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({
        success: false,
        code: 'CLINIC_GUEST_CONSENT_OTP_INVALID',
        error: 'sensitive provider detail',
      }),
    } as Response);

    await expect(requestGuestConsentJson({
      url: 'https://example.test/guest',
      schema: z.never(),
      otpInvalidCode: 'CLINIC_GUEST_CONSENT_OTP_INVALID',
    })).rejects.toMatchObject<Partial<GuestConsentHttpError>>({
      failure: 'OTP_INVALID',
      message: 'OTP_INVALID',
    });
  });

  it('uses the effective Retry-After returned by the backend', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '137' }),
      json: async () => ({
        success: false,
        code: 'CLINICAL_GUEST_CONSENT_UNAVAILABLE',
      }),
    } as Response);

    await expect(requestGuestConsentJson({
      url: 'https://example.test/guest',
      schema: z.never(),
    })).rejects.toMatchObject<Partial<GuestConsentHttpError>>({
      failure: 'RATE_LIMITED',
      retryAfterSeconds: 137,
    });
  });
});
