import { resolveClinicalGuestConsent, verifyClinicalGuestConsentOtp } from '../clinicalGuestConsentPublicService';

jest.mock('../../config/api', () => ({ __esModule: true, default: () => ({ apiUrl: 'https://example.test/api' }) }));

afterEach(() => jest.restoreAllMocks());

const pending = {
  stage: 'OTP_REQUIRED', status: 'PENDING', serverTime: '2026-10-27T16:00:00Z',
  maskedEmail: 'p***@example.test', otpDeliveryStatus: 'SENT',
  otpExpiresAt: '2026-10-27T16:10:00Z', canResendAt: '2026-10-27T16:01:00Z',
};

test.each([undefined, null, 'AB12-CD34'])('accepts the old and reference-aware server contracts: %s', async otpReference => {
  const data = { ...pending, ...(otpReference === undefined ? {} : { otpReference }) };
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  expect(await resolveClinicalGuestConsent('request')).toMatchObject(data);
  expect(fetchMock).toHaveBeenCalledWith('https://example.test/api/clinical-consent/guest-requests/request/resolution?otpReference=1', expect.objectContaining({ credentials: 'include' }));
});

test('verification preserves leading zeroes and opts into the reference without changing the submitted code', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ...pending, otpReference: 'AB12-CD34' } }), { status: 200 }));
  await verifyClinicalGuestConsentOtp('request', '001234');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/otp/verify?otpReference=1'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: '001234' }) }));
});
