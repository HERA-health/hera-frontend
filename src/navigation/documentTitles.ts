import type { LegalDocumentKey } from '../constants/legal';
import type { RootStackParamList } from '../constants/types';

const BRAND_NAME = 'Hera';

const ROUTE_TITLES: Record<keyof RootStackParamList, string> = {
  Landing: 'Inicio',
  Welcome: 'Bienvenida',
  Login: 'Iniciar sesión',
  Register: 'Crear cuenta',
  EmailSentVerification: 'Revisa tu correo',
  EmailVerification: 'Verificación de email',
  ClinicalConsent: 'Consentimiento clínico',
  ClinicConsent: 'Consentimiento de clínica',
  PublicReview: 'Reseña HERA',
  LegalDocument: 'Documento legal',
  RequiredLegalAcceptance: 'Actualización legal',
  ClinicPending: 'Área de clínica',
  ClinicDashboard: 'Panel de clínica',
  ClinicSettings: 'Configuración de clínica',
  ClinicAdministrators: 'Administradores de clínica',
  ClinicTeam: 'Equipo de clínica',
  ClinicPatients: 'Pacientes de clínica',
  ClinicAgenda: 'Agenda de clínica',
  ClinicBilling: 'Facturación de clínica',
  ClinicInvoiceCreate: 'Nueva factura de clínica',
  ForgotPassword: 'Recuperar contraseña',
  EmailSentPasswordReset: 'Revisa tu correo',
  ResetPassword: 'Nueva contraseña',
  ProfessionalVerification: 'Verificación profesional',
  MainStack: 'Área privada',
  Home: 'Inicio',
  Specialists: 'Especialistas',
  PublicSpecialists: 'Especialistas',
  Sessions: 'Mis sesiones',
  OnDutyPsychologist: 'Psicólogo de guardia',
  Profile: 'Mi perfil',
  ProfileCompletion: 'Completar perfil',
  SpecialistDetail: 'Perfil del especialista',
  Booking: 'Reservar sesión',
  Questionnaire: 'Cuestionario inicial',
  QuestionnaireResults: 'Resultados del cuestionario',
  ProfessionalHome: 'Agenda profesional',
  ProfessionalDashboard: 'Panel profesional',
  ProfessionalClients: 'Mis pacientes',
  ProfessionalClinicPatientDetail: 'Paciente de clínica',
  ProfessionalSessions: 'Sesiones',
  ProfessionalProfile: 'Perfil profesional',
  ProfessionalBilling: 'Facturación',
  CreateInvoice: 'Nueva factura',
  ProfessionalAvailability: 'Disponibilidad',
  ClientProfile: 'Ficha de paciente',
  AdminPanel: 'Panel de administración',
  AdminSpecialistDetail: 'Revisión de especialista',
  SpecialistDetailAdmin: 'Detalle del especialista',
  PublicSpecialistProfile: 'Perfil público',
};

const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentKey, string> = {
  TERMS_OF_SERVICE: 'Términos y condiciones',
  PRIVACY_POLICY: 'Política de privacidad',
  PROFESSIONAL_DATA_PROCESSING_TERMS: 'Condiciones profesionales',
  CLINICAL_MODULE_TERMS: 'Módulo clínico',
  CLINICAL_PATIENT_CONSENT: 'Consentimiento clínico',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLegalDocumentTitle(params: unknown): string | null {
  if (!isRecord(params) || typeof params.documentKey !== 'string') {
    return null;
  }

  return LEGAL_DOCUMENT_TITLES[params.documentKey as LegalDocumentKey] ?? null;
}

function getRouteTitle(routeName: string | undefined, params: unknown): string {
  if (routeName === 'LegalDocument') {
    return getLegalDocumentTitle(params) ?? ROUTE_TITLES.LegalDocument;
  }

  if (routeName && routeName in ROUTE_TITLES) {
    return ROUTE_TITLES[routeName as keyof RootStackParamList];
  }

  return 'Área privada';
}

export function getDocumentTitleForRoute(
  routeName: string | undefined,
  params?: unknown
): string {
  const routeTitle = getRouteTitle(routeName, params);
  return `${BRAND_NAME} | ${routeTitle}`;
}
