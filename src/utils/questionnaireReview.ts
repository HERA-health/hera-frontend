import type { QuestionnaireDefinition } from '../services/questionnaireService';
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
  answers?: ClinicalQuestionnaireAnswers | null, definition?: QuestionnaireDefinition | null
): QuestionnaireReviewItem[] => {
  if (!answers) {
    return [];
  }

  if (answers.version === '2') {
    if (!definition) return [];
    return definition.steps.flatMap((step, index) => step.fields.flatMap(field => {
      const values = normalizeAnswerValues(answers[field]);
      return values.length ? [{ questionId: field, category: String(index), categoryLabel: step.title,
        question: definition.labels[field] ?? field,
        answers: values.map(value => definition.choices[field]?.find(option => option.value === value)?.label ?? value),
      }] : [];
    }));
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
