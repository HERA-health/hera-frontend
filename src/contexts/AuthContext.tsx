import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/authService';
import { initializeAuth } from '../services/api';
import { getErrorMessage } from '../constants/errors';
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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string, userType: UserType) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUserType: (type: UserType) => void;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount - check for stored token
  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await initializeAuth();

        if (token) {
          // Token exists, try to get current user
          const userData = await authService.getCurrentUser();

          // Map backend userType to frontend type
          const mappedUser: User = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            type: userData.userType === 'CLIENT' ? 'client' : 'professional',
            phone: userData.phone,
            birthDate: userData.birthDate ? new Date(userData.birthDate) : null,
            gender: userData.gender,
            occupation: userData.occupation,
            avatar: userData.avatar,
            emailVerified: userData.emailVerified ?? false,
          };

          setUser(mappedUser);
        }
      } catch (_err: unknown) {
        // Token might be expired or invalid, just continue as logged out
        await authService.logout();
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });

      // Map backend userType to frontend type
      const mappedUser: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        type: response.user.userType === 'CLIENT' ? 'client' : 'professional',
        phone: response.user.phone,
        birthDate: response.user.birthDate ? new Date(response.user.birthDate) : null,
        gender: response.user.gender,
        occupation: response.user.occupation,
        avatar: response.user.avatar,
        emailVerified: response.user.emailVerified ?? false,
      };

      setUser(mappedUser);

      // Return response so caller can access user data (e.g., for userType validation)
      return response;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al iniciar sesión');
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

      // Map frontend type to backend userType
      const backendUserType = userType === 'client' ? 'CLIENT' : 'PROFESSIONAL';

      const response = await authService.register({
        email,
        password,
        name,
        userType: backendUserType,
      });

      // Map backend userType back to frontend type
      const mappedUser: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        type: response.user.userType === 'CLIENT' ? 'client' : 'professional',
        phone: response.user.phone,
        birthDate: response.user.birthDate ? new Date(response.user.birthDate) : null,
        gender: response.user.gender,
        occupation: response.user.occupation,
        avatar: response.user.avatar,
        emailVerified: false, // New users need to verify their email
      };

      setUser(mappedUser);

      // Return the response so RegisterScreen can use it
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
    } catch (_err: unknown) {
      // Even if logout fails, clear user state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setUserType = (type: UserType) => {
    if (user) {
      setUser({ ...user, type });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
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
        login,
        register,
        logout,
        setUserType,
        updateUser,
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
