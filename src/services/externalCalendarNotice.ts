import { externalCalendarVerificationSchema, calendarVerificationNeedsAttention } from './externalCalendarContracts';

type Notice = { selection: boolean; result: boolean };
let notice: Notice = { selection: false, result: false };
let sequence = 0;
let latestSelection = 0;
const listeners = new Set<() => void>();
const requests = new WeakMap<object, { sequence: number; selection: boolean }>();
const publish = (next: Notice) => { notice = next; listeners.forEach(listener => listener()); };
export const subscribeExternalCalendarNotice = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getExternalCalendarNotice = () => notice;
export const clearExternalCalendarNotice = () => { latestSelection = ++sequence; publish({ selection: false, result: false }); };
export const dismissExternalCalendarResult = () => publish({ ...notice, result: false });
export function beginExternalCalendarRequest(config: object, url?: string) {
  if (!url || !/available-slots|managed-slot-options|slot-options/.test(url)) return;
  latestSelection = ++sequence;
  requests.set(config, { sequence: latestSelection, selection: true });
  publish({ ...notice, selection: false });
}
export function receiveExternalCalendarNotice(config: object, body: unknown, method?: string) {
  if (!body || typeof body !== 'object') return;
  const data = 'data' in body ? body.data : body;
  if (!data || typeof data !== 'object' || !('externalCalendarVerification' in data)) return;
  const parsed = externalCalendarVerificationSchema.safeParse(data.externalCalendarVerification);
  if (!parsed.success) return;
  const needsAttention = calendarVerificationNeedsAttention(parsed.data);
  const request = requests.get(config);
  if (request?.selection && request.sequence === latestSelection) publish({ ...notice, selection: needsAttention });
  else if (method && ['post', 'put', 'patch'].includes(method.toLowerCase()) && needsAttention) publish({ ...notice, result: true });
}
