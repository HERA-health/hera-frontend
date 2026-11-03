import { normalizeRegistrationPhone } from '../registrationPhone';

it.each([
  ['600 123 456', '+34600123456'], [' +34 (600) 123-456 ', '+34600123456'],
  ['0034 600.123.456', '+34600123456'], ['+44 20 7946 0958', '+442079460958'],
  ['+12345678', '+12345678'], ['+123456789012345', '+123456789012345'],
])('normalizes %s to %s', (input, expected) => {
  expect(normalizeRegistrationPhone(input)).toBe(expected);
});

it.each([
  [undefined, 'PHONE_REQUIRED'], ['', 'PHONE_REQUIRED'], ['  ', 'PHONE_REQUIRED'],
  ['letters', 'INVALID_PHONE'], ['+123', 'INVALID_PHONE'], ['+012345678', 'INVALID_PHONE'],
  ['+1234567890123456', 'INVALID_PHONE'], ['1'.repeat(41), 'INVALID_PHONE'],
])('rejects %s with %s', (input, code) => {
  expect(() => normalizeRegistrationPhone(input)).toThrow(expect.objectContaining({ code }));
});
