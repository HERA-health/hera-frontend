import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import type { Specialist } from '../constants/types';
import { buildImageFormData, type UploadAsset } from '../utils/multipartUpload';

export type ClientSource = 'REGISTERED' | 'MANAGED';
export type ClientLifecycleFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL';
export type ClinicalConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED';
export type ClinicalConsentMethod = 'DIGITAL_SIGNATURE' | 'SPECIALIST_ATTESTATION';
export type QuestionnaireAvailability = 'NOT_STARTED' | 'AVAILABLE' | 'REQUIRES_REFRESH';

export interface QuestionnaireSummary {
  concerns: string[];
  therapeuticApproach: string | null;
  sessionStyle: string | null;
  preferredModality: string | null;
  preferredAvailability: string | null;
  budgetRange: string | null;
  frequency: string | null;
}

export interface ProfessionalProfile {
  id: string;
  userId: string;
  specialization: string;
  bio: string;
  experience: number;
  rating: number;
  sessionsCount: number;
  matchingProfile: Specialist['matchingProfile'];
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
  date: string;
  duration: number;
  status: string;
  type: string;
  meetingLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: {
    id: string;
    userId: string | null;
    user: {
      name: string;
      email: string;
      avatar?: string | null;
    };
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

export interface Client {
  id: string;
  userId: string | null;
  source: ClientSource;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  displayName?: string;
  initials?: string;
  completedQuestionnaire?: boolean;
  questionnaireAvailability?: QuestionnaireAvailability;
  questionnaireAnswers?: unknown;
  consentOnFile?: boolean;
  consentDate?: string | null;
  consentVersion?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  homeCity?: string | null;
  homeCountry?: string | null;
  user: {
    id: string | null;
    email: string;
    name: string;
    userType: string;
    phone?: string;
    avatar?: string | null;
    birthDate?: string;
    gender?: string;
    occupation?: string;
  };
  sessions?: Session[];
}

const normalizeClient = (client: Client): Client => client;

export interface CreateManagedClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  consentOnFile: true;
  consentVersion?: string;
}

export interface UpdateManagedClientInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  archived?: boolean;
}

interface GetProfessionalClientsOptions {
  source?: ClientSource | 'ALL';
  lifecycle?: ClientLifecycleFilter;
}

export const getProfessionalProfile = async (): Promise<ProfessionalProfile | null> => {
  const response = await api.get('/specialists/me');
  return response.data.success ? response.data.data : null;
};

export const getProfessionalSessions = async (): Promise<Session[]> => {
  const response = await api.get('/sessions/professional');
  return response.data.success ? response.data.data : [];
};

export const getProfessionalClients = async (
  sourceOrOptions?: ClientSource | 'ALL' | GetProfessionalClientsOptions,
  lifecycle: ClientLifecycleFilter = 'ACTIVE'
): Promise<Client[]> => {
  const options: GetProfessionalClientsOptions =
    typeof sourceOrOptions === 'string' || sourceOrOptions === undefined
      ? { source: sourceOrOptions, lifecycle }
      : sourceOrOptions;

  const response = await api.get('/clients', {
    params: {
      ...(options.source ? { source: options.source } : {}),
      ...(options.lifecycle ? { lifecycle: options.lifecycle } : {}),
    },
  });
  return response.data.success ? response.data.data.map(normalizeClient) : [];
};

export const getProfessionalClientDetail = async (clientId: string): Promise<Client | null> => {
  const response = await api.get(`/clients/${clientId}`);
  return response.data.success ? normalizeClient(response.data.data) : null;
};

