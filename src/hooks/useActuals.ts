import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActualsPeriodEntry } from '@/types/models';
import { useStorageService, useErrorService, useLogService } from '@/services';
import { useProject } from './useProjects';

/**
 * Hook to fetch actuals data for a project
 */
export const useActualsForProject = (projectId: string | undefined) => {
  const storageService = useStorageService();
  const logService = useLogService();
  
  return useQuery<ActualsPeriodEntry[], Error>({
    queryKey: ['actuals', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      logService.debug('useActualsForProject fetching for project', { projectId });
      
      const actuals = await storageService.getActualsForProject(projectId);
      logService.debug('useActualsForProject found actuals', { count: actuals.length, projectId });
      return actuals;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook to create or update actuals data
 */
export const useUpsertActuals = () => {
  const queryClient = useQueryClient();
  const storageService = useStorageService();
  const errorService = useErrorService();
  const logService = useLogService();
  
  return useMutation<ActualsPeriodEntry, Error, Omit<ActualsPeriodEntry, 'id'>>({
    mutationFn: async (actualData) => {
      logService.debug('Upserting actuals data', actualData);
      
      // Use the existing upsertActualsPeriod function from storage service
      const result = await storageService.upsertActualsPeriod(actualData);
      return result;
    },
    onSuccess: (data, variables) => {
      logService.info('Actuals data saved successfully', { actualId: data.id, projectId: variables.projectId });
      
      // Invalidate actuals cache for this project
      queryClient.invalidateQueries({ queryKey: ['actuals', variables.projectId] });
      
      logService.debug('Actuals cache invalidated for project', { projectId: variables.projectId });
    },
    onError: (error) => {
      errorService.logError(error, 'useUpsertActuals');
    },
  });
};

/**
 * Hook to get combined project data with actuals
 * Useful for dashboard views that need both
 */
export const useProjectWithActuals = (projectId: string | undefined) => {
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { data: actuals, isLoading: actualsLoading, error: actualsError } = useActualsForProject(projectId);

  return {
    project,
    actuals: actuals || [],
    isLoading: projectLoading || actualsLoading,
    error: projectError || actualsError,
    hasData: !!project && !!actuals,
  };
};