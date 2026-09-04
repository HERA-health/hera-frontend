import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import * as authService from '../services/authService';
import * as professionalService from '../services/professionalService';
import { initializeAuth, registerSessionExpiredHandler } from '../services/api';
import { getErrorMessage } from '../constants/errors';
import * as analyticsService from '../services/analyticsService';
import type { AuthResponse, BackendUserType } from '../services/authService';
import { clearPersistedClinicalAccessSession } from '../services/secureSessionStorage';
import type { LegalDocumentKey } from '../constants/legal';
import type { LegalAcceptanceStatus } from '../services/legalService';
import { rotateRequestCacheScope } from '../services/requestCache';

export type UserType = 'client' | 'professional' | 'clinic';
export type PublicUserType = UserType;

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
  /** Delivery feedback from registration in this session, not verification status. */
  verificationEmailSent?: boolean;
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
  legalStatusSnapshot: LegalAcceptanceStatus | null;
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
    userType: PublicUserType,
    acceptedLegalDocumentKeys: LegalDocumentKey[],
    clinicCommercialName?: string
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUserType: (type: UserType) => void;
  updateUser: (updates: Partial<User>) => void;
  refreshCurrentUser: () => Promise<User | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapBackendUserType = (backendUserType: BackendUserType): UserType => {
  switch (backendUserType) {
    case 'CLIENT':
      return 'client';
    case 'PROFESSIONAL':
      return 'professional';
    case 'CLINIC':
      return 'clinic';
    default: {
      const exhaustiveCheck: never = backendUserType;
      return exhaustiveCheck;
    }
  }
};

