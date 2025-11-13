import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, FinancialModel, SpecialEventForecast, SpecialEventActual, SpecialEventMilestone, db, getProject, createProject, updateProject, deleteProject } from '@/lib/db';
import { toast } from 'sonner';
import { isCloudModeEnabled } from '@/config/app.config';
import { useMemo } from 'react';
import { getSupabaseStorageService } from '@/services/singleton';

// --- Projects --- //

export const useMyProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'my'],
    queryFn: async () => {
      const cloudEnabled = isCloudModeEnabled();
      console.log('🔍 Environment check:', {
        cloudEnabled,
        configSource: 'app.config.ts'
      });
      
      if (cloudEnabled) {
        // Use Supabase for cloud storage - create service when auth is ready
        console.log('🌤️ Using Supabase for projects');
        try {
          const supabaseStorage = getSupabaseStorageService();
          console.log('🔍 Service created successfully');
          const result = await supabaseStorage.getAllProjects();
          console.log('🔍 getAllProjects result:', result);
          return result;
        } catch (error) {
          console.error('🚨 DETAILED ERROR in getAllProjects:', {
            error: (error as Error)?.message,
            stack: (error as Error)?.stack,
            name: (error as Error)?.name,
            cause: (error as Error)?.cause
          });
          throw error; // Re-throw to let React Query handle it
        }
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Using IndexedDB for projects');
        return db.projects.toArray();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

// --- Special Event Actuals --- //

export const useSpecialEventActuals = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  return useQuery<SpecialEventActual[], Error>({
    queryKey: ['specialEventActuals', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getSpecialEventActualsForProject(projectId);
      } else {
        // Local IndexedDB implementation (if needed)
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000, // Increased to 15 minutes to prevent unwanted refetches
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    refetchInterval: false, // Disable automatic polling
    retry: 3,
  });
};

export const useCreateSpecialEventActual = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventActual, Error, Partial<SpecialEventActual>>({
    mutationFn: async (newActualData) => {
      if (!newActualData.project_id) throw new Error('Project ID is required for actuals');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.createSpecialEventActual(newActualData);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event actuals not implemented');
      }
    },
    onSuccess: (newActual) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventActuals', newActual.project_id] });
      toast.success('Special event actual created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create special event actual:', error);
      toast.error('Failed to create special event actual', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useUpdateSpecialEventActual = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventActual, Error, { id: string; data: Partial<SpecialEventActual> }>({
    mutationFn: async ({ id, data }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.updateSpecialEventActual(id, data);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event actuals not implemented');
      }
    },
    onSuccess: (updatedActual) => {
      // Update cache directly instead of invalidating to prevent form reset
      queryClient.setQueryData(
        ['specialEventActuals', updatedActual.project_id],
        (oldData: SpecialEventActual[] | undefined) => {
          if (!oldData) return [updatedActual];
          return oldData.map(actual => 
            actual.id === updatedActual.id ? updatedActual : actual
          );
        }
      );
      
      // Also update individual actual cache if it exists
      queryClient.setQueryData(
        ['specialEventActuals', updatedActual.id],
        updatedActual
      );
      
      toast.success('Special event actual updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update special event actual:', error);
      toast.error('Failed to update special event actual', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useDeleteSpecialEventActual = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async ({ id, projectId }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        await supabaseStorage.deleteSpecialEventActual(id);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event actuals not implemented');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventActuals', variables.projectId] });
      toast.success('Special event actual deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete special event actual:', error);
      toast.error('Failed to delete special event actual', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

// --- Special Event Milestones --- //

export const useSpecialEventMilestones = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  return useQuery<SpecialEventMilestone[], Error>({
    queryKey: ['specialEventMilestones', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getSpecialEventMilestonesForProject(projectId);
      } else {
        // Local IndexedDB implementation (if needed)
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000, // Increased to 15 minutes to prevent unwanted refetches
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    refetchInterval: false, // Disable automatic polling
    retry: 3,
  });
};

export const useCreateSpecialEventMilestone = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventMilestone, Error, Partial<SpecialEventMilestone>>({
    mutationFn: async (newMilestoneData) => {
      if (!newMilestoneData.project_id) throw new Error('Project ID is required for milestone');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.createSpecialEventMilestone(newMilestoneData);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event milestones not implemented');
      }
    },
    onSuccess: (newMilestone) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', newMilestone.project_id] });
      toast.success('Special event milestone created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create special event milestone:', error);
      toast.error('Failed to create special event milestone', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useUpdateSpecialEventMilestone = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventMilestone, Error, { id: string; data: Partial<SpecialEventMilestone> }>({
    mutationFn: async ({ id, data }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.updateSpecialEventMilestone(id, data);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event milestones not implemented');
      }
    },
    onSuccess: (updatedMilestone) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', updatedMilestone.project_id] });
      queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', updatedMilestone.id] });
      toast.success('Special event milestone updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update special event milestone:', error);
      toast.error('Failed to update special event milestone', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useDeleteSpecialEventMilestone = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async ({ id, projectId }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        await supabaseStorage.deleteSpecialEventMilestone(id);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event milestones not implemented');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', variables.projectId] });
      toast.success('Special event milestone deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete special event milestone:', error);
      toast.error('Failed to delete special event milestone', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useSharedProjects = () => {
  const cloudEnabled = isCloudModeEnabled();
  
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'shared'],
    queryFn: async () => {
      if (!cloudEnabled) {
        return [];
      }
      
      try {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getSharedProjects();
      } catch (error) {
        console.error('Error fetching shared projects:', error);
        throw error;
      }
    },
    enabled: cloudEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const usePublicProjects = () => {
  const cloudEnabled = isCloudModeEnabled();
  
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'public'],
    queryFn: async () => {
      if (!cloudEnabled) {
        return [];
      }
      
      try {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getPublicProjects();
      } catch (error) {
        console.error('Error fetching public projects:', error);
        throw error;
      }
    },
    enabled: cloudEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useProject = (projectId: string | undefined) => {
  return useQuery<Project, Error>({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage - create service when auth is ready
        console.log('🌤️ Getting project from Supabase');
        const supabaseStorage = getSupabaseStorageService();
        const project = await supabaseStorage.getProject(projectId);
        if (!project) throw new Error('Project not found');
        return project;
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Getting project from IndexedDB');
        const project = await getProject(projectId);
        if (!project) throw new Error('Project not found');
        return project;
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: async (newProjectData) => {
      console.log('🚀 useCreateProject started with cloud mode:', isCloudModeEnabled());
      
      if (isCloudModeEnabled()) {
        try {
          // Use Supabase for cloud storage - create service when auth is ready
          console.log('🌤️ Attempting to create project in Supabase');
          const supabaseStorage = getSupabaseStorageService();
          const result = await Promise.race([
            supabaseStorage.createProject(newProjectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Supabase timeout after 10 seconds')), 10000)
            )
          ]);
          console.log('✅ Supabase project creation successful');
          return result as Project;
        } catch (error) {
          console.error('❌ Supabase project creation failed:', error);
          console.log('🔄 Falling back to IndexedDB');
          // Fall back to IndexedDB
          const newProjectId = await createProject(newProjectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
          const createdProject = await db.projects.get(newProjectId);
          if (!createdProject) {
            throw new Error(`Failed to retrieve created project with ID: ${newProjectId}`);
          }
          return createdProject;
        }
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Creating project in IndexedDB');
        const newProjectId = await createProject(newProjectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
        const createdProject = await db.projects.get(newProjectId);
        if (!createdProject) {
          throw new Error(`Failed to retrieve created project with ID: ${newProjectId}`);
        }
        return createdProject;
      }
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      if (newProject.event_type === 'special') {
        queryClient.invalidateQueries({ queryKey: ['specialEventForecasts', newProject.id] });
        queryClient.invalidateQueries({ queryKey: ['specialEventActuals', newProject.id] });
        queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', newProject.id] });
      }
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

// --- Special Event Forecasts --- //

export const useSpecialEventForecasts = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  return useQuery<SpecialEventForecast[], Error>({
    queryKey: ['specialEventForecasts', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.getSpecialEventForecastsForProject(projectId);
      } else {
        // Local IndexedDB implementation (if needed)
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000, // Increased to 15 minutes to prevent unwanted refetches
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    refetchInterval: false, // Disable automatic polling
    retry: 3,
  });
};

export const useCreateSpecialEventForecast = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventForecast, Error, Partial<SpecialEventForecast>>({
    mutationFn: async (newForecastData) => {
      if (!newForecastData.project_id) throw new Error('Project ID is required for forecast');
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.createSpecialEventForecast(newForecastData);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event forecasts not implemented');
      }
    },
    onSuccess: (newForecast) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventForecasts', newForecast.project_id] });
      toast.success('Special event forecast created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create special event forecast:', error);
      toast.error('Failed to create special event forecast', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useUpdateSpecialEventForecast = () => {
  const queryClient = useQueryClient();
  return useMutation<SpecialEventForecast, Error, { id: string; data: Partial<SpecialEventForecast> }>({
    mutationFn: async ({ id, data }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.updateSpecialEventForecast(id, data);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event forecasts not implemented');
      }
    },
    onSuccess: (updatedForecast) => {
      // Update cache directly instead of invalidating to prevent form reset
      queryClient.setQueryData(
        ['specialEventForecasts', updatedForecast.project_id],
        (oldData: SpecialEventForecast[] | undefined) => {
          if (!oldData) return [updatedForecast];
          return oldData.map(forecast => 
            forecast.id === updatedForecast.id ? updatedForecast : forecast
          );
        }
      );
      
      // Also update individual forecast cache if it exists
      queryClient.setQueryData(
        ['specialEventForecasts', updatedForecast.id],
        updatedForecast
      );
      
      toast.success('Special event forecast updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update special event forecast:', error);
      toast.error('Failed to update special event forecast', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useDeleteSpecialEventForecast = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async ({ id, projectId }) => {
      if (isCloudModeEnabled()) {
        const supabaseStorage = getSupabaseStorageService();
        await supabaseStorage.deleteSpecialEventForecast(id);
      } else {
        // Local IndexedDB implementation (if needed)
        throw new Error('Local storage for special event forecasts not implemented');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialEventForecasts', variables.projectId] });
      toast.success('Special event forecast deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete special event forecast:', error);
      toast.error('Failed to delete special event forecast', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, Error, { id: string; data: Partial<Project> }>({
    mutationFn: async ({ id, data }) => {
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage - create service when auth is ready
        console.log('🌤️ Updating project in Supabase');
        const supabaseStorage = getSupabaseStorageService();
        return await supabaseStorage.updateProject(id, data);
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Updating project in IndexedDB');
        await updateProject(id, data);
        const updated = await getProject(id);
        if (!updated) {
          throw new Error(`Failed to retrieve updated project with ID: ${id}`);
        }
        return updated;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      if (variables.data.event_type === 'special') {
        queryClient.invalidateQueries({ queryKey: ['specialEventForecasts', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['specialEventActuals', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['specialEventMilestones', variables.id] });
      }
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage - create service when auth is ready
        console.log('🌤️ Deleting project in Supabase');
        const supabaseStorage = getSupabaseStorageService();
        await supabaseStorage.deleteProject(id);
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Deleting project in IndexedDB');
        await deleteProject(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    },
  });
};
