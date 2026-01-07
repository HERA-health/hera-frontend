import { api } from './api';
import { getErrorMessage } from '../constants/errors';

/**
 * Time slot from available slots API
 * Note: Backend returns only available slots without explicit 'available' property
 */
export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;
  available?: boolean; // Optional - backend doesn't always provide this
}

/**
 * Session type enum matching backend
 */
export type SessionType = 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';

/**
 * Get available time slots for a specialist on a specific date
 */
export const getAvailableSlots = async (
  specialistId: string,
  date: string // YYYY-MM-DD format
): Promise<TimeSlot[]> => {
  try {
    const url = `/specialists/${specialistId}/available-slots?date=${date}`;
    const response = await api.get(url);
    const slots = response.data.data.slots || [];
    return slots;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar los horarios disponibles'));
  }
};

/**
 * Create a new session booking
 */
export const createSession = async (sessionData: {
  specialistId: string;
  date: string; // ISO format with time (YYYY-MM-DDTHH:mm:ss)
  duration: number;
  type: SessionType;
}): Promise<any> => {
  try {
    const response = await api.post('/sessions', sessionData);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo crear la cita'));
  }
};

/**
 * Get user's sessions (client perspective)
 */
export const getMySessions = async (): Promise<any[]> => {
  try {
    const response = await api.get('/sessions/my-sessions');
    return response.data.data || [];
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar tus sesiones'));
  }
};

/**
 * Cancel a session
 */
export const cancelSession = async (sessionId: string): Promise<void> => {
  try {
    await api.patch(`/sessions/${sessionId}/cancel`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo cancelar la sesión'));
  }
};

/**
 * Meeting link response interface
 */
export interface MeetingLinkResponse {
  meetingLink: string | null;
  canJoin: boolean;
  sessionDate: string;
  sessionDuration: number;
  status: string;
  type: string;
  minutesUntilSession: number;
  message: string;
}

/**
 * Get meeting link for a session with access control
 */
export const getMeetingLink = async (sessionId: string): Promise<MeetingLinkResponse> => {
  try {
    const response = await api.get(`/sessions/${sessionId}/meeting-link`);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener el enlace de la videollamada'));
  }
};
