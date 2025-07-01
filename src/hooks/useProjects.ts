import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, FinancialModel, db, getProject, createProject, updateProject, deleteProject } from '@/lib/db';
import { toast } from 'sonner';

// Check if cloud sync is enabled via environment variable
const isCloudEnabled = () => import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true';

// --- Projects --- //

export const useMyProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'my'],
    queryFn: async () => {
      // Direct database access - no service layer needed
      return db.projects.toArray();
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
  return useQuery<Project, Error>({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      // Direct database access
      const project = await getProject(projectId);
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
  
  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: async (newProjectData) => {
      // Direct database access
      const newProjectId = await createProject(newProjectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
      const createdProject = await db.projects.get(newProjectId);
      if (!createdProject) {
        throw new Error(`Failed to retrieve created project with ID: ${newProjectId}`);
      }
      return createdProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
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

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, Error, { id: string; data: Partial<Project> }>({
    mutationFn: async ({ id, data }) => {
      // Direct database access
      await updateProject(id, data);
      const updated = await getProject(id);
      if (!updated) {
        throw new Error(`Failed to retrieve updated project with ID: ${id}`);
      }
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
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
      // Direct database access
      await deleteProject(id);
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

