import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Project, FinancialModel } from '@/lib/db';
import { storageService } from '@/lib/hybrid-storage';
import { toast } from 'sonner';

// Helper to check if cloud sync is enabled
const isCloudEnabled = () => {
  // This should ideally come from a more robust config/auth context
  // For now, we'll use the same logic as in hybrid-storage.ts
  try {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    return !!(token && userData);
  } catch (error) {
    console.error("Could not get auth data from localStorage", error);
  }
  return false;
};

// --- Projects --- //

export const useMyProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'my'],
    queryFn: async () => {
      // Always try local first, then sync with cloud if enabled
      const localProjects = await storageService.getAllProjectsLocal();
      if (isCloudEnabled()) {
        try {
          const cloudProjects = await apiService.getProjects();
          // TODO: Implement proper reconciliation logic here
          // For now, we'll just return cloud projects if successful
          return cloudProjects;
        } catch (error) {
          console.error('Failed to load projects from cloud, falling back to local:', error);
          return localProjects;
        }
      }
      return localProjects;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useSharedProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'shared'],
    queryFn: async () => {
      if (!isCloudEnabled()) {
        return [];
      }
      const response = await apiService.getSharedWithMeProjects();
      return response.projects;
    },
    enabled: isCloudEnabled(), // Only fetch if cloud is enabled
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const usePublicProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'public'],
    queryFn: async () => {
      if (!isCloudEnabled()) {
        return [];
      }
      const response = await apiService.getPublicProjects();
      return response.projects;
    },
    enabled: isCloudEnabled(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useProject = (projectId: string | number | undefined) => {
  return useQuery<Project, Error>({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      if (typeof projectId === 'string' && projectId.includes('-') && isCloudEnabled()) {
        const project = await apiService.getProject(projectId);
        if (!project) throw new Error('Project not found');
        return project;
      }
      const project = await storageService.getProjectLocal(projectId);
      if (!project) throw new Error('Project not found');
      return project;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1, // Reduce retries to prevent hanging
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: async (newProjectData) => {
      if (isCloudEnabled()) {
        return apiService.createProject(newProjectData);
      }
      return storageService.createProjectLocal(newProjectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, { id: string | number; data: Partial<Project> }>({
    mutationFn: async ({ id, data }) => {
      if (typeof id === 'string' && id.includes('-') && isCloudEnabled()) {
        return apiService.updateProject(id, data);
      }
      return storageService.updateProjectLocal(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string | number>({
    mutationFn: async (id) => {
      if (typeof id === 'string' && id.includes('-') && isCloudEnabled()) {
        await apiService.deleteProject(id);
      } else {
        await storageService.deleteProjectLocal(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
};

// --- Models --- //

export const useModelsForProject = (projectId: string | number | undefined) => {
  return useQuery<FinancialModel[], Error>({
    queryKey: ['models', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      if (typeof projectId === 'string' && projectId.includes('-') && isCloudEnabled()) {
        return apiService.getModelsForProject(projectId);
      }
      return storageService.getModelsForProjectLocal(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useCreateModel = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialModel, Error, Partial<FinancialModel>>({
    mutationFn: async (newModelData) => {
      if (isCloudEnabled() && typeof newModelData.projectId === 'string' && newModelData.projectId.includes('-')) {
        return apiService.createModel(newModelData);
      }
      return storageService.createModelLocal(newModelData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
      toast.success('Model created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create model: ${error.message}`);
    },
  });
};

export const useUpdateModel = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialModel, Error, { id: string | number; data: Partial<FinancialModel> }>({
    mutationFn: async ({ id, data }) => {
      if (typeof id === 'string' && id.includes('-') && isCloudEnabled()) {
        return apiService.updateModel(id, data);
      }
      return storageService.updateModelLocal(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['models', variables.id] });
      toast.success('Model updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update model: ${error.message}`);
    },
  });
};

export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { modelId: string | number; projectId: string | number }>({
    mutationFn: async ({ modelId, projectId }) => {
      if (typeof modelId === 'string' && modelId.includes('-') && isCloudEnabled()) {
        await apiService.deleteModel(modelId);
      } else {
        await storageService.deleteModelLocal(modelId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
      toast.success('Model deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete model: ${error.message}`);
    },
  });
};