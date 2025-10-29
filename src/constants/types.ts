/**
 * TypeScript type definitions for MindConnect
 * Defines all core domain models and interfaces
 */

/**
 * Represents a mental health specialist/psychologist
 */
export interface Specialist {
  id: string;
  name: string;
  avatar?: string;
  initial: string;
  specialization: string;
  rating: number;
  reviewCount: number;
  description: string;
  affinityPercentage: number;
  tags: string[];
  pricePerSession: number;
  firstVisitFree?: boolean;
  verified: boolean;

  // Matching attributes for questionnaire algorithm
  matchingProfile: {
    therapeuticApproach: string[];
    specialties: string[];
    sessionStyle: string;
    personality: string[];
    ageGroups: string[];
    experienceYears: number;
    language: string[];
    availability: string;
    format: string[];
  };
}

/**
 * Represents a therapy session (scheduled or completed)
 */
export interface Session {
  id: string;
  specialistId: string;
  specialistName: string;
  date: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  type: 'video' | 'audio' | 'chat';
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  occupation?: string;
  avatar?: string;
  initial: string;
  profileCompleted: boolean;
}

/**
 * Feature card for home screen
 */
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
}

/**
 * Navigation types for type-safe navigation
 */
export type RootStackParamList = {
  Welcome: undefined;
  Login: { userType: 'client' | 'professional' };
  Register: { userType: 'client' | 'professional' };
  MainStack: undefined;
  Home: undefined;
  Specialists: undefined;
  Sessions: undefined;
  OnDutyPsychologist: undefined;
  Profile: undefined;
  ProfileCompletion: undefined;
  SpecialistDetail: { specialistId: string; affinity?: number };
  Questionnaire: undefined;
  QuestionnaireResults: { results: any[] };
  ProfessionalHome: undefined;
  ProfessionalClients: undefined;
  ProfessionalSessions: undefined;
  ProfessionalProfile: undefined;
  ClientProfile: { clientId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Specialists: undefined;
  Sessions: undefined;
  Profile: undefined;
};

/**
 * Filter options for specialists screen
 */
export interface SpecialistFilters {
  specializations: string[];
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  firstVisitFree: boolean;
}

/**
 * Sort options for specialists
 */
export type SortOption =
  | 'affinity'
  | 'rating'
  | 'price_low'
  | 'price_high'
  | 'availability';

/**
 * Tab type for profile screen
 */
export type ProfileTab =
  | 'information'
  | 'payment'
  | 'referrals'
  | 'diary';

/**
 * Session tab type
 */
export type SessionTab = 'upcoming' | 'history';

/**
 * Professional session tab type
 */
export type ProfessionalSessionTab = 'upcoming' | 'history' | 'pending';

/**
 * Client/Patient information for professionals
 */
export interface Client {
  id: string;
  name: string;
  initial: string;
  email: string;
  phone?: string;
  avatar?: string;
  lastSession?: Date;
  nextSession?: Date;
  totalSessions: number;
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
}

/**
 * Professional statistics
 */
export interface ProfessionalStats {
  totalClients: number;
  sessionsThisWeek: number;
  averageRating: number;
  pendingAppointments: number;
}

/**
 * Session from professional's perspective
 */
export interface ProfessionalSession {
  id: string;
  clientId: string;
  clientName: string;
  clientInitial: string;
  date: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
  meetingLink?: string;
  notes?: string;
  type: 'video' | 'audio' | 'chat';
  clientAvatar?: string;
}
