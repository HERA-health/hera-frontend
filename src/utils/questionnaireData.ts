export type QuestionType = 'single' | 'multiple';

export interface QuestionOption {
  id: string;
  text: string;
  value: string;
  matchingKey?: string; // Which specialist attribute this maps to
  emoji?: string; // Optional emoji for visual warmth
}

export interface Question {
  id: string;
  text: string;
  helpText?: string; // Optional helper text below the question
  type: QuestionType;
  options: QuestionOption[];
  category: string; // For grouping similar questions
}

export const questionnaire: Question[] = [
  {
    id: 'q1',
    text: '¿Qué te gustaría trabajar?',
    helpText: 'Puedes seleccionar todas las que apliquen',
    type: 'multiple',
    category: 'specialties',
    options: [
      { id: 'q1-1', text: 'Ansiedad y estrés', value: 'anxiety', matchingKey: 'specialties', emoji: '😰' },
      { id: 'q1-2', text: 'Depresión o tristeza', value: 'depression', matchingKey: 'specialties', emoji: '😢' },
      { id: 'q1-3', text: 'Estrés laboral', value: 'stress', matchingKey: 'specialties', emoji: '🏢' },
      { id: 'q1-4', text: 'Relaciones y comunicación', value: 'relationships', matchingKey: 'specialties', emoji: '💬' },
      { id: 'q1-5', text: 'Traumas o experiencias difíciles', value: 'trauma', matchingKey: 'specialties', emoji: '🧠' },
      { id: 'q1-6', text: 'Autoestima y confianza', value: 'self-esteem', matchingKey: 'specialties', emoji: '💪' },
    ],
  },
  {
    id: 'q2',
    text: '¿Qué enfoque terapéutico prefieres?',
    helpText: 'No te preocupes si no estás seguro/a, te ayudaremos',
    type: 'single',
    category: 'approach',
    options: [
      { id: 'q2-1', text: 'Práctico, orientado a soluciones', value: 'cognitive-behavioral', matchingKey: 'therapeuticApproach', emoji: '🎯' },
      { id: 'q2-2', text: 'Centrado en la persona, empático', value: 'humanistic', matchingKey: 'therapeuticApproach', emoji: '💚' },
      { id: 'q2-3', text: 'Exploración profunda del pasado', value: 'psychodynamic', matchingKey: 'therapeuticApproach', emoji: '🔍' },
      { id: 'q2-4', text: 'Mindfulness y atención plena', value: 'mindfulness', matchingKey: 'therapeuticApproach', emoji: '🧘' },
      { id: 'q2-5', text: 'No estoy seguro/a', value: 'unsure', matchingKey: 'therapeuticApproach', emoji: '🤔' },
    ],
  },
  {
    id: 'q3',
    text: '¿Cómo prefieres que sean las sesiones?',
    type: 'single',
    category: 'style',
    options: [
      { id: 'q3-1', text: 'Estructuradas con objetivos claros', value: 'structured', matchingKey: 'sessionStyle', emoji: '📋' },
      { id: 'q3-2', text: 'Flexibles y conversacionales', value: 'conversational', matchingKey: 'sessionStyle', emoji: '💭' },
      { id: 'q3-3', text: 'Mixto según necesidad', value: 'flexible', matchingKey: 'sessionStyle', emoji: '✨' },
    ],
  },
  {
    id: 'q4',
    text: '¿Qué cualidades valoras más en un terapeuta?',
    helpText: 'Selecciona las que sean importantes para ti',
    type: 'multiple',
    category: 'personality',
    options: [
      { id: 'q4-1', text: 'Empático y comprensivo', value: 'empathetic', matchingKey: 'personality', emoji: '🤗' },
      { id: 'q4-2', text: 'Directo y honesto', value: 'direct', matchingKey: 'personality', emoji: '💬' },
      { id: 'q4-3', text: 'Paciente y calmado', value: 'patient', matchingKey: 'personality', emoji: '🌿' },
      { id: 'q4-4', text: 'Motivador y energético', value: 'motivating', matchingKey: 'personality', emoji: '🔥' },
      { id: 'q4-5', text: 'Cálido y cercano', value: 'warm', matchingKey: 'personality', emoji: '☀️' },
    ],
  },
  {
    id: 'q5',
    text: '¿En qué rango de edad te encuentras?',
    helpText: 'Esto nos ayuda a encontrar terapeutas con experiencia en tu grupo de edad',
    type: 'single',
    category: 'demographics',
    options: [
      { id: 'q5-1', text: '18-25 años', value: 'youth', matchingKey: 'ageGroups', emoji: '🌱' },
      { id: 'q5-2', text: '26-45 años', value: 'adults', matchingKey: 'ageGroups', emoji: '🌳' },
      { id: 'q5-3', text: '46-65 años', value: 'middle-aged', matchingKey: 'ageGroups', emoji: '🌲' },
      { id: 'q5-4', text: 'Más de 65 años', value: 'elderly', matchingKey: 'ageGroups', emoji: '🌴' },
    ],
  },
  {
    id: 'q6',
    text: '¿Qué tan importante es la experiencia del profesional?',
    type: 'single',
    category: 'experience',
    options: [
      { id: 'q6-1', text: 'Mucha experiencia (10+ años)', value: 'high', matchingKey: 'experienceYears', emoji: '🏆' },
      { id: 'q6-2', text: 'Experiencia moderada (5-10 años)', value: 'medium', matchingKey: 'experienceYears', emoji: '⭐' },
      { id: 'q6-3', text: 'No es determinante', value: 'low', matchingKey: 'experienceYears', emoji: '🌟' },
    ],
  },
  {
    id: 'q7',
    text: '¿En qué idioma prefieres las sesiones?',
    type: 'single',
    category: 'language',
    options: [
      { id: 'q7-1', text: 'Español', value: 'spanish', matchingKey: 'language', emoji: '🇪🇸' },
      { id: 'q7-2', text: 'Inglés', value: 'english', matchingKey: 'language', emoji: '🇬🇧' },
      { id: 'q7-3', text: 'Catalán', value: 'catalan', matchingKey: 'language', emoji: '🏴' },
      { id: 'q7-4', text: 'Indiferente', value: 'any', matchingKey: 'language', emoji: '🌍' },
    ],
  },
  {
    id: 'q8',
    text: '¿Cuándo prefieres tener las sesiones?',
    type: 'single',
    category: 'availability',
    options: [
      { id: 'q8-1', text: 'Por las mañanas', value: 'morning', matchingKey: 'availability', emoji: '🌅' },
      { id: 'q8-2', text: 'Por las tardes', value: 'afternoon', matchingKey: 'availability', emoji: '☀️' },
      { id: 'q8-3', text: 'Por las noches', value: 'evening', matchingKey: 'availability', emoji: '🌙' },
      { id: 'q8-4', text: 'Horario flexible', value: 'flexible', matchingKey: 'availability', emoji: '📅' },
    ],
  },
  {
    id: 'q9',
    text: '¿Cómo prefieres las sesiones?',
    type: 'single',
    category: 'format',
    options: [
      { id: 'q9-1', text: 'Videollamada online', value: 'online', matchingKey: 'format', emoji: '📹' },
      { id: 'q9-2', text: 'Presencial en consulta', value: 'in-person', matchingKey: 'format', emoji: '🏢' },
      { id: 'q9-3', text: 'Sin preferencia (flexible)', value: 'both', matchingKey: 'format', emoji: '✨' },
    ],
  },
  {
    id: 'q10',
    text: '¿Has tenido terapia anteriormente?',
    type: 'single',
    category: 'experience',
    options: [
      { id: 'q10-1', text: 'Sí, y fue positiva', value: 'positive', matchingKey: 'previous', emoji: '👍' },
      { id: 'q10-2', text: 'Sí, pero no me ayudó', value: 'negative', matchingKey: 'previous', emoji: '🔄' },
      { id: 'q10-3', text: 'No, es mi primera vez', value: 'first-time', matchingKey: 'previous', emoji: '🌱' },
    ],
  },
  {
    id: 'q11',
    text: '¿Qué tan pronto te gustaría empezar?',
    type: 'single',
    category: 'urgency',
    options: [
      { id: 'q11-1', text: 'Lo antes posible (esta semana)', value: 'urgent', matchingKey: 'urgency', emoji: '⚡' },
      { id: 'q11-2', text: 'Pronto (próximas 2 semanas)', value: 'soon', matchingKey: 'urgency', emoji: '📆' },
      { id: 'q11-3', text: 'Sin prisa, puedo esperar', value: 'flexible', matchingKey: 'urgency', emoji: '🕐' },
    ],
  },
  {
    id: 'q12',
    text: '¿Tienes preferencia de género del terapeuta?',
    type: 'single',
    category: 'preferences',
    options: [
      { id: 'q12-1', text: 'Prefiero mismo género', value: 'same', matchingKey: 'gender', emoji: '👤' },
      { id: 'q12-2', text: 'No tengo preferencia', value: 'any', matchingKey: 'gender', emoji: '🤝' },
    ],
  },
  {
    id: 'q13',
    text: '¿Qué duración de sesión prefieres?',
    type: 'single',
    category: 'session-length',
    options: [
      { id: 'q13-1', text: '30-45 minutos', value: 'short', matchingKey: 'sessionLength', emoji: '⏱️' },
      { id: 'q13-2', text: '50-60 minutos (estándar)', value: 'standard', matchingKey: 'sessionLength', emoji: '⏰' },
      { id: 'q13-3', text: '90 minutos o más', value: 'long', matchingKey: 'sessionLength', emoji: '🕐' },
    ],
  },
  {
    id: 'q14',
    text: '¿Con qué frecuencia te gustaría las sesiones?',
    type: 'single',
    category: 'frequency',
    options: [
      { id: 'q14-1', text: 'Una vez por semana', value: 'weekly', matchingKey: 'frequency', emoji: '📅' },
      { id: 'q14-2', text: 'Cada dos semanas', value: 'biweekly', matchingKey: 'frequency', emoji: '📆' },
      { id: 'q14-3', text: 'Una vez al mes', value: 'monthly', matchingKey: 'frequency', emoji: '🗓️' },
      { id: 'q14-4', text: 'Según necesidad', value: 'flexible', matchingKey: 'frequency', emoji: '✨' },
    ],
  },
  {
    id: 'q15',
    text: '¿Cuál es tu presupuesto por sesión?',
    type: 'single',
    category: 'budget',
    options: [
      { id: 'q15-1', text: 'Hasta 50€', value: 'low', matchingKey: 'budget', emoji: '💰' },
      { id: 'q15-2', text: '50-75€', value: 'medium', matchingKey: 'budget', emoji: '💶' },
      { id: 'q15-3', text: '75-100€', value: 'high', matchingKey: 'budget', emoji: '💎' },
      { id: 'q15-4', text: 'Más de 100€', value: 'premium', matchingKey: 'budget', emoji: '👑' },
      { id: 'q15-5', text: 'Flexible', value: 'flexible', matchingKey: 'budget', emoji: '✨' },
    ],
  },
];

// Helper function to get option label with emoji
export const getOptionLabel = (option: QuestionOption): string => {
  return option.emoji ? `${option.emoji} ${option.text}` : option.text;
};

// Category labels for the review screen
export const categoryLabels: Record<string, string> = {
  specialties: 'Áreas de trabajo',
  approach: 'Enfoque terapéutico',
  style: 'Estilo de sesión',
  personality: 'Cualidades del terapeuta',
  demographics: 'Grupo de edad',
  experience: 'Experiencia',
  language: 'Idioma',
  availability: 'Disponibilidad',
  format: 'Formato de sesión',
  urgency: 'Urgencia',
  preferences: 'Preferencias',
  'session-length': 'Duración de sesión',
  frequency: 'Frecuencia',
  budget: 'Presupuesto',
};
