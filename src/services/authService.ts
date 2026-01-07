import api, { setAuthToken, removeAuthToken } from './api';
import { getErrorMessage, hasResponseData } from '../constants/errors';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    userType: 'CLIENT' | 'PROFESSIONAL';
    phone?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    occupation?: string | null;
    avatar?: string | null;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  userType: 'CLIENT' | 'PROFESSIONAL';
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post<{ success: boolean; data: AuthResponse }>(
      '/auth/register',
      data
    );

    if (response.data.success && response.data.data) {
      const { token, user } = response.data.data;
      await setAuthToken(token);
      return { token, user };
    }

    throw new Error('Registration failed');
  } catch (error: unknown) {
    // Map error codes to Spanish messages
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al registrarse. Intenta de nuevo';

      switch (errorCode) {
        case 'EMAIL_EXISTS':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Datos de registro inválidos';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al registrarse. Intenta de nuevo'));
  }
};

/**
 * Login a user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await api.post<{ success: boolean; data: AuthResponse }>(
      '/auth/login',
      data
    );

    if (response.data.success && response.data.data) {
      const { token, user } = response.data.data;
      await setAuthToken(token);
      return { token, user };
    }

    throw new Error('Login failed');
  } catch (error: unknown) {
    // Map error codes to Spanish messages
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al iniciar sesión. Intenta de nuevo';

      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Email o contraseña incorrectos';
          break;
        case 'EMAIL_EXISTS':
          errorMessage = 'Este email ya está registrado';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al iniciar sesión. Intenta de nuevo'));
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/auth/me');

    if (response.data.success && response.data.data) {
      return {
        id: response.data.data.id,
        email: response.data.data.email,
        name: response.data.data.name,
        userType: response.data.data.userType,
        phone: response.data.data.phone,
        birthDate: response.data.data.birthDate,
        gender: response.data.data.gender,
        occupation: response.data.data.occupation,
        avatar: response.data.data.avatar,
      };
    }

    throw new Error('Failed to get user data');
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al obtener datos del usuario'));
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await removeAuthToken();
  } catch (_error: unknown) {
    // Silently fail on logout errors - user should still be logged out locally
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (data: {
  name?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  occupation?: string;
}): Promise<AuthResponse['user']> => {
  try {
    const response = await api.put<{ success: boolean; data: any }>('/auth/profile', data);

    if (response.data.success && response.data.data) {
      return {
        id: response.data.data.id,
        email: response.data.data.email,
        name: response.data.data.name,
        userType: response.data.data.userType,
        phone: response.data.data.phone,
        birthDate: response.data.data.birthDate,
        gender: response.data.data.gender,
        occupation: response.data.data.occupation,
        avatar: response.data.data.avatar,
      };
    }

    throw new Error('Failed to update profile');
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al actualizar perfil'));
  }
};
