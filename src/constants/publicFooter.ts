import type { LandingSectionAnchor } from './landingNavigation';
import { professionalHeaderLinks } from './professionalNavigation';

export type FooterAction = 'directory' | 'professional' | 'access' | 'plans' | 'privacy';
export interface FooterLink {
  label: string;
  href: string;
  action?: FooterAction;
  section?: LandingSectionAnchor;
}

export const footerSocialLinks = [
  { label: 'HERA en LinkedIn', icon: 'logo-linkedin', href: 'https://www.linkedin.com/company/health-hera' },
  { label: 'HERA en Instagram', icon: 'logo-instagram', href: 'https://www.instagram.com/health.hera?igsh=MXdrb3h3Yjd2dWc3Zg==' },
  { label: 'HERA en TikTok', icon: 'logo-tiktok', href: 'https://www.tiktok.com/@hera.health.tech?_r=1&_t=ZN-98QojUsdfqo' },
] as const;

export const footerTagline = 'Psicología y consulta, en un mismo lugar.';
export const footerDescription = 'Encuentra un/a psicólogo/a o gestiona tu consulta con agenda, pacientes y facturación. Elige cómo empezar con HERA.';
export const registerProfessionalHref = '/register?userType=PROFESSIONAL';

const sectionLink = (label: string, section: LandingSectionAnchor): FooterLink => ({
  label, section, href: '/?section=' + section,
});

export function footerColumns(
  professionalLabel = 'Crear cuenta profesional',
  professionalHref = registerProfessionalHref,
  accessHref = '/login?userType=PROFESSIONAL',
): { title: string; links: FooterLink[] }[] {
  return [
    { title: 'Pacientes', links: [
      { label: 'Buscar psicólogo/a', href: '/especialistas', action: 'directory' },
      { label: 'Psicólogos/as online', href: '/psicologos-online' },
      { label: 'Psicólogos/as para la ansiedad', href: '/psicologos/ansiedad' },
      { label: 'Psicólogos/as para la autoestima', href: '/psicologos/autoestima' },
      { label: 'Psicólogos/as en Barcelona', href: '/psicologos/barcelona' },
      { label: 'Psicólogos/as en Cataluña', href: '/psicologos/cataluna' },
      sectionLink('Cómo funciona', 'howItWorks'), sectionLink('Especialidades', 'specializations'),
      sectionLink('Preguntas frecuentes', 'faq'),
    ] },
    { title: 'Profesionales', links: [
      { label: professionalLabel, href: professionalHref, action: 'professional' },
      { label: 'Iniciar sesión', href: accessHref, action: 'access' },
      { label: 'Planes para psicólogos/as', href: '/planes', action: 'plans' },
      ...professionalHeaderLinks.filter(item => item.route !== 'Pricing').map(item => ({
        label: item.route === 'ProfessionalSoftware' ? 'Software para psicólogos'
          : item.route === 'ProfessionalAgenda' ? 'Agenda para psicólogos' : item.route === 'ProfessionalDirectory' ? 'Publicar mi perfil en el directorio' : item.label,
        href: item.href,
      })),
      sectionLink('Especialistas destacados', 'featuredSpecialists'),
    ] },
    { title: 'HERA', links: [
      sectionLink('Quiénes somos', 'about'),
      { label: 'Política de cookies', href: '/legal/cookies' },
      { label: 'Política de privacidad', href: '/legal/privacidad' },
      { label: 'Términos y condiciones', href: '/legal/terminos' },
      { label: 'Preferencias de privacidad', href: '/legal/cookies', action: 'privacy' },
      { label: 'Contacto', href: 'mailto:herahealthtech@gmail.com' },
    ] },
  ];
}
