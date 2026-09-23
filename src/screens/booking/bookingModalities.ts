import type { SessionType } from '../../services/sessionsService';

export interface BookingModalityFlags {
  offersOnline?: boolean;
  offersPhone?: boolean;
  offersInPerson?: boolean;
}

export const getAvailableBookingSessionTypes = (
  flags: BookingModalityFlags
): SessionType[] => {
  const available: SessionType[] = [];

  if (flags.offersOnline !== false) {
    available.push('VIDEO_CALL');
  }

  if (flags.offersInPerson === true) {
    available.push('IN_PERSON');
  }

  if (flags.offersPhone === true) available.push('PHONE_CALL');
  return available;
};

export const getDefaultBookingSessionType = (
  flags: BookingModalityFlags
): SessionType | null => getAvailableBookingSessionTypes(flags)[0] ?? null;

export const isBookingSessionTypeAvailable = (
  type: SessionType,
  flags: BookingModalityFlags
): boolean => getAvailableBookingSessionTypes(flags).includes(type);
