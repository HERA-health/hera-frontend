/**
 * TypeScript type definitions for HERA - Health Era
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

  // User information from backend (includes avatar)
  user?: {
    name: string;
    email: string;
    avatar?: string | null;
  };

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

  // Location & modality
  offersInPerson?: boolean;
  offersOnline?: boolean;
  officeCity?: string | null;

  // Distance (calculated by backend when proximity filter is used)
  distance?: number; // in km
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
import type { LegalDocumentKey } from './legal';

export type RootStackParamList = {
  Landing: undefined;
  Welcome: undefined;
  Login: { userType: 'CLIENT' | 'PROFESSIONAL'; specialization?: string };
  Register: { userType: 'CLIENT' | 'PROFESSIONAL' };
  EmailSentVerification: { email: string; userType: 'CLIENT' | 'PROFESSIONAL' };
  EmailVerification: { token: string };
  ClinicalConsent: { requestId: string; token: string };
  LegalDocument: { documentKey: LegalDocumentKey };
  RequiredLegalAcceptance: undefined;
  ForgotPassword: undefined;
  EmailSentPasswordReset: { email: string };
  ResetPassword: { token: string };
  ProfessionalVerification: undefined;
  MainStack: undefined;
  Home: undefined;
  Specialists: undefined;
  Sessions: undefined;
  OnDutyPsychologist: undefined;
  Profile: undefined;
  ProfileCompletion: undefined;
  SpecialistDetail: { specialistId: string; affinity?: number };
  Booking: {
    specialistId: string;
    specialistName: string;
    pricePerSession: number;
    avatar?: string;
  };
  Questionnaire: undefined;
  QuestionnaireResults: { results: any[] };
  ProfessionalHome: undefined;
  ProfessionalDashboard: undefined;
  ProfessionalClients: undefined;
  ProfessionalSessions: undefined;
  ProfessionalProfile: undefined;
  ProfessionalBilling: undefined;
  CreateInvoice: {
    invoiceId?: string;
    clientId?: string;
    sessionId?: string;
    sessionDate?: string;
    sessionDuration?: number;
    returnToClientId?: string;
  };
  ProfessionalAvailability: undefined;
  ClientProfile: {
    clientId: string;
    initialTab?: 'summary' | 'history' | 'clinical';
    focusBillingEditor?: boolean;
  };
  AdminPanel: undefined;
  AdminSpecialistDetail: { specialist: string }; // JSON-serialized PendingSpecialist
  SpecialistDetailAdmin: { specialistId: string };
  PublicSpecialistProfile: { specialistId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Specialists: undefined;
  Sessions: { refresh?: boolean; showSuccess?: boolean } | undefined;
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
  | 'availability'
  | 'distance';

/**
 * Tab type for profile screen
 * Simplified to 2 essential tabs: personal info and payment/billing
 */
export type ProfileTab =
  | 'information'
  | 'payment';

/**
 * Session tab type
 */
export type SessionTab = 'upcoming' | 'history';

/**
 * Professional session tab type
 */
export type ProfessionalSessionTab = 'upcoming' | 'history' | 'pending';

/**
 * Professional session view mode
 */
export type SessionViewMode = 'day' | 'week' | 'list';

/**
 * Session status with display info
 */
export type SessionDisplayStatus = 'confirmed' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

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
  startDate?: Date;
  tags?: string[];

  // User information from backend (includes avatar)
  user?: {
    id?: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
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
  type: 'video' | 'audio' | 'chat';
  clientAvatar?: string;
}

// ============================================================================
// TYPED NAVIGATION HELPERS
// ============================================================================

import { NavigationProp, RouteProp } from '@react-navigation/native';

/**
 * Typed navigation prop for use with useNavigation hook
 *
 * Usage:
 * const navigation = useNavigation<AppNavigationProp>();
 */
export type AppNavigationProp = NavigationProp<RootStackParamList>;

/**
 * Typed route prop for use with useRoute hook
 *
 * Usage:
 * const route = useRoute<AppRouteProp<'Login'>>();
 */
export type AppRouteProp<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;

/**
 * Typed screen props for screen components
 *
 * Usage:
 * type Props = ScreenProps<'Login'>;
 * const LoginScreen: React.FC<Props> = ({ navigation, route }) => { ... }
 */
export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: NavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
};

/**
 * Typed tab navigation prop
 */
export type TabNavigationProp = NavigationProp<MainTabParamList>;

/**
 * Typed tab route prop
 */
export type TabRouteProp<T extends keyof MainTabParamList> = RouteProp<MainTabParamList, T>;
