/**
 * Mock data for development and testing
 * Contains sample specialists, sessions, user profile, and features
 */

import { Specialist, Session, UserProfile, Feature } from '../constants/types';
import { colors } from '../constants/colors';

export const mockSpecialists: Specialist[] = [
  {
    id: '1',
    name: 'Dr. María González',
    initial: 'M',
    specialization: 'Psicóloga Clínica',
    rating: 4.9,
    reviewCount: 127,
    description:
      'Especialista en terapia cognitivo-conductual con más de 15 años de experiencia. Enfoque en ansiedad y depresión.',
    affinityPercentage: 95,
    tags: ['Ansiedad', 'Depresión', 'Terapia Cognitiva', 'Adultos'],
    pricePerSession: 65,
    firstVisitFree: true,
    verified: true,
    matchingProfile: {
      therapeuticApproach: ['cognitive-behavioral', 'mindfulness'],
      specialties: ['anxiety', 'depression', 'stress'],
      sessionStyle: 'structured',
      personality: ['empathetic', 'patient', 'warm'],
      ageGroups: ['adults', 'youth'],
      experienceYears: 15,
      language: ['spanish', 'english'],
      availability: 'flexible',
      format: ['online', 'in-person'],
    },
  },
  {
    id: '2',
    name: 'Dr. Carlos Rodríguez',
    initial: 'C',
    specialization: 'Psicólogo Deportivo',
    rating: 4.8,
    reviewCount: 89,
    description:
      'Especializado en psicología deportiva y rendimiento. Trabajo con atletas profesionales y amateurs.',
    affinityPercentage: 88,
    tags: ['Rendimiento', 'Motivación', 'Estrés', 'Deportistas'],
    pricePerSession: 70,
    firstVisitFree: false,
    verified: true,
    matchingProfile: {
      therapeuticApproach: ['cognitive-behavioral', 'humanistic'],
      specialties: ['stress', 'self-esteem', 'relationships'],
      sessionStyle: 'flexible',
      personality: ['motivating', 'direct', 'empathetic'],
      ageGroups: ['youth', 'adults'],
      experienceYears: 8,
      language: ['spanish', 'catalan'],
      availability: 'afternoon',
      format: ['online', 'in-person'],
    },
  },
  {
    id: '3',
    name: 'Dra. Ana Martínez',
    initial: 'A',
    specialization: 'Terapeuta Familiar',
    rating: 5.0,
    reviewCount: 156,
    description:
      'Terapeuta familiar sistémica. Especialista en conflictos de pareja y comunicación familiar.',
    affinityPercentage: 92,
    tags: ['Pareja', 'Familia', 'Comunicación', 'Conflictos'],
    pricePerSession: 80,
    firstVisitFree: true,
    verified: true,
    matchingProfile: {
      therapeuticApproach: ['humanistic', 'psychodynamic'],
      specialties: ['relationships', 'self-esteem', 'anxiety'],
      sessionStyle: 'conversational',
      personality: ['empathetic', 'warm', 'patient'],
      ageGroups: ['adults', 'middle-aged'],
      experienceYears: 12,
      language: ['spanish', 'english', 'catalan'],
      availability: 'morning',
      format: ['online'],
    },
  },
  {
    id: '4',
    name: 'Dr. Luis Fernández',
    initial: 'L',
    specialization: 'Psicólogo Clínico',
    rating: 4.7,
    reviewCount: 73,
    description:
      'Especialista en trastornos de la personalidad y trauma. Enfoque integrativo con mindfulness.',
    affinityPercentage: 85,
    tags: ['Trauma', 'Mindfulness', 'Personalidad', 'EMDR'],
    pricePerSession: 75,
    firstVisitFree: false,
    verified: true,
    matchingProfile: {
      therapeuticApproach: ['mindfulness', 'psychodynamic'],
      specialties: ['trauma', 'anxiety', 'depression'],
      sessionStyle: 'structured',
      personality: ['patient', 'direct', 'empathetic'],
      ageGroups: ['adults', 'elderly'],
      experienceYears: 18,
      language: ['spanish'],
      availability: 'evening',
      format: ['online', 'in-person'],
    },
  },
  {
    id: '5',
    name: 'Dra. Isabel Sánchez',
    initial: 'I',
    specialization: 'Psicóloga Infantil',
    rating: 4.9,
    reviewCount: 102,
    description:
      'Especializada en psicología infantil y adolescente. Terapia de juego y apoyo emocional.',
    affinityPercentage: 90,
    tags: ['Niños', 'Adolescentes', 'Terapia de Juego', 'Autoestima'],
    pricePerSession: 60,
    firstVisitFree: true,
    verified: true,
    matchingProfile: {
      therapeuticApproach: ['humanistic', 'cognitive-behavioral'],
      specialties: ['self-esteem', 'anxiety', 'relationships'],
      sessionStyle: 'flexible',
      personality: ['warm', 'motivating', 'patient'],
      ageGroups: ['youth'],
      experienceYears: 6,
      language: ['spanish', 'english'],
      availability: 'flexible',
      format: ['online', 'in-person'],
    },
  },
];

