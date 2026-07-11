import type {
  ProfileCompletionCode,
  ProfileCompletionItem,
  ProfileCompletionSnapshot,
} from '../../../services/profileCompletionService';
import type { SidebarNotice, SidebarNoticeMap } from './types';

const CODE_PRIORITY: Record<ProfileCompletionCode, number> = {
  PROFESSIONAL_INSURANCE: 0,
  PROFESSIONAL_VERIFICATION: 1,
  PROFILE_IDENTITY: 2,
  PROFILE_BIO: 3,
  PROFILE_MODALITY: 4,
  PROFILE_LOCATION: 5,
  PROFILE_MATCHING: 6,
  PROFESSIONAL_BILLING: 7,
  CLINIC_CONTACT: 8,
  CLINIC_BILLING: 9,
};

const LABELS: Record<ProfileCompletionCode, { action: string; waiting: string }> = {
  PROFILE_IDENTITY: { action: 'Completa tu identidad', waiting: 'Identidad en revisión' },
  PROFILE_BIO: {
    action: 'Completa tu descripción profesional',
    waiting: 'Descripción en revisión',
  },
  PROFILE_MATCHING: { action: 'Añade especialidades', waiting: 'Especialidades en revisión' },
  PROFILE_MODALITY: { action: 'Elige una modalidad', waiting: 'Modalidad en revisión' },
  PROFILE_LOCATION: { action: 'Completa tu ubicación', waiting: 'Ubicación en revisión' },
  PROFESSIONAL_VERIFICATION: {
    action: 'Completa la verificación',
    waiting: 'Verificación en revisión',
  },
  PROFESSIONAL_INSURANCE: { action: 'Falta seguro RC', waiting: 'Seguro en revisión' },
  PROFESSIONAL_BILLING: { action: 'Completa datos fiscales', waiting: 'Datos en revisión' },
  CLINIC_CONTACT: { action: 'Completa datos de contacto', waiting: 'Datos en revisión' },
  CLINIC_BILLING: { action: 'Completa datos fiscales', waiting: 'Datos en revisión' },
};

const getNoticeTone = (item: ProfileCompletionItem): SidebarNotice['tone'] => {
  if (item.severity === 'CRITICAL') return 'critical';
  if (item.state === 'WAITING_REVIEW') return 'info';
  return 'warning';
};

const getItemRank = (item: ProfileCompletionItem): number => {
  const stateRank = item.severity === 'CRITICAL'
    ? 0
    : item.state === 'ACTION_REQUIRED'
      ? 100
      : 200;
  return stateRank + CODE_PRIORITY[item.code];
};

const getTarget = (code: ProfileCompletionCode): SidebarNotice['target'] => {
  switch (code) {
    case 'PROFILE_IDENTITY':
      return { route: 'ProfessionalProfile', params: { initialTab: 'information', initialSection: 'identity' } };
    case 'PROFILE_BIO':
      return { route: 'ProfessionalProfile', params: { initialTab: 'information', initialSection: 'bio' } };
    case 'PROFILE_MATCHING':
      return { route: 'ProfessionalProfile', params: { initialTab: 'information', initialSection: 'matching' } };
    case 'PROFILE_MODALITY':
      return { route: 'ProfessionalProfile', params: { initialTab: 'information', initialSection: 'modality' } };
    case 'PROFILE_LOCATION':
      return { route: 'ProfessionalProfile', params: { initialTab: 'information', initialSection: 'location' } };
    case 'PROFESSIONAL_VERIFICATION':
      return { route: 'ProfessionalProfile', params: { initialTab: 'credentials', initialSection: 'verification' } };
    case 'PROFESSIONAL_INSURANCE':
      return { route: 'ProfessionalProfile', params: { initialTab: 'credentials', initialSection: 'insurance' } };
    case 'PROFESSIONAL_BILLING':
      return { route: 'ProfessionalBilling', params: { initialSection: 'fiscal' } };
    case 'CLINIC_CONTACT':
      return { route: 'ClinicSettings', params: { initialSection: 'contact' } };
    case 'CLINIC_BILLING':
      return { route: 'ClinicBilling', params: { initialSection: 'config' } };
  }
};

const buildNotice = (items: ProfileCompletionItem[]): SidebarNotice | undefined => {
  if (items.length === 0) return undefined;

  const sortedItems = [...items].sort((left, right) => getItemRank(left) - getItemRank(right));
  const primary = sortedItems[0];
  const baseLabel = primary.state === 'WAITING_REVIEW'
    ? LABELS[primary.code].waiting
    : LABELS[primary.code].action;
  const additionalCount = items.length - 1;

  return {
    code: primary.code,
    label: additionalCount > 0 ? `${baseLabel} · +${additionalCount}` : baseLabel,
    tone: getNoticeTone(primary),
    count: items.length,
    target: getTarget(primary.code),
  };
};

export const buildSidebarCompletionNotices = (
  snapshot: ProfileCompletionSnapshot | null
): SidebarNoticeMap => {
  if (!snapshot) return {};

  if (snapshot.role === 'PROFESSIONAL') {
    const profileItems = snapshot.items.filter((item) => item.code !== 'PROFESSIONAL_BILLING');
    const billingItems = snapshot.items.filter((item) => item.code === 'PROFESSIONAL_BILLING');
    const profileNotice = buildNotice(profileItems);
    const billingNotice = buildNotice(billingItems);

    return {
      ...(profileNotice ? { profile: profileNotice } : {}),
      ...(billingNotice ? { billing: billingNotice } : {}),
    };
  }

  const settingsNotice = buildNotice(
    snapshot.items.filter((item) => item.code === 'CLINIC_CONTACT')
  );
  const billingNotice = buildNotice(
    snapshot.items.filter((item) => item.code === 'CLINIC_BILLING')
  );

  return {
    ...(settingsNotice ? { 'clinic-settings': settingsNotice } : {}),
    ...(billingNotice ? { 'clinic-billing': billingNotice } : {}),
  };
};
