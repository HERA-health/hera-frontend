import { captureClinicalPinResetUrl, clearClinicalPinResetIntent, getClinicalPinResetToken, hasPendingClinicalPinReset, setClinicalPinReturnContext, takeClinicalPinReturnClient } from '../clinicalPinResetIntent';

afterEach(() => { clearClinicalPinResetIntent(); jest.restoreAllMocks(); });
test('captures web and native links without putting secrets in navigation URLs', () => {
  const token = 'a'.repeat(64);
  expect(captureClinicalPinResetUrl(`https://example.test/clinical-pin/reset?token=${token}`)).toBe('https://example.test/clinical-pin/reset');
  expect(getClinicalPinResetToken()).toBe(token);
  expect(captureClinicalPinResetUrl(`hera://clinical-pin/reset?token=${token}`)).toBe('hera://clinical-pin/reset');
  expect(hasPendingClinicalPinReset()).toBe(true);
});
test('invalid or expired links never yield usable tokens', () => {
  captureClinicalPinResetUrl('hera://clinical-pin/reset?token=invalid');
  expect(getClinicalPinResetToken()).toBe('');
  const now = Date.now();
  captureClinicalPinResetUrl(`hera://clinical-pin/reset?token=${'a'.repeat(64)}`);
  jest.spyOn(Date, 'now').mockReturnValue(now + 16 * 60_000);
  expect(getClinicalPinResetToken()).toBeNull();
});
test('return to an expediente is local and bound to the authenticated account', () => {
  setClinicalPinReturnContext('user-a', 'client-a');
  expect(takeClinicalPinReturnClient('user-b')).toBeUndefined();
  setClinicalPinReturnContext('user-a', 'client-a');
  expect(takeClinicalPinReturnClient('user-a')).toBe('client-a');
  expect(takeClinicalPinReturnClient('user-a')).toBeUndefined();
});