export const mapAuthUser = (userData: AuthResponse['user']): User => {
  const userType = mapBackendUserType(userData.userType);

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

export const deriveKnownVerificationSubmission = (user: User): boolean | null => {
  if (user.type !== 'professional') {
    return null;
  }

  const snapshot = user.specialist;
  if (!snapshot?.verificationStatus) {
    return null;
  }

  if (snapshot.verificationStatus === 'VERIFIED') {
    return true;
  }

  if (snapshot.verificationStatus === 'REJECTED') {
    return false;
  }

  if (snapshot.verificationStatus === 'PENDING') {
    if (snapshot.verificationSubmittedAt === undefined) {
      return null;
    }

    return snapshot.verificationSubmittedAt !== null;
  }

  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalStatusSnapshot, setLegalStatusSnapshot] = useState<LegalAcceptanceStatus | null>(null);
  // null = not yet checked, true = submitted, false = not submitted
  const [verificationSubmitted, setVerificationSubmitted] = useState<boolean | null>(null);
  const authenticatedUserIdRef = useRef<string | null>(null);
  const authEpochRef = useRef(0);

  const resetAuthenticatedState = useCallback((): void => {
    authEpochRef.current += 1;
    rotateRequestCacheScope();
    authenticatedUserIdRef.current = null;
    setUser(null);
    setLegalStatusSnapshot(null);
    setVerificationSubmitted(null);
    setLoading(false);
    void clearPersistedClinicalAccessSession();
    try {
      analyticsService.reset();
    } catch {
      // Authentication cleanup must not depend on analytics availability.
    }
  }, []);

  const checkVerificationStatus = useCallback(async (mappedUser: User, expectedEpoch: number) => {
    if (authEpochRef.current !== expectedEpoch) return;
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
      if (authEpochRef.current !== expectedEpoch) return;
      setVerificationSubmitted(
        status.verificationStatus === 'PENDING' || status.verificationStatus === 'VERIFIED'
      );
    } catch (_err: unknown) {
      if (authEpochRef.current !== expectedEpoch) return;
      // Keep the status unresolved instead of forcing professionals
      // through verification on transient API failures.
      setVerificationSubmitted(null);
    }
  }, []);

  const syncUserState = useCallback(async (
    userData: AuthResponse['user'],
    expectedEpoch = authEpochRef.current,
  ): Promise<User | null> => {
    const mappedUser = mapAuthUser(userData);
    if (authEpochRef.current !== expectedEpoch) return null;
    if (authenticatedUserIdRef.current !== mappedUser.id) {
      rotateRequestCacheScope();
      authenticatedUserIdRef.current = mappedUser.id;
    }
    setUser(mappedUser);

    try {
      analyticsService.identify(mappedUser.id, {
        userType: mappedUser.type,
        emailVerified: mappedUser.emailVerified === true,
      });
    } catch {
      // silently ignore analytics errors
    }

    await checkVerificationStatus(mappedUser, expectedEpoch);
    if (authEpochRef.current !== expectedEpoch) return null;
    return mappedUser;
  }, [checkVerificationStatus]);

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    const expectedEpoch = authEpochRef.current;
    const userData = await authService.getCurrentUser();
    if (authEpochRef.current !== expectedEpoch) return null;
    return syncUserState(userData, expectedEpoch);
  }, [syncUserState]);

  const markVerificationSubmitted = useCallback(() => {
    setVerificationSubmitted(true);
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      resetAuthenticatedState();
    });

    const initialize = async () => {
      const initializationEpoch = authEpochRef.current;
      try {
        const session = await initializeAuth();
        if (authEpochRef.current !== initializationEpoch) return;

        if (session) {
          try {
            await refreshCurrentUser();
          } catch {
            if (!session.user) {
              throw new Error('No user data available after session refresh');
            }
            await syncUserState(session.user, initializationEpoch);
          }
          if (authEpochRef.current === initializationEpoch) {
            setLegalStatusSnapshot(session.legalStatus);
          }
        } else {
          resetAuthenticatedState();
        }
      } catch (_err: unknown) {
        if (authEpochRef.current !== initializationEpoch) return;
        // Token might be expired or invalid, just continue as logged out
        resetAuthenticatedState();
        await authService.logout();
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
    return () => {
      registerSessionExpiredHandler(null);
    };
  }, [refreshCurrentUser, resetAuthenticatedState]);

  const login = async (email: string, password: string) => {
    const operationEpoch = authEpochRef.current + 1;
    authEpochRef.current = operationEpoch;
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });
      if (authEpochRef.current !== operationEpoch) return response;

      try {
        await refreshCurrentUser();
      } catch {
        await syncUserState(response.user, operationEpoch);
      }
      if (authEpochRef.current === operationEpoch) {
        setLegalStatusSnapshot(response.legalStatus ?? null);
      }

      return response;
    } catch (err: unknown) {
      if (authEpochRef.current === operationEpoch) {
        const errorMessage = getErrorMessage(err, 'Error al iniciar sesión');
        setError(errorMessage);
      }
      throw err;
    } finally {
      if (authEpochRef.current === operationEpoch) setLoading(false);
    }
  };

  const authenticateWithGoogle = async (data: authService.GoogleAuthData) => {
    const operationEpoch = authEpochRef.current + 1;
    authEpochRef.current = operationEpoch;
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authenticateWithGoogle(data);
      if (authEpochRef.current !== operationEpoch) return response;

      try {
        await refreshCurrentUser();
      } catch {
        await syncUserState(response.user, operationEpoch);
      }
      if (authEpochRef.current === operationEpoch) {
        setLegalStatusSnapshot(response.legalStatus ?? null);
      }

      return response;
    } catch (err: unknown) {
      if (authEpochRef.current === operationEpoch) {
        const errorMessage = getErrorMessage(err, 'No se pudo iniciar sesión con Google');
        setError(errorMessage);
      }
      throw err;
    } finally {
      if (authEpochRef.current === operationEpoch) setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    userType: PublicUserType,
    acceptedLegalDocumentKeys: LegalDocumentKey[],
    clinicCommercialName?: string
  ) => {
    const operationEpoch = authEpochRef.current + 1;
    authEpochRef.current = operationEpoch;
    try {
      setLoading(true);
      setError(null);

      const backendUserType: BackendUserType = userType === 'client'
        ? 'CLIENT'
        : userType === 'professional'
          ? 'PROFESSIONAL'
          : 'CLINIC';

      const response = await authService.register({
        email,
        password,
        name,
        userType: backendUserType,
        acceptedLegalDocumentKeys,
        clinicCommercialName,
      });
      if (authEpochRef.current !== operationEpoch) return response;

      const mappedUser: User = {
        ...mapAuthUser(response.user),
        emailVerified: false,
        verificationEmailSent: response.verificationEmailSent,
      };

      if (authenticatedUserIdRef.current !== mappedUser.id) {
        rotateRequestCacheScope();
        authenticatedUserIdRef.current = mappedUser.id;
      }
      setUser(mappedUser);
      setLegalStatusSnapshot(response.legalStatus ?? null);

      if (userType === 'professional') {
        setVerificationSubmitted(false);
      } else {
        setVerificationSubmitted(null);
      }

      return response;
    } catch (err: unknown) {
      if (authEpochRef.current === operationEpoch) {
        const errorMessage = getErrorMessage(err, 'Error al registrarse');
        setError(errorMessage);
      }
      throw err;
    } finally {
      if (authEpochRef.current === operationEpoch) setLoading(false);
    }
  };

  const logout = async () => {
    let logoutEpoch = authEpochRef.current;
    try {
      setLoading(true);
      resetAuthenticatedState();
      logoutEpoch = authEpochRef.current;
      await authService.logout();
    } catch (_err: unknown) {
      // Local state was already cleared before contacting the server.
    } finally {
      if (authEpochRef.current === logoutEpoch) setLoading(false);
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
        legalStatusSnapshot,
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
