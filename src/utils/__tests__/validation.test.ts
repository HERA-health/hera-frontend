import {
  getPasswordErrors,
  getPasswordRequirementStatuses,
  validatePassword,
} from '../validation';

describe('password validation policy', () => {
  it('accepts passwords with length, uppercase, lowercase, number and symbol', () => {
    expect(validatePassword('Password1!')).toBe(true);
    expect(validatePassword('Ñandú123!')).toBe(true);
  });

  it('rejects passwords missing any required condition', () => {
    expect(validatePassword('Pass1!')).toBe(false);
    expect(validatePassword('password1!')).toBe(false);
    expect(validatePassword('PASSWORD1!')).toBe(false);
    expect(validatePassword('Password!')).toBe(false);
    expect(validatePassword('Password1')).toBe(false);
  });

  it('returns inline requirement status for each unmet condition', () => {
    const statuses = getPasswordRequirementStatuses('password');

    expect(statuses).toEqual([
      expect.objectContaining({ key: 'minLength', met: true }),
      expect.objectContaining({ key: 'uppercase', met: false, label: '1 mayúscula' }),
      expect.objectContaining({ key: 'lowercase', met: true }),
      expect.objectContaining({ key: 'number', met: false, label: '1 número' }),
      expect.objectContaining({ key: 'symbol', met: false, label: '1 símbolo' }),
    ]);
  });

  it('does not treat spaces as symbols', () => {
    expect(validatePassword('Password1 ')).toBe(false);
    expect(getPasswordErrors('Password1 ')).toEqual(['1 símbolo']);
  });
});
