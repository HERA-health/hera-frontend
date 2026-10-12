import { api } from './api';
import { invalidateSpecialistsCache } from './specialistsService';

import type { ProfileOption } from '../utils/profileOptions';
export type { ProfileOption } from '../utils/profileOptions';
export interface ProfileOptions { languages: ProfileOption[]; religions: ProfileOption[]; religionEnabled: boolean; religionNotice: string | null; religionNoticeVersion: string | null; religionDraftNotice?: string | null; religionDraftNoticeVersion?: string | null }
export interface ReligionPublication { religionCode: string | null; religionOtherText?: string | null; hasPublication: boolean; hasDeclaration?: boolean; needsReconfirmation?: boolean }
export type {PerspectiveDraft} from '../utils/perspective';
export type PerspectiveOperation = {action: 'delete'} | {action: 'publish'; religionCode: string; religionOtherText: string | null; noticeVersion: string};

let optionsRequest: Promise<ProfileOptions> | undefined;
export const getProfileOptions = (): Promise<ProfileOptions> => {
  if (!optionsRequest) optionsRequest = api.get<ProfileOptions>('/specialists/profile-options').then(response => response.data).finally(() => {optionsRequest = undefined;});
  return optionsRequest;
};
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
