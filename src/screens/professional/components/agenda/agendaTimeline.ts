import type { ProfessionalSession } from '../../../../constants/types';
import { formatMadridInstant, parseMadridDateTime } from '../../../../utils/madridTime';
import { addCalendarDays, DAY_HOUR_HEIGHT, formatTime, getSessionEndDate, toCalendarDateKey } from './professionalAgendaUtils';

const HOUR = 3_600_000;
export interface AgendaHour {
  key: string;
  hour: number;
  occurrence: number;
  start: number;
  end: number;
  offset: string;
}
const dayCache = new Map<string, AgendaHour[]>();

export function getAgendaHours(day: Date): AgendaHour[] {
  const key = toCalendarDateKey(day);
  const cached = dayCache.get(key);
  if (cached) return cached;
  const start = parseMadridDateTime(key, '00:00');
  const end = parseMadridDateTime(toCalendarDateKey(addCalendarDays(day, 1)), '00:00');
  if (!start || !end) throw new Error('Fecha de agenda inválida');
  const occurrences = new Map<number, number>();
  const hours: AgendaHour[] = [];
  for (let instant = start.date.getTime(); instant < end.date.getTime(); instant += HOUR) {
    const date = new Date(instant);
    const hour = Number(formatTime(date).split(':')[0]);
    const occurrence = occurrences.get(hour) ?? 0;
    occurrences.set(hour, occurrence + 1);
    const offset = formatMadridInstant(date, { timeZoneName: 'shortOffset' }).split(' ').at(-1) ?? '';
    hours.push({ key: `${hour}:${occurrence}`, hour, occurrence, start: instant, end: instant + HOUR, offset });
  }
  dayCache.set(key, hours);
  if (dayCache.size > 100) dayCache.delete(dayCache.keys().next().value!);
  return hours;
}

export function sessionIntersectsDay(session: ProfessionalSession, day: Date): boolean {
  const hours = getAgendaHours(day);
  return session.date.getTime() < hours[hours.length - 1].end && getSessionEndDate(session).getTime() > hours[0].start;
}

export interface AgendaAxisRow { key: string; label: string; }
export function getAgendaAxis(days: Date[]): AgendaAxisRow[] {
  const hours = days.flatMap(getAgendaHours);
  return Array.from({ length: 24 }, (_, hour) => {
    const repeated = hours.some((slot) => slot.hour === hour && slot.occurrence === 1);
    return [
      { key: `${hour}:0`, label: `${String(hour).padStart(2, '0')}:00${repeated ? ' ①' : ''}` },
      ...(repeated ? [{ key: `${hour}:1`, label: `${String(hour).padStart(2, '0')}:00 ②` }] : []),
    ];
  }).flat();
}

export function getInstantTop(instant: number, hours: AgendaHour[], axis: AgendaAxisRow[]): number | null {
  const slot = hours.find((hour) => instant >= hour.start && instant < hour.end);
  if (!slot) return null;
  return (axis.findIndex((row) => row.key === slot.key) + (instant - slot.start) / HOUR) * DAY_HOUR_HEIGHT;
}

export interface AgendaSessionBlock {
  key: string;
  session: ProfessionalSession;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  offset: string;
}

/** Split at civil-time discontinuities; assign lanes by strict interval overlap. */
export function layoutAgendaSessions(sessions: ProfessionalSession[], day: Date, axis: AgendaAxisRow[]): AgendaSessionBlock[] {
  const hours = getAgendaHours(day);
  const blocks: AgendaSessionBlock[] = [];
  for (const session of sessions) {
    let current: AgendaSessionBlock | null = null;
    for (const slot of hours) {
      const start = Math.max(session.date.getTime(), slot.start);
      const end = Math.min(getSessionEndDate(session).getTime(), slot.end);
      if (end <= start) continue;
      const top = (axis.findIndex((row) => row.key === slot.key) + (start - slot.start) / HOUR) * DAY_HOUR_HEIGHT;
      const height = (end - start) / HOUR * DAY_HOUR_HEIGHT;
      if (current && Math.abs(current.top + current.height - top) < 0.01 && current.offset === slot.offset) {
        current.height += height;
      } else {
        current = { key: `${session.id}:${slot.start}`, session, top, height, lane: 0, lanes: 1, offset: slot.offset };
        blocks.push(current);
      }
    }
  }
  const ordered = blocks.sort((a, b) => a.top - b.top || Number(a.session.status === 'cancelled') - Number(b.session.status === 'cancelled') || b.height - a.height || a.key.localeCompare(b.key));
  let cluster: AgendaSessionBlock[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const finish = () => { cluster.forEach((block) => { block.lanes = laneEnds.length; }); };
  for (const block of ordered) {
    if (block.top >= clusterEnd) { finish(); cluster = []; laneEnds = []; clusterEnd = -1; }
    let lane = laneEnds.findIndex((end) => end <= block.top);
    if (lane === -1) lane = laneEnds.length;
    block.lane = lane;
    laneEnds[lane] = block.top + block.height;
    clusterEnd = Math.max(clusterEnd, block.top + block.height);
    cluster.push(block);
  }
  finish();
  return ordered;
}
