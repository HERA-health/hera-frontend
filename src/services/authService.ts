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
    throw error;
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

    // Provide user-friendly error messages
    if (error.message.includes('Invalid email or password')) {
      throw new Error('Email o contraseña incorrectos');
    }

    if (error.message.includes('Network error')) {
      throw new Error('Error de conexión. Verifica tu internet');
    }

    throw new Error('Error al iniciar sesión. Intenta de nuevo');
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
