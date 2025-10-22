import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  login: (email: string, password: string, type: UserType) => Promise<void>;
  logout: () => void;
  setUserType: (type: UserType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, type: UserType) => {
    // Mock login - in real app this would call an API
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    // Mock user data
    const mockUser: User = {
      id: '1',
      name: type === 'client' ? 'Rubén' : 'Dr. García',
      email: email,
      type: type,
    };

    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const setUserType = (type: UserType) => {
    if (user) {
      setUser({ ...user, type });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        setUserType
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
