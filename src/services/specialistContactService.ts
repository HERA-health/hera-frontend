import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { api } from './api';

export type SpecialistHelpCategory =
  | 'TECHNICAL'
  | 'ACCOUNT_ACCESS'
  | 'AGENDA_SESSIONS'
  | 'BILLING'
  | 'PROFILE'
  | 'CLINIC_MANAGEMENT'
  | 'PRIVACY_SECURITY'
  | 'OTHER';

export type SpecialistHelpImpact = 'BLOCKING' | 'DEGRADED' | 'NON_BLOCKING';
export type SpecialistHelpStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_SPECIALIST'
  | 'RESOLVED';
export type SpecialistHelpAuthor = 'SPECIALIST' | 'ADMIN';

export type SpecialistFeedbackCategory =
  | 'IMPROVEMENT_IDEA'
  | 'CONFUSING_EXPERIENCE'
  | 'GENERAL_COMMENT'
  | 'POSITIVE_FEEDBACK';
export type SpecialistFeedbackStatus =
  | 'RECEIVED'
  | 'REVIEWED'
  | 'CONSIDERING'
  | 'PLANNED'
  | 'IMPLEMENTED'
  | 'CLOSED';

export type ContactNotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type ContactNotificationChannel = 'DISCORD' | 'EMAIL';

export interface HelpRequestListItem {
  id: string;
  reference: string;
  category: SpecialistHelpCategory;
  impact: SpecialistHelpImpact;
  subject: string;
  status: SpecialistHelpStatus;
  lastActivityAt: string;
  resolvedAt: string | null;
  createdAt: string;
  unreadAdminMessages: number;
}

