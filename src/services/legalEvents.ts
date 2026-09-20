const listeners = new Set<() => void>();
export const notifyLegalUpdate = () => { for (const listener of listeners) listener(); };
export const subscribeLegalUpdate = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