export const createManagedClient = async (data: CreateManagedClientInput): Promise<Client> => {
  try {
    const response = await api.post('/clients/managed', data);
    return normalizeClient(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo crear el paciente gestionado'));
  }
};

export const updateManagedClient = async (
  clientId: string,
  data: UpdateManagedClientInput
): Promise<Client> => {
  try {
    const response = await api.patch(`/clients/${clientId}/managed`, data);
    return normalizeClient(response.data.data);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el paciente'));
  }
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

  // Mi Espacio
  gradientId?: string;
  personalMotto?: string;
  photoGallery?: string[];
  presentationVideoUrl?: string;
  yearsInPractice?: number;
  languagesSpoken?: string[];

  // Location & Service Modality
  officeAddress: string;
  officeCity: string;
  officePostalCode: string;
  officeCountry: string;
  officeLat: number | null;
  officeLng: number | null;
  offersOnline: boolean;
  offersInPerson: boolean;
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

    // Mi Espacio
    if (data.gradientId !== undefined) apiData.gradientId = data.gradientId;
    if (data.personalMotto !== undefined) apiData.personalMotto = data.personalMotto;
    if (data.photoGallery !== undefined) apiData.photoGallery = data.photoGallery;
    if (data.presentationVideoUrl !== undefined) apiData.presentationVideoUrl = data.presentationVideoUrl;
    if (data.yearsInPractice !== undefined) apiData.yearsInPractice = data.yearsInPractice;
    if (data.languagesSpoken !== undefined) apiData.languagesSpoken = data.languagesSpoken;

    // Location & Service Modality
    if (data.officeAddress !== undefined) apiData.officeAddress = data.officeAddress;
    if (data.officeCity !== undefined) apiData.officeCity = data.officeCity;
    if (data.officePostalCode !== undefined) apiData.officePostalCode = data.officePostalCode;
    if (data.officeCountry !== undefined) apiData.officeCountry = data.officeCountry;
    if (data.officeLat !== undefined) apiData.officeLat = data.officeLat;
    if (data.officeLng !== undefined) apiData.officeLng = data.officeLng;
    if (data.offersOnline !== undefined) apiData.offersOnline = data.offersOnline;
    if (data.offersInPerson !== undefined) apiData.offersInPerson = data.offersInPerson;

    const response = await api.put('/specialists/me/profile', apiData);
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el perfil'));
  }
};

// ============================================================================
// PROFESSIONAL VERIFICATION
// ============================================================================

/**
 * Verification status type
 */
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_SUBMITTED';

/**
 * Verification data interface
 */
export interface VerificationData {
  colegiadoNumber: string;
  dniImage: UploadAsset;
}

/**
 * Verification response interface
 */
export interface VerificationResponse {
  success: boolean;
  message: string;
  data?: {
    verificationStatus: VerificationStatus;
  };
}

/**
 * Get verification status for the current specialist
 */
export interface VerificationStatusResponse {
  verificationStatus: VerificationStatus;
  colegiadoNumber?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const getVerificationSubmissionErrorMessage = (error: unknown): string =>
  getErrorMessage(
    error,
    'No hemos podido enviar tu verificación. Inténtalo de nuevo en un momento.'
  );

export const getVerificationStatus = async (): Promise<VerificationStatusResponse> => {
  try {
    const response = await api.get('/specialists/me/verification');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { verificationStatus: 'NOT_SUBMITTED' };
  } catch (error: unknown) {
    // If the endpoint returns 404, the specialist hasn't submitted verification yet
    return { verificationStatus: 'NOT_SUBMITTED' };
  }
};

/**
 * Submit verification data for the current specialist
 */
export const submitVerification = async (data: VerificationData): Promise<VerificationResponse> => {
  try {
    const formData = await buildImageFormData(
      'dniPhoto',
      data.dniImage,
      { colegiadoNumber: data.colegiadoNumber },
      'colegiado'
    );
    const response = await api.post('/specialists/me/verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Verificación enviada correctamente',
        data: response.data.data,
      };
    }

    throw new Error('Error al enviar la verificación');
  } catch (error: unknown) {
    throw new Error(getVerificationSubmissionErrorMessage(error));
  }
};

/**
 * Upload a photo to the specialist's gallery
 */
export const uploadGalleryPhoto = async (image: UploadAsset): Promise<{ url: string }> => {
  try {
    const formData = await buildImageFormData('image', image, {}, 'gallery');
    const response = await api.post('/specialists/me/gallery', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo subir la foto a la galería'));
  }
};

/**
 * Delete a photo from the specialist's gallery
 */
export const deleteGalleryPhoto = async (url: string): Promise<void> => {
  try {
    await api.delete('/specialists/me/gallery', { data: { url } });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'No se pudo eliminar la foto de la galería'));
  }
};

