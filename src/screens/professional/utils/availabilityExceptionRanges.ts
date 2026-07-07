import type { AvailabilityException } from '../../../services/availabilityService';

export const MAX_EXCEPTION_RANGE_DAYS = 180;

export interface AvailabilityExceptionPeriod {
  id: string;
  startDate: string;
  endDate: string;
  displayReason: string;
  deleteReason: string | null;
  dayCount: number;
  exceptions: AvailabilityException[];
}

export const getExceptionDateKey = (exceptionDate: string | null | undefined): string | null => (
  typeof exceptionDate === 'string' && exceptionDate.length > 0
    ? exceptionDate.split('T')[0]
    : null
);

export const getOrderedDateRange = (
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } => (
  startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate }
);

export const getInclusiveDateRangeDayCount = (
  startDate: string,
  endDate: string
): number => {
  if (!startDate || !endDate) return 0;

  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const utcStart = Date.UTC(start.year, start.month - 1, start.day);
  const utcEnd = Date.UTC(end.year, end.month - 1, end.day);

  return Math.floor((utcEnd - utcStart) / 86400000) + 1;
};

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateKey(date);
};

export const getDateKeysInRange = (startDate: string, endDate: string): string[] => {
  const dayCount = getInclusiveDateRangeDayCount(startDate, endDate);
  if (dayCount <= 0) return [];

  return Array.from({ length: dayCount }, (_, index) => addDaysToDateKey(startDate, index));
};

export const groupAvailabilityExceptionPeriods = (
  exceptions: AvailabilityException[]
): AvailabilityExceptionPeriod[] => {
  const unavailableExceptions = exceptions
    .filter((exception) => !exception.isAvailable)
    .map((exception) => ({
      exception,
      dateKey: getExceptionDateKey(exception.date),
      deleteReason: exception.reason ?? null,
      displayReason: exception.reason ?? 'No disponible',
    }))
    .filter((entry): entry is {
      exception: AvailabilityException;
      dateKey: string;
      deleteReason: string | null;
      displayReason: string;
    } => entry.dateKey !== null)
    .sort((left, right) => (
      left.dateKey === right.dateKey
        ? left.displayReason.localeCompare(right.displayReason, 'es')
        : left.dateKey.localeCompare(right.dateKey)
    ));

  const periods: AvailabilityExceptionPeriod[] = [];

  unavailableExceptions.forEach(({ exception, dateKey, deleteReason, displayReason }) => {
    const currentPeriod = periods[periods.length - 1];
    const isConsecutive =
      currentPeriod !== undefined &&
      currentPeriod.deleteReason === deleteReason &&
      addDaysToDateKey(currentPeriod.endDate, 1) === dateKey;

    if (isConsecutive) {
      currentPeriod.endDate = dateKey;
      currentPeriod.dayCount += 1;
      currentPeriod.exceptions.push(exception);
      currentPeriod.id = buildPeriodId(
        currentPeriod.startDate,
        currentPeriod.endDate,
        displayReason
      );
      return;
    }

    periods.push({
      id: buildPeriodId(dateKey, dateKey, displayReason),
      startDate: dateKey,
      endDate: dateKey,
      displayReason,
      deleteReason,
      dayCount: 1,
      exceptions: [exception],
    });
  });

  return periods;
};

export const sortAvailabilityExceptionPeriodsForSidebar = (
  periods: AvailabilityExceptionPeriod[],
  todayDateKey: string = getTodayDateKey()
): AvailabilityExceptionPeriod[] => {
  const futureOrCurrentPeriods = periods
    .filter((period) => period.endDate >= todayDateKey)
    .sort((left, right) => (
      left.startDate === right.startDate
        ? left.endDate.localeCompare(right.endDate)
        : left.startDate.localeCompare(right.startDate)
    ));

  const pastPeriods = periods
    .filter((period) => period.endDate < todayDateKey)
    .sort((left, right) => (
      left.endDate === right.endDate
        ? right.startDate.localeCompare(left.startDate)
        : right.endDate.localeCompare(left.endDate)
    ));

  return [...futureOrCurrentPeriods, ...pastPeriods];
};

export const getTodayDateKey = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatExceptionPeriodDateRange = (
  period: Pick<AvailabilityExceptionPeriod, 'startDate' | 'endDate'>
): string => {
  if (period.startDate === period.endDate) {
    return formatDayMonth(period.startDate);
  }

  const start = parseDateKey(period.startDate);
  const end = parseDateKey(period.endDate);

  if (start.year === end.year && start.month === end.month) {
    const monthLabel = formatMonthShort(period.endDate);
    return `${start.day}-${end.day} ${monthLabel}`;
  }

  return `${formatDayMonth(period.startDate)}-${formatDayMonth(period.endDate)}`;
};

export const formatExceptionPeriodDayCount = (dayCount: number): string =>
  dayCount === 1 ? '1 día' : `${dayCount} días`;

const buildPeriodId = (startDate: string, endDate: string, reason: string): string =>
  `${startDate}_${endDate}_${reason}`;

const parseDateKey = (dateKey: string): { year: number; month: number; day: number } => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
};

const formatDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDayMonth = (dateKey: string): string => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    .replace('.', '');
};

const formatMonthShort = (dateKey: string): string => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('es-ES', { month: 'short' })
    .replace('.', '');
};
