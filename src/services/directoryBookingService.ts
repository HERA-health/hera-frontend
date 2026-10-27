// Direct links work in new tabs and without cookies. The verified booking
// channel establishes origin without a database write to view each profile.
export const directoryEntryHref = (profileRef: string, optionId?: string) =>
  `/especialista/${encodeURIComponent(profileRef)}${optionId ? `?optionId=${encodeURIComponent(optionId)}` : ''}`;
