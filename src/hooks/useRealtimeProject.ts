import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { IRealtimeService, RealtimePayload } from '@/services/interfaces/IRealtimeService';
import { serviceContainer, SERVICE_TOKENS } from '@/services/container/ServiceContainer';
import { ILogService } from '@/services/interfaces/ILogService';

/**
 * Hook for real-time project updates that integrates with React Query cache
 * Automatically invalidates and updates cached project data when changes occur
 */
export function useRealtimeProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);

  useEffect(() => {
    if (!projectId) return;

    const realtimeService = serviceContainer.resolve<IRealtimeService>(SERVICE_TOKENS.REALTIME_SERVICE);
    
    const subscribeToProject = async () => {
      try {
        logService.debug(`Setting up real-time subscription for project: ${projectId}`);

        const channel = await realtimeService.subscribeToProject(
          projectId,
          (payload: RealtimePayload) => {
            logService.debug('Project real-time update received', { projectId, payload });
            
            // Handle different types of updates
            switch (payload.eventType) {
              case 'UPDATE':
                // Invalidate project query to trigger refetch
                queryClient.invalidateQueries({ 
                  queryKey: ['project', projectId] 
                });
                
                // Update project cache directly if we have the new data
                if (payload.new_record) {
                  queryClient.setQueryData(['project', projectId], payload.new_record);
                }
                break;

              case 'DELETE':
                // Remove from cache and redirect user if needed
                queryClient.invalidateQueries({ 
                  queryKey: ['project', projectId] 
                });
                queryClient.invalidateQueries({ 
                  queryKey: ['projects'] 
                });
                break;

              case 'INSERT':
                // This shouldn't happen for existing project, but handle gracefully
                queryClient.invalidateQueries({ 
                  queryKey: ['projects'] 
                });
                break;
            }
          }
        );

        channelRef.current = channel;
        logService.info(`Real-time project subscription active: ${projectId}`);
      } catch (error) {
        logService.error('Failed to set up project real-time subscription', { projectId, error });
      }
    };

    subscribeToProject();

    // Cleanup subscription on unmount or projectId change
    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(channelRef.current).catch(error => {
          logService.error('Failed to unsubscribe from project updates', { projectId, error });
        });
        channelRef.current = null;
        logService.debug(`Real-time project subscription removed: ${projectId}`);
      }
    };
  }, [projectId, queryClient, logService]);

  return {
    isConnected: !!channelRef.current
  };
}

/**
 * Hook for real-time project models updates
 * Monitors all financial models within a project for live updates
 */
export function useRealtimeProjectModels(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);

  useEffect(() => {
    if (!projectId) return;

    const realtimeService = serviceContainer.resolve<IRealtimeService>(SERVICE_TOKENS.REALTIME_SERVICE);
    
    const subscribeToModels = async () => {
      try {
        logService.debug(`Setting up real-time subscription for project models: ${projectId}`);

        const channel = await realtimeService.subscribeToProjectModels(
          projectId,
          (payload: RealtimePayload) => {
            logService.debug('Project models real-time update received', { projectId, payload });
            
            switch (payload.eventType) {
              case 'INSERT':
                // New model added to project
                queryClient.invalidateQueries({ 
                  queryKey: ['project', projectId, 'models'] 
                });
                
                // Update project summary if cached
                queryClient.invalidateQueries({ 
                  queryKey: ['project', projectId] 
                });
                break;

              case 'UPDATE':
                // Model updated
                if (payload.new_record?.id) {
                  // Update specific model cache
                  queryClient.setQueryData(
                    ['model', payload.new_record.id], 
                    payload.new_record
                  );
                  
                  // Invalidate models list to trigger refetch
                  queryClient.invalidateQueries({ 
                    queryKey: ['project', projectId, 'models'] 
                  });
                }
                break;

              case 'DELETE':
                // Model deleted from project
                if (payload.old_record?.id) {
                  // Remove from model cache
                  queryClient.removeQueries({ 
                    queryKey: ['model', payload.old_record.id] 
                  });
                }
                
                // Refresh models list
                queryClient.invalidateQueries({ 
                  queryKey: ['project', projectId, 'models'] 
                });
                break;
            }
          }
        );

        channelRef.current = channel;
        logService.info(`Real-time project models subscription active: ${projectId}`);
      } catch (error) {
        logService.error('Failed to set up project models real-time subscription', { projectId, error });
      }
    };

    subscribeToModels();

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(channelRef.current).catch(error => {
          logService.error('Failed to unsubscribe from project models updates', { projectId, error });
        });
        channelRef.current = null;
        logService.debug(`Real-time project models subscription removed: ${projectId}`);
      }
    };
  }, [projectId, queryClient, logService]);

  return {
    isConnected: !!channelRef.current
  };
}