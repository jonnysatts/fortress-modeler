import React, { createContext, useContext, ReactNode } from 'react';

// Simplified auth context for local-only mode
interface AuthContextType {
  user: null;
  token: null;
  isAuthenticated: false;
  isLoading: false;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Local-only mode - no authentication needed
  const value: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => {
      // No-op for local-only mode
    },
    logout: async () => {
      // No-op for local-only mode
    },
    handleCallback: async (code: string) => {
      // No-op for local-only mode
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}