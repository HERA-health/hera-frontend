import {
  categoryLabels,
  questionnaire,
  type Question,
} from './questionnaireData';
import type { ClinicalQuestionnaireAnswers } from '../services/clinicalService';

export interface QuestionnaireReviewItem {
  questionId: string;
  category: string;
  categoryLabel: string;
  question: string;
  helpText?: string;
  answers: string[];
}

const normalizeAnswerValues = (
  value?: string | string[]
): string[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const mapAnswerLabel = (question: Question, value: string): string => {
  const option = question.options.find((item) => item.value === value);
  return option?.text ?? value;
};

export const buildQuestionnaireReviewItems = (
  answers?: ClinicalQuestionnaireAnswers | null
): QuestionnaireReviewItem[] => {
  if (!answers) {
    return [];
  }

  return questionnaire.reduce<QuestionnaireReviewItem[]>((items, question) => {
    const answerValues = normalizeAnswerValues(answers[question.id]);

    if (answerValues.length === 0) {
      return items;
    }

    items.push({
      questionId: question.id,
      category: question.category,
      categoryLabel: categoryLabels[question.category] ?? question.category,
      question: question.text,
      helpText: question.helpText,
      answers: answerValues.map((value) => mapAnswerLabel(question, value)),
    });

    return items;
  }, []);
};
