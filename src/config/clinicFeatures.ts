const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const readBooleanFlag = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return undefined;
};

export const isClinicAuthEntryEnabled = (): boolean => {
  const explicitFlag = readBooleanFlag(process.env.EXPO_PUBLIC_ENABLE_CLINIC_AUTH_ENTRY);

  if (explicitFlag !== undefined) {
    return explicitFlag;
  }

  return false;
};
