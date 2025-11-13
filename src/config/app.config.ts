/**
 * Fortress Financial Modeler - Application Configuration
 * 
 * These are PUBLIC configuration values that are safe to expose.
 * The Supabase anon key is designed to be public - security is handled
 * by Row Level Security (RLS) policies and authentication.
 */

export const appConfig = {
  // Supabase Configuration - Using the correct active project
  supabase: {
    url: 'https://issmshemlkrucmxcvibs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzc21zaGVtbGtydWNteGN2aWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzM1MzAsImV4cCI6MjA2NzcwOTUzMH0.xhxwSFCNSsG4Q1xta4L_uLKlnSHZfp7N3wXW0E3fOdg'
  },
  
  // Feature Flags
  features: {
    useSupabaseBackend: true,  // Use cloud storage
    debugMode: false,          // Production debug setting
  },
  
  // OAuth Configuration (Optional - can be added later)
  oauth: {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined
  },
  
  // Application Settings
  app: {
    name: 'Fortress Financial Modeler',
    version: '1.0.0',
    port: 8081,
    defaultTheme: 'light'
  }
};

// For backwards compatibility with existing code
export const getSupabaseConfig = () => ({
  url: appConfig.supabase.url,
  anonKey: appConfig.supabase.anonKey
});

// Feature flag helpers
export const isCloudModeEnabled = () => appConfig.features.useSupabaseBackend;
export const isDebugEnabled = () => appConfig.features.debugMode;
