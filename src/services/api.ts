import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getEnvVars from '../config/api';

// Get API URL based on environment
const { apiUrl } = getEnvVars();
const API_BASE_URL = apiUrl;

// Storage key for the auth token
const TOKEN_KEY = '@hera_token';
const API_DEBUG_LOGGING_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_API === 'true';

const logApiDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!API_DEBUG_LOGGING_ENABLED) return;

  if (meta) {
    console.log(`[api] ${message}`, meta);
    return;
  }

  console.log(`[api] ${message}`);
};

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Set authentication token in AsyncStorage and axios headers
 */
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } catch (_error: unknown) {
    throw new Error('Failed to save authentication token');
  }
};

/**
 * Remove authentication token from AsyncStorage and axios headers
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  } catch (_error: unknown) {
    // Silently fail - user should still be logged out locally
  }
};

/**
 * Get stored token from AsyncStorage
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (_error: unknown) {
    return null;
  }
};

/**
 * Initialize authentication by loading stored token
 */
export const initializeAuth = async (): Promise<string | null> => {
  try {
    const token = await getStoredToken();
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      return token;
    }
    return null;
  } catch (_error: unknown) {
    return null;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    logApiDebug('response', {
      status: response.status,
      url: response.config.url,
    });

    return response;
  },
  async (error) => {
    if (API_DEBUG_LOGGING_ENABLED) {
      console.error('[api] response error', {
        status: error.response?.status,
        url: error.config?.url,
      });
    }

    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';

      if (status === 401) {
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

        if (isAuthEndpoint) {
          return Promise.reject(error);
        }

        await removeAuthToken();
        const sessionError = new Error('Tu sesión ha expirado. Inicia sesión de nuevo');
        (sessionError as Error & { code: string }).code = 'SESSION_EXPIRED';
        return Promise.reject(sessionError);
      }

      return Promise.reject(error);
    }

    if (error.request) {
      const networkError = new Error('Error de conexión. Verifica tu internet');
      (networkError as Error & { code: string }).code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    }

    return Promise.reject(new Error('Error inesperado. Intenta de nuevo'));
  }
);

export default api;
