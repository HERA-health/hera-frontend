import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ProfessionalShowcaseStepId } from '../../constants/professionalShowcase';
import { PROFESSIONAL_PREVIEW_IMAGES } from './professionalPreviewAssets';

export interface ProfessionalShowcaseStep {
  id: ProfessionalShowcaseStepId;
  eyebrow: string;
  title: string;
  navigationLabel: string;
  navigationSummary: string;
  description: string;
  highlights: readonly [string, string, string];
  icon: ComponentProps<typeof Ionicons>['name'];
  images: Readonly<{
    light: ImageSourcePropType;
    dark: ImageSourcePropType;
  }>;
  imageAccessibilityLabel: string;
}

export const PROFESSIONAL_SHOWCASE_STEPS: readonly ProfessionalShowcaseStep[] = [
  {
    id: 'home',
    eyebrow: 'TU JORNADA',
    title: 'Empieza el día con una visión clara',
    navigationLabel: 'Inicio',
    navigationSummary: 'Prioridades y actividad',
    description:
      'El inicio reúne la próxima cita, los asuntos que requieren una decisión y el resumen semanal. Puedes entender qué necesita atención antes de abrir cada área.',
    highlights: [
      'Próxima cita y accesos directos',
      'Avisos y tareas pendientes',
      'Resumen semanal de la consulta',
    ],
    icon: 'home-outline',
    images: PROFESSIONAL_PREVIEW_IMAGES,
    imageAccessibilityLabel: 'Vista del inicio del espacio profesional de HERA',
  },
  {
    id: 'patients',
    eyebrow: 'CONTINUIDAD',
    title: 'Cada paciente, con su contexto a mano',
    navigationLabel: 'Pacientes',
    navigationSummary: 'Búsqueda y seguimiento',
    description:
      'Busca, filtra y revisa el estado operativo de tus pacientes desde un único lugar. Abre su ficha o crea una cita sin perder el hilo del trabajo.',
    highlights: [
      'Buscador y filtros rápidos',
      'Estado de consentimientos visible',
      'Acciones directas desde cada ficha',
    ],
    icon: 'people-outline',
    images: {
      light: require('../../../assets/onboarding/mis-pacientes-especialistas.png') as ImageSourcePropType,
      dark: require('../../../assets/onboarding/mis-pacientes-especialistas-dark.png') as ImageSourcePropType,
    },
    imageAccessibilityLabel: 'Vista del listado de pacientes del espacio profesional de HERA',
  },
  {
    id: 'agenda',
    eyebrow: 'PLANIFICACIÓN',
    title: 'Una agenda pensada para trabajar',
    navigationLabel: 'Agenda',
    navigationSummary: 'Citas en contexto',
    description:
      'Alterna entre día, semana, mes o lista y revisa cada cita dentro de un calendario creado para la actividad de una consulta de salud mental.',
    highlights: [
      'Vistas diaria, semanal, mensual y lista',
      'Citas particulares y de clínica diferenciadas',
      'Creación y gestión desde el calendario',
    ],
    icon: 'calendar-outline',
    images: {
      light: require('../../../assets/onboarding/agenda-especialistas.png') as ImageSourcePropType,
      dark: require('../../../assets/onboarding/agenda-especialistas-dark.png') as ImageSourcePropType,
    },
    imageAccessibilityLabel: 'Vista semanal de la agenda profesional de HERA',
  },
  {
    id: 'availability',
    eyebrow: 'CONTROL',
    title: 'Decide cuándo pueden reservarte',
    navigationLabel: 'Disponibilidad',
    navigationSummary: 'Horarios y excepciones',
    description:
      'Define una base semanal, revisa la capacidad de tu agenda y bloquea vacaciones o excepciones sin alterar el horario habitual.',
    highlights: [
      'Patrones semanales configurables',
      'Resumen de horas y sesiones posibles',
      'Excepciones para ausencias y vacaciones',
    ],
    icon: 'time-outline',
    images: {
      light: require('../../../assets/onboarding/disponibilidad-especialistas.png') as ImageSourcePropType,
      dark: require('../../../assets/onboarding/disponibilidad-especialistas-dark.png') as ImageSourcePropType,
    },
    imageAccessibilityLabel: 'Vista de configuración de disponibilidad profesional en HERA',
  },
  {
    id: 'billing',
    eyebrow: 'ADMINISTRACIÓN',
    title: 'La facturación, conectada con la consulta',
    navigationLabel: 'Facturación',
    navigationSummary: 'Ingresos, facturas y tarifas',
    description:
      'Revisa ingresos, estados de facturas, tarifas y datos fiscales desde el mismo espacio en el que gestionas pacientes y sesiones.',
    highlights: [
      'Historial y estados de facturas',
      'Tarifas y duraciones centralizadas',
      'Información fiscal preparada para reutilizar',
    ],
    icon: 'receipt-outline',
    images: {
      light: require('../../../assets/onboarding/facturacion-especialistas.png') as ImageSourcePropType,
      dark: require('../../../assets/onboarding/facturacion-especialistas-dark.png') as ImageSourcePropType,
    },
    imageAccessibilityLabel: 'Vista del área de facturación profesional de HERA',
  },
  {
    id: 'statistics',
    eyebrow: 'PERSPECTIVA',
    title: 'Entiende la actividad de tu consulta',
    navigationLabel: 'Estadísticas',
    navigationSummary: 'Evolución y rendimiento',
    description:
      'Consulta la evolución de ingresos, sesiones, pacientes activos y valoraciones para conocer mejor la actividad sin preparar informes manuales.',
    highlights: [
      'Evolución mensual de ingresos',
      'Indicadores de pacientes y sesiones',
      'Valoraciones y distribución de actividad',
    ],
    icon: 'stats-chart-outline',
    images: {
      light: require('../../../assets/onboarding/estadisticas-especialistas.png') as ImageSourcePropType,
      dark: require('../../../assets/onboarding/estadisticas-especialistas-dark.png') as ImageSourcePropType,
    },
    imageAccessibilityLabel: 'Vista de estadísticas del espacio profesional de HERA',
  },
] as const;
