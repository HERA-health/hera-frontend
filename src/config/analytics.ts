// PostHog Analytics Configuration
// Uses EU servers (https://eu.i.posthog.com) for GDPR compliance (Spain)

export const POSTHOG_API_KEY =  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';

export const POSTHOG_HOST = 'https://eu.i.posthog.com';

// Analytics remain opt-in until the product exposes the corresponding
// consent surface. Production alone is not a sufficient legal basis.
export const ANALYTICS_ENABLED =
  !__DEV__ && process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
