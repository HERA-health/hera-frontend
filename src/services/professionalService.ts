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
