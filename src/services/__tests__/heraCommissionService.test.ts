import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accept, decide, durableCommandKey, type Action } from '../heraCommissionService';
import { subscribeCommissionAcceptance } from '../commissionAcceptanceEvents';
jest.mock('../api', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => {
 const values = new Map<string, string>();
 return { __esModule: true, default: { getItem: async (k: string) => values.get(k) ?? null, setItem: async (k: string, v: string) => { values.set(k, v); }, removeItem: async (k: string) => { values.delete(k); }, clear: async () => values.clear(), getAllKeys: async () => [...values.keys()], multiGet: async (keys: string[]) => keys.map(k => [k, values.get(k)]) } };
});
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_: string, text: string) => require('crypto').createHash('sha256').update(text).digest('hex'), randomUUID: () => require('crypto').randomUUID() }));
const post = jest.mocked(api.post);
beforeEach(async () => { post.mockReset(); await AsyncStorage.clear(); });
const input: Action = { action: 'ATTENDANCE', snapshotId: 'snapshot', outcome: 'ATTENDED', reason: 'Asistencia verificada' };
it('notifies open views only after acceptance succeeds and reuses the retry key', async () => {
 const listener = jest.fn(); const unsubscribe = subscribeCommissionAcceptance(listener);
 try {
  post.mockRejectedValueOnce(new Error('lost response')).mockResolvedValue({ data: { accountId: 'account' } });
  await expect(accept('terms-v1')).rejects.toThrow('lost response');
  expect(listener).not.toHaveBeenCalled();
  await accept('terms-v1');
  expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
  expect(listener).toHaveBeenCalledWith('terms-v1');
 } finally { unsubscribe(); }
});
it('retains the command after a lost response, then permits a later deliberate correction', async () => {
 post.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ data: { id: 'snapshot' } });
 await expect(decide('account', false, input)).rejects.toThrow('timeout');
 await decide('account', false, input);
 expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
 await decide('account', false, input);
 expect(post.mock.calls[2][1]).not.toEqual(post.mock.calls[1][1]);
});
it('separates account/action/payload, uses one concurrent key, and stores no payload', async () => {
 const [a, b] = await Promise.all([durableCommandKey('account', input), durableCommandKey('account', input)]);
 expect(a.commandKey).toBe(b.commandKey);
 expect((await durableCommandKey('other', input)).commandKey).not.toBe(a.commandKey);
 expect((await durableCommandKey('account', { ...input, reason: 'Otra razón' })).commandKey).not.toBe(a.commandKey);
 const stored = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
 expect(JSON.stringify(stored)).not.toContain(input.reason);
 expect(JSON.stringify(stored)).not.toContain(input.snapshotId);
});
