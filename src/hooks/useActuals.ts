import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualsForProject, upsertActualsPeriod } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { toast } from 'sonner';

/**
 * Hook for managing actuals data for projects
 */
export const useActualsForProject = (projectId: string | undefined) => {
  return useQuery<ActualsPeriodEntry[], Error>({
    queryKey: ['actuals', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return getActualsForProject(projectId);
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
      return upsertActualsPeriod(actualsData);
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