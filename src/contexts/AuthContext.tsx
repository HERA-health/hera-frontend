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
import { initializeAuth, registerSessionExpiredHandler } from '../services/api';
import { getErrorMessage } from '../constants/errors';
import * as analyticsService from '../services/analyticsService';
import type { AuthResponse } from '../services/authService';
import { clearPersistedClinicalAccessSession } from '../services/secureSessionStorage';
import type { LegalDocumentKey } from '../constants/legal';

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
  specialist?: {
    verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
    verificationSubmittedAt?: string | null;
  };
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
  authenticateWithGoogle: (data: authService.GoogleAuthData) => Promise<AuthResponse>;
  register: (
    email: string,
    password: string,
    name: string,
    userType: UserType,
    acceptedLegalDocumentKeys: LegalDocumentKey[]
  ) => Promise<AuthResponse>;
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
    specialist: userData.specialist,
  };
};

const deriveKnownVerificationSubmission = (user: User): boolean | null => {
  if (user.type !== 'professional') {
    return null;
  }

  const snapshot = user.specialist;
  if (!snapshot?.verificationStatus) {
    return null;
  }

  if (snapshot.verificationStatus === 'VERIFIED' || snapshot.verificationStatus === 'REJECTED') {
    return true;
  }

  if (snapshot.verificationStatus === 'PENDING') {
    return Boolean(snapshot.verificationSubmittedAt);
  }

  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = not yet checked, true = submitted, false = not submitted
  const [verificationSubmitted, setVerificationSubmitted] = useState<boolean | null>(null);

  const checkVerificationStatus = useCallback(async (mappedUser: User) => {
    if (mappedUser.type !== 'professional') {
      setVerificationSubmitted(null);
      return;
    }

    const knownVerificationState = deriveKnownVerificationSubmission(mappedUser);
    if (knownVerificationState !== null) {
      setVerificationSubmitted(knownVerificationState);
      return;
    }

    try {
      const status = await professionalService.getVerificationStatus();
      setVerificationSubmitted(status.verificationStatus !== 'NOT_SUBMITTED');
    } catch (_err: unknown) {
      // Keep the status unresolved instead of forcing professionals
      // through verification on transient API failures.
      setVerificationSubmitted(null);
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

    await checkVerificationStatus(mappedUser);
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
    registerSessionExpiredHandler(() => {
      setUser(null);
      setVerificationSubmitted(null);
      void clearPersistedClinicalAccessSession();
      try {
        analyticsService.reset();
      } catch {
        // silently ignore analytics errors
      }
    });

    const initialize = async () => {
      try {
        const token = await initializeAuth();

        if (token) {
          await refreshCurrentUser();
        }
      } catch (_err: unknown) {
        // Token might be expired or invalid, just continue as logged out
        await authService.logout();
        await clearPersistedClinicalAccessSession();
        setUser(null);
        setVerificationSubmitted(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
    return () => {
      registerSessionExpiredHandler(null);
    };
  }, [refreshCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });

      try {
        await refreshCurrentUser();
      } catch {
        await syncUserState(response.user);
      }

      return response;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al iniciar sesión');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithGoogle = async (data: authService.GoogleAuthData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authenticateWithGoogle(data);

      try {
        await refreshCurrentUser();
      } catch {
        await syncUserState(response.user);
      }

      return response;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'No se pudo iniciar sesión con Google');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    userType: UserType,
    acceptedLegalDocumentKeys: LegalDocumentKey[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      const backendUserType = userType === 'client' ? 'CLIENT' : 'PROFESSIONAL';

      const response = await authService.register({
        email,
        password,
        name,
        userType: backendUserType,
        acceptedLegalDocumentKeys,
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
        authenticateWithGoogle,
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
