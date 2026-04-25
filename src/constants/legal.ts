export type LegalDocumentKey =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'PROFESSIONAL_DATA_PROCESSING_TERMS'
  | 'CLINICAL_MODULE_TERMS'
  | 'CLINICAL_PATIENT_CONSENT';

export const LEGAL_DOCUMENT_VERSION = '2026-04-25';

export const LEGAL_ENTITY = {
  responsibleName: 'Sara Herrer Fernández',
  tradeName: 'HERA',
  taxId: 'Pendiente de completar antes de publicación definitiva',
  address: 'Pendiente de completar antes de publicación definitiva',
  privacyEmail: 'herahealthtech@gmail.com',
  supportEmail: 'herahealthtech@gmail.com',
  securityEmail: 'herahealthtech@gmail.com',
  dpo: 'Pendiente de designación o confirmación',
  country: 'España',
} as const;

export interface LegalDocumentContent {
  key: LegalDocumentKey;
  version: string;
  title: string;
  slug: string;
  routePath: string;
  summary: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
}

const commonIdentitySection = {
  title: 'Responsable y contacto',
  body: [
    `Responsable provisional: ${LEGAL_ENTITY.responsibleName}.`,
    `Nombre comercial: ${LEGAL_ENTITY.tradeName}.`,
    `NIF/CIF: ${LEGAL_ENTITY.taxId}.`,
    `Domicilio: ${LEGAL_ENTITY.address}.`,
    `Contacto de privacidad, soporte e incidencias: ${LEGAL_ENTITY.privacyEmail}.`,
    `Ámbito principal de operación: ${LEGAL_ENTITY.country}.`,
  ],
};

