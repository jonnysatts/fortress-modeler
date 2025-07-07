import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, auth as supabaseAuth, db } from '@/lib/supabase';

// Enhanced auth context for Supabase integration
interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code?: string) => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simplified logging for OAuth testing
  const logService = {
    debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data),
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data)
  };
  
  const errorService = {
    logError: (error: any, context: string, category: string, severity: string) => 
      console.error(`[${severity.toUpperCase()}] ${context}:`, error),
    showError: (message: string) => console.error('User Error:', message)
  };

  useEffect(() => {
    // Add timeout to prevent infinite loading - reduced to 5 seconds
    const timeoutId = setTimeout(() => {
      console.log('⏰ [SupabaseAuth] Session check timeout (5s), stopping loading...');
      setIsLoading(false);
    }, 5000); // 5-second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 [SupabaseAuth] Getting initial session...');
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        console.log('🔍 [SupabaseAuth] Initial session result:', {
          hasSession: !!initialSession,
          hasUser: !!initialSession?.user,
          userId: initialSession?.user?.id,
          userEmail: initialSession?.user?.email,
          expiresAt: initialSession?.expires_at,
          error: error?.message
        });
        
        if (error) {
          logService.error('Failed to get initial session', error);
          errorService.logError(error, 'SupabaseAuth.getInitialSession', 'auth', 'medium');
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            console.log('👤 [SupabaseAuth] User found, ensuring profile exists...');
            await ensureUserProfile(initialSession.user);
            await loadUserProfile(initialSession.user.id);
          } else {
            console.log('👤 [SupabaseAuth] No user found in session');
          }
        }
      } catch (error) {
        logService.error('Error during initial session setup', error);
        errorService.logError(error, 'SupabaseAuth.initialSetup', 'auth', 'high');
      } finally {
        console.log('✅ [SupabaseAuth] Initial session setup complete, clearing timeout and stopping loading');
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logService.debug('Auth state changed', { event, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await ensureUserProfile(session.user);
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        if (event === 'SIGNED_IN') {
          logService.info('User signed in successfully', { userId: session?.user?.id });
        } else if (event === 'SIGNED_OUT') {
          logService.info('User signed out');
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureUserProfile = async (user: any) => {
    try {
      console.log('🔍 [ensureUserProfile] Ensuring profile exists for user:', user.id);
      
      // Try to get existing profile
      const existingProfile = await db.getProfile(user.id);
      
      if (existingProfile) {
        console.log('✅ [ensureUserProfile] Profile already exists');
        return existingProfile;
      }
      
      // Profile doesn't exist, create it
      console.log('🔧 [ensureUserProfile] Creating new profile for user');
      const newProfile = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || '',
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        company_domain: user.user_metadata?.custom_claims?.hd || null,
        preferences: {}
      };
      
      const createdProfile = await db.createProfile(newProfile);
      
      if (!createdProfile) {
        console.error('❌ [ensureUserProfile] Failed to create profile');
        throw new Error('Failed to create profile');
      }
      
      console.log('✅ [ensureUserProfile] Profile created successfully:', createdProfile.id);
      return createdProfile;
    } catch (error) {
      console.error('❌ [ensureUserProfile] Profile setup failed:', error);
      // Don't throw - we want auth to continue even if profile creation fails
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔍 [loadUserProfile] Loading profile for user:', userId);
      
      // Add timeout to profile loading to prevent hanging
      const profilePromise = db.getProfile(userId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 5000)
      );
      
      const profileData = await Promise.race([profilePromise, timeoutPromise]);
      
      if (profileData) {
        setProfile(profileData);
        console.log('✅ [loadUserProfile] Profile loaded successfully:', { userId, hasProfile: !!profileData });
      } else {
        console.log('⚠️ [loadUserProfile] No profile found for user:', userId);
        setProfile(null);
      }
    } catch (error) {
      console.log('⚠️ [loadUserProfile] Failed to load profile (continuing anyway):', { userId, error: error?.message });
      // Don't throw error here - profile might not exist yet, continue without it
      setProfile(null);
    }
  };

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logService.debug('Initiating Google OAuth login');
      
      // Add pre-call debugging
      console.log('🔍 Pre-OAuth call debug:', {
        supabaseAuthExists: !!supabaseAuth,
        signInWithGoogleExists: !!supabaseAuth?.signInWithGoogle,
        windowLocation: window.location.href,
        origin: window.location.origin
      });
      
      const { data, error } = await supabaseAuth.signInWithGoogle();
      
      console.log('🔍 Post-OAuth call:', { data, error });
      
      if (error) {
        throw error;
      }
      
      // Check if we got a URL but no redirect happened
      if (data?.url) {
        console.log('🔍 Got OAuth URL:', data.url);
        // If we have a URL but haven't redirected, force it
        window.location.href = data.url;
      }
      
      logService.info('OAuth redirect initiated');
    } catch (error) {
      logService.error('Login failed', error);
      errorService.logError(error, 'SupabaseAuth.login', 'auth', 'high');
      
      // DETAILED ERROR LOGGING FOR OAUTH DEBUG
      console.error('🚨 DETAILED OAUTH ERROR:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        status: error?.status,
        stack: error?.stack
      });
      
      // Show the actual error details
      const errorDetails = error?.message || error?.details || error?.hint || error?.toString();
      errorService.showErrorToUser(`OAuth Debug: ${errorDetails}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logService.debug('Initiating logout');
      
      const { error } = await supabaseAuth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      logService.info('User logged out successfully');
    } catch (error) {
      logService.error('Logout failed', error);
      errorService.logError(error, 'SupabaseAuth.logout', 'auth', 'medium');
      errorService.showErrorToUser('Failed to sign out. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallback = async (code?: string): Promise<void> => {
    try {
      logService.debug('Handling OAuth callback', { hasCode: !!code });
      
      // Supabase handles OAuth callbacks automatically via onAuthStateChange
      // This method exists for interface compatibility
      
      // If we have a code, we can optionally handle it manually
      if (code) {
        // Handle manual callback if needed
        logService.debug('Processing OAuth callback code');
      }
      
    } catch (error) {
      logService.error('OAuth callback handling failed', error);
      errorService.logError(error, 'SupabaseAuth.handleCallback', 'auth', 'high');
      errorService.showErrorToUser('Authentication failed. Please try signing in again.');
      throw error;
    }
  };

  const updateProfile = async (updates: any): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      logService.debug('Updating user profile', { userId: user.id, updates });
      
      const updatedProfile = await db.updateProfile(user.id, updates);
      setProfile(updatedProfile);
      
      logService.info('User profile updated successfully', { userId: user.id });
    } catch (error) {
      logService.error('Profile update failed', error);
      errorService.logError(error, 'SupabaseAuth.updateProfile', 'auth', 'medium');
      errorService.showErrorToUser('Failed to update profile. Please try again.');
      throw error;
    }
  };

  const value: SupabaseAuthContextType = {
    user,
    session,
    profile,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    handleCallback,
    updateProfile,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContextType {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// Compatibility wrapper that maintains the same interface as useAuth
export function useAuth(): Pick<SupabaseAuthContextType, 'user' | 'isAuthenticated' | 'isLoading' | 'login' | 'logout' | 'handleCallback'> & { token: string | null } {
  const supabaseAuth = useSupabaseAuth();
  
  return {
    user: supabaseAuth.user,
    token: supabaseAuth.session?.access_token || null,
    isAuthenticated: supabaseAuth.isAuthenticated,
    isLoading: supabaseAuth.isLoading,
    login: supabaseAuth.login,
    logout: supabaseAuth.logout,
    handleCallback: supabaseAuth.handleCallback,
  };
}