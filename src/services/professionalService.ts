import { api } from './api';
import { getErrorMessage } from '../constants/errors';

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
    const response = await api.put(`/sessions/${sessionId}/status`, { status });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el estado de la sesión'));
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
 * Get meeting link for a session with access control (professional)
 */
export const getMeetingLink = async (sessionId: string): Promise<MeetingLinkResponse> => {
  try {
    const response = await api.get(`/sessions/${sessionId}/meeting-link`);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener el enlace de la videollamada'));
  }
};

// ============================================================================
// COMPREHENSIVE PROFILE MANAGEMENT
// ============================================================================

export interface SpecialistProfileData {
  // Basic Info
  fullName: string;
  professionalTitle: string;
  licenseNumber: string;
  licenseVerified: boolean;
  bio: string;
  avatar: string | null;

  // Professional Details
  specialties: string[];
  therapeuticApproaches: string[];
  languages: string[];
  education: {
    id: string;
    degree: string;
    institution: string;
    startYear: string;
    endYear: string;
  }[];
  experience: {
    id: string;
    position: string;
    organization: string;
    startYear: string;
    endYear: string | null;
    current: boolean;
  }[];

  // Verification
  identityVerified: boolean;
  insuranceUploaded: boolean;
  certificates: {
    id: string;
    name: string;
    issuer: string;
    validUntil: string | null;
  }[];

  // Pricing
  priceStandard: number;
  priceExtended: number | null;
  priceFirstSession: number | null;
  offerExtended: boolean;
  offerFirstSessionDiscount: boolean;
  sessionTypes: string[];
  modalityOnline: number;
  modalityInPerson: number;

  // Payment
  bankIban: string;
  bankHolder: string;
  bankVerified: boolean;
  taxId: string;
  taxAddress: string;
  taxCity: string;
  applyVat: boolean;
  vatRate: number;
  applyIrpf: boolean;

  // Account
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  profileVisible: boolean;
  showReviewCount: boolean;
  showLastOnline: boolean;

  // Stats
  rating: number;
  reviewCount: number;
}

/**
 * Get comprehensive profile data for the current professional
 */
export const getComprehensiveProfile = async (): Promise<SpecialistProfileData | null> => {
  try {
    const response = await api.get('/specialists/me/profile');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener el perfil'));
  }
};

/**
 * Update comprehensive profile for the current professional
 */
export const updateComprehensiveProfile = async (
  data: Partial<SpecialistProfileData>
): Promise<SpecialistProfileData> => {
  try {
    // Transform frontend data to API format
    const apiData: Record<string, unknown> = {};

    if (data.fullName !== undefined) apiData.fullName = data.fullName;
    if (data.professionalTitle !== undefined) apiData.professionalTitle = data.professionalTitle;
    if (data.licenseNumber !== undefined) apiData.licenseNumber = data.licenseNumber;
    if (data.bio !== undefined) apiData.bio = data.bio;
    if (data.avatar !== undefined) apiData.avatar = data.avatar;

    if (data.specialties !== undefined) apiData.specialties = data.specialties;
    if (data.therapeuticApproaches !== undefined) apiData.therapeuticApproaches = data.therapeuticApproaches;
    if (data.languages !== undefined) apiData.languages = data.languages;
    if (data.education !== undefined) apiData.education = data.education;
    if (data.experience !== undefined) apiData.experience = data.experience;
    if (data.certificates !== undefined) apiData.certificates = data.certificates;

    if (data.priceStandard !== undefined) apiData.priceStandard = data.priceStandard;
    if (data.priceExtended !== undefined) apiData.priceExtended = data.priceExtended;
    if (data.priceFirstSession !== undefined) apiData.priceFirstSession = data.priceFirstSession;
    if (data.offerExtended !== undefined) apiData.offerExtended = data.offerExtended;
    if (data.offerFirstSessionDiscount !== undefined) apiData.offerFirstSessionDiscount = data.offerFirstSessionDiscount;
    if (data.sessionTypes !== undefined) apiData.sessionTypes = data.sessionTypes;
    if (data.modalityOnline !== undefined) apiData.modalityOnline = data.modalityOnline;
    if (data.modalityInPerson !== undefined) apiData.modalityInPerson = data.modalityInPerson;

    if (data.bankIban !== undefined) apiData.bankIban = data.bankIban;
    if (data.bankHolder !== undefined) apiData.bankHolder = data.bankHolder;
    if (data.taxId !== undefined) apiData.taxId = data.taxId;
    if (data.taxAddress !== undefined) apiData.taxAddress = data.taxAddress;
    if (data.taxCity !== undefined) apiData.taxCity = data.taxCity;
    if (data.applyVat !== undefined) apiData.applyVat = data.applyVat;
    if (data.vatRate !== undefined) apiData.vatRate = data.vatRate;
    if (data.applyIrpf !== undefined) apiData.applyIrpf = data.applyIrpf;

    if (data.phone !== undefined) apiData.phone = data.phone;
    if (data.profileVisible !== undefined) apiData.profileVisible = data.profileVisible;
    if (data.showReviewCount !== undefined) apiData.showReviewCount = data.showReviewCount;
    if (data.showLastOnline !== undefined) apiData.showLastOnline = data.showLastOnline;

    const response = await api.put('/specialists/me/profile', apiData);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el perfil'));
  }
};
