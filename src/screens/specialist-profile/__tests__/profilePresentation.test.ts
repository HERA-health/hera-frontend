import {
  formatProfileSlotLabel,
  getCloudinaryProfileImageUrl,
  getProfileLanguageItems,
  getProfileLanguages,
} from '../profilePresentation';
import type { Specialist } from '../types';

const specialistWithLanguages = {
  languagesSpoken: ['Español', 'English', '  Català  '],
  languages: ['español', 'ENGLISH', 'Francés', 'German', 'Portuguese'],
} as Specialist;

describe('profilePresentation', () => {
  it('combines normalized profile and matching languages without duplicates', () => {
    expect(getProfileLanguages(specialistWithLanguages)).toEqual([
      'Español',
      'Inglés',
      'Catalán',
      'Francés',
      'Alemán',
      'Portugués',
    ]);
    expect(getProfileLanguageItems(specialistWithLanguages)).toEqual([
      { label: 'Español', flag: 'spain' },
      { label: 'Inglés', flag: 'united-kingdom' },
      { label: 'Catalán', flag: 'catalonia' },
      { label: 'Francés', flag: 'france' },
      { label: 'Alemán', flag: 'germany' },
      { label: 'Portugués', flag: 'portugal' },
    ]);
  });

  it('returns no languages when both sources are empty', () => {
    expect(getProfileLanguages({ languages: [], languagesSpoken: [] } as unknown as Specialist))
      .toEqual([]);
  });

  it('requests a face-aware Cloudinary variant for the hero', () => {
    expect(getCloudinaryProfileImageUrl(
      'https://res.cloudinary.com/hera/image/upload/v123/profile/avatar.jpg',
      720,
      900,
    )).toBe(
      'https://res.cloudinary.com/hera/image/upload/c_fill,g_auto:faces,w_720,h_900,q_auto:good,f_auto/v123/profile/avatar.jpg',
    );
  });

  it('replaces an existing Cloudinary transformation instead of stacking it', () => {
    expect(getCloudinaryProfileImageUrl(
      'https://res.cloudinary.com/hera/image/upload/c_fill,w_500,q_auto/v123/avatar.jpg',
      900,
      675,
    )).toBe(
      'https://res.cloudinary.com/hera/image/upload/c_fill,g_auto:faces,w_900,h_675,q_auto:good,f_auto/v123/avatar.jpg',
    );
  });

  it('leaves external image URLs untouched', () => {
    const external = 'https://images.example.com/avatar.jpg';
    expect(getCloudinaryProfileImageUrl(external, 720, 900)).toBe(external);
  });

  it('formats the selected booking slot for the contextual CTA', () => {
    expect(formatProfileSlotLabel('2026-07-29', '11:05')).toBe('mié 29 jul, 11:05');
  });
});
