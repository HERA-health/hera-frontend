import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getEnvVars from '../config/api';

// Get API URL based on environment
const { apiUrl } = getEnvVars();
const API_BASE_URL = apiUrl;

// Storage key for the auth token
const TOKEN_KEY = '@hera_token';

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
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
    delete api.defaults.headers.common['Authorization'];
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
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const url = error.config?.url || '';

      // Handle 401 Unauthorized
      if (status === 401) {
        // Check if this is a login/register request
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

        if (isAuthEndpoint) {
          // For login/register, pass through the original error without modification
          return Promise.reject(error);
        } else {
          // For other endpoints, it's a session expiration
          await removeAuthToken();
          const sessionError = new Error('Tu sesión ha expirado. Inicia sesión de nuevo');
          (sessionError as Error & { code: string }).code = 'SESSION_EXPIRED';
          return Promise.reject(sessionError);
        }
      }

      // For other errors, pass through the original error
      return Promise.reject(error);
    } else if (error.request) {
      // Request made but no response received (network error)
      const networkError = new Error('Error de conexión. Verifica tu internet');
      (networkError as Error & { code: string }).code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    } else {
      // Something else happened
      return Promise.reject(new Error('Error inesperado. Intenta de nuevo'));
    }
  }
);

export default api;
