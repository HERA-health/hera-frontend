import { formatMadridDateKey, getMadridDateKey, parseMadridDateTime } from '../madridTime';

describe('madridTime', () => {
  it('converts summer Madrid date/time to UTC ISO', () => {
    expect(parseMadridDateTime('2026-06-15', '10:00')?.iso).toBe(
      '2026-06-15T08:00:00.000Z'
    );
  });

  it('converts winter Madrid date/time to UTC ISO', () => {
    expect(parseMadridDateTime('2026-01-02', '10:30')?.iso).toBe(
      '2026-01-02T09:30:00.000Z'
    );
  });

  it('returns null for invalid date or time values', () => {
    expect(parseMadridDateTime('2026-99-02', '10:30')).toBeNull();
    expect(parseMadridDateTime('2026-01-02', '25:00')).toBeNull();
  });

  it('formats date keys in Madrid without shifting the day', () => {
    expect(formatMadridDateKey('2026-06-15', { day: 'numeric', month: 'short' })).toBe(
      '15 jun'
    );
  });

  it('returns the current date key in Madrid', () => {
    expect(getMadridDateKey(new Date('2026-06-14T22:30:00.000Z'))).toBe('2026-06-15');
  });
});
