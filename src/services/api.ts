import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import getEnvVars from '../config/api';
import {
  clearPersistedRefreshToken,
  getPersistedRefreshToken,
  persistRefreshToken,
} from './secureSessionStorage';

const { apiUrl } = getEnvVars();
const API_BASE_URL = apiUrl;
const API_DEBUG_LOGGING_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_API === 'true';
const IS_WEB_PLATFORM = Platform.OS === 'web';

const logApiDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!API_DEBUG_LOGGING_ENABLED) {
    return;
  }

  if (meta) {
    console.log(`[api] ${message}`, meta);
    return;
  }

  console.log(`[api] ${message}`);
};

const buildSessionExpiredError = (): Error & { code: string } => {
  const error = new Error('Tu sesión ha expirado. Inicia sesión de nuevo') as Error & {
    code: string;
  };
  error.code = 'SESSION_EXPIRED';
  return error;
};

const buildNetworkError = (): Error & { code: string } => {
  const error = new Error('Error de conexión. Verifica tu internet') as Error & {
    code: string;
  };
  error.code = 'NETWORK_ERROR';
  return error;
};

const buildTimeoutError = (): Error & { code: string } => {
  const error = new Error(
    'La solicitud ha tardado demasiado en completarse. Intenta de nuevo en unos segundos.'
  ) as Error & {
    code: string;
  };
  error.code = 'REQUEST_TIMEOUT';
  return error;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: IS_WEB_PLATFORM,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: IS_WEB_PLATFORM,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isAuthEndpoint = (url = ''): boolean =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout');

const setAuthorizationHeader = (
  config: InternalAxiosRequestConfig,
  token: string
): InternalAxiosRequestConfig => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;

  return config;
};

const clearAuthorizationHeader = (
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig => {
  if (!config.headers) {
    return config;
  }

  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
  headers.delete('Authorization');
  config.headers = headers;

  return config;
};

const normalizeMultipartHeaders = (
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig => {
  if (typeof FormData === 'undefined' || !(config.data instanceof FormData)) {
    return config;
  }

  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);

  // Let the runtime set the multipart boundary instead of inheriting the JSON default.
  headers.delete('Content-Type');
  config.headers = headers;

  return config;
};

const clearAccessToken = () => {
  accessToken = null;
};

export const setAuthSession = async (token: string, refreshToken: string): Promise<void> => {
  if (IS_WEB_PLATFORM) {
    clearAccessToken();
    await clearPersistedRefreshToken();
    return;
  }

  accessToken = token;
  await persistRefreshToken(refreshToken);
};

export const clearAuthSession = async (): Promise<void> => {
  clearAccessToken();
  await clearPersistedRefreshToken();
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = IS_WEB_PLATFORM ? null : await getPersistedRefreshToken();

      if (!IS_WEB_PLATFORM && !refreshToken) {
        await clearAuthSession();
        return null;
      }

      const response = await publicApi.post<{
        success: boolean;
        data?: { token: string; refreshToken: string };
      }>(
        '/auth/refresh',
        IS_WEB_PLATFORM ? {} : { refreshToken }
      );

      if (!response.data.success || !response.data.data) {
        await clearAuthSession();
        return null;
      }

      await setAuthSession(response.data.data.token, response.data.data.refreshToken);
      return response.data.data.token;
    } catch {
      await clearAuthSession();
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const initializeAuth = async (): Promise<string | null> => refreshAccessToken();

export const registerSessionExpiredHandler = (handler: (() => void) | null): void => {
  sessionExpiredHandler = handler;
};

export const logoutServerSession = async (): Promise<void> => {
  try {
    if (IS_WEB_PLATFORM) {
      await publicApi.post('/auth/logout', {});
    } else {
      const refreshToken = await getPersistedRefreshToken();
      if (refreshToken) {
        await publicApi.post('/auth/logout', { refreshToken });
      }
    }
  } catch {
    // Ignore logout transport errors and clear local session regardless.
  } finally {
    await clearAuthSession();
  }
};

api.interceptors.request.use(
  (config) => {
    if (!IS_WEB_PLATFORM && accessToken) {
      setAuthorizationHeader(config, accessToken);
    } else if (IS_WEB_PLATFORM) {
      clearAuthorizationHeader(config);
    }

    normalizeMultipartHeaders(config);

    logApiDebug('request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasBody: config.data !== undefined,
    });

    return config;
  },
  (error) => {
    if (API_DEBUG_LOGGING_ENABLED) {
      console.error('[api] request error', error);
    }

    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    logApiDebug('response', {
      status: response.status,
      url: response.config.url,
    });

    return response;
  },
  async (error: AxiosError) => {
    if (API_DEBUG_LOGGING_ENABLED) {
      console.error('[api] response error', {
        status: error.response?.status,
        url: error.config?.url,
      });
    }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(buildTimeoutError());
      }

      return Promise.reject(buildNetworkError());
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | null;

    if (
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;
      const nextToken = await refreshAccessToken();

      if (nextToken) {
        if (!IS_WEB_PLATFORM) {
          setAuthorizationHeader(originalRequest, nextToken);
        } else {
          clearAuthorizationHeader(originalRequest);
        }
        return api(originalRequest);
      }

      sessionExpiredHandler?.();
      return Promise.reject(buildSessionExpiredError());
    }

    return Promise.reject(error);
  }
);

export default api;
