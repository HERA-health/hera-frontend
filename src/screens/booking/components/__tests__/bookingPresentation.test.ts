import { mapProfileToBookingSpecialist } from '../bookingPresentation';
import type { Specialist } from '../../../specialist-profile/types';

describe('mapProfileToBookingSpecialist', () => {
  it('uses canonical profile values and preserves valid zero coordinates', () => {
    const profile: Specialist = {
      id: 'specialist-1',
      name: 'Dra. Prueba',
      title: 'Psicóloga sanitaria',
      avatar: 'https://cdn.example.com/avatar.jpg',
      bio: 'Perfil público',
      rating: 4.9,
      reviewCount: 12,
      pricePerSession: 75,
      specializations: ['Ansiedad'],
      slotDuration: 50,
      sessionTypes: [],
      offersOnline: true,
      offersInPerson: true,
      address: {
        street: 'Calle Prueba, 1',
        city: 'Madrid',
        postalCode: '28001',
        latitude: 0,
        longitude: 0,
      },
    };

    expect(mapProfileToBookingSpecialist(profile)).toEqual({
      id: 'specialist-1',
      name: 'Dra. Prueba',
      title: 'Psicóloga sanitaria',
      avatar: 'https://cdn.example.com/avatar.jpg',
      pricePerSession: 75,
      specializations: ['Ansiedad'],
      sessionDuration: 50,
      offersOnline: true,
      offersInPerson: true,
      officeLocation: profile.address,
    });
  });
});
