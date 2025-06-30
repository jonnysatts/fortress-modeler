import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, FinancialModel } from '@/lib/db';
import { useStorageService, useErrorService } from '@/services';

// Local-only mode - cloud sync is disabled
const isCloudEnabled = () => false;

// --- Projects --- //

export const useMyProjects = () => {
  const storageService = useStorageService();
  
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'my'],
    queryFn: async () => {
      // Local-only mode - always use local storage
      return storageService.getAllProjects();
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
      // Local-only mode - no shared projects
      return [];
    },
    enabled: false, // Disabled in local-only mode
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const usePublicProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'public'],
    queryFn: async () => {
      // Local-only mode - no public projects
      return [];
    },
    enabled: false, // Disabled in local-only mode
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useProject = (projectId: string | undefined) => {
  const storageService = useStorageService();
  
  return useQuery<Project, Error>({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      // Local-only mode - always use local storage
      const project = await storageService.getProject(projectId);
      if (!project) throw new Error('Project not found');
      return project;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const storageService = useStorageService();
  const errorService = useErrorService();
  
  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: async (newProjectData) => {
      // Local-only mode - always use local storage
      return storageService.createProject(newProjectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      errorService.showSuccessToUser('Project created successfully!');
    },
    onError: (error) => {
      const category = errorService.categorizeError(error);
      const severity = category === 'network' ? 'medium' : 'high';
      
      errorService.logError(error, 'useCreateProject', category, severity);
      
      if (category === 'network') {
        errorService.handleNetworkError(error, 'useCreateProject');
      } else if (category === 'validation') {
        errorService.showErrorToUser('Invalid Project Data', 'Please check your input and try again.');
      } else {
        errorService.showErrorToUser('Failed to create project', errorService.getErrorMessage(error));
      }
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const storageService = useStorageService();
  const errorService = useErrorService();
  
  return useMutation<Project, Error, { id: string; data: Partial<Project> }>({
    mutationFn: async ({ id, data }) => {
      // Local-only mode - always use local storage
      return storageService.updateProject(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      errorService.showSuccessToUser('Project updated successfully!');
    },
    onError: (error) => {
      errorService.logError(error, 'useUpdateProject');
      errorService.showErrorToUser('Failed to update project', errorService.getErrorMessage(error));
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const storageService = useStorageService();
  const errorService = useErrorService();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      // Local-only mode - always use local storage
      await storageService.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      errorService.showSuccessToUser('Project deleted successfully!');
    },
    onError: (error) => {
      errorService.logError(error, 'useDeleteProject');
      errorService.showErrorToUser('Failed to delete project', errorService.getErrorMessage(error));
    },
  });
};