export const mockSessions: Session[] = [
  {
    id: '1',
    specialistId: '1',
    specialistName: 'Dr. María González',
    date: new Date('2024-03-15T10:00:00'),
    duration: 50,
    status: 'completed',
    type: 'video',
    notes: 'Primera sesión. Establecimos objetivos terapéuticos.',
  },
  {
    id: '2',
    specialistId: '1',
    specialistName: 'Dr. María González',
    date: new Date('2024-03-22T10:00:00'),
    duration: 50,
    status: 'completed',
    type: 'video',
    notes: 'Trabajamos técnicas de respiración para la ansiedad.',
  },
  {
    id: '3',
    specialistId: '3',
    specialistName: 'Dra. Ana Martínez',
    date: new Date('2024-03-25T15:30:00'),
    duration: 60,
    status: 'completed',
    type: 'video',
    notes: 'Sesión familiar. Mejora en la comunicación.',
  },
];

export const mockUserProfile: UserProfile = {
  id: '1',
  fullName: 'Rubén Vallejo',
  email: 'ruben.vallejo.jara@gmail.com',
  phone: '+34 123 456 789',
  birthDate: new Date('1990-05-15'),
  gender: 'male',
  occupation: 'Ingeniero de Software',
  initial: 'R',
  profileCompleted: false,
};

export const mockFeatures: Feature[] = [
  {
    id: '1',
    title: 'Matching Inteligente',
    description:
      'Nuestro algoritmo de afinidad conecta usuarios con especialistas según personalidad, valores y necesidades específicas.',
    icon: 'brain',
    iconColor: colors.primary.main,
    iconBackground: colors.background.tertiary,
  },
  {
    id: '2',
    title: 'Sesiones Seguras',
    description:
      'Plataforma 100% confidencial con videollamadas cifradas end-to-end. Tu privacidad es nuestra prioridad.',
    icon: 'shield-checkmark',
    iconColor: colors.primary.main,
    iconBackground: colors.background.success,
  },
  {
    id: '3',
    title: 'Profesionales Verificados',
    description:
      'Todos nuestros especialistas están verificados, colegiados y cuentan con experiencia comprobada.',
    icon: 'medal',
    iconColor: colors.secondary.purple,
    iconBackground: '#F3E8FF',
  },
];

export const whyMindConnectFeatures = [
  {
    id: '1',
    icon: 'checkmark-circle',
    title: 'Especialistas Verificados',
    description: 'Profesionales colegiados y certificados',
  },
  {
    id: '2',
    icon: 'lock-closed',
    title: '100% Confidencial',
    description: 'Tus sesiones son privadas y seguras',
  },
  {
    id: '3',
    icon: 'time',
    title: 'Horarios Flexibles',
    description: 'Encuentra sesiones que se ajusten a ti',
  },
  {
    id: '4',
    icon: 'videocam',
    title: 'Videoconferencia HD',
    description: 'Sesiones por videollamada de alta calidad',
  },
  {
    id: '5',
    icon: 'card',
    title: 'Pagos Seguros',
    description: 'Transacciones encriptadas y protegidas',
  },
  {
    id: '6',
    icon: 'star',
    title: 'Reseñas Reales',
    description: 'Opiniones verificadas de usuarios reales',
  },
];
