import type { LandingSectionAnchor } from './landingNavigation';

export const PUBLIC_HEADER_LINKS: ReadonlyArray<{ id: LandingSectionAnchor; label: string }> = [
  { id: 'featuredSpecialists', label: 'Psicólogos' },
  { id: 'howItWorks', label: 'Cómo funciona' },
  { id: 'forSpecialists', label: 'Para psicólogos' },
  { id: 'specializations', label: 'Especialidades' },
  { id: 'about', label: 'Quiénes somos' },
  { id: 'faq', label: 'Dudas' },
];
