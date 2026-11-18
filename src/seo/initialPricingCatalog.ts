import { catalogSchema, type SubscriptionCatalog } from './subscriptionCatalog';

type InitialCatalog = {
  started: number;
  data?: unknown;
  result: Promise<{ ok: true; data: unknown } | { ok: false }>;
};

declare global {
  interface Window { heraInitialPricingCatalog?: InitialCatalog }
}

/** The export runs this self-contained function while the application downloads. */
export function startPricingCatalog(url: string): void {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const result: InitialCatalog['result'] = fetch(url, {
    credentials: 'include', headers: { Accept: 'application/json' }, signal: controller.signal,
  }).then(async response => {
    if (!response.ok) return { ok: false as const };
    const data: unknown = await response.json();
    if (window.heraInitialPricingCatalog === initial) initial.data = data;
    return { ok: true as const, data };
  }).catch(() => ({ ok: false as const })).finally(() => clearTimeout(timeout));
  const initial: InitialCatalog = { started: Date.now(), result };
  window.heraInitialPricingCatalog = initial;
}

export function readInitialPricingCatalog(): SubscriptionCatalog | null {
  if (typeof window === 'undefined') return null;
  const initial = window.heraInitialPricingCatalog;
  if (!initial?.data || Date.now() - initial.started > 15000) return null;
  const parsed = catalogSchema.safeParse(initial.data);
  return parsed.success ? parsed.data : null;
}

export function takeInitialPricingCatalog(): Promise<SubscriptionCatalog> | undefined {
  if (typeof window === 'undefined') return;
  const initial = window.heraInitialPricingCatalog;
  delete window.heraInitialPricingCatalog;
  if (!initial || Date.now() - initial.started > 15000) return;
  return initial.result.then(response => {
    if (!response.ok) throw new Error('No hemos podido cargar los planes. Vuelve a intentarlo.');
    return catalogSchema.parse(response.data);
  });
}
