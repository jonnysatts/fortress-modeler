
import { create } from 'zustand';
import { Project, FinancialModel, db } from '@/lib/db';

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  error: string | null;
  
  loadProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentModel: (model: FinancialModel | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
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
}));

export default useStore;
