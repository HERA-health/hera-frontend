import { api } from './api';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  specialization: string;
  bio: string;
  experience: number;
  rating: number;
  sessionsCount: number;
  matchingProfile: any;
  user: {
    id: string;
    email: string;
    name: string;
    userType: string;
  };
}

export interface Session {
  id: string;
  clientId: string;
  specialistId: string;
  scheduledDate: string;
  status: string;
  notes?: string;
  client?: {
    id: string;
    userId: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export interface Client {
  id: string;
  userId: string;
  preferences: any;
  user: {
    id: string;
    email: string;
    name: string;
    userType: string;
  };
  sessions?: Session[];
}

export const getProfessionalProfile = async (): Promise<ProfessionalProfile | null> => {
  const response = await api.get('/specialists/me');
  return response.data.success ? response.data.data : null;
};

export const getProfessionalSessions = async (): Promise<Session[]> => {
  const response = await api.get('/sessions/professional');
  return response.data.success ? response.data.data : [];
};

export const getProfessionalClients = async (): Promise<Client[]> => {
  const response = await api.get('/clients');
  return response.data.success ? response.data.data : [];
};

/**
 * Update session status (professional only)
 * @param sessionId - The session ID to update
 * @param status - The new status ('CONFIRMED' or 'CANCELLED')
 */
export const updateSessionStatus = async (
  sessionId: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
): Promise<void> => {
  try {
    console.log('📝 ========== UPDATE SESSION STATUS ==========');
    console.log('📋 Session ID:', sessionId);
    console.log('📊 New status:', status);

    const response = await api.put(`/sessions/${sessionId}/status`, { status });

    console.log('✅ Status updated successfully');
    console.log('📦 Response:', response.data);
    console.log('📝 ========== END UPDATE SESSION STATUS ==========');

    return response.data.data;
  } catch (error: any) {
    console.error('❌ ========== ERROR UPDATING SESSION STATUS ==========');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ ========== END ERROR ==========');

    throw new Error(
      error.response?.data?.error || 'No se pudo actualizar el estado de la sesión'
    );
  }
};
