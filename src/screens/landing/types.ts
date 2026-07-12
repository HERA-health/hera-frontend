export type LandingSectionAnchor =
  | 'howItWorks'
  | 'featuredSpecialists'
  | 'about'
  | 'forSpecialists'
  | 'specializations'
  | 'faq';

export const LANDING_SECTION_NATIVE_IDS: Record<LandingSectionAnchor, string> = {
  howItWorks: 'landing-section-how-it-works',
  featuredSpecialists: 'landing-section-featured-specialists',
  about: 'landing-section-about',
  forSpecialists: 'landing-section-for-specialists',
  specializations: 'landing-section-specializations',
  faq: 'landing-section-faq',
};
