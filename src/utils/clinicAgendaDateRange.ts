import { getMadridDateKey, parseMadridDateTime } from './madridTime';
import { addSchedulerDateKeyDays } from './schedulerDateTime';

export const toMadridDateInputValue = (date = new Date()): string => getMadridDateKey(date);

export const addMadridDaysInputValue = (days: number, baseDate = new Date()): string => {
  const baseDateKey = getMadridDateKey(baseDate);
  return addSchedulerDateKeyDays(baseDateKey, days) ?? baseDateKey;
};

export const toMadridStartOfDayIso = (date: string): string => {
  const parsed = parseMadridDateTime(date, '00:00');
  if (!parsed) throw new Error('Usa una fecha válida.');
  return parsed.iso;
};

export const toMadridEndOfDayIso = (date: string): string => {
  const nextDate = addSchedulerDateKeyDays(date, 1);
  const nextDayStart = nextDate ? parseMadridDateTime(nextDate, '00:00') : null;
  if (!nextDayStart) throw new Error('Usa una fecha válida.');
  return new Date(nextDayStart.date.getTime() - 1).toISOString();
};
