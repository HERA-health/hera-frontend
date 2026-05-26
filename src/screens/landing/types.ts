export type LandingSectionAnchor =
  | 'howItWorks'
  | 'about'
  | 'forSpecialists'
  | 'specializations'
  | 'faq';

export const LANDING_SECTION_NATIVE_IDS: Record<LandingSectionAnchor, string> = {
  howItWorks: 'landing-section-how-it-works',
  about: 'landing-section-about',
  forSpecialists: 'landing-section-for-specialists',
  specializations: 'landing-section-specializations',
  faq: 'landing-section-faq',
};
