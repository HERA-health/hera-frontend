import type { RootStackParamList } from '../../constants/types';
import type {
  ProfessionalTourDefinition,
  ProfessionalTourDisplayMode,
  ProfessionalTourId,
  ProfessionalTourStepDefinition,
} from './professionalTourTypes';

export const PROFESSIONAL_ROUTE_TOUR_MAP: Partial<
  Record<keyof RootStackParamList, ProfessionalTourId>
> = {
  ProfessionalHome: 'professional_home_v1',
  ProfessionalClients: 'professional_clients_v1',
  ProfessionalSessions: 'professional_sessions_v1',
  ProfessionalAvailability: 'professional_availability_v1',
  ProfessionalBilling: 'professional_billing_v1',
  ProfessionalProfile: 'professional_profile_v1',
  ClientProfile: 'professional_client_profile_v1',
  ProfessionalDashboard: 'professional_dashboard_v1',
};

export const PROFESSIONAL_TOUR_DEFINITIONS: Record<
  ProfessionalTourId,
  ProfessionalTourDefinition
> = {
  professional_home_v1: {
    id: 'professional_home_v1',
    version: 1,
    routeName: 'ProfessionalHome',
    autoStart: true,
    steps: [
      {
        id: 'navigation-desktop',
        targetId: 'professional.nav.home',
        title: 'Tu mapa principal',
        body: 'La barra lateral concentra las áreas clave: pacientes, sesiones, facturación, disponibilidad y perfil.',
        display: 'desktop',
        placement: 'right',
      },
      {
        id: 'navigation-mobile',
        targetId: 'professional.nav.mobile-menu',
        title: 'Tu mapa principal',
        body: 'En móvil, abre este menú para moverte entre pacientes, sesiones, facturación, disponibilidad y perfil.',
        display: 'mobile',
        placement: 'bottom',
      },
      {
        id: 'calendar',
        targetId: 'professional.home.calendar',
        title: 'Agenda de trabajo',
        body: 'Aquí puedes revisar el mes o la semana, cambiar de fecha y detectar sesiones pendientes o confirmadas.',
        placement: 'bottom',
      },
      {
        id: 'pending',
        targetId: 'professional.home.pending-requests',
        title: 'Solicitudes pendientes',
        body: 'Las nuevas reservas aparecen aquí para confirmarlas o rechazarlas sin buscar por toda la agenda.',
        placement: 'left',
      },
      {
        id: 'upcoming',
        targetId: 'professional.home.upcoming-sessions',
        title: 'Próximas sesiones',
        body: 'Este bloque resume lo inmediato para que puedas preparar el día con menos fricción.',
        placement: 'left',
      },
    ],
  },
  professional_clients_v1: {
    id: 'professional_clients_v1',
    version: 1,
    routeName: 'ProfessionalClients',
    autoStart: true,
    steps: [
      {
        id: 'new-patient',
        targetId: 'professional.clients.new-patient',
        title: 'Crear paciente gestionado',
        body: 'Usa este botón para registrar pacientes que aún no tienen cuenta HERA y poder agendarles citas.',
        placement: 'left',
      },
      {
        id: 'filters',
        targetId: 'professional.clients.filters',
        title: 'Busca y ordena tu cartera',
        body: 'Filtra por tipo y estado, o busca por nombre, email o teléfono cuando la lista crezca.',
        placement: 'bottom',
      },
      {
        id: 'grid',
        targetId: 'professional.clients.grid',
        title: 'Acciones por paciente',
        body: 'Cada ficha permite abrir el detalle, crear citas y distinguir pacientes registrados de gestionados.',
        placement: 'top',
      },
    ],
  },
  professional_sessions_v1: {
    id: 'professional_sessions_v1',
    version: 1,
    routeName: 'ProfessionalSessions',
    autoStart: true,
    steps: [
      {
        id: 'new-session',
        targetId: 'professional.sessions.new-session',
        title: 'Programa una cita',
        body: 'Desde aquí creas sesiones para pacientes gestionados sin salir del calendario.',
        placement: 'left',
      },
      {
        id: 'views',
        targetId: 'professional.sessions.view-tabs',
        title: 'Cambia la vista',
        body: 'Alterna entre día, semana o lista. En móvil priorizamos la lista para que todo sea más legible.',
        placement: 'bottom',
      },
      {
        id: 'date-controls',
        targetId: 'professional.sessions.date-controls',
        title: 'Salta de fecha',
        body: 'Avanza, vuelve a hoy o usa el calendario lateral para encontrar rápidamente una sesión.',
        placement: 'bottom',
      },
      {
        id: 'session-list',
        targetId: 'professional.sessions.list',
        title: 'Acciones de sesión',
        body: 'En cada tarjeta podrás confirmar, cancelar, entrar a videollamada o abrir la ficha del paciente.',
        placement: 'top',
      },
    ],
  },
  professional_availability_v1: {
    id: 'professional_availability_v1',
    version: 1,
    routeName: 'ProfessionalAvailability',
    autoStart: true,
    steps: [
      {
        id: 'presets',
        targetId: 'professional.availability.presets',
        title: 'Empieza con patrones',
        body: 'Aplica una base de mañana, tarde o jornada completa y después ajusta solo lo necesario.',
        placement: 'bottom',
      },
      {
        id: 'weekly-grid',
        targetId: 'professional.availability.weekly-grid',
        title: 'Marca tus huecos reales',
        body: 'Activa días y pulsa franjas para decidir cuándo pueden reservarte los pacientes.',
        placement: 'bottom',
      },
      {
        id: 'sidebar',
        targetId: 'professional.availability.sidebar',
        title: 'Excepciones y resumen',
        body: 'Aquí bloqueas vacaciones, revisas el total semanal y conectas la duración con tus tarifas.',
        placement: 'left',
      },
      {
        id: 'save',
        targetId: 'professional.availability.save',
        title: 'Guarda antes de salir',
        body: 'Los cambios no afectan a las reservas públicas hasta que pulses Guardar.',
        placement: 'bottom',
      },
    ],
  },
  professional_billing_v1: {
    id: 'professional_billing_v1',
    version: 1,
    routeName: 'ProfessionalBilling',
    autoStart: true,
    steps: [
      {
        id: 'new-invoice',
        targetId: 'professional.billing.new-invoice',
        title: 'Crea facturas',
        body: 'Este botón abre el flujo para generar facturas completas o simplificadas.',
        placement: 'left',
      },
      {
        id: 'invoice-list',
        targetId: 'professional.billing.invoice-list',
        title: 'Historial y estados',
        body: 'Busca por paciente, filtra por estado y descarga o envía facturas desde la lista.',
        placement: 'right',
      },
      {
        id: 'tariffs',
        targetId: 'professional.billing.tariffs',
        title: 'Tarifas base',
        body: 'Configura precios y duraciones. Disponibilidad usa estos datos para mostrar reservas coherentes.',
        placement: 'left',
      },
      {
        id: 'fiscal',
        targetId: 'professional.billing.fiscal',
        title: 'Datos fiscales',
        body: 'Completa aquí los datos que se reutilizan en cada factura para evitar trabajo repetido.',
        placement: 'left',
      },
      {
        id: 'automation',
        targetId: 'professional.billing.automation',
        title: 'Automatizaciones',
        body: 'Activa solo lo que quieras delegar: generar, enviar o copiar facturas automáticamente.',
        placement: 'left',
      },
    ],
  },
  professional_profile_v1: {
    id: 'professional_profile_v1',
    version: 1,
    routeName: 'ProfessionalProfile',
    autoStart: true,
    steps: [
      {
        id: 'tabs',
        targetId: 'professional.profile.tabs',
        title: 'Perfil por secciones',
        body: 'Las pestañas separan información pública, mi espacio, credenciales, facturación, privacidad y cuenta.',
        placement: 'bottom',
      },
      {
        id: 'visibility',
        targetId: 'professional.profile.visibility',
        title: 'Visibilidad y enlace',
        body: 'Comprueba si tu perfil está público y comparte el enlace cuando la verificación lo permita.',
        placement: 'left',
      },
      {
        id: 'preview',
        targetId: 'professional.profile.preview',
        title: 'Vista de paciente',
        body: 'La previsualización ayuda a entender cómo te verán los pacientes antes de guardar cambios.',
        display: 'desktop',
        placement: 'left',
      },
      {
        id: 'save',
        targetId: 'professional.profile.save',
        title: 'Guarda cambios',
        body: 'Este botón se activa cuando hay cambios pendientes. Nada se publica hasta guardar.',
        placement: 'top',
      },
    ],
  },
  professional_client_profile_v1: {
    id: 'professional_client_profile_v1',
    version: 1,
    routeName: 'ClientProfile',
    autoStart: false,
    steps: [
      {
        id: 'hero',
        targetId: 'professional.client-profile.hero',
        title: 'Ficha del paciente',
        body: 'Este resumen separa datos administrativos, estado y contexto sin mostrar información clínica innecesaria.',
        placement: 'bottom',
      },
      {
        id: 'actions',
        targetId: 'professional.client-profile.actions',
        title: 'Acciones principales',
        body: 'Desde aquí puedes editar, crear cita, contactar o archivar la ficha cuando corresponda.',
        placement: 'top',
      },
      {
        id: 'tabs',
        targetId: 'professional.client-profile.tabs',
        title: 'Resumen, historial y área clínica',
        body: 'El área clínica mantiene sus protecciones propias; la guía solo orienta sobre dónde encontrarla.',
        placement: 'bottom',
      },
    ],
  },
  professional_clinical_area_v1: {
    id: 'professional_clinical_area_v1',
    version: 1,
    routeName: 'ClientProfile',
    autoStart: true,
    steps: [
      {
        id: 'clinical-hero',
        targetId: 'professional.clinical.hero',
        title: 'Expediente protegido',
        body: 'Al desbloquear el área clínica verás el estado del consentimiento, el contenido cargado y el botón para bloquear de nuevo el acceso.',
        placement: 'bottom',
      },
      {
        id: 'workspace-tabs',
        targetId: 'professional.clinical.workspace-tabs',
        title: 'Dos espacios de trabajo',
        body: 'General reúne notas, consentimientos y documentos estables. Sesiones organiza cada cita como una carpeta con notas, materiales y factura vinculada.',
        placement: 'bottom',
      },
      {
        id: 'notes',
        targetId: 'professional.clinical.notes',
        title: 'Notas generales',
        body: 'Usa este bloque para contexto del proceso, acuerdos o hitos que no pertenecen a una única sesión. No se mezclan con la ficha administrativa.',
        placement: 'bottom',
      },
      {
        id: 'timeline',
        targetId: 'professional.clinical.timeline',
        title: 'Timeline general',
        body: 'Aquí revisas las notas recientes del expediente sin abrir cada entrada una por una.',
        placement: 'bottom',
      },
      {
        id: 'questionnaire',
        targetId: 'professional.clinical.questionnaire',
        title: 'Cuestionario del paciente',
        body: 'Este panel resume las respuestas del cuestionario cuando existan, para tener contexto inicial sin salir del área clínica.',
        placement: 'bottom',
      },
      {
        id: 'consent',
        targetId: 'professional.clinical.consent',
        title: 'Consentimiento digital o manual',
        body: 'Si el paciente tiene cuenta HERA, solicita la firma digital. Si es un paciente gestionado, registra el consentimiento cuando hayas adjuntado el documento firmado.',
        placement: 'bottom',
      },
      {
        id: 'consent-documents',
        targetId: 'professional.clinical.consent-documents',
        title: 'Consentimiento firmado externo',
        body: 'Para pacientes sin cuenta HERA, adjunta aquí el PDF o documento firmado que acredita la autorización clínica. También puedes guardar evidencias de apoyo.',
        placement: 'bottom',
      },
      {
        id: 'reports',
        targetId: 'professional.clinical.reports',
        title: 'Informes médicos',
        body: 'Guarda informes de derivación, diagnósticos o documentación clínica de apoyo sin mezclarlos con notas de sesión.',
        placement: 'bottom',
      },
      {
        id: 'documents',
        targetId: 'professional.clinical.documents',
        title: 'Documentación general',
        body: 'Este espacio queda para documentos fijos del paciente que convenga tener accesibles dentro del expediente clínico.',
        placement: 'top',
      },
    ],
  },
  professional_dashboard_v1: {
    id: 'professional_dashboard_v1',
    version: 1,
    routeName: 'ProfessionalDashboard',
    autoStart: true,
    steps: [
      {
        id: 'income-chart',
        targetId: 'professional.dashboard.income-chart',
        title: 'Evolución mensual',
        body: 'Este gráfico te ayuda a leer la facturación por mes y cambiar de año cuando haya histórico.',
        placement: 'bottom',
      },
      {
        id: 'kpis',
        targetId: 'professional.dashboard.kpis',
        title: 'Indicadores rápidos',
        body: 'Los KPIs resumen ingresos, sesiones, pacientes activos y próximas citas sin entrar en cada módulo.',
        placement: 'left',
      },
      {
        id: 'detail-charts',
        targetId: 'professional.dashboard.detail-charts',
        title: 'Calidad y actividad',
        body: 'Abajo tienes valoraciones, sesiones por estado y actividad por día para detectar tendencias.',
        mobilePlacement: 'bottom',
        placement: 'top',
      },
    ],
  },
};

