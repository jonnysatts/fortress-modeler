import { create } from 'zustand';
import { Project, FinancialModel, db } from '@/lib/db';

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  error: string | null;
  
  loadProjects: () => Promise<void>;
  loadProjectById: (id: number) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentModel: (model: FinancialModel | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  
  // Financial model methods
  loadModelsForProject: (projectId: number) => Promise<FinancialModel[]>;
  addFinancialModel: (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateFinancialModel: (id: number, updates: Partial<FinancialModel>) => Promise<void>;
  deleteFinancialModel: (id: number) => Promise<void>;
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
      const projects = await db.projects.toArray();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Error loading projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },
  
  loadProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await db.projects.get(id);
      if (project) {
        set({ currentProject: project, isLoading: false });
      } else {
        set({ error: 'Project not found', isLoading: false });
      }
      return project || null;
    } catch (error) {
      console.error('Error loading project:', error);
      set({ error: 'Failed to load project', isLoading: false });
      return null;
    }
  },
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  setCurrentModel: (model) => set({ currentModel: model }),
  
  addProject: async (project) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.projects.add({
        ...project,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await get().loadProjects();
      return id;
    } catch (error) {
      console.error('Error adding project:', error);
      set({ error: 'Failed to add project', isLoading: false });
      return -1;
    }
  },
  
  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.projects.update(id, { ...updates, updatedAt: new Date() });
      await get().loadProjects();
      
      // Update current project if it's the one being edited
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        const updatedProject = await db.projects.get(id);
        if (updatedProject) {
          set({ currentProject: updatedProject });
        }
      }
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: 'Failed to update project', isLoading: false });
    }
  },
  
  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await db.projects.delete(id);
      
      // Reset current project if it's the one being deleted
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        set({ currentProject: null });
      }
      
      await get().loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: 'Failed to delete project', isLoading: false });
    }
  },

  // Financial model methods
  loadModelsForProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const models = await db.financialModels
        .where('projectId')
        .equals(projectId)
        .toArray();
      set({ isLoading: false });
      return models;
    } catch (error) {
      console.error('Error loading financial models:', error);
      set({ error: 'Failed to load financial models', isLoading: false });
      return [];
    }
  },

  addFinancialModel: async (model) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.financialModels.add({
        ...model,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error adding financial model:', error);
      set({ error: 'Failed to add financial model', isLoading: false });
      return -1;
    }
  },

  updateFinancialModel: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.update(id, { ...updates, updatedAt: new Date() });
      
      // Update current model if it's the one being edited
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        const updatedModel = await db.financialModels.get(id);
        if (updatedModel) {
          set({ currentModel: updatedModel });
        }
      }
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating financial model:', error);
      set({ error: 'Failed to update financial model', isLoading: false });
    }
  },

  deleteFinancialModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.delete(id);
      
      // Reset current model if it's the one being deleted
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        set({ currentModel: null });
      }
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error deleting financial model:', error);
      set({ error: 'Failed to delete financial model', isLoading: false });
    }
  },
}));

export default useStore;
