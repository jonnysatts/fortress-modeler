import { create } from 'zustand';
import { Project, FinancialModel } from '@/lib/db';
import { storageService } from '@/lib/hybrid-storage';
import { getErrorMessage, logError } from '@/lib/errors';
import { devLog } from '@/lib/devLog';


interface AppState {
  // State
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  activeView: 'summary' | 'parameters' | 'scenarios' | 'charts';

  // Actions
  setCurrentProject: (project: Project | null) => void;

  // Model Actions
  createModelForCurrentProject: (newModel: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>) => Promise<FinancialModel | null>;
  updateModelForCurrentProject: (id: string, updatedModel: Partial<FinancialModel>) => Promise<void>;
  deleteModelForCurrentProject: (modelId: string) => Promise<void>;
  selectModel: (model: FinancialModel | null) => void;

  // UI Actions
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  recalculateForecast: () => Promise<void>;
  setIsCalculating: (isCalculating: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setActiveView: (view: 'summary' | 'parameters' | 'scenarios' | 'charts') => void;
  triggerFullExport: (format: 'pdf' | 'xlsx') => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
  // Initial State
  currentProject: null,
  currentModel: null,
  isLoading: false,
  isCalculating: false,
  error: null,
  isSidebarOpen: false,
  isCommandPaletteOpen: false,
  activeView: 'summary',

  // Actions
  setCurrentProject: (project) => set({ currentProject: project, currentModel: null }),

  createModelForCurrentProject: async (newModel) => {
    const currentProject = get().currentProject;
    if (!currentProject || !currentProject.id) {
      const err = 'No current project selected to add a model to.';
      logError(new Error(err));
      set({ error: err });
      return null;
    }
    set({ isLoading: true, error: null });
    try {
      // WORKAROUND: For UUID projects that may not exist in backend, check if they exist first
      const isUUID = typeof currentProject.id === 'string' && currentProject.id.includes('-');
      if (isUUID) {
        devLog('🔄 UUID project detected, checking if it exists in backend...');
        try {
          // First, try to get the project from backend
          const existingProject = await storageService.getProjectLocal(currentProject.id);
          if (existingProject) {
            devLog('✅ Project already exists in backend:', existingProject.id, existingProject.name);
            // Update our current project with the backend version
            set({ currentProject: existingProject });
          } else {
            devLog('🔄 Project not found in backend, creating it...');
            const backendProject = {
              name: currentProject.name,
              description: currentProject.description || '',
              productType: currentProject.productType || 'WeeklyEvent',
              targetAudience: currentProject.targetAudience || '',
              data: currentProject.data || {}
            };
            devLog('🔄 Attempting to sync project to backend:', backendProject);
            const syncedProject = await storageService.createProjectLocal(backendProject);
            devLog('✅ Project successfully synced to backend:', syncedProject);
            
            // Update the current project with the backend project
            if (syncedProject && syncedProject.id) {
              devLog('🔄 Updating project with backend version:', syncedProject.id);
              set({ currentProject: syncedProject });
            }
          }
        } catch (syncError: any) {
          devLog('ℹ️ Project sync error:', syncError.message);
          // Continue anyway and let the model creation attempt with the original project
        }
        
        // Add a small delay to ensure backend has processed any changes
        devLog('⏱️ Adding small delay for backend propagation...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Use the updated current project (which may have been synced)
      const finalProject = get().currentProject;
      const modelToCreate = { ...newModel, projectId: finalProject?.id || currentProject.id };
      devLog('🎯 Creating model for project:', finalProject?.id || currentProject.id, 'Model data:', modelToCreate);
      const createdModel = await storageService.createModelLocal(modelToCreate);
      set({ currentModel: createdModel, isLoading: false });
      return createdModel;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, 'Failed to create financial model');
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  updateModelForCurrentProject: async (id, updatedModel) => {
    set({ isLoading: true, error: null });
    try {
      const returnedModel = await storageService.updateModelLocal(id, updatedModel);
      set(state => ({
        currentModel: state.currentModel?.id?.toString() === id ? returnedModel : state.currentModel,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, `Failed to update model ${id}`);
      set({ error: errorMessage, isLoading: false });
    }
  },

  deleteModelForCurrentProject: async (modelId) => {
    set({ isLoading: true, error: null });
    try {
      await storageService.deleteModelLocal(modelId);
      set(state => ({
        currentModel: state.currentModel?.id?.toString() === modelId ? null : state.currentModel,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, `Failed to delete model ${modelId}`);
      set({ error: errorMessage, isLoading: false });
    }
  },

  selectModel: (model) => set({ currentModel: model }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  recalculateForecast: async () => {
    devLog('Recalculating forecast...');
    set({ isCalculating: true });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
    set({ isCalculating: false });
    devLog('Forecast recalculated.');
  },

  setIsCalculating: (isCalculating) => set({ isCalculating }),

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),

  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),

  setActiveView: (view) => set({ activeView: view }),

  triggerFullExport: async (format) => {
    devLog(`Triggering full export for format: ${format}`);
    alert(`Export to ${format.toUpperCase()} is not yet implemented.`);
  },
}));

export default useStore;