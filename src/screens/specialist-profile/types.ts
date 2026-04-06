/**
 * Types for the Specialist Profile Screen
 * Following SOLID principles - Single Responsibility
 */

export interface Specialist {
  id: string;
  name: string;
  title: string;
  avatar?: string;
  bio: string;
  rating: number;
  reviewCount: number;
  pricePerSession: number;
  specializations: string[];
  specializationsDetail?: SpecializationDetail[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  certifications?: CertificateItem[];
  collegiateNumber?: string;
  nextAvailable?: string | null;
  isAvailableToday?: boolean;
  isOnline?: boolean;
  slotDuration?: number | null;
  sessionTypes: SessionType[];
  languages?: string[];
  therapeuticApproach?: string;
  experienceYears?: number;
  address?: Address;
  schedule?: Schedule;
  // Service modality
  offersOnline?: boolean;
  offersInPerson?: boolean;
  // New profile fields
  gradientId?: string;
  personalMotto?: string | null;
  photoGallery?: string[];
  presentationVideoUrl?: string | null;
  yearsInPractice?: number | null;
  languagesSpoken?: string[];
  verificationStatus?: string;
  firstVisitFree?: boolean;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface Schedule {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

export type SessionType = 'VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL';

export interface SpecializationDetail {
  name: string;
  icon: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
}

export interface ExperienceItem {
  id: string;
  position: string;
  organization: string;
  startYear: string;
  endYear?: string | null;
  current?: boolean;
}

export interface CertificateItem {
  id: string;
  name: string;
  issuer?: string;
  validUntil?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  date: string;
}

// Props interfaces for components
export interface ProfileHeroProps {
  specialist: Specialist;
  affinity?: number;
  onBookPress: () => void;
  onRatingPress?: () => void;
  gradientColors: [string, string];
  onSharePress?: () => void;
  bio?: string | null;
  personalMotto?: string | null;
  therapeuticApproach?: string;
}

export interface AboutSectionProps {
  bio: string;
  therapeuticApproach?: string;
}

export interface SpecializationsGridProps {
  specializations: string[];
  specializationsDetail?: SpecializationDetail[];
}

export interface ExperienceSectionProps {
  education?: EducationItem[];
  experience?: ExperienceItem[];
  certifications?: CertificateItem[];
  collegiateNumber?: string;
  experienceYears?: number;
}

export interface ReviewsSectionProps {
  reviews: Review[];
  rating: number;
  reviewCount: number;
  onSeeAllPress?: () => void;
}

export interface ReviewCardProps {
  review: Review;
}

export interface StickyBookingBarProps {
  specialistName: string;
  pricePerSession: number;
  onBookPress: () => void;
  visible: boolean;
}

export interface BookingSidebarProps {
  specialist: Specialist;
  onBookPress: () => void;
  gradientColors: [string, string];
}

export interface CompactHeroProps {
  specialist: Specialist;
  affinity?: number;
  onRatingPress?: () => void;
  gradientColors: [string, string];
}

export interface PhotoGallerySectionProps {
  photoGallery: string[];
  specialistName?: string;
}

export interface VideoSectionProps {
  presentationVideoUrl: string;
  specialistName: string;
  gradientColors: [string, string];
}

export interface ProfileSkeletonProps {
  isDesktop?: boolean;
}

// Specialization icon mapping
export const SPECIALIZATION_ICONS: Record<string, string> = {
  'Ansiedad': '😰',
  'Estrés': '😤',
  'Depresión': '😔',
  'Pareja': '💔',
  'Trauma': '🧠',
  'Autoestima': '💪',
  'Duelo': '🕊️',
  'TDAH': '🎯',
  'Adicciones': '🔗',
  'Fobias': '😨',
  'TOC': '🔄',
  'Alimentación': '🍽️',
  'Sueño': '😴',
  'Laboral': '💼',
  'Familia': '👨‍👩‍👧',
  'Adolescentes': '🧒',
  'Infantil': '👶',
  'Sexología': '💕',
  'default': '🌿',
};

export const getSpecializationIcon = (name: string): string => {
  const normalizedName = name.toLowerCase();
  for (const [key, icon] of Object.entries(SPECIALIZATION_ICONS)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return icon;
    }
  }
  return SPECIALIZATION_ICONS.default;
};
