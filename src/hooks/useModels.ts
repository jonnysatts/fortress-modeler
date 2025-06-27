import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialModel } from '@/lib/db';
import { apiService } from '@/lib/api';
import { storageService } from '@/lib/hybrid-storage';
import { toast } from 'sonner';

const isCloudEnabled = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    return !!(token && userData);
  } catch (error) {
    console.error('Could not get auth data from localStorage', error);
  }
  return false;
};

export const useModelsForProject = (projectId: string | number | undefined) => {
  return useQuery<FinancialModel[], Error>({
    queryKey: ['models', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      if (typeof projectId === 'string' && projectId.includes('-') && isCloudEnabled()) {
        return apiService.getModelsForProject(projectId);
      }
      return storageService.getModelsForProjectLocal(Number(projectId));
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
      if (modelId.includes('-') && isCloudEnabled()) {
        return apiService.getModel(modelId);
      }
      return storageService.getModelLocal(modelId);
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
      if (
        isCloudEnabled() &&
        typeof newModelData.projectId === 'string' &&
        newModelData.projectId.includes('-')
      ) {
        return apiService.createModel(newModelData);
      }
      return storageService.createModelLocal(newModelData);
    },
    onMutate: async (newModelData) => {
      await queryClient.cancelQueries({ queryKey: ['models', newModelData.projectId] });
      const previousModels = queryClient.getQueryData<FinancialModel[]>(['models', newModelData.projectId]);
      if (previousModels) {
        queryClient.setQueryData(['models', newModelData.projectId], [
          ...previousModels,
          { ...(newModelData as FinancialModel), id: Date.now() } as FinancialModel,
        ]);
      }
      return { previousModels };
    },
    onError: (err, variables, context) => {
      if (context?.previousModels) {
        queryClient.setQueryData(['models', variables.projectId], context.previousModels);
      }
      toast.error(`Failed to create model: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Model created successfully!');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models', variables.projectId] });
    },
  });
};

export const useUpdateModel = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialModel, Error, { id: string | number; projectId: string | number; data: Partial<FinancialModel> }>({
    mutationFn: async ({ id, projectId, data }) => {
      if (typeof id === 'string' && id.includes('-') && isCloudEnabled()) {
        return apiService.updateModel(id, data);
      }
      return storageService.updateModelLocal(id, data);
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
  return useMutation<void, Error, { modelId: string | number; projectId: string | number }>({
    mutationFn: async ({ modelId }) => {
      if (typeof modelId === 'string' && modelId.includes('-') && isCloudEnabled()) {
        await apiService.deleteModel(modelId);
      } else {
        await storageService.deleteModelLocal(Number(modelId));
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
