import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/authService';
import { initializeAuth } from '../services/api';
import type { AuthResponse } from '../services/authService';

export type UserType = 'client' | 'professional';

interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string, userType: UserType) => Promise<void>;
  logout: () => Promise<void>;
  setUserType: (type: UserType) => void;
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
          };

          setUser(mappedUser);
        }
      } catch (err: any) {
        console.error('Auto-login failed:', err);
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
      };

      setUser(mappedUser);

      // Return response so caller can access user data (e.g., for userType validation)
      return response;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al iniciar sesión');
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
      };

      setUser(mappedUser);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrarse');
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
    } catch (err: any) {
      console.error('Logout error:', err);
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
