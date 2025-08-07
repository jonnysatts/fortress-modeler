// Environment variable validation and configuration
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  VITE_USE_SUPABASE_BACKEND: z.string().transform(val => val === 'true'),
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),
  VITE_DEBUG: z.string().transform(val => val === 'true').optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export const getEnv = (): Env => {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(import.meta.env);
    return validatedEnv;
  } catch (error) {
    console.error('Environment validation failed:', error);
    
    // Provide fallback configuration for development
    if (import.meta.env.DEV) {
      console.warn('Using fallback configuration for development');
      validatedEnv = {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://localhost:3000',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'fallback-key',
        VITE_USE_SUPABASE_BACKEND: false,
        VITE_DEBUG: true,
      };
      return validatedEnv;
    }
    
    throw new Error('Critical environment variables are missing or invalid');
  }
};

// Validate environment on module load
try {
  getEnv();
} catch (error) {
  console.error('Failed to validate environment:', error);
}