import api, { setAuthToken, removeAuthToken } from './api';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    userType: 'CLIENT' | 'PROFESSIONAL';
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
  } catch (error: any) {
    console.error('Registration error:', error);

    // Map error codes to Spanish messages
    if (error.response) {
      const errorCode = error.response.data?.code;
      let errorMessage = 'Error al registrarse. Intenta de nuevo';

      // Map specific error codes to user-friendly Spanish messages
      switch (errorCode) {
        case 'EMAIL_EXISTS':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Datos de registro inválidos';
          break;
        default:
          errorMessage = error.response.data?.message
            || error.response.data?.error
            || errorMessage;
      }

      const newError = new Error(errorMessage);
      (newError as any).response = error.response;
      (newError as any).code = errorCode;
      throw newError;
    } else if (error.request) {
      const newError = new Error('Error de conexión. Verifica tu internet');
      (newError as any).request = error.request;
      (newError as any).code = 'NETWORK_ERROR';
      throw newError;
    } else {
      throw new Error(error.message || 'Error al registrarse. Intenta de nuevo');
    }
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
  } catch (error: any) {
    console.error('Login error:', error);

    // Map error codes to Spanish messages
    if (error.response) {
      // Backend responded with an error
      const errorCode = error.response.data?.code;
      let errorMessage = 'Error al iniciar sesión. Intenta de nuevo';

      // Map specific error codes to user-friendly Spanish messages
      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Email o contraseña incorrectos';
          break;
        case 'EMAIL_EXISTS':
          errorMessage = 'Este email ya está registrado';
          break;
        default:
          // Use message from backend if available
          errorMessage = error.response.data?.message
            || error.response.data?.error
            || errorMessage;
      }

      const newError = new Error(errorMessage);
      (newError as any).response = error.response;
      (newError as any).code = errorCode;
      throw newError;
    } else if (error.request) {
      // Network error - request was made but no response received
      const newError = new Error('Error de conexión. Verifica tu internet');
      (newError as any).request = error.request;
      (newError as any).code = 'NETWORK_ERROR';
      throw newError;
    } else {
      // Something else happened
      throw new Error(error.message || 'Error al iniciar sesión. Intenta de nuevo');
    }
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
      };
    }

    throw new Error('Failed to get user data');
  } catch (error: any) {
    console.error('Get current user error:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await removeAuthToken();
  } catch (error) {
    console.error('Logout error:', error);
    // Don't throw on logout errors, just log them
  }
};
