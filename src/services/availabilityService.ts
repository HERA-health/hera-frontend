import { api } from './api';

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
  reason?: string;
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
    // First get my profile to get specialist ID
    const profileResponse = await api.get('/specialists/me');
    const specialistId = profileResponse.data.data.id;

    // Then get the schedule
    const response = await api.get(`/availability/schedule/${specialistId}`);
    return response.data.data.schedule;
  } catch (error: any) {
    console.error('[availabilityService] Error fetching weekly schedule:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudo cargar el horario'
    );
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
  } catch (error: any) {
    console.error('[availabilityService] Error updating weekly schedule:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudo actualizar el horario'
    );
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
    // First get my profile to get specialist ID
    const profileResponse = await api.get('/specialists/me');
    const specialistId = profileResponse.data.data.id;

    // Build query params
    let url = `/availability/exceptions/${specialistId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await api.get(url);
    return response.data.data.exceptions;
  } catch (error: any) {
    console.error('[availabilityService] Error fetching exceptions:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudieron cargar las excepciones'
    );
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
  } catch (error: any) {
    console.error('[availabilityService] Error adding exception:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudo agregar la excepción'
    );
  }
};

/**
 * Remove an availability exception
 */
export const removeException = async (date: string): Promise<void> => {
  try {
    await api.delete(`/availability/exceptions/${date}`);
  } catch (error: any) {
    console.error('[availabilityService] Error removing exception:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudo eliminar la excepción'
    );
  }
};
