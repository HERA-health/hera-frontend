import PostHog, { PostHogPersistedProperty } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, ANALYTICS_ENABLED } from '../config/analytics';
let client: PostHog | null = null;
let generation = 0;
export const getPostHogClient = () => client;
export const reset = (): void => {
  generation++;
  const previous = client;
  client = null;
  if (previous) {
    previous.setPersistedProperty(PostHogPersistedProperty.Queue, []);
    void previous.optOut().then(() => { previous.setPersistedProperty(PostHogPersistedProperty.Queue, []); }).catch(() => {});
  }
};
export const configureAnalytics = (enabled: boolean): void => {
  reset();
  if (!enabled || !ANALYTICS_ENABLED || !POSTHOG_API_KEY) return;
  const ownGeneration = generation;
  const next = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST, persistence: 'memory', defaultOptIn: false,
    enableSessionReplay: false, captureAppLifecycleEvents: false,
    preloadFeatureFlags: false, disableRemoteConfig: true, disableSurveys: true,
    setDefaultPersonProperties: false, disableGeoip: true, fetchRetryCount: 0,
    flushAt: 1, flushInterval: 0,
  });
  void next.optIn().then(() => {
    if (generation === ownGeneration) client = next;
    else { next.setPersistedProperty(PostHogPersistedProperty.Queue, []); void next.optOut(); }
  }).catch(() => {});
};
const events = new Set(['login_submitted', 'register_submitted', 'theme_changed']);
export const track = (event: string, _properties?: Record<string, unknown>): void => {
  if (client && events.has(event)) client.capture(event, { platform: 'mobile_web' });
};
export const trackScreen = (screen: string, _properties?: Record<string, unknown>): void => {
  if (client && ['landing', 'login', 'register'].includes(screen)) client.capture('screen_viewed', { screen });
};
