import { api } from './api';
import type { SpecialistData } from './specialistsService';
import type { UserAnswers } from '../utils/matchingAlgorithm';

export interface SubmitQuestionnaireResponseData {
  specialists: SpecialistData[];
  message: string;
}

interface SubmitQuestionnaireResponse {
  success: boolean;
  data: SubmitQuestionnaireResponseData;
}

export const submitQuestionnaire = async (
  answers: UserAnswers
): Promise<SubmitQuestionnaireResponseData> => {
  const response = await api.post<SubmitQuestionnaireResponse>('/questionnaire/submit', {
    answers,
  });

  return response.data.data;
};
