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
  experience?: string[];
  education?: EducationItem[];
  certifications?: string[];
  collegiateNumber?: string;
  nextAvailable?: string;
  isAvailableToday: boolean;
  isOnline?: boolean;
  sessionTypes: SessionType[];
  languages?: string[];
  therapeuticApproach?: string;
  experienceYears?: number;
  address?: Address;
  schedule?: Schedule;
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
  title: string;
  institution: string;
  year: string;
  type: 'degree' | 'certificate';
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
  experience?: string[];
  certifications?: string[];
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
}

export interface CompactHeroProps {
  specialist: Specialist;
  affinity?: number;
  onRatingPress?: () => void;
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
