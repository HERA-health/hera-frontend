import api, { logoutServerSession, setAuthSession } from './api';
import { getErrorMessage, hasResponseData } from '../constants/errors';
import { invalidateSpecialistsCache } from './specialistsService';
import { buildImageFormData, type UploadAsset } from '../utils/multipartUpload';
import { clearPersistedClinicalAccessSession } from './secureSessionStorage';

export interface AuthResponse {
  token: string;
  refreshToken: string;
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
    emailVerified?: boolean;
    isAdmin?: boolean;
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
      const { token, refreshToken, user } = response.data.data;
      await setAuthSession(token, refreshToken);
      return { token, refreshToken, user };
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
      const { token, refreshToken, user } = response.data.data;
      await setAuthSession(token, refreshToken);
      return { token, refreshToken, user };
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
        emailVerified: response.data.data.emailVerified,
        isAdmin: response.data.data.isAdmin,
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
    await logoutServerSession();
    await clearPersistedClinicalAccessSession();
    invalidateSpecialistsCache();
  } catch (_error: unknown) {
    await clearPersistedClinicalAccessSession();
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
        emailVerified: response.data.data.emailVerified,
      };
    }

    throw new Error('Failed to update profile');
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Error al actualizar perfil'));
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Send verification email to user
 */
export const sendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      '/auth/verify-email/send',
      { email }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Correo de verificación enviado',
      };
    }

    throw new Error('Error al enviar correo de verificación');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al enviar correo de verificación';

      switch (errorCode) {
        case 'EMAIL_NOT_FOUND':
          errorMessage = 'No existe una cuenta con este correo electrónico';
          break;
        case 'ALREADY_VERIFIED':
          errorMessage = 'Este correo ya ha sido verificado';
          break;
        case 'RATE_LIMIT':
          errorMessage = 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al enviar correo de verificación'));
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.get<{ success: boolean; message: string }>(
      `/auth/verify-email/${token}`
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Correo verificado correctamente',
      };
    }

    throw new Error('Error al verificar correo');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al verificar correo';

      switch (errorCode) {
        case 'TOKEN_INVALID':
          errorMessage = 'El enlace de verificación no es válido';
          break;
        case 'TOKEN_EXPIRED':
          errorMessage = 'El enlace de verificación ha expirado. Solicita uno nuevo';
          break;
        case 'TOKEN_ALREADY_USED':
          errorMessage = 'Este enlace ya ha sido utilizado';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al verificar correo'));
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      '/auth/verify-email/resend',
      { email }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Correo de verificación reenviado',
      };
    }

    throw new Error('Error al reenviar correo de verificación');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al reenviar correo de verificación';

      switch (errorCode) {
        case 'EMAIL_NOT_FOUND':
          errorMessage = 'No existe una cuenta con este correo electrónico';
          break;
        case 'ALREADY_VERIFIED':
          errorMessage = 'Este correo ya ha sido verificado';
          break;
        case 'RATE_LIMIT':
          errorMessage = 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al reenviar correo de verificación'));
  }
};

// ============================================================================
// AVATAR UPLOAD
// ============================================================================

/**
 * Upload user avatar
 */
export const uploadAvatar = async (image: UploadAsset): Promise<AuthResponse['user']> => {
  try {
    const formData = await buildImageFormData('image', image, {}, 'avatar');
    const response = await api.post<{ success: boolean; data: AuthResponse['user']; message?: string }>(
      '/auth/upload-avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

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
        emailVerified: response.data.data.emailVerified,
      };
    }

    throw new Error('Error al subir la foto de perfil');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al subir la foto de perfil';

      switch (errorCode) {
        case 'UPLOAD_FAILED':
          errorMessage = error.response.data?.message || 'Error al procesar la imagen';
          break;
        case 'UNAUTHORIZED':
          errorMessage = 'Debes iniciar sesión para subir una foto';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al subir la foto de perfil'));
  }
};

// ============================================================================
// PASSWORD RECOVERY
// ============================================================================

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      '/auth/password-reset/request',
      { email }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Correo de recuperación enviado',
      };
    }

    throw new Error('Error al solicitar recuperación de contraseña');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al solicitar recuperación de contraseña';

      switch (errorCode) {
        case 'EMAIL_NOT_FOUND':
          errorMessage = 'No existe una cuenta con este correo electrónico';
          break;
        case 'RATE_LIMIT':
          errorMessage = 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al solicitar recuperación de contraseña'));
  }
};

/**
 * Validate password reset token
 */
export const validateResetToken = async (token: string): Promise<{ valid: boolean; email?: string }> => {
  try {
    const response = await api.get<{ success: boolean; valid: boolean; email?: string }>(
      `/auth/password-reset/validate-token/${token}`
    );

    if (response.data.success) {
      return {
        valid: response.data.valid,
        email: response.data.email,
      };
    }

    return { valid: false };
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;

      switch (errorCode) {
        case 'TOKEN_INVALID':
        case 'TOKEN_EXPIRED':
        case 'TOKEN_ALREADY_USED':
          return { valid: false };
      }
    }

    throw new Error(getErrorMessage(error, 'Error al validar enlace de recuperación'));
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      '/auth/password-reset/verify',
      { token, newPassword }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Contraseña actualizada correctamente',
      };
    }

    throw new Error('Error al restablecer contraseña');
  } catch (error: unknown) {
    if (hasResponseData(error)) {
      const errorCode = error.response.data?.code as string | undefined;
      let errorMessage = 'Error al restablecer contraseña';

      switch (errorCode) {
        case 'TOKEN_INVALID':
          errorMessage = 'El enlace de recuperación no es válido';
          break;
        case 'TOKEN_EXPIRED':
          errorMessage = 'El enlace de recuperación ha expirado. Solicita uno nuevo';
          break;
        case 'TOKEN_ALREADY_USED':
          errorMessage = 'Este enlace ya ha sido utilizado';
          break;
        case 'WEAK_PASSWORD':
          errorMessage = 'La contraseña no cumple con los requisitos mínimos';
          break;
        default:
          errorMessage = getErrorMessage(error, errorMessage);
      }

      throw new Error(errorMessage);
    }

    throw new Error(getErrorMessage(error, 'Error al restablecer contraseña'));
  }
};
