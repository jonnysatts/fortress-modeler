import { useParams } from 'react-router-dom';
import { useProject } from './useProjects';
import { useModel } from './useModels';

/**
 * Hook to get the current project based on URL params
 * Replaces Zustand's currentProject state
 */
export const useCurrentProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  return useProject(projectId);
};

/**
 * Hook to get the current model based on URL params
 * Replaces Zustand's currentModel state
 */
export const useCurrentModel = () => {
  const { modelId } = useParams<{ modelId: string }>();
  return useModel(modelId);
};

/**
 * Hook to get both current project and model with combined loading states
 * Useful for pages that need both project and model context
 */
export const useCurrentProjectAndModel = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const projectQuery = useProject(projectId);
  const modelQuery = useModel(modelId);

  return {
    project: projectQuery.data,
    model: modelQuery.data,
    isLoading: projectQuery.isLoading || modelQuery.isLoading,
    error: projectQuery.error || modelQuery.error,
    projectQuery,
    modelQuery,
  };
};