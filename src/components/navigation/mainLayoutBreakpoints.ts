export const isLargeScreenForRole = (
  windowWidth: number,
  isProfessional: boolean,
): boolean => windowWidth >= (isProfessional ? 1040 : 768);
