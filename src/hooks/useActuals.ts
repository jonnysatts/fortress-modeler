import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualsForProject, upsertActualsPeriod } from '@/lib/db';
import { getSupabaseStorageService } from '@/services/singleton';
import { ActualsPeriodEntry } from '@/types/models';
import { toast } from 'sonner';
import { isCloudModeEnabled } from '@/config/app.config';

/**
 * Hook for managing actuals data for projects
 */
export const useActualsForProject = (projectId: string | undefined) => {
  return useQuery<ActualsPeriodEntry[], Error>({
    queryKey: ['actuals', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage
        console.log('🌤️ Getting actuals from Supabase');
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getActualsForProject(projectId);
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Getting actuals from IndexedDB');
        return getActualsForProject(projectId);
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook for saving actuals data
 */
export const useSaveActuals = () => {
  const queryClient = useQueryClient();

  return useMutation<ActualsPeriodEntry, Error, ActualsPeriodEntry>({
    mutationFn: async (actualsData) => {
      try {
        if (isCloudModeEnabled()) {
          // Use Supabase for cloud storage
          console.log('🌤️ Saving actuals to Supabase');
          const supabaseStorage = getSupabaseStorageService();
          const result = await supabaseStorage.upsertActualsPeriod(actualsData);
          console.log('✅ Actuals saved to Supabase:', result.id);
          return result;
        } else {
          // Use IndexedDB for local storage
          console.log('💾 Saving actuals to IndexedDB');
          return upsertActualsPeriod(actualsData);
        }
      } catch (error) {
        console.error('❌ Actuals save failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch actuals for this project
      queryClient.invalidateQueries({ queryKey: ['actuals', data.projectId] });
    },
    onError: (error) => {
      console.error('Failed to save actuals:', error);
    }
  });
};

/**
 * Alias for useSaveActuals to match the import in ActualsInputForm
 */
export const useUpsertActuals = useSaveActuals;

/**
 * Hook for getting actuals for a specific period
 */
export const useActualsForPeriod = (projectId: string | undefined, period: string) => {
  const { data: allActuals = [] } = useActualsForProject(projectId);
  
  return allActuals.find(actual => actual.period === period);
};