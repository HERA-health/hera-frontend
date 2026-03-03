// PostHog Analytics Configuration
// Uses EU servers (https://eu.i.posthog.com) for GDPR compliance (Spain)

export const POSTHOG_API_KEY =  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';

export const POSTHOG_HOST = 'https://eu.i.posthog.com';

// Analytics disabled in development to avoid polluting production data
export const ANALYTICS_ENABLED = !__DEV__;
