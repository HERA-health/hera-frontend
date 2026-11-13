import { PROFESSIONAL_SPECIALTY_OPTIONS } from '../constants/professionalMatchingCatalog';
import type { PublicSpecialistDirectoryFilters } from '../services/specialistsService';

export const psychologyTypes = ['PSYCHOLOGIST_HEALTH', 'PSYCHOLOGIST_CLINICAL'] as const;
export type PsychologyTopic = 'online' | 'ansiedad' | 'autoestima' | 'barcelona' | 'cataluna';
export interface PsychologyPage {
  label: string; linkLabel: string;
  path: string; title: string; heading: string; description: string; introduction: string;
  guidance: { title: string; text: string }[];
  questions: { question: string; answer: string }[];
  filters: PublicSpecialistDirectoryFilters;
}
export const psychologyPages: Record<PsychologyTopic, PsychologyPage> = {
  online: {
    label: 'Terapia online', linkLabel: 'Psicólogos online',
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
    label: 'Ansiedad', linkLabel: 'Psicólogos para la ansiedad',
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
    label: 'Autoestima', linkLabel: 'Psicólogos para la autoestima',
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
  barcelona: {
    label: 'Barcelona', linkLabel: 'Psicólogos en Barcelona',
    path: '/psicologos/barcelona', title: 'Psicólogos en Barcelona · HERA',
    heading: 'Encuentra psicólogos en Barcelona para empezar con calma',
    description: 'Encuentra psicólogos con consulta presencial en Barcelona. Conoce su enfoque, consulta sus precios y elige con quién dar el primer paso en HERA.',
    introduction: 'Si buscas terapia presencial en Barcelona, aquí puedes conocer psicólogos con consulta en la ciudad. Revisa su forma de trabajar, su ubicación y sus precios antes de elegir con quién empezar.',
    filters: { professionalTypes: [...psychologyTypes], modality: 'IN_PERSON', city: 'barcelona' },
    guidance: [
      { title: 'Encuentra una consulta que encaje contigo', text: 'Consulta la dirección del perfil y valora cómo llegar desde casa o el trabajo. Elegir una ubicación en Barcelona a la que puedas acudir con comodidad puede ayudarte a organizar las sesiones.' },
      { title: 'Conoce al psicólogo antes de empezar', text: 'Revisa su formación, las áreas que trabaja y sus tarifas de atención presencial. Puedes plantearle tus dudas sobre la primera sesión y la frecuencia de las visitas antes de reservar.' },
    ],
    questions: [
      { question: '¿Estos psicólogos atienden presencialmente en Barcelona?', answer: 'Los perfiles de esta página tienen atención presencial publicada y una dirección de consulta en Barcelona ciudad. Puedes consultar la ubicación en cada perfil y confirmar los detalles antes de acudir.' },
      { question: '¿Cuánto cuesta una sesión presencial en Barcelona?', answer: 'Cada profesional establece sus tarifas. Las tarjetas de esta página muestran el precio de sus opciones presenciales publicadas; en el perfil puedes consultar los servicios y la duración de cada sesión.' },
      { question: '¿Puedo ver otros especialistas o elegir terapia online?', answer: 'Sí. Puedes entrar en el directorio completo para explorar otros especialistas y modalidades, o visitar nuestra página de psicólogos online. Si necesitas orientación para empezar, también puedes hacer el cuestionario de HERA.' },
    ],
  },
  cataluna: {
    label: 'Cataluña', linkLabel: 'Psicólogos en Cataluña',
    path: '/psicologos/cataluna', title: 'Psicólogos en Cataluña · HERA',
    heading: 'Encuentra psicólogos con consulta presencial en Cataluña',
    description: 'Conoce psicólogos con consulta presencial en Cataluña. Consulta su municipio, enfoque y precios para elegir con quién empezar en HERA.',
    introduction: 'Explora psicólogos con consulta presencial en distintos municipios de Cataluña. En cada perfil puedes comprobar dónde atienden, conocer su forma de trabajar y consultar sus precios.',
    filters: { professionalTypes: [...psychologyTypes], modality: 'IN_PERSON', region: 'cataluna' },
    guidance: [
      { title: 'Elige también por la ubicación', text: 'Cataluña abarca municipios y distancias muy diferentes. Mira la ciudad de cada tarjeta y la dirección del perfil para valorar si puedes desplazarte con comodidad y mantener la frecuencia de las sesiones.' },
      { title: 'Encuentra una forma de trabajar que encaje contigo', text: 'Además de la ubicación, revisa las áreas que trabaja cada psicólogo, su enfoque y las tarifas presenciales. Si el desplazamiento no encaja contigo, puedes explorar la terapia online desde el directorio.' },
    ],
    questions: [
      { question: '¿Dónde están las consultas de estos psicólogos?', answer: 'Los perfiles de esta página tienen atención presencial publicada en municipios de Cataluña. La ciudad aparece en cada tarjeta y puedes consultar la dirección en el perfil. No todos los profesionales estarán cerca de tu ubicación.' },
      { question: '¿Puedo buscar solo en Barcelona ciudad?', answer: 'Sí. La página de psicólogos en Barcelona reúne las consultas de ese municipio. Esta selección es más amplia e incluye profesionales de otros municipios de Cataluña.' },
      { question: '¿Puedo ver otros especialistas o hacer el cuestionario?', answer: 'Sí. El directorio completo permite explorar otros especialistas y modalidades. También puedes hacer el cuestionario de HERA si necesitas orientación para empezar.' },
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
  if (filters?.city) params.append('city', filters.city);
  if (filters?.region) params.append('region', filters.region);
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
