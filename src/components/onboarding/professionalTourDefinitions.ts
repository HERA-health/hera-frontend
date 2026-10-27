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
    version: 2,
    routeName: 'ProfessionalHome',
    autoStart: true,
    steps: [
      {
        id: 'navigation-desktop',
        targetId: 'professional.nav.home',
        title: 'Tu mapa principal',
        body: 'La barra lateral concentra Agenda, pacientes, facturación, estadísticas, perfil y ayuda. Perfil y ayuda también están en tu avatar.',
        display: 'desktop',
        placement: 'right',
      },
      {
        id: 'navigation-mobile',
        targetId: 'professional.nav.mobile-menu',
        title: 'Tu mapa principal',
        body: 'En móvil, abre este menú para navegar y buscar pacientes sin recargar la cabecera.',
        display: 'mobile',
        placement: 'bottom',
      },
      {
        id: 'next-session',
        targetId: 'professional.home.next-session',
        title: 'Lo siguiente, sin ruido',
        body: 'La cita más próxima concentra hora, modalidad, origen y solo las acciones válidas.',
        placement: 'bottom',
      },
      {
        id: 'attention',
        targetId: 'professional.home.attention',
        title: 'Atención o tranquilidad',
        body: 'Si algo necesita una decisión aparece aquí; cuando no, HERA confirma de forma compacta que todo está al día.',
        placement: 'bottom',
      },
      {
        id: 'today',
        targetId: 'professional.home.today',
        title: 'Tu día en orden',
        body: 'Las citas de hoy aparecen cronológicamente y abren el mismo detalle que en Agenda.',
        placement: 'bottom',
      },
      {
        id: 'week-pulse',
        targetId: 'professional.home.week-pulse',
        title: 'Resumen semanal',
        body: 'Actividad, horas reservadas, disponibilidad base y automatizaciones siguen siendo útiles aunque no haya tareas manuales.',
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
        title: 'Añade pacientes desde tu panel',
        body: 'Usa este botón para añadir pacientes que aún no tienen cuenta HERA y poder agendarles citas.',
        placement: 'left',
      },
      {
        id: 'filters',
        targetId: 'professional.clients.filters',
        title: 'Busca y ordena tu cartera',
        body: 'Usa Origen para alternar entre Todos, Autoregistrados y Añadidos por mí, y Estado para ver activos o archivados.',
        placement: 'bottom',
      },
      {
        id: 'grid',
        targetId: 'professional.clients.grid',
        title: 'Acciones por paciente',
        body: 'Cada ficha permite abrir el detalle, crear citas y revisar el consentimiento sin añadir etiquetas permanentes.',
        placement: 'top',
      },
    ],
  },
  professional_sessions_v1: {
    id: 'professional_sessions_v1',
    version: 2,
    routeName: 'ProfessionalSessions',
    autoStart: true,
    steps: [
      {
        id: 'new-session',
        targetId: 'professional.sessions.new-session',
        title: 'Programa una cita',
        body: 'Desde aquí creas sesiones para pacientes de tu consulta sin salir del calendario.',
        placement: 'left',
      },
      {
        id: 'views',
        targetId: 'professional.sessions.view-tabs',
        title: 'Cambia la vista',
        body: 'En escritorio comenzarás en Semana y en móvil en Día. Alterna entre día, semana, mes o lista; recordaremos tu elección. En móvil, la semana se organiza por días.',
        placement: 'bottom',
      },
      {
        id: 'date-controls',
        targetId: 'professional.sessions.date-controls',
        title: 'Salta de fecha',
        body: 'Avanza, vuelve a hoy o pulsa la fecha para elegir un día y encontrar rápidamente una sesión.',
        placement: 'bottom',
      },
      {
        id: 'session-list',
        targetId: 'professional.sessions.list',
        title: 'Acciones de sesión',
        body: 'Abre una cita para ver su detalle, confirmar, cancelar, modificar el horario o acceder a la videollamada y a la ficha, según sus permisos.',
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
        body: 'Elige horario, selecciona días destino y aplica una base antes de ajustar solo lo necesario.',
        placement: 'bottom',
      },
      {
        id: 'weekly-grid',
        targetId: 'professional.availability.weekly-grid',
        title: 'Ajusta tus franjas',
        body: 'Activa días y añade o quita franjas de forma libre para decidir cuándo pueden reservarte los pacientes.',
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
        placement: 'bottom',
      },
      {
        id: 'invoice-list',
        targetId: 'professional.billing.invoice-list',
        title: 'Historial y estados',
        body: 'Busca por paciente, filtra por estado y descarga o envía facturas desde la lista.',
        placement: 'right',
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
        body: 'Activa esta opción para crear la factura y enviarla automáticamente al paciente y al correo de tu cuenta al completar una sesión.',
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
        body: 'Cada apartado tiene su espacio. Calendar y Meet están en Google; tu PIN y los datos de acceso, en Cuenta.',
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
        body: 'Abre tu perfil público real para revisar la experiencia que verá el paciente cuando esté disponible.',
        placement: 'bottom',
      },
      {
        id: 'save',
        targetId: 'professional.profile.save',
        title: 'Guarda cambios',
        body: 'Este botón se activa cuando hay cambios pendientes. Nada se publica hasta guardar.',
        placement: 'bottom',
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
        title: 'Cuatro secciones en la ficha',
        body: 'Información general, Sesiones, Área clínica protegida y Datos y bonos organizan la ficha. Las notas, la historia y los documentos se consultan tras introducir el PIN.',
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
      { id:'clinical-hero', targetId:'professional.clinical.hero', title:'Expediente protegido', body:'Aquí puedes gestionar el consentimiento informado del paciente y bloquear el área clínica cuando termines.', placement:'bottom' },
      { id:'workspace-tabs', targetId:'professional.clinical.workspace-tabs', title:'Una ficha organizada', body:'Información general, Sesiones y Datos y bonos reúnen la gestión administrativa. Notas, historia y documentos se consultan dentro del área clínica protegida.', placement:'bottom' },
      { id:'consent', targetId:'professional.clinical.consent', title:'Consentimiento informado', body:'Registra el PDF firmado o utiliza la firma digital cuando esté disponible. Si está pendiente, puedes seguir trabajando; una retirada impide nuevas actuaciones y conserva el historial.', placement:'bottom' },
      { id:'notes', targetId:'professional.clinical.notes', title:'Notas clínicas', body:'Busca y filtra tus notas, consulta su detalle y adjuntos y conserva el historial de las correcciones. Puedes vincularlas a una sesión.', placement:'bottom' },
      { id:'timeline', targetId:'professional.clinical.timeline', title:'Historia clínica y ejercicios', body:'Registra evaluaciones, antecedentes, evolución, objetivos y planes de tratamiento. El selector Ejercicios conserva tus ejercicios y archivos anteriores.', placement:'bottom' },
      { id:'documents', targetId:'professional.clinical.documents', title:'Documentación clínica', body:'Organiza los archivos del expediente, consulta PDF e imágenes y descarga DOCX. El documento firmado se registra desde Consentimiento informado.', placement:'top' },
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
        body: 'Consulta cobros reales y sesiones completadas. El filtro superior cambia el periodo de toda la pantalla.',
        placement: 'bottom',
      },
      {
        id: 'kpis',
        targetId: 'professional.dashboard.kpis',
        title: 'Indicadores rápidos',
        body: 'Compara cobros, sesiones completadas, pacientes nuevos y pacientes atendidos con el periodo anterior.',
        placement: 'left',
      },
      {
        id: 'detail-charts',
        targetId: 'professional.dashboard.detail-charts',
        title: 'Calidad y actividad',
        body: 'Consulta la evolución de pacientes nuevos y recurrentes. Más abajo encontrarás valoraciones y sesiones por día del mismo periodo.',
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
