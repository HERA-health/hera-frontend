import {
  generateSchedulerTimeOptions,
  getNextMadridSchedulerValue,
  isSchedulerTimeInPast,
  normalizeSchedulerTimeInput,
  SCHEDULER_TIME_OPTIONS,
} from '../schedulerDateTime';

describe('schedulerDateTime', () => {
  it('generates the inclusive 15-minute scheduling grid', () => {
    expect(SCHEDULER_TIME_OPTIONS).toHaveLength(65);
    expect(SCHEDULER_TIME_OPTIONS[0]).toBe('07:00');
    expect(SCHEDULER_TIME_OPTIONS[64]).toBe('23:00');
    expect(generateSchedulerTimeOptions('09:00', '10:00', 30)).toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
  });

  it('returns an empty grid for invalid bounds or steps', () => {
    expect(generateSchedulerTimeOptions('10:00', '09:00', 15)).toEqual([]);
    expect(generateSchedulerTimeOptions('invalid', '10:00', 15)).toEqual([]);
    expect(generateSchedulerTimeOptions('09:00', '10:00', 0)).toEqual([]);
  });

  it('suggests the next Madrid slot without depending on the device timezone', () => {
    expect(getNextMadridSchedulerValue(new Date('2026-06-15T06:07:00.000Z'))).toEqual({
      date: '2026-06-15',
      time: '09:15',
    });
    expect(getNextMadridSchedulerValue(new Date('2026-01-15T06:07:00.000Z'))).toEqual({
      date: '2026-01-15',
      time: '08:15',
    });
  });

  it('rolls the suggestion to the next Madrid day after the scheduling limit', () => {
    expect(getNextMadridSchedulerValue(new Date('2026-06-15T20:30:00.000Z'))).toEqual({
      date: '2026-06-16',
      time: '07:00',
    });
  });

  it('blocks historical dates and only elapsed times on the current Madrid day', () => {
    const now = new Date('2026-06-15T08:30:00.000Z');
    expect(isSchedulerTimeInPast('2026-06-14', '23:00', now)).toBe(true);
    expect(isSchedulerTimeInPast('2026-06-15', '10:30', now)).toBe(true);
    expect(isSchedulerTimeInPast('2026-06-15', '10:45', now)).toBe(false);
    expect(isSchedulerTimeInPast('2026-06-16', '07:00', now)).toBe(false);
    expect(isSchedulerTimeInPast('invalid', '07:00', now)).toBe(false);
  });

  it('normalizes a single-digit hour without hiding invalid input', () => {
    expect(normalizeSchedulerTimeInput(' 9:30 ')).toBe('09:30');
    expect(normalizeSchedulerTimeInput('9:75')).toBe('9:75');
    expect(normalizeSchedulerTimeInput('15:32')).toBe('15:32');
  });
});
