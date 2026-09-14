// Keep open views in sync after the backend has persisted an acceptance.
const listeners = new Set<(termsId: string) => void>();

export function subscribeCommissionAcceptance(listener: (termsId: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyCommissionAcceptance(termsId: string) {
  listeners.forEach(listener => listener(termsId));
}
