import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from '../config/analytics';

let posthogClient: PostHog | null = null;

/**
 * Get or initialize the PostHog client singleton.
 * Returns null if analytics are disabled.
 */
export const getPostHogClient = (): PostHog | null => {
  if (!ANALYTICS_ENABLED) return null;
  return posthogClient;
};

/**
 * Set the PostHog client reference (called from PostHogProvider's onReady or initialization).
 */
export const setPostHogClient = (client: PostHog): void => {
  posthogClient = client;
};

/**
 * Identify a user for analytics. Links future events to this user.
 */
export const identify = (
  userId: string,
  properties: { userType: string; emailVerified: boolean }
): void => {
  try {
    if (!ANALYTICS_ENABLED) return;
    const client = posthogClient;
    if (!client) return;

    client.identify(userId, properties);
  } catch {
    // silently ignore analytics errors
  }
};

/**
 * Reset user identity on logout. Clears stored user data.
 */
export const reset = (): void => {
  try {
    if (!ANALYTICS_ENABLED) return;
    const client = posthogClient;
    if (!client) return;

    client.reset();
  } catch {
    // silently ignore analytics errors
  }
};

/**
 * Track a custom event.
 */
export const track = (
  event: string,
  properties?: Record<string, unknown>
): void => {
  try {
    if (!ANALYTICS_ENABLED) return;
    const client = posthogClient;
    if (!client) return;

    client.capture(event, {
      ...properties,
      platform: 'mobile_web',
      timestamp: new Date().toISOString(),
    });
  } catch {
    // silently ignore analytics errors
  }
};

/**
 * Track a screen view event.
 */
export const trackScreen = (
  screenName: string,
  properties?: Record<string, unknown>
): void => {
  track('screen_viewed', { screen: screenName, ...properties });
};
