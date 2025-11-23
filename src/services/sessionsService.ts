import { api } from './api';

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
    console.log('🌐 ========== API CALL: getAvailableSlots ==========');
    console.log('📋 Specialist ID:', specialistId);
    console.log('📅 Date:', date);
    console.log('📅 Date type:', typeof date);

    const url = `/specialists/${specialistId}/available-slots?date=${date}`;
    console.log('🔗 Full URL:', url);
    console.log('🔗 Base URL:', api.defaults.baseURL);

    const response = await api.get(url);

    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    console.log('📊 Response structure:', {
      hasData: !!response.data,
      hasDataProperty: !!response.data?.data,
      hasSlotsProperty: !!response.data?.data?.slots,
      slotsType: typeof response.data?.data?.slots,
      slotsLength: Array.isArray(response.data?.data?.slots) ? response.data.data.slots.length : 'Not an array'
    });

    const slots = response.data.data.slots || [];
    console.log('🎯 Returning slots:', slots.length, 'slots');
    console.log('🎯 Slots details:', slots);
    console.log('🌐 ========== END API CALL ==========');

    return slots;
  } catch (error: any) {
    console.error('❌ ========== ERROR in getAvailableSlots ==========');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Full error:', error);
    console.error('❌ ========== END ERROR ==========');
    throw new Error(
      error.response?.data?.error || 'No se pudieron cargar los horarios disponibles'
    );
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
    console.log('🌐 ========== API CALL: createSession ==========');
    console.log('📤 Session data being sent:', JSON.stringify(sessionData, null, 2));
    console.log('🔗 Endpoint: POST /sessions');

    const response = await api.post('/sessions', sessionData);

    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    console.log('🌐 ========== END API CALL ==========');

    return response.data.data;
  } catch (error: any) {
    console.error('❌ ========== ERROR in createSession ==========');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ ========== END ERROR ==========');
    throw new Error(
      error.response?.data?.error || 'No se pudo crear la cita'
    );
  }
};

/**
 * Get user's sessions (client perspective)
 */
export const getMySessions = async (): Promise<any[]> => {
  try {
    console.log('[sessionsService] Fetching my sessions');
    const response = await api.get('/sessions/my-sessions');
    console.log('[sessionsService] My sessions:', response.data);
    return response.data.data || [];
  } catch (error: any) {
    console.error('[sessionsService] Error fetching my sessions:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudieron cargar tus sesiones'
    );
  }
};

/**
 * Cancel a session
 */
export const cancelSession = async (sessionId: string): Promise<void> => {
  try {
    console.log(`[sessionsService] Cancelling session ${sessionId}`);
    await api.patch(`/sessions/${sessionId}/cancel`);
    console.log('[sessionsService] Session cancelled successfully');
  } catch (error: any) {
    console.error('[sessionsService] Error cancelling session:', error);
    throw new Error(
      error.response?.data?.error || 'No se pudo cancelar la sesión'
    );
  }
};