export interface HelpMessage {
  id: string;
  author: SpecialistHelpAuthor;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface HelpRequestDetail {
  id: string;
  reference: string;
  category: SpecialistHelpCategory;
  impact: SpecialistHelpImpact;
  subject: string;
  status: SpecialistHelpStatus;
  platform: string | null;
  appVersion: string | null;
  screenName: string | null;
  lastActivityAt: string;
  resolvedAt: string | null;
  createdAt: string;
  messages: HelpMessage[];
}

export interface FeedbackListItem {
  id: string;
  reference: string;
  category: SpecialistFeedbackCategory;
  status: SpecialistFeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AdminSpecialistIdentity {
  id: string | null;
  name: string;
}

export interface ContactNotification {
  id: string;
  channel: ContactNotificationChannel;
  event: 'HELP_CREATED' | 'HELP_SPECIALIST_REPLIED' | 'HELP_ADMIN_REPLIED';
  status: ContactNotificationStatus;
  attemptCount: number;
  nextAttemptAt?: string;
  sentAt?: string | null;
  failedAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
}

export interface AdminHelpListItem {
  id: string;
  reference: string;
  category: SpecialistHelpCategory;
  impact: SpecialistHelpImpact;
  status: SpecialistHelpStatus;
  lastActivityAt: string;
  createdAt: string;
  specialist: AdminSpecialistIdentity;
  unreadSpecialistMessages: number;
}

export interface HelpStateUpdate {
  status: SpecialistHelpStatus;
  resolvedAt: string | null;
  lastActivityAt?: string;
}

export interface FeedbackStateUpdate {
  status: SpecialistFeedbackStatus;
  closedAt: string | null;
  updatedAt: string;
}

export interface AdminHelpDetail extends Omit<HelpRequestDetail, 'subject'> {
  subject: string;
  specialist: AdminSpecialistIdentity;
  notifications: ContactNotification[];
}

export interface AdminFeedbackListItem {
  id: string;
  reference: string;
  category: SpecialistFeedbackCategory;
  status: SpecialistFeedbackStatus;
  createdAt: string;
  updatedAt: string;
  specialist: AdminSpecialistIdentity;
}

export interface AdminFeedbackDetail extends AdminFeedbackListItem {
  body: string;
  platform: string | null;
  appVersion: string | null;
  screenName: string | null;
  closedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const getTechnicalContext = (screenName: string) => ({
  platform: Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android',
  appVersion: Application.nativeApplicationVersion ?? undefined,
  screenName,
});

export const createHelpRequest = async (payload: {
  category: SpecialistHelpCategory;
  impact: SpecialistHelpImpact;
  subject: string;
  message: string;
  platform?: string;
  appVersion?: string;
  screenName?: string;
}): Promise<HelpRequestDetail> => {
  const response = await api.post<ApiResponse<HelpRequestDetail>>(
    '/specialist-contact/help-requests',
    payload
  );
  notifySpecialistContactSummaryChanged();
  return response.data.data;
};
export const listHelpRequests = async (
  cursor?: string
): Promise<ContactPage<HelpRequestListItem>> => {
  const response = await api.get<ApiResponse<ContactPage<HelpRequestListItem>>>(
    '/specialist-contact/help-requests',
    { params: { cursor } }
  );
  return response.data.data;
};

export const getHelpRequest = async (id: string): Promise<HelpRequestDetail> => {
  const response = await api.get<ApiResponse<HelpRequestDetail>>(
    `/specialist-contact/help-requests/${id}`
  );
  return response.data.data;
};

export const replyToHelpRequest = async (
  id: string,
  message: string
): Promise<HelpMessage> => {
  const response = await api.post<ApiResponse<HelpMessage>>(
    `/specialist-contact/help-requests/${id}/messages`,
    { message }
  );
  return response.data.data;
};

export const markHelpRequestRead = async (
  id: string,
  throughMessageId: string
): Promise<void> => {
  await api.patch(`/specialist-contact/help-requests/${id}/read`, { throughMessageId });
  notifySpecialistContactSummaryChanged();
};

export const resolveHelpRequest = async (id: string): Promise<HelpStateUpdate> => {
  const response = await api.patch<ApiResponse<HelpStateUpdate>>(
    `/specialist-contact/help-requests/${id}/resolve`
  );
  return response.data.data;
};

export const createFeedback = async (payload: {
  category: SpecialistFeedbackCategory;
  text: string;
  platform?: string;
  appVersion?: string;
  screenName?: string;
}): Promise<FeedbackListItem> => {
  const response = await api.post<ApiResponse<FeedbackListItem>>(
    '/specialist-contact/feedback',
    payload
  );
  return response.data.data;
};

export const listFeedback = async (
  cursor?: string
): Promise<ContactPage<FeedbackListItem>> => {
  const response = await api.get<ApiResponse<ContactPage<FeedbackListItem>>>(
    '/specialist-contact/feedback',
    { params: { cursor } }
  );
  return response.data.data;
};

export const getSpecialistContactSummary = async (): Promise<{
  unreadHelpRequests: number;
}> => {
  const response = await api.get<ApiResponse<{ unreadHelpRequests: number }>>(
    '/specialist-contact/summary'
  );
  return response.data.data;
};

type SummaryListener = () => void;
const summaryListeners = new Set<SummaryListener>();

export const subscribeSpecialistContactSummary = (
  listener: SummaryListener
): (() => void) => {
  summaryListeners.add(listener);
  return () => summaryListeners.delete(listener);
};

export const notifySpecialistContactSummaryChanged = (): void => {
  summaryListeners.forEach((listener) => listener());
};

export interface AdminHelpFilters {
  cursor?: string;
  status?: SpecialistHelpStatus;
  category?: SpecialistHelpCategory;
  impact?: SpecialistHelpImpact;
  unread?: boolean;
  search?: string;
}

export const listAdminHelpRequests = async (
  filters: AdminHelpFilters
): Promise<ContactPage<AdminHelpListItem>> => {
  const response = await api.get<ApiResponse<ContactPage<AdminHelpListItem>>>(
    '/admin/specialist-contact/help-requests',
    { params: filters }
  );
  return response.data.data;
};

export const getAdminHelpRequest = async (id: string): Promise<AdminHelpDetail> => {
  const response = await api.get<ApiResponse<AdminHelpDetail>>(
    `/admin/specialist-contact/help-requests/${id}`
  );
  return response.data.data;
};

export const replyToHelpRequestAsAdmin = async (
  id: string,
  message: string
): Promise<HelpMessage> => {
  const response = await api.post<ApiResponse<HelpMessage>>(
    `/admin/specialist-contact/help-requests/${id}/messages`,
    { message }
  );
  return response.data.data;
};

export const markAdminHelpRequestRead = async (
  id: string,
  throughMessageId: string
): Promise<void> => {
  await api.patch(`/admin/specialist-contact/help-requests/${id}/read`, { throughMessageId });
};

export const updateAdminHelpStatus = async (
  id: string,
  status: SpecialistHelpStatus
): Promise<HelpStateUpdate> => {
  const response = await api.patch<ApiResponse<HelpStateUpdate>>(
    `/admin/specialist-contact/help-requests/${id}/status`,
    { status }
  );
  return response.data.data;
};

export interface AdminFeedbackFilters {
  cursor?: string;
  status?: SpecialistFeedbackStatus;
  category?: SpecialistFeedbackCategory;
  search?: string;
}

export const listAdminFeedback = async (
  filters: AdminFeedbackFilters
): Promise<ContactPage<AdminFeedbackListItem>> => {
  const response = await api.get<ApiResponse<ContactPage<AdminFeedbackListItem>>>(
    '/admin/specialist-contact/feedback',
    { params: filters }
  );
  return response.data.data;
};

export const getAdminFeedback = async (id: string): Promise<AdminFeedbackDetail> => {
  const response = await api.get<ApiResponse<AdminFeedbackDetail>>(
    `/admin/specialist-contact/feedback/${id}`
  );
  return response.data.data;
};

export const updateAdminFeedbackStatus = async (
  id: string,
  status: SpecialistFeedbackStatus
): Promise<FeedbackStateUpdate> => {
  const response = await api.patch<ApiResponse<FeedbackStateUpdate>>(
    `/admin/specialist-contact/feedback/${id}/status`,
    { status }
  );
  return response.data.data;
};

export const retryContactNotification = async (id: string): Promise<void> => {
  await api.post(`/admin/specialist-contact/notifications/${id}/retry`);
};

export const getAdminContactSummary = async (): Promise<{
  unreadHelpRequests: number;
  openHelpRequests: number;
  receivedFeedback: number;
  failedRetryable: number;
  failedDefinitive: number;
}> => {
  const response = await api.get<ApiResponse<{
    unreadHelpRequests: number;
    openHelpRequests: number;
    receivedFeedback: number;
    failedRetryable: number;
    failedDefinitive: number;
  }>>('/admin/specialist-contact/summary');
  return response.data.data;
};