export const LEGAL_DOCUMENT_SLUGS: Record<LegalDocumentKey, string> = {
  TERMS_OF_SERVICE: 'terminos',
  PRIVACY_POLICY: 'privacidad',
  PROFESSIONAL_DATA_PROCESSING_TERMS: 'condiciones-profesionales',
  CLINICAL_MODULE_TERMS: 'modulo-clinico',
  CLINICAL_PATIENT_CONSENT: 'consentimiento-clinico',
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocumentContent> = {
  TERMS_OF_SERVICE: {
    key: 'TERMS_OF_SERVICE',
    version: LEGAL_DOCUMENT_VERSION,
    title: 'Términos y condiciones de HERA',
    slug: LEGAL_DOCUMENT_SLUGS.TERMS_OF_SERVICE,
    routePath: '/legal/terminos',
    summary: 'Condiciones generales para usar HERA como paciente o especialista.',
    sections: [
      commonIdentitySection,
      {
        title: 'Objeto del servicio',
        body: [
          'HERA es una herramienta digital para gestión profesional, agenda, seguimiento, documentación, facturación operativa y comunicación entre pacientes y especialistas.',
          'La plataforma no sustituye el criterio clínico, profesional o sanitario del especialista. Cada profesional conserva la responsabilidad sobre la atención que presta.',
        ],
      },
      {
        title: 'Uso permitido',
        body: [
          'La persona usuaria debe usar HERA de forma lícita, diligente y conforme a su rol.',
          'No está permitido intentar acceder a datos de terceros, compartir credenciales, introducir información falsa o usar la plataforma para emergencias médicas.',
        ],
      },
      {
        title: 'Cuentas y seguridad',
        body: [
          'Cada usuario es responsable de mantener la confidencialidad de sus credenciales.',
          'HERA puede suspender o bloquear cuentas cuando exista riesgo de seguridad, incumplimiento de condiciones o necesidad legal.',
        ],
      },
      {
        title: 'Limitación sanitaria',
        body: [
          'HERA no presta directamente servicios sanitarios o psicológicos. La atención corresponde al especialista que usa la herramienta.',
          'Ante urgencias, riesgo vital o crisis, se debe contactar con servicios de emergencia o recursos sanitarios adecuados.',
        ],
      },
      {
        title: 'Versión y revisión',
        body: [
          `Versión vigente: ${LEGAL_DOCUMENT_VERSION}.`,
          'Este texto está preparado para lanzamiento inicial y debe revisarse legalmente cuando se complete la constitución o datos fiscales definitivos.',
        ],
      },
    ],
  },
  PRIVACY_POLICY: {
    key: 'PRIVACY_POLICY',
    version: LEGAL_DOCUMENT_VERSION,
    title: 'Política de privacidad',
    slug: LEGAL_DOCUMENT_SLUGS.PRIVACY_POLICY,
    routePath: '/legal/privacidad',
    summary: 'Información sobre qué datos trata HERA, para qué y cómo se protegen.',
    sections: [
      commonIdentitySection,
      {
        title: 'Datos que tratamos',
        body: [
          'Tratamos datos de cuenta, contacto, perfil profesional, agenda, sesiones, facturación, cuestionarios, consentimientos, documentos y registros de seguridad.',
          'Algunos datos pueden revelar información de salud o bienestar psicológico y se tratan con protección reforzada.',
        ],
      },
      {
        title: 'Finalidades',
        body: [
          'Usamos los datos para crear cuentas, prestar la herramienta, gestionar sesiones, permitir seguimiento profesional, verificar especialistas, emitir facturas, enviar comunicaciones necesarias y proteger la seguridad.',
          'No se deben usar datos clínicos para analítica, publicidad o finalidades incompatibles.',
        ],
      },
      {
        title: 'Bases jurídicas',
        body: [
          'Según el caso, tratamos datos por ejecución del servicio, cumplimiento de obligaciones legales, consentimiento explícito e interés legítimo en seguridad.',
          'Los datos clínicos y de salud requieren una base reforzada y consentimiento o legitimación adecuada según el contexto profesional.',
        ],
      },
      {
        title: 'Conservación',
        body: [
          'Conservamos los datos durante el tiempo necesario para cada finalidad.',
          'Facturas, consentimientos e historia clínica pueden conservarse bloqueados durante plazos legales aunque se solicite la baja.',
        ],
      },
      {
        title: 'Derechos',
        body: [
          `Puedes solicitar acceso, rectificación, supresión, oposición, limitación, portabilidad o retirada de consentimiento en ${LEGAL_ENTITY.privacyEmail}.`,
          'Algunos derechos pueden tener límites cuando existan obligaciones legales, historia clínica, facturación o defensa ante reclamaciones.',
        ],
      },
    ],
  },
  PROFESSIONAL_DATA_PROCESSING_TERMS: {
    key: 'PROFESSIONAL_DATA_PROCESSING_TERMS',
    version: LEGAL_DOCUMENT_VERSION,
    title: 'Condiciones profesionales y tratamiento de datos',
    slug: LEGAL_DOCUMENT_SLUGS.PROFESSIONAL_DATA_PROCESSING_TERMS,
    routePath: '/legal/condiciones-profesionales',
    summary: 'Obligaciones de especialistas que usan HERA como herramienta profesional.',
    sections: [
      commonIdentitySection,
      {
        title: 'Rol profesional',
        body: [
          'El especialista es responsable de usar HERA conforme a su normativa profesional, deber de secreto y obligaciones de protección de datos.',
          'El especialista debe informar correctamente a sus pacientes cuando use HERA para gestionar datos o documentación.',
        ],
      },
      {
        title: 'Confidencialidad',
        body: [
          'El especialista solo debe acceder a datos necesarios para la atención o gestión legítima del paciente.',
          'Queda prohibido compartir credenciales, descargar datos sin motivo o usar información fuera del contexto profesional.',
        ],
      },
      {
        title: 'Datos de pacientes',
        body: [
          'Los datos de pacientes deben introducirse de forma proporcionada y exacta.',
          'No deben subirse documentos innecesarios ni información excesiva para la finalidad asistencial o administrativa.',
        ],
      },
      {
        title: 'Baja y conservación',
        body: [
          'La baja del especialista no implica borrado inmediato de facturas, consentimientos o documentación clínica sujeta a conservación legal.',
          'HERA podrá bloquear y minimizar datos no necesarios conservando lo obligatorio.',
        ],
      },
    ],
  },
  CLINICAL_MODULE_TERMS: {
    key: 'CLINICAL_MODULE_TERMS',
    version: LEGAL_DOCUMENT_VERSION,
    title: 'Condiciones del módulo clínico',
    slug: LEGAL_DOCUMENT_SLUGS.CLINICAL_MODULE_TERMS,
    routePath: '/legal/modulo-clinico',
    summary: 'Condiciones reforzadas para usar notas, documentos y consentimientos clínicos.',
    sections: [
      commonIdentitySection,
      {
        title: 'Acceso clínico',
        body: [
          'El área clínica contiene información especialmente sensible y solo debe usarse para pacientes con relación profesional legítima.',
          'Los accesos pueden quedar registrados por seguridad, auditoría y cumplimiento.',
        ],
      },
      {
        title: 'Uso de notas y documentos',
        body: [
          'Las notas y documentos clínicos deben ser pertinentes, proporcionados y necesarios para el proceso asistencial.',
          'No deben guardarse datos de terceros o información no relacionada con la finalidad clínica.',
        ],
      },
      {
        title: 'Consentimiento y retención',
        body: [
          'El especialista debe asegurarse de contar con consentimiento o base jurídica adecuada antes de usar el módulo clínico.',
          'La documentación clínica puede conservarse durante el plazo legal mínimo aplicable y quedar bloqueada tras el cierre del proceso.',
        ],
      },
      {
        title: 'Seguridad',
        body: [
          'El módulo clínico exige desbloqueo adicional y medidas de seguridad reforzadas.',
          'El especialista debe cerrar sesión o bloquear el acceso cuando use dispositivos compartidos o no supervisados.',
        ],
      },
    ],
  },
  CLINICAL_PATIENT_CONSENT: {
    key: 'CLINICAL_PATIENT_CONSENT',
    version: LEGAL_DOCUMENT_VERSION,
    title: 'Consentimiento clínico del paciente',
    slug: LEGAL_DOCUMENT_SLUGS.CLINICAL_PATIENT_CONSENT,
    routePath: '/legal/consentimiento-clinico',
    summary: 'Información que acepta el paciente para permitir seguimiento clínico en HERA.',
    sections: [
      commonIdentitySection,
      {
        title: 'Qué aceptas',
        body: [
          'Autorizas el tratamiento de información clínica necesaria para tu seguimiento profesional dentro de HERA por parte del especialista que te atiende.',
          'Puede incluir notas clínicas, documentos, informes, ejercicios, consentimientos, datos de sesiones y registros de acceso.',
        ],
      },
      {
        title: 'Quién accede',
        body: [
          'Debe acceder solo el especialista autorizado y los sistemas estrictamente necesarios para prestar el servicio, seguridad o cumplimiento legal.',
          'Los accesos relevantes pueden quedar registrados.',
        ],
      },
      {
        title: 'Conservación y retirada',
        body: [
          'La documentación clínica puede conservarse durante los plazos legalmente exigidos, incluso si retiras el consentimiento.',
          'La retirada impide nuevos tratamientos basados en ese consentimiento, pero no siempre permite borrar documentación ya incorporada a la historia clínica.',
        ],
      },
      {
        title: 'Derechos',
        body: [
          `Puedes ejercer tus derechos escribiendo a ${LEGAL_ENTITY.privacyEmail}.`,
          'En información clínica pueden existir límites legales o profesionales que se explicarán en cada caso.',
        ],
      },
    ],
  },
};

export const getRequiredRegistrationDocumentKeys = (
  userType: 'CLIENT' | 'PROFESSIONAL'
): LegalDocumentKey[] => {
  const base: LegalDocumentKey[] = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'];
  return userType === 'PROFESSIONAL'
    ? [...base, 'PROFESSIONAL_DATA_PROCESSING_TERMS']
    : base;
};

export const getLegalDocumentKeyFromSlug = (slug: string): LegalDocumentKey => {
  const matchingEntry = Object.entries(LEGAL_DOCUMENT_SLUGS).find(([, value]) => value === slug);
  return (matchingEntry?.[0] as LegalDocumentKey | undefined) ?? 'PRIVACY_POLICY';
};

export const getLegalDocumentUrl = (key: LegalDocumentKey): string =>
  LEGAL_DOCUMENTS[key].routePath;

export const getLegalDocumentByPath = (path?: string): LegalDocumentContent =>
  Object.values(LEGAL_DOCUMENTS).find((document) => document.routePath === path)
  || LEGAL_DOCUMENTS.PRIVACY_POLICY;
