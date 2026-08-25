import { getMadridDateKey, MADRID_TIME_ZONE } from './madridTime';

export const SCHEDULER_TIME_START = '07:00';
export const SCHEDULER_TIME_END = '23:00';
export const SCHEDULER_TIME_STEP_MINUTES = 15;

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface SchedulerDateTimeValue {
  date: string;
  time: string;
}

export const parseSchedulerTimeToMinutes = (time: string): number | null => {
  if (!TIME_PATTERN.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

export const formatSchedulerMinutesAsTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

export const generateSchedulerTimeOptions = (
  startTime = SCHEDULER_TIME_START,
  endTime = SCHEDULER_TIME_END,
  stepMinutes = SCHEDULER_TIME_STEP_MINUTES,
): string[] => {
  const start = parseSchedulerTimeToMinutes(startTime);
  const end = parseSchedulerTimeToMinutes(endTime);

  if (start === null || end === null || start > end || stepMinutes <= 0) {
    return [];
  }

  const options: string[] = [];
  for (let minutes = start; minutes <= end; minutes += stepMinutes) {
    options.push(formatSchedulerMinutesAsTime(minutes));
  }

  return options;
};

export const SCHEDULER_TIME_OPTIONS = generateSchedulerTimeOptions();

export const getMadridMinutesOfDay = (date: Date = new Date(Date.now())): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

  return hour * 60 + minute;
};

export const isSchedulerTimeInPast = (
  dateKey: string,
  time: string,
  now: Date = new Date(Date.now()),
): boolean => {
  if (!DATE_KEY_PATTERN.test(dateKey)) return false;

  const todayDateKey = getMadridDateKey(now);
  if (dateKey < todayDateKey) return true;
  if (dateKey > todayDateKey) return false;

  const optionMinutes = parseSchedulerTimeToMinutes(time);
  if (optionMinutes === null) {
    return false;
  }

  return optionMinutes <= getMadridMinutesOfDay(now);
};

export const addSchedulerDateKeyDays = (dateKey: string, days: number): string | null => {
  if (!DATE_KEY_PATTERN.test(dateKey)) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  if (Number.isNaN(date.getTime())) return null;

  return getMadridDateKey(date);
};

export const getNextMadridSchedulerValue = (
  now: Date = new Date(Date.now()),
  leadMinutes = 60,
): SchedulerDateTimeValue => {
  const target = new Date(now.getTime() + Math.max(0, leadMinutes) * 60 * 1000);
  const targetDate = getMadridDateKey(target);
  const startMinutes = parseSchedulerTimeToMinutes(SCHEDULER_TIME_START) ?? 0;
  const endMinutes = parseSchedulerTimeToMinutes(SCHEDULER_TIME_END) ?? 23 * 60;
  const targetMinutes = getMadridMinutesOfDay(target);
  const nextStepMinutes = Math.ceil(targetMinutes / SCHEDULER_TIME_STEP_MINUTES)
    * SCHEDULER_TIME_STEP_MINUTES;

  if (nextStepMinutes > endMinutes) {
    return {
      date: addSchedulerDateKeyDays(targetDate, 1) ?? targetDate,
      time: formatSchedulerMinutesAsTime(startMinutes),
    };
  }

  return {
    date: targetDate,
    time: formatSchedulerMinutesAsTime(Math.max(nextStepMinutes, startMinutes)),
  };
};

export const normalizeSchedulerTimeInput = (time: string): string => {
  const trimmed = time.trim();
  const singleDigitHourMatch = trimmed.match(/^(\d):(\d{2})$/);

  if (!singleDigitHourMatch) return trimmed;

  const hours = Number(singleDigitHourMatch[1]);
  const minutes = Number(singleDigitHourMatch[2]);
  if (hours > 9 || minutes > 59) return trimmed;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
