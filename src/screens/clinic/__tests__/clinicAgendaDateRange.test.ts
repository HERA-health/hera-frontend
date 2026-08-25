import {
  addMadridDaysInputValue,
  toMadridDateInputValue,
  toMadridEndOfDayIso,
  toMadridStartOfDayIso,
} from '../../../utils/clinicAgendaDateRange';

describe('clinic agenda Madrid date ranges', () => {
  it('derives the visible date from Madrid rather than the device timezone', () => {
    expect(toMadridDateInputValue(new Date('2030-07-14T22:30:00.000Z'))).toBe('2030-07-15');
    expect(addMadridDaysInputValue(30, new Date('2030-07-14T22:30:00.000Z'))).toBe('2030-08-14');
  });

  it('builds exact winter and summer day boundaries in Europe/Madrid', () => {
    expect(toMadridStartOfDayIso('2030-01-15')).toBe('2030-01-14T23:00:00.000Z');
    expect(toMadridEndOfDayIso('2030-01-15')).toBe('2030-01-15T22:59:59.999Z');
    expect(toMadridStartOfDayIso('2030-07-15')).toBe('2030-07-14T22:00:00.000Z');
    expect(toMadridEndOfDayIso('2030-07-15')).toBe('2030-07-15T21:59:59.999Z');
  });

  it('keeps complete DST transition days', () => {
    expect(toMadridStartOfDayIso('2030-03-31')).toBe('2030-03-30T23:00:00.000Z');
    expect(toMadridEndOfDayIso('2030-03-31')).toBe('2030-03-31T21:59:59.999Z');
  });
});
