import { config } from './config';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = config.apiUrl;
  }

  // Get stored auth state from localStorage
  getStoredAuth(): Partial<AuthState> {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        return {
          token,
          user: JSON.parse(userData),
          isAuthenticated: true
        };
      }
    } catch (error) {
      console.error('Error reading stored auth:', error);
    }
    
    return {
      token: null,
      user: null,
      isAuthenticated: false
    };
  }

  // Store auth state in localStorage
  storeAuth(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  // Clear auth state from localStorage
  clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  // Get Google OAuth URL
  async getGoogleAuthUrl(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/auth/google`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get auth URL');
    }
    
    return data.authUrl;
  }

  // Handle OAuth callback with deduplication
  private pendingCallback: Promise<{ token: string; user: User }> | null = null;
  
  async handleCallback(code: string): Promise<{ token: string; user: User }> {
    // If there's already a pending callback, return it
    if (this.pendingCallback) {
      console.log('Returning existing callback promise');
      return this.pendingCallback;
    }

    // Create new callback promise
    this.pendingCallback = (async () => {
      try {
        const response = await fetch(`${this.apiUrl}/api/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Authentication failed');
        }

        return {
          token: data.access_token,
          user: data.user
        };
      } finally {
        // Clear pending callback
        this.pendingCallback = null;
      }
    })();

    return this.pendingCallback;
  }

  // Verify token and get user info
  async verifyToken(token: string): Promise<User> {
    const response = await fetch(`${this.apiUrl}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Token verification failed');
    }

    return data.user;
  }

  // Refresh token
  async refreshToken(token: string): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Token refresh failed');
    }

    return data.token;
  }

  // Logout
  async logout(token: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Get authenticated user
  async getMe(token: string): Promise<User> {
    const response = await fetch(`${this.apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user info');
    }

    return data.user;
  }
}

export const authService = new AuthService();