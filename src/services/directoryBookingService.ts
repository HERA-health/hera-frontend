import getEnvVars from '../config/api';

// Native browser navigation (new tab, context menu, keyboard) must enter through
// the server too. It creates the same verified intent as an ordinary app click.
export const directoryEntryHref = (profileRef: string, optionId?: string) =>
  `${getEnvVars().apiUrl.replace(/\/$/, '')}/hera-commissions/directory-entry/${encodeURIComponent(profileRef)}${optionId ? `?optionId=${encodeURIComponent(optionId)}` : ''}`;
