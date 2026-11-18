import { Platform } from 'react-native';
import type PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from '../config/analytics';
let client: PostHog | null = null;
let generation = 0;
let stopClient: (() => void) | undefined;
export const getPostHogClient = () => client;
export const reset = (): void => {
  generation++;
  client = null;
  stopClient?.();
  stopClient = undefined;
};
export const configureAnalytics = async (enabled: boolean): Promise<void> => {
  reset();
  if (!enabled || !ANALYTICS_ENABLED || !POSTHOG_API_KEY) return;
  const ownGeneration = generation;
  try {
    const sdk: typeof import('posthog-react-native') = Platform.OS === 'web'
      ? await import('posthog-react-native')
      : require('posthog-react-native');
    const { default: AnalyticsClient, PostHogPersistedProperty } = sdk;
    if (generation !== ownGeneration) return;
    const next = new AnalyticsClient(POSTHOG_API_KEY, {
      host: POSTHOG_HOST, persistence: 'memory', defaultOptIn: false,
      enableSessionReplay: false, captureAppLifecycleEvents: false,
      preloadFeatureFlags: false, disableRemoteConfig: true, disableSurveys: true,
      setDefaultPersonProperties: false, disableGeoip: true, fetchRetryCount: 0,
      flushAt: 1, flushInterval: 0,
    });
    const stop = () => {
      next.setPersistedProperty(PostHogPersistedProperty.Queue, []);
      void next.optOut().then(() => next.setPersistedProperty(PostHogPersistedProperty.Queue, [])).catch(() => {});
    };
    await next.optIn();
    if (generation === ownGeneration) {
      client = next;
      stopClient = stop;
    } else {
      stop();
    }
  } catch {
    // Optional telemetry stays disabled when the SDK or opt-in cannot load.
  }
};
const events = new Set(['login_submitted', 'register_submitted', 'theme_changed']);
export const track = (event: string, _properties?: Record<string, unknown>): void => {
  if (client && events.has(event)) client.capture(event, { platform: 'mobile_web' });
};
export const trackScreen = (screen: string, _properties?: Record<string, unknown>): void => {
  if (client && ['landing', 'login', 'register'].includes(screen)) client.capture('screen_viewed', { screen });
};
