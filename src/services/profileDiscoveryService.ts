import { api } from './api';
import { invalidateSpecialistsCache } from './specialistsService';

import type { ProfileOption } from '../utils/profileOptions';
export type { ProfileOption } from '../utils/profileOptions';
export interface ProfileOptions { languages: ProfileOption[]; religions: ProfileOption[]; religionEnabled: boolean; religionNotice: string | null; religionNoticeVersion: string | null; religionDraftNotice?: string | null; religionDraftNoticeVersion?: string | null }
export interface ReligionPublication { religionCode: string | null; hasPublication: boolean; hasDeclaration?: boolean }
export const getProfileOptions = async (): Promise<ProfileOptions> => (await api.get<ProfileOptions>('/specialists/profile-options')).data;
export const getReligionPublication = async (): Promise<ReligionPublication> => (await api.get<ReligionPublication>('/specialists/me/religion')).data;
export const publishReligion = async (religionCode: string, noticeVersion: string): Promise<ReligionPublication> => {
  const response = await api.put<ReligionPublication>('/specialists/me/religion', { religionCode, noticeVersion, publish: true });
  invalidateSpecialistsCache();
  return response.data;
};
export const withdrawReligion = async (): Promise<ReligionPublication> => {
  const response = await api.delete<ReligionPublication>('/specialists/me/religion');
  invalidateSpecialistsCache();
  return response.data;
};

export const saveReligionDraft = async (religionCode: string, noticeVersion: string): Promise<ReligionPublication> => {
  const response = await api.put<ReligionPublication>('/specialists/me/religion', { religionCode, noticeVersion, publish: false });
  invalidateSpecialistsCache();
  return response.data;
};
