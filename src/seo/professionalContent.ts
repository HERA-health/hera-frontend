export type ProfessionalPageId = "software" | "agenda" | "patients" | "billing";
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
  image: MarketingCapture;
  sections: readonly ProfessionalSection[];
  faqs: readonly { question: string; answer: string }[];
}
export const professionalPages: Record<ProfessionalPageId, ProfessionalPage> = {
  software: {
    path: "/software-para-psicologos",
    title: "Software para psicólogos: gestión de consultas · HERA",
    description:
      "Organiza tu consulta de psicología con HERA: agenda, pacientes, historia clínica y facturación. Descubre la aplicación por dentro y solicita una prueba gratuita.",
    heading: "Software para psicólogos, con tu consulta en orden",
    eyebrow: "HERA para profesionales",
    intro:
      "Prepara tu próxima sesión, retoma la historia de cada paciente y revisa tus facturas desde un mismo lugar.",
    image: "home",
    sections: [
      {
        eyebrow: "01 · Tu día, en orden",
        title: "Una agenda que te deja ver lo importante",
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
        eyebrow: "02 · Continuidad en cada sesión",
        title: "Cada paciente, con su propio contexto",
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
        eyebrow: "Conoce tu próximo espacio de trabajo",
        title: "Entra en HERA antes de crear tu cuenta",
        text: "Recorre las pantallas de la aplicación y descubre cómo se conectan las tareas de tu día a día. A tu ritmo y sin registro.",
        points: [
          "Capturas de la aplicación actual.",
          "Datos de demostración, sin información de pacientes reales.",
        ],
        image: "patients",
        link: {
          href: "/profesionales/recorrido",
          label: "Ver HERA por dentro",
        },
      },
      {
        eyebrow: "03 · La gestión también merece calma",
        title: "Facturas, cobros y actividad, con perspectiva",
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
      {
        eyebrow: "Tu práctica, también hacia fuera",
        title: "Tu consulta y tu presencia profesional",
        text: "Gestionar tus pacientes propios y aparecer en el directorio son dos posibilidades diferentes. Puedes combinarlas cuando encajen con tu práctica.",
        points: [
          "Perfil público sujeto a verificación profesional.",
          "Directorio para que las personas conozcan tu forma de trabajar.",
          "Condiciones de captación diferenciadas de la suscripción.",
        ],
        link: {
          href: "/planes",
          label: "Entender las dos modalidades",
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
  agenda: {
    path: "/agenda-para-psicologos",
    title: "Agenda online para psicólogos · HERA",
    description:
      "Organiza citas, sesiones y disponibilidad con la agenda online para psicólogos de HERA. Consulta tu semana y accede al contexto de cada paciente.",
    heading: "Tu agenda de psicología, organizada con calma",
    eyebrow: "Agenda para psicólogos",
    intro:
      "Una vista clara de tu semana, de quién viene y de lo que necesitas preparar. Organiza tus sesiones sin separar el calendario del resto de tu consulta.",
    image: "agenda",
    sections: [
      {
        eyebrow: "Cada cita, en su lugar",
        title: "Planifica la semana. Atiende el presente.",
        text: "Consulta las sesiones de tu agenda y distingue sus estados. Abre una cita para revisar sus datos y continúa el trabajo desde el espacio del paciente.",
        points: [
          "Sesiones presenciales y por videollamada.",
          "Información del paciente, horario y servicio.",
          "Seguimiento de sesiones pendientes, confirmadas y realizadas.",
        ],
        image: "agenda",
      },
      {
        eyebrow: "Tu tiempo tiene su propio ritmo",
        title: "Una disponibilidad que refleja cómo trabajas",
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
    heading: "Pacientes e historia clínica, con el contexto que necesitas",
    eyebrow: "Gestión de pacientes para psicólogos",
    intro:
      "Cada proceso tiene su historia. Reúne la información del paciente, las sesiones y el trabajo clínico en un espacio que te ayuda a mantener el hilo.",
    image: "patients",
    sections: [
      {
        eyebrow: "Una visión de conjunto",
        title: "La ficha que conecta el día a día",
        text: "Consulta los datos del paciente, sus citas y la actividad de su relación contigo. Pasa de una visión general al detalle que necesitas, sin mezclar los procesos.",
        points: [
          "Pacientes propios y relaciones de atención identificadas.",
          "Historial de sesiones y próxima cita.",
          "Acceso a la gestión administrativa desde su contexto.",
        ],
        image: "patients",
      },
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
    heading: "La facturación de tu consulta, en orden",
    eyebrow: "Facturación para psicólogos",
    intro:
      "La parte administrativa también necesita un lugar claro. Reúne tus facturas y el seguimiento de los cobros junto al trabajo de tu consulta.",
    image: "billing",
    sections: [
      {
        eyebrow: "De la sesión a la gestión",
        title: "Facturas conectadas con tu actividad",
        text: "Trabaja con los datos de tus pacientes y servicios para organizar la facturación. Consulta las facturas y revisa su información sin perder la relación con la atención realizada.",
        points: [
          "Listado y detalle de facturas.",
          "Conceptos e importes vinculados a la consulta.",
          "Estado de cada factura a la vista.",
        ],
        image: "billing",
      },
      {
        eyebrow: "Seguimiento con claridad",
        title: "Distingue lo registrado de lo pendiente",
        text: "Revisa los cobros registrados y la información administrativa del paciente. Una vista ordenada ayuda a detectar lo que aún necesita tu atención.",
        points: [
          "Seguimiento de estados y cobros.",
          "Información administrativa en el contexto del paciente.",
          "Consulta de la actividad de tu práctica.",
        ],
        image: "statistics",
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
    text: "Las próximas sesiones y la actividad de tu consulta, a primera vista.",
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
    text: "Historia, evolución y notas para mantener el hilo de la atención.",
  },
  {
    id: "documents",
    label: "Documentos",
    text: "Documentos y consentimiento dentro del contexto del paciente.",
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
    text: "Una perspectiva de la actividad de tu práctica.",
  },
];
