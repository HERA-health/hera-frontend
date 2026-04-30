import type { ApiSession } from '../../types';
import { buildGoogleMapsSearchUrl, getSessionOfficeLocation } from '../sessionLocation';

const buildSession = (overrides: Partial<ApiSession> = {}): ApiSession => ({
  id: 'session-1',
  date: '2026-05-20T10:00:00.000Z',
  duration: 60,
  status: 'CONFIRMED',
  type: 'IN_PERSON',
  meetingLink: null,
  hasReview: false,
  specialist: {
    id: 'specialist-1',
    specialization: 'Psicología sanitaria',
    pricePerSession: 80,
    avatar: null,
    officeAddress: 'Calle Serrano 10',
    officeCity: 'Madrid',
    officePostalCode: '28001',
    officeCountry: 'Spain',
    officeLat: 40.425,
    officeLng: -3.687,
    user: {
      name: 'Dra. Elena Martin',
      email: 'elena@example.com',
      avatar: null,
    },
  },
  ...overrides,
});

describe('sessionLocation', () => {
  it('returns null for remote sessions', () => {
    const location = getSessionOfficeLocation(buildSession({ type: 'VIDEO_CALL' }));

    expect(location).toBeNull();
  });

  it('builds address, coordinates and directions for in-person sessions', () => {
    const location = getSessionOfficeLocation(buildSession());

    expect(location).toMatchObject({
      hasAddress: true,
      hasCoordinates: true,
      line1: 'Calle Serrano 10',
      city: 'Madrid',
      fullAddress: 'Calle Serrano 10, Madrid, 28001, Spain',
      lat: 40.425,
      lng: -3.687,
    });
    expect(location?.directionsUrl).toBe(
      buildGoogleMapsSearchUrl('Calle Serrano 10, Madrid, 28001, Spain')
    );
  });

  it('keeps address directions available without coordinates', () => {
    const location = getSessionOfficeLocation(
      buildSession({
        specialist: {
          ...buildSession().specialist,
          officeLat: null,
          officeLng: null,
        },
      })
    );

    expect(location?.hasAddress).toBe(true);
    expect(location?.hasCoordinates).toBe(false);
    expect(location?.directionsUrl).toContain('google.com/maps/search');
  });

  it('uses available city and country when the street address is missing', () => {
    const location = getSessionOfficeLocation(
      buildSession({
        specialist: {
          ...buildSession().specialist,
          officeAddress: null,
          officeLat: null,
          officeLng: null,
        },
      })
    );

    expect(location?.hasAddress).toBe(true);
    expect(location?.fullAddress).toBe('Madrid, 28001, Spain');
    expect(location?.directionsUrl).toBe(buildGoogleMapsSearchUrl('Madrid, 28001, Spain'));
  });

  it('keeps directions available from coordinates when textual address is missing', () => {
    const location = getSessionOfficeLocation(
      buildSession({
        specialist: {
          ...buildSession().specialist,
          officeAddress: null,
          officeCity: null,
          officePostalCode: null,
          officeCountry: null,
        },
      })
    );

    expect(location?.hasAddress).toBe(false);
    expect(location?.hasCoordinates).toBe(true);
    expect(location?.directionsUrl).toBe(buildGoogleMapsSearchUrl('40.425,-3.687'));
  });

  it('marks in-person sessions without address or coordinates as pending location', () => {
    const location = getSessionOfficeLocation(
      buildSession({
        specialist: {
          ...buildSession().specialist,
          officeAddress: null,
          officeCity: null,
          officePostalCode: null,
          officeCountry: null,
          officeLat: null,
          officeLng: null,
        },
      })
    );

    expect(location?.hasAddress).toBe(false);
    expect(location?.hasCoordinates).toBe(false);
    expect(location?.directionsUrl).toBeNull();
  });
});
