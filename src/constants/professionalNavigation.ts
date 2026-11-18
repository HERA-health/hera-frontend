/** Shared by the professional pages, pricing and their initial HTML. */
export const professionalHeaderLinks = [
  { href: '/software-para-psicologos', label: 'Funcionalidades', route: 'ProfessionalSoftware' },
  { href: '/agenda-para-psicologos', label: 'Agenda', route: 'ProfessionalAgenda' },
  { href: '/gestion-pacientes-psicologos', label: 'Pacientes e historia clínica', route: 'ProfessionalPatients' },
  { href: '/facturacion-para-psicologos', label: 'Facturación', route: 'ProfessionalBillingInfo' },
  { href: '/perfil-en-el-directorio-para-psicologos', label: 'Directorio', route: 'ProfessionalDirectory' },
  { href: '/profesionales/recorrido', label: 'HERA por dentro', route: 'ProfessionalShowcase' },
  { href: '/planes', label: 'Planes y precios', route: 'Pricing' },
] as const;
