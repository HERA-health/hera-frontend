import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import * as authService from '../services/authService';
import * as professionalService from '../services/professionalService';
import { initializeAuth } from '../services/api';
import { getErrorMessage } from '../constants/errors';
import * as analyticsService from '../services/analyticsService';
import type { AuthResponse } from '../services/authService';

export type UserType = 'client' | 'professional';

interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
  phone?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  occupation?: string | null;
  avatar?: string | null;
  emailVerified?: boolean;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
  /** Whether a professional has submitted their verification data (colegiado + DNI) */
  verificationSubmitted: boolean | null;
  /** Mark verification as submitted (called after successful submission) */
  markVerificationSubmitted: () => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string, userType: UserType) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUserType: (type: UserType) => void;
  updateUser: (updates: Partial<User>) => void;
  refreshCurrentUser: () => Promise<User | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapAuthUser = (userData: AuthResponse['user']): User => {
  const userType: UserType = userData.userType === 'CLIENT' ? 'client' : 'professional';

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    type: userType,
    phone: userData.phone,
    birthDate: userData.birthDate ? new Date(userData.birthDate) : null,
    gender: userData.gender,
    occupation: userData.occupation,
    avatar: userData.avatar,
    emailVerified: userData.emailVerified,
    isAdmin: userData.isAdmin ?? false,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = not yet checked, true = submitted, false = not submitted
  const [verificationSubmitted, setVerificationSubmitted] = useState<boolean | null>(null);

  const checkVerificationStatus = useCallback(async (userType: UserType) => {
    if (userType !== 'professional') {
      setVerificationSubmitted(null);
      return;
    }

    try {
      const status = await professionalService.getVerificationStatus();
      const submittedAt =
        status.submittedAt ??
        (status as unknown as { verificationSubmittedAt?: string | null }).verificationSubmittedAt ??
        null;
      setVerificationSubmitted(Boolean(submittedAt));
    } catch (_err: unknown) {
      // If the check fails, assume not submitted to be safe
      setVerificationSubmitted(false);
    }
  }, []);

  const syncUserState = useCallback(async (userData: AuthResponse['user']): Promise<User> => {
    const mappedUser = mapAuthUser(userData);
    setUser(mappedUser);

    try {
      analyticsService.identify(mappedUser.id, {
        userType: mappedUser.type,
        emailVerified: mappedUser.emailVerified === true,
      });
    } catch {
      // silently ignore analytics errors
    }

    await checkVerificationStatus(mappedUser.type);
    return mappedUser;
  }, [checkVerificationStatus]);

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    const userData = await authService.getCurrentUser();
    return syncUserState(userData);
  }, [syncUserState]);

  const markVerificationSubmitted = useCallback(() => {
    setVerificationSubmitted(true);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await initializeAuth();

        if (token) {
          await refreshCurrentUser();
        }
      } catch (_err: unknown) {
        // Token might be expired or invalid, just continue as logged out
        await authService.logout();
        setUser(null);
        setVerificationSubmitted(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, [refreshCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });
      await syncUserState(response.user);

      return response;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al iniciar sesiÃ³n');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, userType: UserType) => {
    try {
      setLoading(true);
      setError(null);

      const backendUserType = userType === 'client' ? 'CLIENT' : 'PROFESSIONAL';

      const response = await authService.register({
        email,
        password,
        name,
        userType: backendUserType,
      });

      const mappedUser: User = {
        ...mapAuthUser(response.user),
        emailVerified: false,
      };

      setUser(mappedUser);

      if (userType === 'professional') {
        setVerificationSubmitted(false);
      } else {
        setVerificationSubmitted(null);
      }

      return response;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al registrarse');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setVerificationSubmitted(null);
      try {
        analyticsService.reset();
      } catch {
        // silently ignore analytics errors
      }
    } catch (_err: unknown) {
      setUser(null);
      setVerificationSubmitted(null);
      try {
        analyticsService.reset();
      } catch {
        // silently ignore analytics errors
      }
    } finally {
      setLoading(false);
    }
  };

  const setUserType = (type: UserType) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return { ...currentUser, type };
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return { ...currentUser, ...updates };
    });
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        loading,
        error,
        verificationSubmitted,
        markVerificationSubmitted,
        login,
        register,
        logout,
        setUserType,
        updateUser,
        refreshCurrentUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
