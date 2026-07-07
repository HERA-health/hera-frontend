import { api } from './api';
import { z } from 'zod';
import { getErrorMessage } from '../constants/errors';
import type {
  AvailabilityAbsenceReason,
  AvailabilityExceptionRangeImpact,
  AvailabilityExceptionRangeResult,
  RemoveAvailabilityExceptionRangeResult,
} from './availabilityContracts';

export {
  AVAILABILITY_ABSENCE_REASONS,
  type AvailabilityAbsenceReason,
  type AvailabilityExceptionRangeImpact,
  type AvailabilityExceptionRangeResult,
  type RemoveAvailabilityExceptionRangeResult,
} from './availabilityContracts';

/**
 * Day schedule interface
 */
export interface DaySchedule {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

type LegacyDaySchedule = DaySchedule | DaySchedule[] | null;

/**
 * Weekly availability schedule
 */
export interface WeeklySchedule {
  monday: DaySchedule[] | null;
  tuesday: DaySchedule[] | null;
  wednesday: DaySchedule[] | null;
  thursday: DaySchedule[] | null;
  friday: DaySchedule[] | null;
  saturday: DaySchedule[] | null;
  sunday: DaySchedule[] | null;
}

type WeeklyScheduleResponse = Record<keyof WeeklySchedule, LegacyDaySchedule>;

export interface WeeklyScheduleSnapshot {
  schedule: WeeklySchedule;
  scheduleRevision: string | null;
}

const INVALID_WEEKLY_SCHEDULE_MESSAGE = 'Formato de disponibilidad no válido';
const WEEKLY_SCHEDULE_MIN_MINUTES = 7 * 60;
const WEEKLY_SCHEDULE_MAX_MINUTES = 23 * 60;
const WEEKLY_SCHEDULE_STEP_MINUTES = 30;
const WEEKLY_SCHEDULE_MIN_RANGE_MINUTES = 30;
const MAX_WEEKLY_SCHEDULE_RANGES_PER_DAY = 32;
const weeklyScheduleTimeSchema = z.string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);

const getTimeMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const canonicalWeeklyScheduleRangeSchema = z.object({
  start: weeklyScheduleTimeSchema,
  end: weeklyScheduleTimeSchema,
}).strict();

const databaseWeeklyScheduleRangeSchema = z.object({
  startTime: weeklyScheduleTimeSchema,
  endTime: weeklyScheduleTimeSchema,
}).passthrough().transform(({ startTime, endTime }) => ({
  start: startTime,
  end: endTime,
}));

const weeklyScheduleRangeSchema = z.union([
  canonicalWeeklyScheduleRangeSchema,
  databaseWeeklyScheduleRangeSchema,
]).superRefine((range, context) => {
  const startMinutes = getTimeMinutes(range.start);
  const endMinutes = getTimeMinutes(range.end);

  if (startMinutes >= endMinutes) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Schedule range start must be before end',
      path: ['end'],
    });
  }

  if (startMinutes < WEEKLY_SCHEDULE_MIN_MINUTES || endMinutes > WEEKLY_SCHEDULE_MAX_MINUTES) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Schedule range must stay within 07:00-23:00',
      path: ['start'],
    });
  }

  if (
    startMinutes % WEEKLY_SCHEDULE_STEP_MINUTES !== 0
    || endMinutes % WEEKLY_SCHEDULE_STEP_MINUTES !== 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Schedule range must use 30-minute steps',
      path: ['start'],
    });
  }

  if (endMinutes - startMinutes < WEEKLY_SCHEDULE_MIN_RANGE_MINUTES) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Schedule range must last at least 30 minutes',
      path: ['end'],
    });
  }
});

const legacyDayScheduleSchema = z.union([
  weeklyScheduleRangeSchema,
  z.array(weeklyScheduleRangeSchema).max(MAX_WEEKLY_SCHEDULE_RANGES_PER_DAY),
  z.null(),
]);

const weeklyScheduleResponseSchema = z.object({
  friday: legacyDayScheduleSchema,
  monday: legacyDayScheduleSchema,
  saturday: legacyDayScheduleSchema,
  sunday: legacyDayScheduleSchema,
  thursday: legacyDayScheduleSchema,
  tuesday: legacyDayScheduleSchema,
  wednesday: legacyDayScheduleSchema,
}).strict();

const weeklyScheduleSnapshotResponseSchema = z.object({
  schedule: weeklyScheduleResponseSchema,
  scheduleRevision: z.string().min(1),
}).passthrough();

const legacyWeeklyScheduleEnvelopeSchema = z.object({
  schedule: weeklyScheduleResponseSchema,
}).passthrough();

/**
 * Availability exception (date-specific override)
 */
