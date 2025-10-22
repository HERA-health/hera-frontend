import { Specialist } from '../constants/types';
import { questionnaire } from './questionnaireData';

export interface UserAnswers {
  [questionId: string]: string | string[]; // Single or multiple answers
}

export interface MatchResult {
  specialist: Specialist;
  affinityScore: number;
  matchedAttributes: string[];
}

export function calculateMatching(
  answers: UserAnswers,
  specialists: Specialist[]
): MatchResult[] {
  const results: MatchResult[] = specialists.map(specialist => {
    let totalScore = 0;
    let maxScore = 0;
    const matchedAttributes: string[] = [];

    // Process each answer
    Object.entries(answers).forEach(([questionId, answer]) => {
      const question = questionnaire.find(q => q.id === questionId);
      if (!question) return;

      const selectedOptions = Array.isArray(answer) ? answer : [answer];

      selectedOptions.forEach(answerValue => {
        const option = question.options.find(opt => opt.value === answerValue);
        if (!option || !option.matchingKey) return;

        maxScore += 10; // Each answer can contribute up to 10 points

        const matchingKey = option.matchingKey as keyof typeof specialist.matchingProfile;
        const specialistValue = specialist.matchingProfile[matchingKey];

        // Check for match
        if (Array.isArray(specialistValue)) {
          if (specialistValue.includes(answerValue)) {
            totalScore += 10;
            matchedAttributes.push(option.text);
          } else if (answerValue === 'unsure' || answerValue === 'any' || answerValue === 'flexible') {
            totalScore += 7; // Partial match for flexible answers
          }
        } else {
          if (specialistValue === answerValue) {
            totalScore += 10;
            matchedAttributes.push(option.text);
          } else if (answerValue === 'unsure' || answerValue === 'any' || answerValue === 'flexible') {
            totalScore += 7;
          }
        }

        // Special handling for experience
        if (matchingKey === 'experienceYears') {
          const years = specialist.matchingProfile.experienceYears;
          if (answerValue === 'high' && years >= 10) {
            totalScore += 10;
            matchedAttributes.push('Experiencia alta');
          } else if (answerValue === 'medium' && years >= 5 && years < 10) {
            totalScore += 10;
            matchedAttributes.push('Experiencia moderada');
          } else if (answerValue === 'low') {
            totalScore += 10; // Not important
          }
        }
      });
    });

    // Calculate percentage
    const affinityScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return {
      specialist: {
        ...specialist,
        affinityPercentage: affinityScore,
      },
      affinityScore,
      matchedAttributes,
    };
  });

  // Sort by affinity score (highest first)
  return results.sort((a, b) => b.affinityScore - a.affinityScore);
}
