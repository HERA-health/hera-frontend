const DEFAULT_DEV_API_URL = 'http://localhost:3000/api';
const DEFAULT_PROD_API_URL = 'https://api.health-hera.com/api';

const readEnvUrl = (key: string, fallback: string): string => {
  const rawValue = process.env[key];
  if (typeof rawValue !== 'string') {
    return fallback;
  }

  const value = rawValue.trim();
  return value.length > 0 ? value : fallback;
};

const ENV = {
  dev: {
    apiUrl: readEnvUrl('EXPO_PUBLIC_API_URL_DEV', DEFAULT_DEV_API_URL),
  },
  prod: {
    apiUrl: readEnvUrl('EXPO_PUBLIC_API_URL', DEFAULT_PROD_API_URL),
  },
};

const isLocalWebHostname = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const getEnvVars = () => {
  if (typeof window !== 'undefined') {
    return isLocalWebHostname(window.location.hostname) ? ENV.dev : ENV.prod;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  return isDev ? ENV.dev : ENV.prod;
};

export default getEnvVars;

/**
 * Returns the web app base URL (no trailing slash).
 * Web: uses current origin. Mobile: hardcoded production URL.
 */
export const getWebAppUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://www.health-hera.com';
};
