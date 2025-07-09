import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, FinancialModel, db, getProject, createProject, updateProject, deleteProject } from '@/lib/db';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';
import { toast } from 'sonner';
import { isCloudModeEnabled } from '@/config/app.config';

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
          const supabaseStorage = new SupabaseStorageService();
          console.log('🔍 Service created successfully');
          const result = await supabaseStorage.getAllProjects();
          console.log('🔍 getAllProjects result:', result);
          return result;
        } catch (error) {
          console.error('🚨 DETAILED ERROR in getAllProjects:', {
            error,
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            cause: error?.cause
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

export const useSharedProjects = () => {
  const cloudEnabled = isCloudModeEnabled();
  
  return useQuery<Project[], Error>({
    queryKey: ['projects', 'shared'],
    queryFn: async () => {
      if (!cloudEnabled) {
        return [];
      }
      
      try {
        const supabaseStorage = new SupabaseStorageService();
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
        const supabaseStorage = new SupabaseStorageService();
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
        const supabaseStorage = new SupabaseStorageService();
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
          const supabaseStorage = new SupabaseStorageService();
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
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage - create service when auth is ready
        console.log('🌤️ Updating project in Supabase');
        const supabaseStorage = new SupabaseStorageService();
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
        const supabaseStorage = new SupabaseStorageService();
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