export interface AvailabilityException {
  id: string;
  specialistId: string;
  date: string; // ISO date string
  reason?: string | null;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get weekly availability schedule for current professional
 */
export const getMyWeeklySchedule = async (): Promise<WeeklySchedule> => {
  try {
    const response = await api.get('/availability/schedule/me');
    return parseWeeklyScheduleResponse(response.data.data.schedule);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el horario'));
  }
};

export const getMyWeeklyScheduleSnapshot = async (): Promise<WeeklyScheduleSnapshot> => {
  try {
    const response = await api.get('/availability/schedule/me');
    return parseWeeklyScheduleSnapshotResponse(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el horario'));
  }
};

/**
 * Update weekly availability schedule
 */
export const updateWeeklySchedule = async (
  schedule: WeeklySchedule,
  scheduleRevision?: string | null
): Promise<WeeklyScheduleSnapshot> => {
  try {
    const requestBody = scheduleRevision
      ? { schedule, scheduleRevision }
      : schedule;
    const response = await api.put('/availability/schedule', requestBody);
    return parseWeeklyScheduleSnapshotResponse(response.data.data, { requireRevision: true });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el horario'));
  }
};

const validateNormalizedDaySchedule = (daySchedule: DaySchedule[] | null): void => {
  if (!daySchedule) {
    return;
  }

  for (let index = 1; index < daySchedule.length; index += 1) {
    const previousRange = daySchedule[index - 1];
    const currentRange = daySchedule[index];

    if (getTimeMinutes(previousRange.end) > getTimeMinutes(currentRange.start)) {
      throw new Error(INVALID_WEEKLY_SCHEDULE_MESSAGE);
    }
  }
};

const normalizeDaySchedule = (daySchedule: LegacyDaySchedule): DaySchedule[] | null => {
  if (!daySchedule) {
    return null;
  }

  const ranges = Array.isArray(daySchedule) ? daySchedule : [daySchedule];
  const normalizedRanges = ranges.length > 0 ? ranges : null;
  validateNormalizedDaySchedule(normalizedRanges);
  return normalizedRanges;
};

const normalizeWeeklySchedule = (schedule: WeeklyScheduleResponse): WeeklySchedule => ({
  friday: normalizeDaySchedule(schedule.friday),
  monday: normalizeDaySchedule(schedule.monday),
  saturday: normalizeDaySchedule(schedule.saturday),
  sunday: normalizeDaySchedule(schedule.sunday),
  thursday: normalizeDaySchedule(schedule.thursday),
  tuesday: normalizeDaySchedule(schedule.tuesday),
  wednesday: normalizeDaySchedule(schedule.wednesday),
});

const parseWeeklyScheduleResponse = (schedule: unknown): WeeklySchedule => {
  const parsedSchedule = weeklyScheduleResponseSchema.safeParse(schedule);

  if (!parsedSchedule.success) {
    throw new Error(INVALID_WEEKLY_SCHEDULE_MESSAGE);
  }

  return normalizeWeeklySchedule(parsedSchedule.data);
};

const parseWeeklyScheduleSnapshotResponse = (
  data: unknown,
  options: { requireRevision?: boolean } = {}
): WeeklyScheduleSnapshot => {
  const parsedV2Snapshot = weeklyScheduleSnapshotResponseSchema.safeParse(data);

  if (parsedV2Snapshot.success) {
    return {
      schedule: normalizeWeeklySchedule(parsedV2Snapshot.data.schedule),
      scheduleRevision: parsedV2Snapshot.data.scheduleRevision,
    };
  }

  if (options.requireRevision) {
    throw new Error(INVALID_WEEKLY_SCHEDULE_MESSAGE);
  }

  const parsedLegacyEnvelope = legacyWeeklyScheduleEnvelopeSchema.safeParse(data);

  if (parsedLegacyEnvelope.success) {
    return {
      schedule: normalizeWeeklySchedule(parsedLegacyEnvelope.data.schedule),
      scheduleRevision: null,
    };
  }

  const parsedLegacySchedule = weeklyScheduleResponseSchema.safeParse(data);

  if (parsedLegacySchedule.success) {
    return {
      schedule: normalizeWeeklySchedule(parsedLegacySchedule.data),
      scheduleRevision: null,
    };
  }

  throw new Error(INVALID_WEEKLY_SCHEDULE_MESSAGE);
};

/**
 * Get availability exceptions for current professional
 */
export const getMyExceptions = async (
  startDate?: string,
  endDate?: string
): Promise<AvailabilityException[]> => {
  try {
    let url = '/availability/exceptions/me';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await api.get(url);
    return response.data.data.exceptions;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las excepciones'));
  }
};

/**
 * Add an availability exception
 */
export const addException = async (
  date: string,
  reason?: string,
  isAvailable: boolean = false,
  customHours?: { startTime: string; endTime: string }
): Promise<AvailabilityException> => {
  try {
    const response = await api.post('/availability/exceptions', {
      date,
      reason,
      isAvailable,
      customHours,
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo agregar la excepción'));
  }
};

export const getExceptionRangeImpact = async (
  startDate: string,
  endDate: string
): Promise<AvailabilityExceptionRangeImpact> => {
  try {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await api.get(`/availability/exceptions/range-impact?${params.toString()}`);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo comprobar el impacto del periodo'));
  }
};

export const addExceptionRange = async (
  startDate: string,
  endDate: string,
  reason: AvailabilityAbsenceReason
): Promise<AvailabilityExceptionRangeResult> => {
  try {
    const response = await api.post('/availability/exceptions/range', {
      startDate,
      endDate,
      reason,
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo bloquear el periodo'));
  }
};

export const removeExceptionRange = async (
  startDate: string,
  endDate: string,
  reason: string | null
): Promise<RemoveAvailabilityExceptionRangeResult> => {
  try {
    const response = await api.delete('/availability/exceptions/range', {
      data: {
        startDate,
        endDate,
        reason,
      },
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo eliminar el periodo'));
  }
};

/**
 * Remove an availability exception
 */
export const removeException = async (date: string): Promise<void> => {
  try {
    await api.delete(`/availability/exceptions/${date}`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo eliminar la excepción'));
  }
};

/**
 * Get the specialist's current bufferTime setting
 */
export const getMyBufferTime = async (): Promise<number> => {
  try {
    const response = await api.get('/specialists/me/profile');
    return response.data.data.bufferTime ?? 0;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener la configuración'));
  }
};

/**
 * Update the specialist's bufferTime setting
 */
export const updateBufferTime = async (bufferTime: number): Promise<void> => {
  try {
    await api.put('/specialists/me/profile', { bufferTime });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el buffer'));
  }
};
