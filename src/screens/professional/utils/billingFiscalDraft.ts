import type { BillingConfig } from '../../../services/billingService';

export const fiscalAddressFields = [
  { key: 'fiscalStreetAddress', label: 'Calle y número', maxLength: 240 },
  { key: 'fiscalPostalCode', label: 'Código postal', maxLength: 30 },
  { key: 'fiscalCity', label: 'Ciudad', maxLength: 100 },
  { key: 'fiscalCountry', label: 'País', maxLength: 100 },
] as const;

export function createFiscalAddressUpdate(draft: BillingConfig, saved: BillingConfig): BillingConfig {
  const editingAddress = Boolean(saved.fiscalStreetAddress) || fiscalAddressFields.some(({ key }) => draft[key]?.trim());
  if (!editingAddress) return {};
  return {
    fiscalStreetAddress: draft.fiscalStreetAddress?.trim() ?? '',
    fiscalPostalCode: draft.fiscalPostalCode?.trim() ?? '',
    fiscalCity: draft.fiscalCity?.trim() ?? '',
    fiscalCountry: draft.fiscalCountry?.trim() ?? '',
  };
}

export const createFiscalEditDraft = (
  config: BillingConfig,
  fallbackFiscalName?: string | null,
): BillingConfig => {
  const existingFiscalName = config.fiscalName?.trim();
  if (existingFiscalName) {
    return { ...config };
  }

  const fallbackName = fallbackFiscalName?.trim();
  if (!fallbackName) {
    return { ...config };
  }

  return {
    ...config,
    fiscalName: fallbackName,
  };
};
