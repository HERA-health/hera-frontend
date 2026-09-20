const mockCapture = jest.fn();
const mockQueue = jest.fn();
const mockOptOut = jest.fn().mockResolvedValue(undefined);
const mockConstructor = jest.fn();
jest.mock('../../config/analytics', () => ({ POSTHOG_API_KEY: 'test', POSTHOG_HOST: 'https://example.invalid', ANALYTICS_ENABLED: true }));
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  PostHogPersistedProperty: { Queue: 'queue' },
  default: jest.fn().mockImplementation((...args) => { mockConstructor(...args); return { optIn: () => Promise.resolve(), optOut: mockOptOut, capture: mockCapture, setPersistedProperty: mockQueue }; }),
}));
import { configureAnalytics, reset, track, trackScreen } from '../analyticsService';
beforeEach(() => { reset(); jest.clearAllMocks(); });
test('does not initialize or send analytics without explicit consent', () => {
  configureAnalytics(false); track('login_submitted'); trackScreen('login');
  expect(mockConstructor).not.toHaveBeenCalled(); expect(mockCapture).not.toHaveBeenCalled();
});
test('consented telemetry strips arbitrary properties and excludes sensitive events', async () => {
  configureAnalytics(true); await Promise.resolve();
  track('session_booked', { clientId: 'patient', price: 80 });
  trackScreen('clinical');
  expect(mockCapture).not.toHaveBeenCalled();
  track('login_submitted', { email: 'private@example.invalid', token: 'secret' });
  expect(mockCapture).toHaveBeenCalledWith('login_submitted', { platform: 'mobile_web' });
  expect(mockConstructor.mock.calls[0][1]).toMatchObject({ persistence: 'memory', captureAppLifecycleEvents: false, enableSessionReplay: false, disableRemoteConfig: true });
});
test('withdrawal clears pending events and stops capture; delayed opt-in cannot revive it', async () => {
  configureAnalytics(true); await Promise.resolve();
  configureAnalytics(false); track('login_submitted');
  expect(mockQueue).toHaveBeenCalledWith('queue', []); expect(mockOptOut).toHaveBeenCalled();
  expect(mockCapture).not.toHaveBeenCalled();
  configureAnalytics(true); reset(); await Promise.resolve(); track('login_submitted');
  expect(mockCapture).not.toHaveBeenCalled();
});
