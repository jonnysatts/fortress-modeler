import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Supabase client configuration - MUST use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('🔧 Supabase client init:', {
  url: supabaseUrl,
  keyStart: supabaseAnonKey?.substring(0, 20) + '...',
  fromEnv: !!import.meta.env.VITE_SUPABASE_URL,
  allEnvKeys: Object.keys(import.meta.env),
  viteMode: import.meta.env.MODE,
  viteDev: import.meta.env.DEV,
  supabaseBackend: import.meta.env.VITE_USE_SUPABASE_BACKEND
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
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
          cause: error.cause,
          stack: error.stack
        });
        throw error;
      }
      return data;
    } catch (err) {
      console.error('❌ signInWithGoogle exception details:', {
        err,
        message: err?.message,
        name: err?.name,
        cause: err?.cause,
        stack: err?.stack,
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

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
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
  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
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