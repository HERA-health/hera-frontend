import { isLargeScreenForRole } from '../mainLayoutBreakpoints';

describe('MainLayout role breakpoints', () => {
  it.each([
    [767, false, false],
    [768, false, true],
    [1024, false, true],
    [1039, true, false],
    [1040, true, true],
  ])('resolves width %i and professional=%s as large=%s', (width, professional, expected) => {
    expect(isLargeScreenForRole(width, professional)).toBe(expected);
  });
});
