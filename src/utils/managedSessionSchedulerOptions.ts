import {
  formatSchedulerMinutesAsTime,
  getMadridMinutesOfDay,
  isSchedulerTimeInPast,
  parseSchedulerTimeToMinutes,
  SCHEDULER_TIME_END,
  SCHEDULER_TIME_OPTIONS,
  SCHEDULER_TIME_START,
  SCHEDULER_TIME_STEP_MINUTES,
} from './schedulerDateTime';

export const MANAGED_SESSION_DURATION_OPTIONS = [45, 50, 60, 75, 90] as const;
export const MANAGED_SESSION_TIME_START = SCHEDULER_TIME_START;
export const MANAGED_SESSION_TIME_END = SCHEDULER_TIME_END;
export const MANAGED_SESSION_TIME_STEP_MINUTES = SCHEDULER_TIME_STEP_MINUTES;

export type ManagedSessionDurationOption = typeof MANAGED_SESSION_DURATION_OPTIONS[number];

export const parseManagedSessionTimeToMinutes = parseSchedulerTimeToMinutes;
export const formatManagedSessionMinutesAsTime = formatSchedulerMinutesAsTime;
export const MANAGED_SESSION_TIME_OPTIONS = SCHEDULER_TIME_OPTIONS;

export const isManagedSessionDurationOption = (
  value: number
): value is ManagedSessionDurationOption =>
  MANAGED_SESSION_DURATION_OPTIONS.some((option) => option === value);

export const isManagedSessionTimeOption = (time: string): boolean =>
  MANAGED_SESSION_TIME_OPTIONS.includes(time);

export { getMadridMinutesOfDay };

export const isManagedSessionTimeInPast = isSchedulerTimeInPast;
