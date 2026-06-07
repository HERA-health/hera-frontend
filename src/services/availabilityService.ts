import { api } from './api';
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

/**
 * Weekly availability schedule
 */
export interface WeeklySchedule {
  monday: DaySchedule | null;
  tuesday: DaySchedule | null;
  wednesday: DaySchedule | null;
  thursday: DaySchedule | null;
  friday: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}

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
    return response.data.data.schedule;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el horario'));
  }
};

/**
 * Update weekly availability schedule
 */
export const updateWeeklySchedule = async (
  schedule: WeeklySchedule
): Promise<void> => {
  try {
    await api.put('/availability/schedule', schedule);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el horario'));
  }
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
