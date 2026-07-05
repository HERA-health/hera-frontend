import { getMadridDateKey } from './madridTime';

export const MANAGED_SESSION_DURATION_OPTIONS = [45, 50, 60, 75, 90] as const;
export const MANAGED_SESSION_TIME_START = '07:00';
export const MANAGED_SESSION_TIME_END = '23:00';
export const MANAGED_SESSION_TIME_STEP_MINUTES = 15;

export type ManagedSessionDurationOption = typeof MANAGED_SESSION_DURATION_OPTIONS[number];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export const parseManagedSessionTimeToMinutes = (time: string): number | null => {
  if (!TIME_PATTERN.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

export const formatManagedSessionMinutesAsTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

const generateManagedSessionTimeOptions = (): string[] => {
  const start = parseManagedSessionTimeToMinutes(MANAGED_SESSION_TIME_START);
  const end = parseManagedSessionTimeToMinutes(MANAGED_SESSION_TIME_END);

  if (start === null || end === null || start > end) {
    return [];
  }

  const options: string[] = [];
  for (let minutes = start; minutes <= end; minutes += MANAGED_SESSION_TIME_STEP_MINUTES) {
    options.push(formatManagedSessionMinutesAsTime(minutes));
  }

  return options;
};

export const MANAGED_SESSION_TIME_OPTIONS = generateManagedSessionTimeOptions();

export const isManagedSessionDurationOption = (
  value: number
): value is ManagedSessionDurationOption =>
  MANAGED_SESSION_DURATION_OPTIONS.some((option) => option === value);

export const isManagedSessionTimeOption = (time: string): boolean =>
  MANAGED_SESSION_TIME_OPTIONS.includes(time);

export const getMadridMinutesOfDay = (date: Date = new Date(Date.now())): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
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

export const isManagedSessionTimeInPast = (
  dateKey: string,
  time: string,
  now: Date = new Date(Date.now())
): boolean => {
  if (dateKey !== getMadridDateKey(now)) {
    return false;
  }

  const optionMinutes = parseManagedSessionTimeToMinutes(time);
  if (optionMinutes === null) {
    return false;
  }

  return optionMinutes <= getMadridMinutesOfDay(now);
};
