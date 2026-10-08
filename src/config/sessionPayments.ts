// Expo inlines this value at build time. Production builds hide payments by default.
// Backend release controls remain authoritative even if an old client exposes a link.
export const SESSION_PAYMENTS_VISIBLE =
  process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED === 'true' ||
  (__DEV__ && process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED !== 'false');
