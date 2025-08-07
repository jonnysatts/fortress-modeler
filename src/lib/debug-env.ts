// Debug script to verify environment variables
console.log('🔍 Environment Variable Debug:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 40) + '...');
console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log('All VITE vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

// Force use of environment variables over hardcoded config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://issmshemlkrucmxcvibs.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzc21zaGVtbGtydWNteGN2aWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzM1MzAsImV4cCI6MjA2NzcwOTUzMH0.xhxwSFCNSsG4Q1xta4L_uLKlnSHZfp7N3wXW0E3fOdg';

console.log('🔧 Final Supabase Config:');
console.log('URL:', SUPABASE_URL);
console.log('Key prefix:', SUPABASE_ANON_KEY.substring(0, 40));

export { SUPABASE_URL, SUPABASE_ANON_KEY };
