import type { QuestionnaireAnswers } from '../services/questionnaireService';
export const emptyQuestionnaire = (): QuestionnaireAnswers => ({
  version: '2',
  familyPopulations: [],
  childAgeGroup: '',
  respondentRole: '',
  modalities: [],
  city: '',
  languages: [],
  concerns: [],
  concernsNote: '',
  workingStyles: [],
  goals: [],
  previousPositive: '',
  previousImprovement: '',
  gender: '',
  contexts: [],
  religion: '',
  discrimination: [],
  contextNote: '',
  additionalNote: '',
});
export const answerList = (
  answers: QuestionnaireAnswers,
  field: string,
): string[] => (Array.isArray(answers[field]) ? answers[field] : []);
export const answerText = (
  answers: QuestionnaireAnswers,
  field: string,
): string => (typeof answers[field] === 'string' ? answers[field] : '');
export const assistedQuestionnaire = (answers: QuestionnaireAnswers) =>
  answers.therapyType === 'child' ||
  (answers.therapyType === 'family' &&
    answerList(answers, 'familyPopulations').some((p) => p !== 'adults'));
export function updateQuestionnaire(
  answers: QuestionnaireAnswers,
  field: string,
  value: string | string[],
): QuestionnaireAnswers {
  const next = { ...answers, [field]: value };
  if (next.therapyType !== 'family') next.familyPopulations = [];
  if (next.therapyType !== 'child') next.childAgeGroup = '';
  if (!assistedQuestionnaire(next)) next.respondentRole = '';
  if (!answerList(next, 'modalities').includes('in-person')) next.city = '';
  if (next.previousTherapy === 'first') {
    next.previousPositive = '';
    next.previousImprovement = '';
  }
  if (!answerList(next, 'contexts').includes('religion')) next.religion = '';
  if (!answerList(next, 'contexts').includes('discrimination'))
    next.discrimination = [];
  return next;
}
export function questionnaireStepError(
  answers: QuestionnaireAnswers,
  step: number,
): string | null {
  const has = (field: string) =>
    Array.isArray(answers[field])
      ? answers[field].length > 0
      : Boolean(answers[field]);
  const required = [
    [],
    ['therapyType'],
    ['modalities', 'languages'],
    ['budget', 'start'],
    ['concerns'],
    ['workingStyles', 'goals'],
    ['previousTherapy'],
    [],
    [],
  ][step];
  if (required.some((field) => !has(field)))
    return 'Selecciona una respuesta en cada pregunta obligatoria para continuar.';
  if (
    step === 1 &&
    ((answers.therapyType === 'family' && !has('familyPopulations')) ||
      (answers.therapyType === 'child' && !has('childAgeGroup')) ||
      (assistedQuestionnaire(answers) && !has('respondentRole')))
  )
    return 'Indica las edades de quienes participan y quién responde.';
  if (
    step === 2 &&
    answerList(answers, 'modalities').includes('in-person') &&
    !answerText(answers, 'city').trim()
  )
    return 'Selecciona la ciudad donde quieres acudir.';
  if (step === 4 && answerList(answers, 'concerns').length > 3)
    return 'Selecciona como máximo tres áreas de apoyo.';
  return null;
}
