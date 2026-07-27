import Ionicons from '@expo/vector-icons/Ionicons';

import type {
  BookingQuote,
  SessionType,
} from '../../../services/sessionsService';
import type { BookingOfficeLocation } from '../../../constants/types';
import type { Specialist } from '../../specialist-profile/types';
import { formatMadridDateKey } from '../../../utils/madridTime';

export interface BookingSpecialist {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  pricePerSession: number;
  specializations?: string[];
  sessionDuration?: number;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  officeLocation?: BookingOfficeLocation;
}

export const mapProfileToBookingSpecialist = (
  specialist: Specialist,
): BookingSpecialist => ({
  id: specialist.id,
  name: specialist.name,
  title: specialist.title,
  avatar: specialist.avatar,
  pricePerSession: specialist.pricePerSession,
  specializations: specialist.specializations,
  sessionDuration: specialist.slotDuration ?? 60,
  offersOnline: specialist.offersOnline ?? false,
  offersInPerson: specialist.offersInPerson ?? false,
  officeLocation: specialist.address,
});

export interface BookingSelection {
  selectedDate: string | null;
  selectedTime: string | null;
  sessionType: SessionType;
}

export interface BookingSessionOption {
  type: SessionType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const BOOKING_SESSION_OPTIONS: readonly BookingSessionOption[] = [
  {
    type: 'VIDEO_CALL',
    label: 'Videollamada',
    description: 'Sesión privada desde cualquier lugar',
    icon: 'videocam-outline',
  },
  {
    type: 'IN_PERSON',
    label: 'Presencial',
    description: 'Encuentro en la consulta del profesional',
    icon: 'business-outline',
  },
];

const SPECIALIZATION_LABELS: Record<string, string> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  couples: 'Pareja',
  trauma: 'Trauma',
  stress: 'Estrés',
  self_esteem: 'Autoestima',
  selfesteem: 'Autoestima',
  autoestima: 'Autoestima',
  pareja: 'Pareja',
  ansiedad: 'Ansiedad',
  depresion: 'Depresión',
  trauma_y_duelo: 'Trauma y duelo',
  grief: 'Duelo',
  duelo: 'Duelo',
};

export const formatSpecialization = (specialization: string): string => {
  const normalized = specialization.trim().toLowerCase().replace(/\s+/g, '_');

  return (
    SPECIALIZATION_LABELS[normalized]
    ?? specialization
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

export const formatBookingDate = (dateString: string): string =>
  formatMadridDateKey(dateString, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const formatBookingAmount = (amount: number): string =>
  `${amount.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`;

export const formatOfficeLocation = (
  location: BookingOfficeLocation,
): { street: string; locality: string } => ({
  street: location.street.trim(),
  locality: [location.postalCode?.trim(), location.city.trim()]
    .filter(Boolean)
    .join(' '),
});

interface QuotePresentationInput {
  bookingQuote?: BookingQuote | null;
  quoteLoading?: boolean;
  quoteError?: string | null;
  quoteIsEstimated?: boolean;
}

export interface QuotePresentation {
  priceText: string;
  pricePerSessionText: string;
  caption: string;
}

export const getQuotePresentation = ({
  bookingQuote = null,
  quoteLoading = false,
  quoteError = null,
  quoteIsEstimated = false,
}: QuotePresentationInput): QuotePresentation => {
  const priceText = quoteLoading
    ? 'Calculando...'
    : quoteError
      ? 'No disponible'
      : bookingQuote
        ? formatBookingAmount(bookingQuote.price)
        : 'Calculando...';

  const caption = bookingQuote?.firstVisitFreeApplied
    ? `Primera sesión gratuita aplicada. Tarifa habitual ${formatBookingAmount(bookingQuote.basePrice)}`
    : quoteError
      ?? (quoteIsEstimated
        ? 'Precio publicado por el profesional.'
        : bookingQuote
          ? 'Precio final calculado para esta reserva.'
          : 'Calculando precio...');

  return {
    priceText,
    pricePerSessionText: bookingQuote ? `${priceText} / sesión` : priceText,
    caption,
  };
};
