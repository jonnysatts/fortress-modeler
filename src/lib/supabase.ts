import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { appConfig } from '@/config/app.config';

// Use built-in config with fallback to env vars for development flexibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || appConfig.supabase.url;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || appConfig.supabase.anonKey;

// Debug environment variables
console.log('🔧 Supabase client init:', {
  url: supabaseUrl,
  keyStart: supabaseAnonKey?.substring(0, 20) + '...',
  fromEnv: !!import.meta.env.VITE_SUPABASE_URL,
  viteMode: import.meta.env.MODE,
  viteDev: import.meta.env.DEV,
  cloudModeEnabled: appConfig.features.useSupabaseBackend,
  currentUrl: window.location.href,
  origin: window.location.origin
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Built-in config should provide defaults.');
}

// Create Supabase client with full type safety
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'sb-jjearfzmvmpohbebcnju-auth-token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Auth helper functions
export const auth = {
  // Sign in with Google OAuth
  async signInWithGoogle() {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    console.log('🚀 signInWithGoogle called:', {
      provider: 'google',
      redirectTo: redirectUrl,
      currentOrigin: window.location.origin,
      supabaseClientExists: !!supabase,
      authMethodExists: !!supabase?.auth?.signInWithOAuth
    });
    
    // Test if Supabase client is properly initialized
    if (!supabase) {
      console.error('❌ Supabase client is not initialized!');
      throw new Error('Supabase client is not initialized');
    }
    
    if (!supabase.auth) {
      console.error('❌ Supabase auth module is not available!');
      throw new Error('Supabase auth module is not available');
    }
    
    try {
      console.log('📝 About to call supabase.auth.signInWithOAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      
      console.log('✅ signInWithOAuth response:', { data, error });
      
      if (error) {
        console.error('❌ signInWithOAuth error details:', {
          error,
          message: error.message,
          name: error.name,
          cause: (error as any).cause,
          stack: (error as any).stack
        });
        throw error;
      }
      return data;
    } catch (err) {
      console.error('❌ signInWithGoogle exception details:', {
        err,
        message: (err as any)?.message,
        name: (err as any)?.name,
        cause: (err as any)?.cause,
        stack: (err as any)?.stack,
        type: typeof err
      });
      throw err;
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session with debugging
  async getSession() {
    console.log('🔍 [getSession] Fetching current session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 [getSession] Result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expiresAt: session?.expires_at,
      accessToken: session?.access_token ? session.access_token.substring(0, 20) + '...' : null,
      refreshToken: session?.refresh_token ? 'present' : 'missing',
      error: error?.message
    });
    
    if (error) throw error;
    return session;
  },

  // Get current user with debugging
  async getUser() {
    console.log('🔍 [getUser] Fetching current user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('🔍 [getUser] Result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userMetadata: user?.user_metadata,
      appMetadata: user?.app_metadata,
      error: error?.message
    });
    
    if (error) throw error;
    return user;
  },

  // Listen for auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helper functions
export const db = {
  // Get user profile with timeout
  async getProfile(userId: string) {
    try {
      console.log('[db.getProfile] Fetching profile for user:', userId);
      
      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout after 3s')), 3000)
      );
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      // If profile not found (PGRST116), return null instead of throwing
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[db.getProfile] Profile not found for user:', userId);
          return null;
        }
        // Only throw for actual errors, not "not found"
        console.error('[db.getProfile] Error fetching profile:', error);
        throw error;
      }
      
      console.log('[db.getProfile] Profile found for user:', userId);
      return data;
    } catch (error) {
      if ((error as Error).message?.includes('timeout')) {
        console.warn('[db.getProfile] Profile fetch timed out, returning null');
        return null;
      }
      throw error;
    }
  },

  // Create user profile
  async createProfile(profile: any) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) {
      console.error('[db.createProfile] Error creating profile:', error);
      throw error;
    }
    return data;
  },

  // Update user profile
  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Real-time helpers
export const realtime = {
  // Subscribe to table changes
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  },

  // Subscribe to specific record changes
  subscribeToRecord(table: string, id: string, callback: (payload: any) => void) {
    return supabase
      .channel(`public:${table}:id=eq.${id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table, filter: `id=eq.${id}` }, 
        callback
      )
      .subscribe();
  },

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  },
};

// Error handling helper
export function handleSupabaseError(error: any): Error {
  if (error?.code === 'PGRST116') {
    return new Error('Record not found');
  }
  if (error?.code === '23505') {
    return new Error('Record already exists');
  }
  if (error?.code === '23503') {
    return new Error('Invalid reference');
  }
  return new Error(error?.message || 'Unknown database error');
}

export default supabase;
