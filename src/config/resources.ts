// Expo inlines this publication gate at build time. Administration stays available.
// This controls navigation only; backend authorization remains authoritative.
export const RESOURCES_VISIBLE =
  process.env.EXPO_PUBLIC_RESOURCES_RELEASED === 'true' ||
  (__DEV__ && process.env.EXPO_PUBLIC_RESOURCES_RELEASED !== 'false');
