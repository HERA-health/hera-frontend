import type { ApiSession } from '../types';

export interface SessionOfficeLocation {
  hasAddress: boolean;
  hasCoordinates: boolean;
  line1: string;
  city: string;
  fullAddress: string;
  lat: number | null;
  lng: number | null;
  directionsUrl: string | null;
}

const trimOptional = (value?: string | null): string => value?.trim() ?? '';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const buildGoogleMapsSearchUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const buildCoordinateQuery = (lat: number, lng: number): string => `${lat},${lng}`;

export const getSessionOfficeLocation = (
  session: ApiSession
): SessionOfficeLocation | null => {
  if (session.type !== 'IN_PERSON') {
    return null;
  }

  const line1 = trimOptional(session.specialist.officeAddress);
  const city = trimOptional(session.specialist.officeCity);
  const postalCode = trimOptional(session.specialist.officePostalCode);
  const country = trimOptional(session.specialist.officeCountry);
  const lat = isFiniteNumber(session.specialist.officeLat) ? session.specialist.officeLat : null;
  const lng = isFiniteNumber(session.specialist.officeLng) ? session.specialist.officeLng : null;
  const hasCoordinates = lat !== null && lng !== null;
  const fullAddress = [line1, city, postalCode, country]
    .filter((part) => part.length > 0)
    .join(', ');
  const hasAddress = fullAddress.length > 0;
  const directionsQuery = hasAddress
    ? fullAddress
    : hasCoordinates
      ? buildCoordinateQuery(lat, lng)
      : null;

  return {
    hasAddress,
    hasCoordinates,
    line1,
    city,
    fullAddress,
    lat,
    lng,
    directionsUrl: directionsQuery ? buildGoogleMapsSearchUrl(directionsQuery) : null,
  };
};
