import { PROFESSIONAL_SPECIALTY_OPTIONS } from '../constants/professionalMatchingCatalog';
import type { PublicSpecialistDirectoryFilters } from '../services/specialistsService';

export const psychologyTypes = ['PSYCHOLOGIST_HEALTH', 'PSYCHOLOGIST_CLINICAL'] as const;
export type PsychologyTopic = 'online' | 'ansiedad' | 'autoestima';
export interface PsychologyPage {
  path: string; title: string; heading: string; description: string; introduction: string;
  guidance: { title: string; text: string }[];
  questions: { question: string; answer: string }[];
  filters: PublicSpecialistDirectoryFilters;
}
export const psychologyPages: Record<PsychologyTopic, PsychologyPage> = {
  online: {
    path: '/psicologos-online', title: 'Psicólogos online y terapia online · HERA',
    heading: 'Encuentra un psicólogo online con quien dar el primer paso',
    description: 'Conoce psicólogos que ofrecen terapia online. Consulta su experiencia, áreas de trabajo y precios para elegir con información clara en HERA.',
    introduction: 'La terapia online te permite hablar con un psicólogo por videollamada. Conoce su forma de trabajar y consulta sus precios antes de elegir con quién empezar.',
    filters: { professionalTypes: [...psychologyTypes], modality: 'ONLINE' },
    guidance: [
      { title: 'Prepara un espacio para ti', text: 'Para una sesión por videollamada necesitas conexión a internet y un lugar tranquilo donde puedas hablar con privacidad. Consulta con el psicólogo cómo será la primera sesión.' },
      { title: 'Elige con información clara', text: 'Consulta su formación y las áreas en las que trabaja. Puedes preguntarle cómo serán las sesiones y comentar lo que necesitas para valorar juntos si la terapia online encaja contigo.' },
    ],
    questions: [
      { question: '¿Cómo es la primera sesión de terapia online?', answer: 'Es un espacio para hablar de lo que te trae a terapia, conocer cómo trabaja el psicólogo y resolver tus dudas. No necesitas tener todo claro antes de empezar.' },
      { question: '¿Cuánto cuesta una sesión?', answer: 'Cada psicólogo establece sus tarifas. Puedes consultar los precios y las opciones publicadas en su perfil antes de reservar.' },
      { question: '¿Cómo sé si la terapia online encaja conmigo?', answer: 'Puedes hablar con el psicólogo sobre tus necesidades, tu privacidad en casa y tus preferencias. Podrá orientarte sobre la modalidad más adecuada para tu situación.' },
    ],
  },
  ansiedad: {
    path: '/psicologos/ansiedad', title: 'Psicólogos para la ansiedad · HERA',
    heading: 'Encuentra apoyo psicológico para afrontar la ansiedad',
    description: 'Encuentra psicólogos que trabajan la ansiedad. Conoce su enfoque, las modalidades de terapia y sus precios antes de elegir en HERA.',
    introduction: 'Cuando las preocupaciones ocupan demasiado espacio, buscar apoyo puede ser un primer paso. Aquí puedes conocer psicólogos que trabajan la ansiedad y elegir con calma.',
    filters: { professionalTypes: [...psychologyTypes], specialties: ['anxiety'] },
    guidance: [
      { title: 'Empieza por lo que estás viviendo', text: 'No hace falta llegar con una etiqueta o saber explicar todo lo que sientes. Puedes contar qué te preocupa, cuándo aparece y cómo está afectando a tu día a día.' },
      { title: 'Pregunta cómo podéis trabajar juntos', text: 'Consulta la experiencia del psicólogo con la ansiedad, su enfoque y cómo plantea las sesiones. Entender su propuesta te ayudará a decidir si quieres empezar con esa persona.' },
    ],
    questions: [
      { question: '¿Necesito un diagnóstico para buscar apoyo?', answer: 'No necesitas tener un diagnóstico para consultar. Puedes pedir ayuda por lo que estás sintiendo y hablar con el psicólogo sobre tu situación.' },
      { question: '¿Puedo elegir terapia online o presencial?', answer: 'Depende de las modalidades que ofrezca cada psicólogo. En los perfiles puedes comprobarlas y consultar cuál encaja con tus necesidades.' },
      { question: '¿Cuántas sesiones necesitaré?', answer: 'No hay una cifra que sirva para todas las personas. El psicólogo podrá hablar contigo sobre objetivos, frecuencia y evolución después de conocer tu situación.' },
    ],
  },
  autoestima: {
    path: '/psicologos/autoestima', title: 'Psicólogos para trabajar la autoestima · HERA',
    heading: 'Trabaja tu autoestima con apoyo psicológico',
    description: 'Conoce psicólogos que trabajan la autoestima. Consulta su experiencia, enfoque y precios para encontrar apoyo psicológico en HERA.',
    introduction: 'La forma en que te hablas y te valoras merece atención. Encuentra un espacio para explorar lo que necesitas con psicólogos que trabajan la autoestima.',
    filters: { professionalTypes: [...psychologyTypes], specialties: ['self-esteem'] },
    guidance: [
      { title: 'Habla de lo que te cuesta', text: 'La comparación, la autoexigencia o la dificultad para poner límites pueden ser temas que quieras llevar a consulta. Tú puedes empezar por aquello que más te está pesando.' },
      { title: 'Busca una forma de trabajar que entiendas', text: 'Lee la presentación del psicólogo y consulta cómo aborda la autoestima. Puedes preguntar cómo se acuerdan los objetivos y qué espacio tendrás para compartir tus dudas.' },
    ],
    questions: [
      { question: '¿Qué puedo trabajar sobre mi autoestima en terapia?', answer: 'Puedes explorar cómo te valoras, las expectativas que tienes sobre ti y cómo te relacionas con otras personas. Los objetivos se acuerdan a partir de tu situación.' },
      { question: '¿Y si no sé por dónde empezar?', answer: 'Puedes empezar contando una situación reciente o algo que te gustaría cambiar. No necesitas llevar un discurso preparado.' },
      { question: '¿Cómo elijo un psicólogo para trabajar la autoestima?', answer: 'Consulta las áreas que trabaja, su formación y su enfoque. Revisa también modalidad y precio, y plantea las dudas que necesites antes de decidir.' },
    ],
  },
};
export const topicForPath = (path: string): PsychologyTopic | undefined =>
  (Object.keys(psychologyPages) as PsychologyTopic[]).find(key => psychologyPages[key].path === path);
