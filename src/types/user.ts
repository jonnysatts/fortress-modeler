
import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * @description Represents the user profile stored in the application's database.
 * This type can be extended to include additional user-specific information.
 */
export interface UserProfile {
  id: string;
  // Add other profile fields as needed, e.g., avatar_url, full_name
}

/**
 * @description Extends the Supabase user to ensure email is always available.
 * This type should be used throughout the application to ensure consistency.
 * It merges the core authentication user from Supabase with the user's profile.
 */
export type User = Omit<SupabaseUser, 'email'> & {
  email: string;
};
