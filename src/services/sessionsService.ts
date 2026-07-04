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

interface AvailableSlotsResponse {
  slots?: TimeSlot[];
  slotOptions?: TimeSlot[];
}

/**
 * Session type enum matching backend
 */
export type SessionType = 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';

export type SessionStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface ClientSessionSpecialist {
  id: string;
  specialization: string;
  pricePerSession: number;
  avatar?: string | null;
  officeAddress?: string | null;
  officeCity?: string | null;
  officePostalCode?: string | null;
  officeCountry?: string | null;
  officeLat?: number | null;
  officeLng?: number | null;
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export interface ClientSession {
  id: string;
  date: string;
  duration: number;
  bookedPrice?: number | null;
  bookedCurrency?: string | null;
  bookedTariffId?: string | null;
  bookedTariffName?: string | null;
  bookedDuration?: number | null;
  status: SessionStatus;
  type: SessionType;
  meetingLink?: string | null;
  hasReview?: boolean;
  specialist: ClientSessionSpecialist;
}

interface ApiResponse<T> {
  data?: T;
}

interface CreateSessionRequest {
  specialistId: string;
  date: string;
  duration: number;
  type: SessionType;
}

export interface CreatedSession {
  id: string;
  status: SessionStatus;
  bookedPrice?: number | null;
  bookedCurrency?: string | null;
  bookedTariffId?: string | null;
  bookedTariffName?: string | null;
  bookedDuration?: number | null;
}

export interface BookingQuote {
  specialistId: string;
  duration: number;
  currency: string;
  price: number;
  basePrice: number;
  tariffId: string | null;
  tariffName: string | null;
  baseTariffName: string | null;
  firstVisitFreeApplied: boolean;
}

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
    const data = response.data.data as AvailableSlotsResponse | undefined;
    return data?.slotOptions ?? data?.slots ?? [];
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar los horarios disponibles'));
  }
};

/**
 * Create a new session booking
 */
export const createSession = async (sessionData: CreateSessionRequest): Promise<CreatedSession> => {
  try {
    const response = await api.post<ApiResponse<CreatedSession>>('/sessions', sessionData);
    if (!response.data.data) {
      throw new Error('No se pudo crear la cita');
    }
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo crear la cita'));
  }
};

export const getBookingQuote = async (
  specialistId: string,
  type: Exclude<SessionType, 'PHONE_CALL'>,
  duration: number
): Promise<BookingQuote> => {
  try {
    const response = await api.get<ApiResponse<BookingQuote>>('/sessions/booking-quote', {
      params: {
        specialistId,
        type,
        duration,
      },
    });

    if (!response.data.data) {
      throw new Error('No se pudo calcular el precio de la reserva');
    }

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo calcular el precio de la reserva'));
  }
};

/**
 * Get user's sessions (client perspective)
 */
export const getMySessions = async (): Promise<ClientSession[]> => {
  try {
    const response = await api.get<ApiResponse<ClientSession[]>>('/sessions/my-sessions');
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
