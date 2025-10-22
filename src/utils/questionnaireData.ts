export type QuestionType = 'single' | 'multiple';

export interface QuestionOption {
  id: string;
  text: string;
  value: string;
  matchingKey?: string; // Which specialist attribute this maps to
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  category: string; // For grouping similar questions
}

export const questionnaire: Question[] = [
  {
    id: 'q1',
    text: '¿Qué tipo de apoyo buscas principalmente?',
    type: 'multiple',
    category: 'specialties',
    options: [
      { id: 'q1-1', text: 'Ansiedad', value: 'anxiety', matchingKey: 'specialties' },
      { id: 'q1-2', text: 'Depresión', value: 'depression', matchingKey: 'specialties' },
      { id: 'q1-3', text: 'Estrés laboral', value: 'stress', matchingKey: 'specialties' },
      { id: 'q1-4', text: 'Relaciones interpersonales', value: 'relationships', matchingKey: 'specialties' },
      { id: 'q1-5', text: 'Traumas pasados', value: 'trauma', matchingKey: 'specialties' },
      { id: 'q1-6', text: 'Autoestima', value: 'self-esteem', matchingKey: 'specialties' },
    ],
  },
  {
    id: 'q2',
    text: '¿Qué enfoque terapéutico prefieres?',
    type: 'single',
    category: 'approach',
    options: [
      { id: 'q2-1', text: 'Cognitivo-conductual (práctico, orientado a soluciones)', value: 'cognitive-behavioral', matchingKey: 'therapeuticApproach' },
      { id: 'q2-2', text: 'Humanista (centrado en la persona, empático)', value: 'humanistic', matchingKey: 'therapeuticApproach' },
      { id: 'q2-3', text: 'Psicodinámico (exploración profunda del pasado)', value: 'psychodynamic', matchingKey: 'therapeuticApproach' },
      { id: 'q2-4', text: 'Mindfulness (atención plena, presente)', value: 'mindfulness', matchingKey: 'therapeuticApproach' },
      { id: 'q2-5', text: 'No estoy seguro/a', value: 'unsure', matchingKey: 'therapeuticApproach' },
    ],
  },
  {
    id: 'q3',
    text: '¿Cómo prefieres que sean tus sesiones?',
    type: 'single',
    category: 'style',
    options: [
      { id: 'q3-1', text: 'Estructuradas con objetivos claros', value: 'structured', matchingKey: 'sessionStyle' },
      { id: 'q3-2', text: 'Flexibles y conversacionales', value: 'conversational', matchingKey: 'sessionStyle' },
      { id: 'q3-3', text: 'Mixto según necesidad', value: 'flexible', matchingKey: 'sessionStyle' },
    ],
  },
  {
    id: 'q4',
    text: '¿Qué cualidades valoras más en un terapeuta?',
    type: 'multiple',
    category: 'personality',
    options: [
      { id: 'q4-1', text: 'Empático y comprensivo', value: 'empathetic', matchingKey: 'personality' },
      { id: 'q4-2', text: 'Directo y honesto', value: 'direct', matchingKey: 'personality' },
      { id: 'q4-3', text: 'Paciente y calmado', value: 'patient', matchingKey: 'personality' },
      { id: 'q4-4', text: 'Motivador y energético', value: 'motivating', matchingKey: 'personality' },
      { id: 'q4-5', text: 'Cálido y cercano', value: 'warm', matchingKey: 'personality' },
    ],
  },
  {
    id: 'q5',
    text: '¿En qué rango de edad te encuentras?',
    type: 'single',
    category: 'demographics',
    options: [
      { id: 'q5-1', text: '18-25 años', value: 'youth', matchingKey: 'ageGroups' },
      { id: 'q5-2', text: '26-45 años', value: 'adults', matchingKey: 'ageGroups' },
      { id: 'q5-3', text: '46-65 años', value: 'middle-aged', matchingKey: 'ageGroups' },
      { id: 'q5-4', text: 'Más de 65 años', value: 'elderly', matchingKey: 'ageGroups' },
    ],
  },
  {
    id: 'q6',
    text: '¿Qué tan importante es la experiencia del profesional?',
    type: 'single',
    category: 'experience',
    options: [
      { id: 'q6-1', text: 'Prefiero mucha experiencia (10+ años)', value: 'high', matchingKey: 'experienceYears' },
      { id: 'q6-2', text: 'Experiencia moderada (5-10 años)', value: 'medium', matchingKey: 'experienceYears' },
      { id: 'q6-3', text: 'No es determinante', value: 'low', matchingKey: 'experienceYears' },
    ],
  },
  {
    id: 'q7',
    text: '¿En qué idioma prefieres tus sesiones?',
    type: 'single',
    category: 'language',
    options: [
      { id: 'q7-1', text: 'Español', value: 'spanish', matchingKey: 'language' },
      { id: 'q7-2', text: 'Inglés', value: 'english', matchingKey: 'language' },
      { id: 'q7-3', text: 'Catalán', value: 'catalan', matchingKey: 'language' },
      { id: 'q7-4', text: 'Indiferente', value: 'any', matchingKey: 'language' },
    ],
  },
  {
    id: 'q8',
    text: '¿Cuándo prefieres tener tus sesiones?',
    type: 'single',
    category: 'availability',
    options: [
      { id: 'q8-1', text: 'Mañanas', value: 'morning', matchingKey: 'availability' },
      { id: 'q8-2', text: 'Tardes', value: 'afternoon', matchingKey: 'availability' },
      { id: 'q8-3', text: 'Noches', value: 'evening', matchingKey: 'availability' },
      { id: 'q8-4', text: 'Horario flexible', value: 'flexible', matchingKey: 'availability' },
    ],
  },
  {
    id: 'q9',
    text: '¿Prefieres sesiones online o presenciales?',
    type: 'single',
    category: 'format',
    options: [
      { id: 'q9-1', text: 'Solo online', value: 'online', matchingKey: 'format' },
      { id: 'q9-2', text: 'Solo presenciales', value: 'in-person', matchingKey: 'format' },
      { id: 'q9-3', text: 'Ambas opciones', value: 'both', matchingKey: 'format' },
    ],
  },
  {
    id: 'q10',
    text: '¿Has tenido terapia anteriormente?',
    type: 'single',
    category: 'experience',
    options: [
      { id: 'q10-1', text: 'Sí, y fue positiva', value: 'positive', matchingKey: 'previous' },
      { id: 'q10-2', text: 'Sí, pero no me ayudó', value: 'negative', matchingKey: 'previous' },
      { id: 'q10-3', text: 'No, es mi primera vez', value: 'first-time', matchingKey: 'previous' },
    ],
  },
  {
    id: 'q11',
    text: '¿Qué tan rápido necesitas empezar la terapia?',
    type: 'single',
    category: 'urgency',
    options: [
      { id: 'q11-1', text: 'Es urgente (esta semana)', value: 'urgent', matchingKey: 'urgency' },
      { id: 'q11-2', text: 'Pronto (próximas 2 semanas)', value: 'soon', matchingKey: 'urgency' },
      { id: 'q11-3', text: 'Puedo esperar', value: 'flexible', matchingKey: 'urgency' },
    ],
  },
  {
    id: 'q12',
    text: '¿Prefieres un terapeuta de tu mismo género?',
    type: 'single',
    category: 'preferences',
    options: [
      { id: 'q12-1', text: 'Sí, prefiero mismo género', value: 'same', matchingKey: 'gender' },
      { id: 'q12-2', text: 'No, es indiferente', value: 'any', matchingKey: 'gender' },
    ],
  },
  {
    id: 'q13',
    text: '¿Qué duración de sesión prefieres?',
    type: 'single',
    category: 'session-length',
    options: [
      { id: 'q13-1', text: '30-45 minutos', value: 'short', matchingKey: 'sessionLength' },
      { id: 'q13-2', text: '50-60 minutos (estándar)', value: 'standard', matchingKey: 'sessionLength' },
      { id: 'q13-3', text: '90 minutos o más', value: 'long', matchingKey: 'sessionLength' },
    ],
  },
  {
    id: 'q14',
    text: '¿Con qué frecuencia te gustaría tener sesiones?',
    type: 'single',
    category: 'frequency',
    options: [
      { id: 'q14-1', text: 'Una vez por semana', value: 'weekly', matchingKey: 'frequency' },
      { id: 'q14-2', text: 'Cada dos semanas', value: 'biweekly', matchingKey: 'frequency' },
      { id: 'q14-3', text: 'Una vez al mes', value: 'monthly', matchingKey: 'frequency' },
      { id: 'q14-4', text: 'Según necesidad', value: 'flexible', matchingKey: 'frequency' },
    ],
  },
  {
    id: 'q15',
    text: '¿Qué presupuesto tienes por sesión?',
    type: 'single',
    category: 'budget',
    options: [
      { id: 'q15-1', text: 'Hasta 50€', value: 'low', matchingKey: 'budget' },
      { id: 'q15-2', text: '50-75€', value: 'medium', matchingKey: 'budget' },
      { id: 'q15-3', text: '75-100€', value: 'high', matchingKey: 'budget' },
      { id: 'q15-4', text: 'Más de 100€', value: 'premium', matchingKey: 'budget' },
      { id: 'q15-5', text: 'Flexible', value: 'flexible', matchingKey: 'budget' },
    ],
  },
];
