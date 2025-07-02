import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialModel, db, getModelsForProject, getModelById, addFinancialModel, updateFinancialModel, deleteFinancialModel } from '@/lib/db';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';
import { toast } from 'sonner';
import { isCloudModeEnabled } from '@/config/app.config';

export const useModelsForProject = (projectId: string | undefined) => {
  // No normalization needed - projectId is already a string
  return useQuery<FinancialModel[], Error>({
    queryKey: ['models', projectId],
    queryFn: async () => {
      console.log('useModelsForProject queryFn called', { projectId, type: typeof projectId, cloudEnabled: isCloudModeEnabled() });
      if (!projectId) return [];
      
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage
        console.log('🌤️ Getting models from Supabase');
        const supabaseStorage = new SupabaseStorageService();
        const models = await supabaseStorage.getModelsForProject(projectId);
        console.log('useModelsForProject found models in Supabase', { projectId, count: models.length });
        return models;
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Getting models from IndexedDB');
        const models = await getModelsForProject(projectId);
        console.log('useModelsForProject found models in IndexedDB', { projectId, count: models.length });
        return models;
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useModel = (modelId: string | undefined) => {
  return useQuery<FinancialModel, Error>({
    queryKey: ['models', modelId],
    queryFn: async () => {
      if (!modelId) throw new Error('Model ID is required');
      
      if (isCloudModeEnabled()) {
        // Use Supabase for cloud storage
        console.log('🌤️ Getting model from Supabase');
        const supabaseStorage = new SupabaseStorageService();
        const model = await supabaseStorage.getModel(modelId);
        if (!model) throw new Error(`Model with ID ${modelId} not found`);
        return model;
      } else {
        // Use IndexedDB for local storage
        console.log('💾 Getting model from IndexedDB');
        return getModelById(modelId);
      }
    },
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateModel = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialModel, Error, Partial<FinancialModel>>({
    mutationFn: async (newModelData) => {
      try {
        if (isCloudModeEnabled()) {
          // Use Supabase for cloud storage
          console.log('🌤️ Creating model in Supabase');
          const supabaseStorage = new SupabaseStorageService();
          const result = await supabaseStorage.createModel(newModelData);
          console.log('✅ Model created in Supabase:', result.id);
          return result;
        } else {
          // Use IndexedDB for local storage
          console.log('💾 Creating model in IndexedDB');
          const result = await addFinancialModel(newModelData);
          return result;
        }
      } catch (error) {
        console.error('❌ Model creation failed:', error);
        throw error;
      }
    },
    // Temporarily disabled optimistic update to debug
    // onMutate: async (newModelData) => {
    //   await queryClient.cancelQueries({ queryKey: ['models', newModelData.projectId] });
    //   const previousModels = queryClient.getQueryData<FinancialModel[]>(['models', newModelData.projectId]);
    //   if (previousModels) {
    //     queryClient.setQueryData(['models', newModelData.projectId], [
    //       ...previousModels,
    //       { ...(newModelData as FinancialModel), id: Date.now() } as FinancialModel,
    //     ]);
    //   }
    //   return { previousModels };
    // },
    onError: (err, variables, context) => {
      if (context?.previousModels) {
        queryClient.setQueryData(['models', variables.projectId], context.previousModels);
      }
      toast.error(`Failed to create model: ${err.message}`);
    },
    onSuccess: (data, variables) => {
      toast.success('Model created successfully!');
      // Invalidate cache for this project's models
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['models', variables.projectId] });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
    },
  });
};

export const useUpdateModel = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialModel, Error, { id: string; projectId: string; data: Partial<FinancialModel> }>({
    mutationFn: async ({ id, projectId, data }) => {
      try {
        if (isCloudModeEnabled()) {
          // Use Supabase for cloud storage
          console.log('🌤️ Updating model in Supabase');
          const supabaseStorage = new SupabaseStorageService();
          const result = await supabaseStorage.updateModel(id, data);
          console.log('✅ Model updated in Supabase:', result.id);
          return result;
        } else {
          // Use IndexedDB for local storage
          console.log('💾 Updating model in IndexedDB');
          return updateFinancialModel(id, data);
        }
      } catch (error) {
        console.error('❌ Model update failed:', error);
        throw error;
      }
    },
    onMutate: async ({ id, projectId, data }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['models', projectId] }),
        queryClient.cancelQueries({ queryKey: ['models', id] }),
      ]);
      const previousModel = queryClient.getQueryData<FinancialModel>(['models', id]);
      const previousModels = queryClient.getQueryData<FinancialModel[]>(['models', projectId]);
      if (previousModel) {
        queryClient.setQueryData(['models', id], { ...previousModel, ...data });
      }
      if (previousModels) {
        queryClient.setQueryData(
          ['models', projectId],
          previousModels.map((m) => (m.id === id || (m.uuid && m.uuid === id)) ? { ...m, ...data } : m),
        );
      }
      return { previousModel, previousModels };
    },
    onError: (err, variables, context) => {
      if (context?.previousModel) {
        queryClient.setQueryData(['models', variables.id], context.previousModel);
      }
      if (context?.previousModels) {
        queryClient.setQueryData(['models', variables.projectId], context.previousModels);
      }
      toast.error(`Failed to update model: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Model updated successfully!');
    },
    onSettled: (_, __, vars) => {
      queryClient.invalidateQueries({ queryKey: ['models', vars.projectId] });
      queryClient.invalidateQueries({ queryKey: ['models', vars.id] });
    },
  });
};

export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { modelId: string; projectId: string }>({
    mutationFn: async ({ modelId }) => {
      try {
        if (isCloudModeEnabled()) {
          // Use Supabase for cloud storage
          console.log('🌤️ Deleting model in Supabase');
          const supabaseStorage = new SupabaseStorageService();
          await supabaseStorage.deleteModel(modelId);
          console.log('✅ Model deleted in Supabase:', modelId);
        } else {
          // Use IndexedDB for local storage
          console.log('💾 Deleting model in IndexedDB');
          await deleteFinancialModel(modelId);
        }
      } catch (error) {
        console.error('❌ Model deletion failed:', error);
        throw error;
      }
    },
    onMutate: async ({ modelId, projectId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['models', projectId] }),
        queryClient.cancelQueries({ queryKey: ['models', modelId] }),
      ]);
      const previousModels = queryClient.getQueryData<FinancialModel[]>(['models', projectId]);
      if (previousModels) {
        queryClient.setQueryData(
          ['models', projectId],
          previousModels.filter((m) => m.id !== modelId && m.uuid !== modelId),
        );
      }
      return { previousModels };
    },
    onError: (err, variables, context) => {
      if (context?.previousModels) {
        queryClient.setQueryData(['models', variables.projectId], context.previousModels);
      }
      toast.error(`Failed to delete model: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Model deleted successfully!');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['models', variables.modelId] });
    },
  });
};
