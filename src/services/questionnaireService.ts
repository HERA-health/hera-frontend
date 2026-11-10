import { api } from './api';
import {
  invalidateSpecialistsCache,
  type SpecialistData,
  type MatchingResultsOptions,
} from './specialistsService';
export type QuestionnaireAnswers = Record<string, string | string[]>;
export interface QuestionnaireChoice {
  value: string;
  label: string;
  group?: string;
  deprecated?: boolean;
}
export interface QuestionnaireDefinition {
  version: '2';
  notice: string;
  noticeVersion: string;
  choices: Record<string, QuestionnaireChoice[]>;
  labels: Record<string, string>;
  groups: [string, string][];
  steps: Array<{ title: string; shortTitle: string; fields: string[] }>;
}
let definition: Promise<QuestionnaireDefinition> | undefined;
export const getQuestionnaireDefinition = () =>
  (definition ??= api
    .get<{ data: QuestionnaireDefinition }>('/questionnaire/definition')
    .then((response) => response.data.data)
    .catch((error) => {
      definition = undefined;
      throw error;
    }));
export async function submitQuestionnaire(
  answers: QuestionnaireAnswers,
  noticeVersion: string,
  submissionId: string,
) {
  const response = await api.post<{
    data: { saved: boolean; adviceId: string | null };
  }>('/questionnaire/submit', {
    answers,
    consent: { adult: true, accepted: true, version: noticeVersion },
    submissionId,
  });
  invalidateSpecialistsCache();
  return response.data.data;
}
export const getCurrentQuestionnaire = async () =>
  (
    await api.get<{
      data: {
        answers: QuestionnaireAnswers | null;
        needsQuestionnaireRefresh: boolean;
        consentWithdrawn: boolean;
      };
    }>('/questionnaire/current')
  ).data.data;
export const withdrawQuestionnaireConsent = async (adviceId?: string) => {
  await api.post(
    adviceId
      ? `/questionnaire/advice/${encodeURIComponent(adviceId)}/withdraw`
      : '/questionnaire/withdraw',
  );
  invalidateSpecialistsCache();
};
export const withdrawAllQuestionnaireConsents = async () => {
  await api.post('/questionnaire/withdraw', { includeAssisted: true });
  invalidateSpecialistsCache();
};
export interface AdviceRequest {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RESPONDED';
  specialistId: string | null;
  createdAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  respondedAt: string | null;
  teamNotifiedAt: string | null;
  patientNotifiedAt: string | null;
  notificationPending: boolean;
  questionnaire: QuestionnaireAnswers | null;
  request: QuestionnaireAnswers | null;
  response: QuestionnaireAnswers | null;
  contact?: { name: string; email: string; phone: string | null } | null;
}
export const listAdvice = async (admin = false) =>
  (
    await api.get<{ data: AdviceRequest[] }>(
      `/questionnaire/${admin ? 'admin/' : ''}advice`,
    )
  ).data.data;
export const sendAdvice = async (
  input: {
    submissionId: string;
    reason: string;
    message: string;
    specialistId?: string;
    shareQuestionnaire: boolean;
  },
  id?: string,
) =>
  (
    await api.post<{ data: AdviceRequest }>(
      id
        ? `/questionnaire/advice/${encodeURIComponent(id)}/send`
        : '/questionnaire/advice',
      input,
      { timeout: 30000 },
    )
  ).data.data;
export const deleteAdviceDraft = async (id: string) => {
  await api.delete(`/questionnaire/advice/${encodeURIComponent(id)}`);
};
export const respondAdvice = async (id: string, response: string) =>
  (
    await api.post<{ data: AdviceRequest }>(
      `/questionnaire/admin/advice/${encodeURIComponent(id)}/respond`,
      { response },
      { timeout: 30000 },
    )
  ).data.data;
export const getAssistedResults = async (id: string, options: MatchingResultsOptions = {}) =>
  (
    await api.get<{ data: { specialists: SpecialistData[]; needsClarification?: boolean; consentWithdrawn: boolean; privateDraft: boolean; expiresAt: string | null } }>(
      `/questionnaire/advice/${encodeURIComponent(id)}/results`,
      { timeout: 15000, ...(options.prioritizeAvailabilityFor ? {params: options} : {}) },
    )
  ).data.data;

export const readAdvice = async (id: string, admin = false) =>
  (
    await api.get<{ data: AdviceRequest }>(
      `/questionnaire/${admin ? 'admin/' : ''}advice/${encodeURIComponent(id)}`,
    )
  ).data.data;
