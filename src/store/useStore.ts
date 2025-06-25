import { create } from 'zustand';
import { Project, FinancialModel } from '@/types/models';
import { storageService } from '@/lib/hybrid-storage';
import { getErrorMessage, isAppError, logError } from '@/lib/errors';

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  error: string | null;
  
  loadProjects: () => Promise<void>;
  loadProjectById: (id: string) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentModel: (model: FinancialModel | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Financial model methods
  loadModelsForProject: (projectId: string) => Promise<FinancialModel[]>;
  loadModelById: (id: string) => Promise<FinancialModel | null>;
  addFinancialModel: (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FinancialModel>;
  updateFinancialModel: (id: string, updates: Partial<FinancialModel>) => Promise<void>;
  deleteFinancialModel: (id: string) => Promise<void>;
  
  // Sync methods
  syncWithCloud: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentModel: null,
  isLoading: false,
  error: null,
  
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await storageService.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      logError(error, 'Store.loadProjects');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  loadProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await storageService.getProject(id);
      if (project) {
        set({ currentProject: project, isLoading: false });
        return project;
      } else {
        set({ error: 'Project not found', isLoading: false });
        return null;
      }
    } catch (error) {
      logError(error, 'Store.loadProjectById');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  setCurrentModel: (model) => set({ currentModel: model }),
  
  addProject: async (project) => {
    set({ isLoading: true, error: null });
    try {
      const newProject = await storageService.createProject(project);
      
      // Update projects list
      set(state => ({
        projects: [...state.projects, newProject],
        isLoading: false
      }));
      
      return newProject.id.toString();
    } catch (error) {
      logError(error, 'Store.addProject');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  
  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await storageService.updateProject(id, updates);
      
      // Update projects list
      set(state => ({
        projects: state.projects.map(p => p.id.toString() === id ? updatedProject : p),
        isLoading: false
      }));
      
      // Update current project if it's the one being edited
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id.toString() === id) {
        set({ currentProject: updatedProject });
      }
    } catch (error) {
      logError(error, 'Store.updateProject');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  
  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await storageService.deleteProject(id);
      
      // Remove from projects list
      set(state => ({
        projects: state.projects.filter(p => p.id.toString() !== id),
        isLoading: false
      }));
      
      // Reset current project if it's the one being deleted
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id.toString() === id) {
        set({ currentProject: null });
      }
    } catch (error) {
      logError(error, 'Store.deleteProject');
      const errorMessage = getErrorMessage(error);
      
      // If project doesn't exist in storage but exists in UI (phantom project), remove it anyway
      if (errorMessage.includes('Project not found') || errorMessage.includes('not found')) {
        console.log('Removing phantom project from UI:', id);
        set(state => ({
          projects: state.projects.filter(p => p.id.toString() !== id),
          isLoading: false
        }));
        
        // Reset current project if it's the one being deleted
        const currentProject = get().currentProject;
        if (currentProject && currentProject.id.toString() === id) {
          set({ currentProject: null });
        }
        return; // Don't throw error for phantom projects
      }
      
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  loadModelById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const model = await storageService.getModel(id);
      if (model) {
        set({ currentModel: model, isLoading: false });
        return model;
      } else {
        set({ error: 'Model not found', isLoading: false });
        return null;
      }
    } catch (error) {
      logError(error, 'Store.loadModelById');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  loadModelsForProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const models = await storageService.getModelsForProject(projectId);
      set({ isLoading: false });
      return models;
    } catch (error) {
      logError(error, 'Store.loadModelsForProject');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  addFinancialModel: async (model) => {
    set({ isLoading: true, error: null });
    try {
      const newModel = await storageService.createModel(model);
      set({ isLoading: false });
      return newModel;
    } catch (error) {
      logError(error, 'Store.addFinancialModel');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateFinancialModel: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedModel = await storageService.updateModel(id, updates);
      
      // Update current model if it's the one being edited
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id.toString() === id) {
        set({ currentModel: updatedModel });
      }
      
      set({ isLoading: false });
    } catch (error) {
      logError(error, 'Store.updateFinancialModel');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteFinancialModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await storageService.deleteModel(id);
      
      // Reset current model if it's the one being deleted
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id.toString() === id) {
        set({ currentModel: null });
      }
      
      set({ isLoading: false });
    } catch (error) {
      logError(error, 'Store.deleteFinancialModel');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  syncWithCloud: async () => {
    if (!storageService.syncWithCloud) {
      console.log('Sync not supported by current storage service');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await storageService.syncWithCloud();
      // Reload projects after sync
      await get().loadProjects();
      set({ isLoading: false });
    } catch (error) {
      logError(error, 'Store.syncWithCloud');
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
}));

export default useStore;