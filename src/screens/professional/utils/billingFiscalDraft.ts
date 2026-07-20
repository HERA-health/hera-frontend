import type { BillingConfig } from '../../../services/billingService';

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
