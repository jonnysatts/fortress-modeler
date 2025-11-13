import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { supabase, auth as supabaseAuth, db } from '@/lib/supabase';
import { User as AppUser } from '@/types/user';

// Helper function to convert Supabase User to App User
function toAppUser(supabaseUser: SupabaseUser | null): AppUser | null {
  if (!supabaseUser) return null;
  
  // Ensure email is always defined for our app's User type
  if (!supabaseUser.email) {
    console.warn('User without email detected, this should not happen in production');
    return null;
  }
  
  return {
    ...supabaseUser,
    email: supabaseUser.email,
  } as AppUser;
}

// Enhanced auth context for Supabase integration
interface SupabaseAuthContextType {
  user: AppUser | null;
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simplified logging for OAuth testing
  const logService = useMemo(() => ({
    debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data),
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data)
  }), []);
  
  const errorService = useMemo(() => ({
    logError: (error: any, context: string, category: string, severity: string) => 
      console.error(`[${severity.toUpperCase()}] ${context}:`, error),
    showErrorToUser: (message: string) => console.error('User Error:', message)
  }), []);

  const isAuthError = (error: any): error is AuthError => {
    return error && typeof error === 'object' && 'message' in error && 'status' in error;
  };

  const getErrorMessage = (error: unknown): string => {
    if (isAuthError(error)) return error.message;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  };

  useEffect(() => {
    // Increase timeout to 10 seconds and make profile operations non-blocking
    const timeoutId = setTimeout(() => {
      console.log('⏰ [SupabaseAuth] Session check timeout (10s), stopping loading...');
      setIsLoading(false);
    }, 10000); // Increased to 10-second timeout

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
          error: (error as AuthError)?.message
        });
        
        if (error) {
          logService.error('Failed to get initial session', error as AuthError);
          errorService.logError(error as AuthError, 'SupabaseAuth.getInitialSession', 'auth', 'medium');
        } else {
          // Set session and user immediately - don't wait for profile operations
          setSession(initialSession);
          setUser(toAppUser(initialSession?.user ?? null));
          
          // Clear loading state early since we have the essential auth data
          clearTimeout(timeoutId);
          setIsLoading(false);
          
          // Handle profile operations in background (non-blocking)
          if (initialSession?.user) {
            console.log('👤 [SupabaseAuth] User found, handling profile in background...');
            handleProfileOperations(initialSession.user);
          } else {
            console.log('👤 [SupabaseAuth] No user found in session');
          }
        }
      } catch (error) {
        logService.error('Error during initial session setup', error);
        errorService.logError(error, 'SupabaseAuth.initialSetup', 'auth', 'high');
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    // Handle profile operations separately and non-blocking
    const handleProfileOperations = async (user: any) => {
      try {
        console.log('🔄 [SupabaseAuth] Starting background profile operations...');
        await ensureUserProfile(user);
        await loadUserProfile(user.id);
        console.log('✅ [SupabaseAuth] Background profile operations completed');
      } catch (error) {
        console.warn('⚠️ [SupabaseAuth] Profile operations failed (app will continue):', error);
        // Don't throw - profile issues shouldn't block authentication
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logService.debug('Auth state changed', { event, userId: session?.user?.id });
        
        // Set auth state immediately
        setSession(session);
        setUser(toAppUser(session?.user ?? null));
        setIsLoading(false);
        
        // Handle profile operations in background
        if (session?.user) {
          handleProfileOperations(session.user);
        } else {
          setProfile(null);
        }
        
        if (event === 'SIGNED_IN') {
          logService.info('User signed in successfully', { userId: session?.user?.id });
        } else if (event === 'SIGNED_OUT') {
          logService.info('User signed out');
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [logService, errorService]);

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
      console.log('⚠️ [loadUserProfile] Failed to load profile (continuing anyway):', { userId, error: (error as Error)?.message });
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
      
      const result = await supabaseAuth.signInWithGoogle();
      
      console.log('🔍 Post-OAuth call:', result);
      
      if ('error' in result && result.error) {
        throw result.error;
      }
      
      // Check if we got a URL but no redirect happened
      if ('data' in result && result.data && typeof result.data === 'object' && 'url' in result.data) {
        const url = (result.data as any).url;
        console.log('🔍 Got OAuth URL:', url);
        // If we have a URL but haven't redirected, force it
        window.location.href = url;
      }
      
      logService.info('OAuth redirect initiated');
    } catch (error) {
      logService.error('Login failed', error);
      errorService.logError(error, 'SupabaseAuth.login', 'auth', 'high');
      
      // DETAILED ERROR LOGGING FOR OAUTH DEBUG
      console.error('🚨 DETAILED OAUTH ERROR:', error);
      
      // Show the actual error details
      errorService.showErrorToUser(`OAuth Debug: ${getErrorMessage(error)}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logService.debug('Initiating logout');
      
      await supabaseAuth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      logService.info('User logged out successfully');
    } catch (error) {
      logService.error('Logout failed', error as AuthError);
      errorService.logError(error as AuthError, 'SupabaseAuth.logout', 'auth', 'medium');
      errorService.showErrorToUser('Failed to sign out. Please try again.');
      throw error as AuthError;
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
      logService.error('OAuth callback handling failed', error as AuthError);
      errorService.logError(error as AuthError, 'SupabaseAuth.handleCallback', 'auth', 'high');
      errorService.showErrorToUser('Authentication failed. Please try signing in again.');
      throw error as AuthError;
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
      logService.error('Profile update failed', error as AuthError);
      errorService.logError(error as AuthError, 'SupabaseAuth.updateProfile', 'auth', 'medium');
      errorService.showErrorToUser('Failed to update profile. Please try again.');
      throw error as AuthError;
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
