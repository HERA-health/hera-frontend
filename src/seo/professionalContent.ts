export type ProfessionalPageId = "software" | "directory" | "agenda" | "patients" | "billing";
export type MarketingCapture =
  | "home"
  | "agenda"
  | "patients"
  | "record"
  | "documents"
  | "billing"
  | "availability"
  | "statistics";
export interface ProfessionalSection {
  eyebrow: string;
  title: string;
  text: string;
  points: readonly string[];
  image?: MarketingCapture;
  link?: { href: string; label: string };
}
export interface ProfessionalPage {
  path: string;
  title: string;
  description: string;
  heading: string;
  eyebrow: string;
  intro: string;
  image: MarketingCapture | "directory";
  sections: readonly ProfessionalSection[];
  faqs: readonly { question: string; answer: string }[];
}
export const professionalPages: Record<ProfessionalPageId, ProfessionalPage> = {
  software: {
    path: "/software-para-psicologos",
    title: "Software para psicólogos: gestión de consultas · HERA",
    description:
      "Crea gratis tu perfil profesional en HERA. Descubre el directorio y el software para psicólogos con agenda, historia clínica y facturación.",
    heading: "Publica tu perfil y gestiona tu consulta desde HERA.",
    eyebrow: "Software para psicólogos",
    intro:
      "Muestra tus especialidades en el directorio y lleva al día tus citas, las fichas de tus pacientes y tus facturas.",
    image: "home",
    sections: [
      {
        eyebrow: "Agenda",
        title: "Abre tu agenda y prepara la siguiente cita",
        text: "Empieza por saber qué viene después. Consulta tus citas, organiza las sesiones y prepara tu semana desde un calendario conectado con tus pacientes.",
        points: [
          "Citas online y presenciales con su estado a la vista.",
          "Disponibilidad y servicios adaptados a tu forma de trabajar.",
          "Acceso al contexto de cada paciente desde la consulta.",
        ],
        image: "agenda",
        link: {
          href: "/agenda-para-psicologos",
          label: "Descubrir la agenda",
        },
      },
      {
        eyebrow: "Pacientes e historia clínica",
        title: "Recupera las notas de la última sesión",
        text: "Reúne la información que necesitas para dar continuidad al proceso: sesiones, historia clínica, notas y documentos. Un espacio claro, con acceso clínico protegido.",
        points: [
          "Ficha del paciente y seguimiento de su actividad.",
          "Historia clínica y notas organizadas por sesión.",
          "Documentación y consentimiento en su contexto.",
        ],
        image: "record",
        link: {
          href: "/gestion-pacientes-psicologos",
          label: "Ver la gestión de pacientes",
        },
      },
      {
        eyebrow: "Facturación",
        title: "Consulta qué facturas quedan por cobrar",
        text: "Ten a mano la parte administrativa de tu consulta. Revisa tus facturas, los cobros registrados y la evolución de tu actividad sin perder de vista las sesiones.",
        points: [
          "Facturación relacionada con tus pacientes y servicios.",
          "Estados de las facturas para seguir lo pendiente.",
          "Estadísticas para entender cómo evoluciona tu consulta.",
        ],
        image: "billing",
        link: {
          href: "/facturacion-para-psicologos",
          label: "Explorar la facturación",
        },
      },
    ],
    faqs: [
      {
        question: "¿Puedo utilizar HERA con mis pacientes propios?",
        answer:
          "Sí. HERA permite organizar tus propios pacientes, sus sesiones y la gestión de tu consulta. En planes y precios encontrarás las condiciones vigentes y las diferencias con los pacientes que llegan desde el directorio.",
      },
      {
        question: "¿Necesito aparecer en el directorio?",
        answer:
          "La gestión de la consulta y la presencia en el directorio tienen finalidades distintas. El perfil público requiere verificación profesional y aceptación de sus condiciones; no implica una garantía de nuevos pacientes.",
      },
      {
        question: "¿Cómo se solicita la prueba gratuita?",
        answer:
          "Elige un plan y envía la solicitud desde la página de planes. El equipo de HERA te contactará para confirmar la activación. La duración y las condiciones vigentes están indicadas allí.",
      },
      {
        question: "¿Puedo ver el software sin registrarme?",
        answer:
          "Sí. El recorrido de HERA por dentro muestra la aplicación actual con datos sintéticos. Puedes ampliar las capturas y explorar sus funcionalidades sin crear una cuenta.",
      },
    ],
  },
  directory: {
    path: "/perfil-en-el-directorio-para-psicologos",
    title: "Publica tu perfil en el directorio de psicólogos · HERA",
    description: "Descubre cómo aparecer en el directorio de psicólogos de HERA sin contratar una suscripción. Muestra tus especialidades, modalidades de consulta y tarifas.",
    heading: "Así ven tu perfil quienes buscan psicólogo.",
    eyebrow: "Directorio para psicólogos",
    intro: "Muestra a quién acompañas, cómo trabajas y cuánto cuesta una sesión. Crear tu perfil profesional es gratis.",
    image: "directory",
    sections: [],
    faqs: [
      { question: "¿Cuándo se publica mi perfil?", answer: "Para aparecer en el directorio, HERA verifica tu acreditación profesional y tú aceptas las condiciones de publicación." },
      { question: "¿Necesito una suscripción?", answer: "Puedes crear tu perfil sin contratar una suscripción. Consulta en Planes y condiciones cómo funciona el directorio cuando atiendes a un paciente que llega por HERA." },
    ],
  },
  agenda: {
    path: "/agenda-para-psicologos",
    title: "Agenda online para psicólogos · HERA",
    description:
      "Organiza citas, sesiones y disponibilidad con la agenda online para psicólogos de HERA. Consulta tu semana y accede al contexto de cada paciente.",
    heading: "Mira quién viene hoy y prepara tu próxima sesión.",
    eyebrow: "Agenda online para psicólogos",
    intro:
      "Consulta la hora, la modalidad y el paciente de cada cita. Desde la agenda puedes abrir su ficha y repasar lo que trabajasteis.",
    image: "agenda",
    sections: [
      {
        eyebrow: "Disponibilidad",
        title: "Decide qué horas ofreces para reservar",
        text: "Define tus horarios y organiza los servicios que ofreces. Mantén separados los huecos disponibles y las citas que ya forman parte de tu agenda.",
        points: [
          "Horarios de atención y disponibilidad.",
          "Servicios con modalidad y duración.",
          "Organización de sesiones desde el calendario.",
        ],
        image: "availability",
      },
      {
        eyebrow: "Del calendario a la consulta",
        title: "El contexto no se queda en otra herramienta",
        text: "La sesión forma parte del recorrido del paciente. Sus citas, notas e historia clínica están relacionadas para que puedas retomar el proceso con continuidad.",
        points: [
          "Ficha del paciente conectada con sus sesiones.",
          "Acceso clínico protegido para consultar las notas.",
        ],
        image: "record",
        link: {
          href: "/gestion-pacientes-psicologos",
          label: "Conocer el espacio del paciente",
        },
      },
    ],
    faqs: [
      {
        question: "¿Sirve para sesiones online y presenciales?",
        answer:
          "Sí. Puedes organizar sesiones de distintas modalidades y revisar sus datos desde la agenda. Las opciones disponibles dependen de los servicios que configures.",
      },
      {
        question: "¿La agenda está conectada con los pacientes?",
        answer:
          "Sí. Las sesiones están relacionadas con sus pacientes. La información clínica mantiene sus propias condiciones de acceso y consentimiento.",
      },
    ],
  },
  patients: {
    path: "/gestion-pacientes-psicologos",
    title: "Gestión de pacientes e historia clínica · HERA",
    description:
      "Gestiona pacientes, sesiones, historia clínica y documentos en HERA. Un espacio conectado para dar continuidad al trabajo en tu consulta de psicología.",
    heading: "Retoma cada sesión donde la dejaste.",
    eyebrow: "Gestión de pacientes para psicólogos",
    intro:
      "Abre la ficha del paciente, consulta su última sesión y recupera tus notas en el área clínica protegida.",
    image: "patients",
    sections: [
      {
        eyebrow: "Continuidad clínica",
        title: "Historia, notas y evolución, con un orden claro",
        text: "Organiza las entradas de historia clínica y las notas del proceso. Relaciona el trabajo con las sesiones y localiza la información cuando necesites retomarla.",
        points: [
          "Entradas de historia clínica y notas de seguimiento.",
          "Información relacionada con una o varias sesiones.",
          "Acceso clínico protegido y permisos por ámbito.",
        ],
        image: "record",
      },
      {
        eyebrow: "Documentos con contexto",
        title: "Lo que acompaña al proceso, donde lo necesitas",
        text: "Mantén los documentos junto a la relación de atención. Consulta su clasificación y el estado de autorización para trabajar con la información clínica.",
        points: [
          "Documentación organizada dentro del paciente.",
          "Gestión de consentimiento y evidencias.",
        ],
        image: "documents",
      },
    ],
    faqs: [
      {
        question: "¿Qué diferencia hay entre una ficha y una historia clínica?",
        answer:
          "La ficha reúne datos y actividad del paciente. El espacio clínico contiene historia, notas y documentos del proceso, con sus condiciones de autorización y acceso protegido.",
      },
      {
        question: "¿Se pueden relacionar notas y sesiones?",
        answer:
          "Sí. El espacio del paciente permite organizar el trabajo clínico en el contexto de sus sesiones y mantener entradas del proceso cuando no corresponden a una única cita.",
      },
      {
        question: "¿Las capturas contienen datos reales?",
        answer:
          "No. Todas las personas, sesiones y documentos que aparecen en estas imágenes pertenecen a un entorno local de demostración con datos sintéticos.",
      },
    ],
  },
  billing: {
    path: "/facturacion-para-psicologos",
    title: "Software de facturación para psicólogos · HERA",
    description:
      "Organiza la facturación de tu consulta de psicología: facturas, cobros registrados y seguimiento de actividad, conectados con tus pacientes en HERA.",
    heading: "Ve qué has facturado y qué queda por cobrar.",
    eyebrow: "Facturación para psicólogos",
    intro:
      "Localiza la factura de una sesión, comprueba su importe y distingue de un vistazo los cobros registrados de los pendientes.",
    image: "billing",
    sections: [
      {
        eyebrow: "Seguimiento con claridad",
        title: "Haz seguimiento de los cobros",
        text: "Revisa los cobros registrados y la información administrativa del paciente. Una vista ordenada ayuda a detectar lo que aún necesita tu atención.",
        points: [
          "Seguimiento de estados y cobros.",
          "Información administrativa en el contexto del paciente.",
          "Consulta de la actividad de tu práctica.",
        ],
        image: "billing",
      },
      {
        eyebrow: "Una consulta conectada",
        title: "Menos saltos entre tareas",
        text: "Agenda, pacientes y facturación comparten el contexto de tu trabajo. Empieza en una sesión y continúa con su gestión desde el mismo espacio.",
        points: [
          "Servicios y sesiones organizados.",
          "Datos del paciente disponibles para la gestión.",
        ],
        link: {
          href: "/software-para-psicologos",
          label: "Ver todo lo que incluye HERA",
        },
      },
    ],
    faqs: [
      {
        question:
          "¿Registrar un cobro significa que HERA ha cobrado al paciente?",
        answer:
          "No necesariamente. Un registro administrativo y una operación de pago son acciones diferentes. El estado y el origen del cobro permiten distinguirlos en los flujos correspondientes.",
      },
      {
        question: "¿Dónde puedo ver las facturas de mi consulta?",
        answer:
          "En Facturación puedes consultar el listado, abrir una factura y revisar sus conceptos, importe y estado.",
      },
      {
        question: "¿La suscripción incluye las comisiones del directorio?",
        answer:
          "Son conceptos diferentes. Las condiciones de captación de pacientes de HERA y las del software de gestión se explican por separado en planes y precios.",
      },
    ],
  },
};
export const marketingCaptures: readonly {
  id: MarketingCapture;
  label: string;
  text: string;
}[] = [
  {
    id: "home",
    label: "Tu día",
    text: "Comprueba a quién atiendes después y qué necesita tu atención hoy.",
  },
  {
    id: "agenda",
    label: "Agenda",
    text: "Consulta la semana y organiza tus sesiones con su contexto.",
  },
  {
    id: "patients",
    label: "Pacientes",
    text: "Localiza a cada paciente y retoma su proceso desde su propio espacio.",
  },
  {
    id: "record",
    label: "Historia clínica",
    text: "Revisa lo que trabajasteis en la última sesión antes de empezar la siguiente.",
  },
  {
    id: "documents",
    label: "Documentos",
    text: "Localiza los documentos del paciente y comprueba el estado de su consentimiento.",
  },
  {
    id: "billing",
    label: "Facturación",
    text: "Revisa facturas y cobros registrados en tu consulta.",
  },
  {
    id: "availability",
    label: "Disponibilidad",
    text: "Organiza tus horarios y el tiempo que dedicas a la consulta.",
  },
  {
    id: "statistics",
    label: "Estadísticas",
    text: "Consulta cuántas sesiones has atendido y cómo evoluciona tu actividad.",
  },
];
