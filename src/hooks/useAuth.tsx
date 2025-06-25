import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthState, User } from '../lib/auth';
import { config } from '../lib/config';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      if (!config.useCloudSync) {
        // If not using cloud sync, skip authentication
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const stored = authService.getStoredAuth();
      
      if (stored.token && stored.user) {
        try {
          // Verify the stored token is still valid
          const user = await authService.verifyToken(stored.token);
          setAuthState({
            user,
            token: stored.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Token verification failed:', error);
          authService.clearAuth();
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async () => {
    try {
      const authUrl = await authService.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleCallback = async (code: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const { token, user } = await authService.handleCallback(code);
      
      authService.storeAuth(token, user);
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Callback handling failed:', error);
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (authState.token) {
        await authService.logout(authState.token);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      authService.clearAuth();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    handleCallback,
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