import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isCloudModeEnabled } from '@/config/app.config';
import { getSupabaseStorageService } from '@/services/singleton';
import { supabase } from '@/lib/supabase';

export interface UserSettings {
  id?: string;
  user_id?: string;
  dark_mode: boolean;
  backup_reminders: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Default settings for new users or local mode
const DEFAULT_SETTINGS: UserSettings = {
  dark_mode: false,
  backup_reminders: true,
  backup_frequency: 'weekly',
  preferences: {},
};

/**
 * Hook to fetch user settings from Supabase or local storage
 */
export const useUserSettings = () => {
  return useQuery<UserSettings, Error>({
    queryKey: ['userSettings'],
    queryFn: async () => {
      if (isCloudModeEnabled()) {
        console.log('🌤️ Fetching user settings from Supabase');

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('⚠️ No authenticated user, using default settings');
          return DEFAULT_SETTINGS;
        }

        // Fetch user settings
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found - return defaults
            console.log('📝 No settings found, using defaults');
            return DEFAULT_SETTINGS;
          }
          throw error;
        }

        console.log('✅ User settings loaded:', data);
        return data as UserSettings;
      } else {
        // Local mode - use localStorage
        console.log('💾 Using localStorage for settings');
        const stored = localStorage.getItem('user_settings');
        if (stored) {
          try {
            return JSON.parse(stored) as UserSettings;
          } catch (e) {
            console.error('Failed to parse stored settings:', e);
            return DEFAULT_SETTINGS;
          }
        }
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * Hook to save/update user settings
 */
export const useSaveUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, Partial<UserSettings>>({
    mutationFn: async (settingsData) => {
      if (isCloudModeEnabled()) {
        console.log('🌤️ Saving user settings to Supabase:', settingsData);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Upsert settings (insert or update)
        const { data, error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            ...settingsData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Settings saved successfully:', data);
        return data as UserSettings;
      } else {
        // Local mode - use localStorage
        console.log('💾 Saving settings to localStorage:', settingsData);
        const currentSettings = JSON.parse(
          localStorage.getItem('user_settings') || JSON.stringify(DEFAULT_SETTINGS)
        );
        const updatedSettings = {
          ...currentSettings,
          ...settingsData,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('user_settings', JSON.stringify(updatedSettings));
        return updatedSettings;
      }
    },
    onSuccess: (data) => {
      // Update cache immediately
      queryClient.setQueryData(['userSettings'], data);
      console.log('✅ Settings cache updated');
    },
    onError: (error) => {
      console.error('❌ Failed to save settings:', error);
      toast.error('Failed to save settings', {
        description: error.message,
      });
    },
  });
};

/**
 * Hook to get a specific setting value with type safety
 */
export const useSettingValue = <K extends keyof UserSettings>(
  key: K
): UserSettings[K] | undefined => {
  const { data: settings } = useUserSettings();
  return settings?.[key];
};

/**
 * Hook for auto-saving settings on change with debounce
 */
export const useAutoSaveSettings = (debounceMs: number = 1000) => {
  const saveMutation = useSaveUserSettings();
  let timeoutId: NodeJS.Timeout | null = null;

  const autoSave = (settingsData: Partial<UserSettings>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      saveMutation.mutate(settingsData);
    }, debounceMs);
  };

  return {
    autoSave,
    isSaving: saveMutation.isPending,
  };
};
