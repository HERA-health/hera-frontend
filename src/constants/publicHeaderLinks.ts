import type { LandingSectionAnchor } from './landingNavigation';

export const PUBLIC_HEADER_LINKS: ReadonlyArray<{ id: LandingSectionAnchor; label: string }> = [
  { id: 'featuredSpecialists', label: 'Especialistas' },
  { id: 'howItWorks', label: 'Cómo funciona' },
  { id: 'forSpecialists', label: 'Para profesionales' },
  { id: 'specializations', label: 'Especialidades' },
  { id: 'about', label: 'Quiénes somos' },
  { id: 'faq', label: 'FAQ' },
];
