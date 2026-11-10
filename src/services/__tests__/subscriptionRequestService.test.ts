import { AxiosError, AxiosHeaders } from 'axios';
import { publicApi } from '../api';
import { submitSubscriptionRequest, getSubscriptionConditions, SubscriptionRequestError, type SubscriptionRequest } from '../subscriptionRequestService';
jest.mock('../api', () => ({ publicApi: { get: jest.fn(), post: jest.fn() } }));
const input: SubscriptionRequest = { planId: 'calma', firstName: 'Nombre', lastName: 'Sintético', email: 'fixture@example.invalid', phone: '', licenseNumber: '', accepted: true, conditionsVersion: 'fixture', conditionsHash: 'a'.repeat(64), privacyVersion: 'privacy', privacyHash: 'b'.repeat(64) };
beforeEach(() => jest.clearAllMocks());

it('uses the public client and a timeout longer than the provider timeout', async () => {
  jest.mocked(publicApi.post).mockResolvedValue({ data: { success: true } });
  await submitSubscriptionRequest(input);
  expect(publicApi.post).toHaveBeenCalledWith('/subscription-requests', input, { timeout: 20000 });
});
it.each([400, 409, 429, 503])('maps HTTP %s to a safe recoverable error', async status => {
  const config = { headers: new AxiosHeaders() };
  jest.mocked(publicApi.post).mockRejectedValue(new AxiosError('private provider detail', undefined, config, undefined, { data: { message: 'private detail' }, status, statusText: 'Failure', headers: {}, config }));
  await expect(submitSubscriptionRequest(input)).rejects.toBeInstanceOf(SubscriptionRequestError);
  try { await submitSubscriptionRequest(input); } catch (error) {
    expect(error).toMatchObject({ conditionsChanged: status === 409 });
    expect(String(error)).not.toContain('private detail');
  }
});
it('does not treat an invalid or simulated API response as confirmation', async () => {
  jest.mocked(publicApi.post).mockResolvedValue({ data: { success: false } });
  await expect(submitSubscriptionRequest(input)).rejects.toThrow('No hemos podido confirmar');
});
it('rejects incomplete conditions so the form cannot accept unavailable text', async () => {
  jest.mocked(publicApi.get).mockResolvedValue({ data: { version: 'fixture' } });
  await expect(getSubscriptionConditions()).rejects.toThrow();
});
