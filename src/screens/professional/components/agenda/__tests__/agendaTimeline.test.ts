import type { ProfessionalSession } from '../../../../../constants/types';
import { calendarDate, filterAgendaSessions, formatTime, getAgendaCalendarRange, getSessionDisplayStatus, getWeekDays } from '../professionalAgendaUtils';
import { getAgendaHours, getAgendaAxis, getInstantTop, layoutAgendaSessions, sessionIntersectsDay } from '../agendaTimeline';

const session = (id: string, date: string, duration = 60, extra: Partial<ProfessionalSession> = {}): ProfessionalSession => ({
  id, date: new Date(date), duration, clientId: 'synthetic', clientName: 'Paciente de prueba', clientInitial: 'P', status: 'scheduled', type: 'video', ...extra,
});
const day = calendarDate('2026-10-13');
const axis = getAgendaAxis([day]);

describe('Madrid agenda timeline', () => {
  it('places 00:15 and 23:45 at full-day positions and splits midnight without losing identity', () => {
    const early = session('early', '2026-10-12T22:15:00Z');
    const late = session('late', '2026-10-13T21:45:00Z');
    const blocks = layoutAgendaSessions([early, late], day, axis);
    expect(blocks.map(({ top, height }) => ({ top, height }))).toEqual([{ top: 12, height: 48 }, { top: 1140, height: 12 }]);
    const tomorrow = calendarDate('2026-10-14');
    const continuation = layoutAgendaSessions([late], tomorrow, getAgendaAxis([tomorrow]));
    expect(continuation[0]).toMatchObject({ top: 0, height: 36, session: { id: 'late' } });
    expect(sessionIntersectsDay(late, tomorrow)).toBe(true);
  });

  it('assigns overlapping sessions separate columns while consecutive sessions share a column', () => {
    const sessions = [session('a', '2026-10-13T08:00Z'), session('b', '2026-10-13T08:30Z'), session('c', '2026-10-13T09:30Z')];
    const blocks = layoutAgendaSessions(sessions, day, axis);
    expect(blocks.map(({ lane, lanes }) => [lane, lanes])).toEqual([[0, 2], [1, 2], [0, 1]]);
    const cancelled = session('cancelled', '2026-10-13T08:00Z', 60, { status: 'cancelled' });
    expect(layoutAgendaSessions([cancelled, sessions[0]], day, axis)[0].session.id).toBe('a');
  });

  it('marks the missing March hour and splits sessions spanning the clock change', () => {
    const march = calendarDate('2026-03-29');
    const hours = getAgendaHours(march);
    const rows = getAgendaAxis([march]);
    expect(hours).toHaveLength(23);
    expect(rows).toHaveLength(24);
    expect(hours.find((hour) => hour.key === '2:0')).toBeUndefined();
    const blocks = layoutAgendaSessions([session('spring', '2026-03-29T00:30Z', 90)], march, rows);
    expect(blocks.map(({ top, height }) => [top, height])).toEqual([[72, 24], [144, 48]]);
    expect(getInstantTop(new Date('2026-03-29T01:30Z').getTime(), hours, rows)).toBe(168);
  });

  it('distinguishes both October hours by UTC offset and keeps weekdays aligned', () => {
    const october = calendarDate('2026-10-25');
    const hours = getAgendaHours(october);
    const rows = getAgendaAxis(getWeekDays(october));
    expect(hours).toHaveLength(25);
    expect(rows).toHaveLength(25);
    const repeated = hours.filter((hour) => hour.hour === 2);
    expect(repeated.map((hour) => hour.offset)).toEqual(['GMT+2', 'GMT+1']);
    const blocks = layoutAgendaSessions([session('first', '2026-10-25T00:15Z', 30), session('second', '2026-10-25T01:15Z', 30)], october, rows);
    expect(blocks.map(({ top, lanes, offset }) => [top, lanes, offset])).toEqual([[108, 1, 'GMT+2'], [156, 1, 'GMT+1']]);
  });

  it('uses Madrid labels and calendar boundaries independently of the device timezone', () => {
    expect(formatTime(new Date('2026-10-12T22:15Z'))).toBe('00:15');
    expect(getAgendaCalendarRange('day', new Date('2026-10-12T22:15Z'))).toEqual({ from: '2026-10-13', to: '2026-10-13' });
    expect(getAgendaCalendarRange('month', calendarDate('2027-02-10'))).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(getAgendaCalendarRange('list', day)).toEqual(getAgendaCalendarRange('week', day));
  });

  it('combines status and provenance filters without changing persisted status', () => {
    const items = [session('own', '2026-10-13T08:00Z', 60, { provenance: 'OWN' }), session('cancelled', '2026-10-13T09:00Z', 60, { provenance: 'DIRECTORY', status: 'cancelled' }), session('pending', '2026-10-13T10:00Z', 60, { provenance: 'REFERRAL', status: 'pending' })];
    expect(filterAgendaSessions(items, 'ALL', 'ACTIVE').map((item) => item.id)).toEqual(['own', 'pending']);
    expect(filterAgendaSessions(items, 'DIRECTORY', 'CANCELLED').map((item) => item.id)).toEqual(['cancelled']);
    expect(filterAgendaSessions(items, 'REFERRAL', 'PENDING').map((item) => item.id)).toEqual(['pending']);
    expect(filterAgendaSessions(items, 'ALL', 'ALL')).toHaveLength(3);
    expect(getSessionDisplayStatus(items[0], new Date('2026-10-14T10:00Z'))).toBe('ended');
    expect(items[0].status).toBe('scheduled');
  });
});
