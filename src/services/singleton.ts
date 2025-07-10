import { SupabaseStorageService } from './implementations/SupabaseStorageService';

/**
 * Centralized singleton services to prevent recreation on every render
 * This module provides shared instances of services used throughout the application
 */

// Singleton storage service instance
let supabaseStorageInstance: SupabaseStorageService | null = null;

/**
 * Get the singleton SupabaseStorageService instance
 * Creates the instance only once and reuses it across the entire application
 */
export const getSupabaseStorageService = (): SupabaseStorageService => {
  if (!supabaseStorageInstance) {
    supabaseStorageInstance = new SupabaseStorageService();
  }
  return supabaseStorageInstance;
};

/**
 * Reset the singleton instance (useful for testing)
 */
export const resetSupabaseStorageService = (): void => {
  supabaseStorageInstance = null;
};