export function directoryHref(filters: PublicSpecialistDirectoryFilters = {}): string {
  const params = buildPublicDirectoryQueryParams(filters);
  return `/especialistas${params.size ? `?${params}` : ''}`;
}
export const directoryMetadata = {
  title: 'Hera | Psicólogos y profesionales de salud mental',
  description: 'Encuentra psicólogos y otros profesionales de salud mental. Compara perfiles verificados, precios y modalidades de consulta antes de reservar en HERA.',
  canonicalPath: '/especialistas',
};
export function profileMetadata(profile: {
  name: string; professionalType?: string | null; professionalTypeLabel?: string;
  specializations?: string[]; offersOnline?: boolean; offersInPerson?: boolean;
}) {
  const category = profile.professionalType === 'PSYCHOLOGIST_HEALTH' ? 'Psicología sanitaria'
    : profile.professionalType === 'PSYCHOLOGIST_CLINICAL' ? 'Psicología clínica'
      : profile.professionalTypeLabel || 'Profesional de salud mental';
  const areas = profile.specializations?.slice(0, 2).map(value => PROFESSIONAL_SPECIALTY_OPTIONS.find(option => option.value === value)?.label || value).join(' y ');
  const modality = [profile.offersOnline && 'online', profile.offersInPerson && 'presenciales'].filter(Boolean).join(' y ');
  return {
    title: `${profile.name} | ${category} · HERA`,
    description: `Conoce a ${profile.name}: ${category.toLowerCase()}${areas ? `, con atención en ${areas}` : ''}.${modality ? ` Sesiones ${modality}.` : ''} Consulta su enfoque y precios en HERA.`,
  };
}

export const buildPublicDirectoryQueryParams = (
  filters?: PublicSpecialistDirectoryFilters
): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters?.language) params.append('language', filters.language);
  const query = filters?.q?.trim();

  if (query && query.length >= 2) params.append('q', query);
  if (filters?.professionalTypes?.length) params.set('professionalTypes', filters.professionalTypes.join(','));
  if (filters?.professionalType) params.append('professionalType', filters.professionalType);
  if (filters?.modality) params.append('modality', filters.modality);
  filters?.specialties?.forEach((specialty) => params.append('specialty', specialty));
  filters?.approaches?.forEach((approach) => params.append('approach', approach));
  if (filters?.minRating !== undefined) params.append('minRating', filters.minRating.toString());
  if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.minExperienceYears !== undefined) params.append('minExperienceYears', String(filters.minExperienceYears));
  if (filters?.minAge !== undefined) params.append('minAge', String(filters.minAge));
  if (filters?.maxAge !== undefined) params.append('maxAge', String(filters.maxAge));
  if (filters?.sort && filters.sort !== 'RECENT') params.append('sort', filters.sort);
  if (filters?.page && filters.page > 1) params.append('page', filters.page.toString());

  return params;
};

export const landingEditorial = {
  headingStart: 'Encuentra al ', headingEmphasis: 'psicólogo', headingEnd: ' ideal para ti.',
  introduction: 'Encuentra terapia online o presencial. Compara perfiles verificados, especialidades y precios para elegir con quién empezar.',
  profilesHeading: 'Elige psicólogo con información clara',
  profilesIntroduction: 'Conoce la experiencia y el enfoque de cada perfil. Consulta qué temas aborda en terapia, cómo son sus sesiones y cuánto cuestan antes de decidir.',
};