export function getProfessionalTourDefinition(
  tourId: ProfessionalTourId,
): ProfessionalTourDefinition {
  return PROFESSIONAL_TOUR_DEFINITIONS[tourId];
}

export function getProfessionalTourIdForRoute(
  routeName: string,
): ProfessionalTourId | null {
  const routeTour = PROFESSIONAL_ROUTE_TOUR_MAP[routeName as keyof RootStackParamList];
  return routeTour ?? null;
}

export function getProfessionalTourIdsForRoute(routeName: string): ProfessionalTourId[] {
  const defaultTourId = getProfessionalTourIdForRoute(routeName);
  const routeTourIds = Object.values(PROFESSIONAL_TOUR_DEFINITIONS)
    .filter((definition) => definition.routeName === routeName)
    .map((definition) => definition.id);

  if (!defaultTourId) {
    return routeTourIds;
  }

  return [
    defaultTourId,
    ...routeTourIds.filter((tourId) => tourId !== defaultTourId),
  ];
}

export function getProfessionalTourStepsForDisplay(
  definition: ProfessionalTourDefinition,
  displayMode: Exclude<ProfessionalTourDisplayMode, 'all'>,
): ProfessionalTourStepDefinition[] {
  return definition.steps.filter(
    (step) => !step.display || step.display === 'all' || step.display === displayMode,
  );
}
