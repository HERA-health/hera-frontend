export const LANDING_SECTION_ANCHORS = [
  'howItWorks',
  'featuredSpecialists',
  'about',
  'forSpecialists',
  'specializations',
  'faq',
] as const;

export type LandingSectionAnchor = (typeof LANDING_SECTION_ANCHORS)[number];

export const LANDING_SECTION_NATIVE_IDS: Record<LandingSectionAnchor, string> = {
  howItWorks: 'landing-section-how-it-works',
  featuredSpecialists: 'landing-section-featured-specialists',
  about: 'landing-section-about',
  forSpecialists: 'landing-section-for-specialists',
  specializations: 'landing-section-specializations',
  faq: 'landing-section-faq',
};

export const isLandingSectionAnchor = (
  value: unknown
): value is LandingSectionAnchor =>
  typeof value === 'string'
  && LANDING_SECTION_ANCHORS.some((section) => section === value);
