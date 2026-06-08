export const MADRID_TIME_ZONE = 'Europe/Madrid';

interface DateKeyParts {
  year: number;
  month: number;
  day: number;
}

interface TimeParts {
  hour: number;
  minute: number;
}

export interface MadridDateTime {
  date: Date;
  iso: string;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const parseDateKey = (dateKey: string): DateKeyParts | null => {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year
    || utcDate.getUTCMonth() !== month - 1
    || utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const parseTime = (time: string): TimeParts | null => {
  if (!TIME_PATTERN.test(time)) {
    return null;
  }

  const [hour, minute] = time.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

const getTimeZoneDateParts = (date: Date, timeZone: string): DateKeyParts & TimeParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? 0),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? 0),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? 0),
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
  const parts = getTimeZoneDateParts(date, timeZone);
  const timeZoneAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );

  return timeZoneAsUtc - date.getTime();
};

export const parseMadridDateTime = (dateKey: string, time: string): MadridDateTime | null => {
  const date = parseDateKey(dateKey);
  const timeParts = parseTime(time);

  if (!date || !timeParts) {
    return null;
  }

  const localTimeAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    timeParts.hour,
    timeParts.minute,
    0,
    0
  );
  const firstPass = new Date(localTimeAsUtc);
  const adjusted = new Date(localTimeAsUtc - getTimeZoneOffsetMs(firstPass, MADRID_TIME_ZONE));
  const utcDate = new Date(localTimeAsUtc - getTimeZoneOffsetMs(adjusted, MADRID_TIME_ZONE));
  const resolved = getTimeZoneDateParts(utcDate, MADRID_TIME_ZONE);

  if (
    resolved.year !== date.year
    || resolved.month !== date.month
    || resolved.day !== date.day
    || resolved.hour !== timeParts.hour
    || resolved.minute !== timeParts.minute
  ) {
    return null;
  }

  return {
    date: utcDate,
    iso: utcDate.toISOString(),
  };
};

export const getMadridDateKey = (date: Date = new Date()): string => {
  const parts = getTimeZoneDateParts(date, MADRID_TIME_ZONE);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  return `${parts.year}-${month}-${day}`;
};

export const formatMadridDateKey = (
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
  locale: string = 'es-ES'
): string => {
  const date = parseDateKey(dateKey);
  if (!date) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: MADRID_TIME_ZONE,
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0, 0)));
};
