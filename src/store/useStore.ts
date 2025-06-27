import { create } from 'zustand';
import { Project, FinancialModel } from '@/lib/db';
import { storageService } from '@/lib/hybrid-storage';
import { getErrorMessage, logError } from '@/lib/errors';

// Synchronous, module-level lock to prevent race conditions during project loading
const projectLoadLocks = new Set<string>();

interface AppState {
  // State
  projects: Record<string, Project>;
  // NOTE: The StorageService does not support separate fetching for shared/public projects.
  // This functionality will need to be re-evaluated. For now, all projects are in one list.
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  activeView: 'summary' | 'parameters' | 'scenarios' | 'charts';

  // Actions
  loadProjects: () => Promise<void>;
  loadProjectById: (id: string | null | undefined) => Promise<Project | null>;
  createProject: (newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project | null>;
  updateProject: (id: string, updatedProject: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
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
  projects: {},
  currentProject: null,
  currentModel: null,
  isLoading: false,
  isCalculating: false,
  error: null,
  isSidebarOpen: false,
  isCommandPaletteOpen: false,
  activeView: 'summary',

  // Actions
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projectsArray = await storageService.getAllProjects();
      const projects = projectsArray.reduce((acc, p) => {
        if (p.id) acc[p.id.toString()] = p; // Ensure key is string
        return acc;
      }, {} as Record<string, Project>);
      set({ projects, isLoading: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, 'Failed to load projects');
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadProjectById: async (id: string | null | undefined): Promise<Project | null> => {
    console.log('🔍 loadProjectById called with:', id, 'timestamp:', Date.now());
    if (!id || projectLoadLocks.has(id)) {
      console.log('⚠️ Skipping load - either no ID or already loading:', { id, isLocked: projectLoadLocks.has(id || '') });
      return null;
    }

    try {
      projectLoadLocks.add(id);
      console.log('🔒 Added lock for project:', id);
      set({ isLoading: true, error: null });

      const project = await storageService.getProject(id);
      console.log('📦 Retrieved project:', project?.id, project?.name);
      if (project && project.id) {
        set(state => ({
          projects: { ...state.projects, [project.id!.toString()]: project },
        }));
        return project;
      }
      return null;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, `Failed to load project ${id}`);
      set({ error: errorMessage });
      return null;
    } finally {
      projectLoadLocks.delete(id);
      console.log('🔓 Released lock for project:', id);
      set({ isLoading: false });
    }
  },

  createProject: async (newProject) => {
    set({ isLoading: true, error: null });
    try {
      const createdProject = await storageService.createProject(newProject);
      console.log('🏪 Store: received created project:', createdProject);
      console.log('🏪 Store: project properties:', Object.keys(createdProject || {}));
      
      // Log the actual property names and values to debug
      if (createdProject) {
        Object.keys(createdProject).forEach(key => {
          console.log(`🏪 Store: property "${key}":`, createdProject[key]);
        });
      }
      
      // Check for different ID field names
      const projectId = createdProject?.id || createdProject?.uuid || createdProject?.projectId;
      console.log('🏪 Store: extracted project ID:', projectId);
      
      if (createdProject && projectId) {
        // Ensure the project has the correct id field for the store
        const normalizedProject = { ...createdProject, id: projectId };
        const projectKey = projectId.toString();
        console.log('🏪 Store: adding project to state with key:', projectKey);
        
        set(state => {
          const newProjects = { ...state.projects, [projectKey]: normalizedProject };
          console.log('🏪 Store: new projects state has', Object.keys(newProjects).length, 'projects');
          return {
            projects: newProjects,
            isLoading: false
          };
        });
      } else {
        console.warn('⚠️ Store: created project missing id:', createdProject);
        set({ isLoading: false });
      }
      return createdProject;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, 'Failed to create project');
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  updateProject: async (id, updatedProject) => {
    set({ isLoading: true, error: null });
    try {
      const returnedProject = await storageService.updateProject(id, updatedProject);
      set(state => ({
        projects: { ...state.projects, [id]: returnedProject },
        currentProject: state.currentProject?.id?.toString() === id ? returnedProject : state.currentProject,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, `Failed to update project ${id}`);
      set({ error: errorMessage, isLoading: false });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await storageService.deleteProject(id);
      set(state => {
        const newProjects = { ...state.projects };
        delete newProjects[id];
        return {
          projects: newProjects,
          currentProject: state.currentProject?.id?.toString() === id ? null : state.currentProject,
          isLoading: false
        };
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logError(error, `Failed to delete project ${id}`);
      set({ error: errorMessage, isLoading: false });
    }
  },

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
        console.log('🔄 UUID project detected, checking if it exists in backend...');
        try {
          // First, try to get the project from backend
          const existingProject = await storageService.getProject(currentProject.id);
          if (existingProject) {
            console.log('✅ Project already exists in backend:', existingProject.id, existingProject.name);
            // Update our current project with the backend version
            set({ currentProject: existingProject });
          } else {
            console.log('🔄 Project not found in backend, creating it...');
            const backendProject = {
              name: currentProject.name,
              description: currentProject.description || '',
              productType: currentProject.productType || 'WeeklyEvent',
              targetAudience: currentProject.targetAudience || '',
              data: currentProject.data || {}
            };
            console.log('🔄 Attempting to sync project to backend:', backendProject);
            const syncedProject = await storageService.createProject(backendProject);
            console.log('✅ Project successfully synced to backend:', syncedProject);
            
            // Update the current project with the backend project
            if (syncedProject && syncedProject.id) {
              console.log('🔄 Updating project with backend version:', syncedProject.id);
              set({ currentProject: syncedProject });
              // Also update in the projects store
              set(state => ({
                projects: { 
                  ...state.projects, 
                  [syncedProject.id!.toString()]: syncedProject 
                },
              }));
            }
          }
        } catch (syncError: any) {
          console.log('ℹ️ Project sync error:', syncError.message);
          // Continue anyway and let the model creation attempt with the original project
        }
        
        // Add a small delay to ensure backend has processed any changes
        console.log('⏱️ Adding small delay for backend propagation...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Use the updated current project (which may have been synced)
      const finalProject = get().currentProject;
      const modelToCreate = { ...newModel, projectId: finalProject?.id || currentProject.id };
      console.log('🎯 Creating model for project:', finalProject?.id || currentProject.id, 'Model data:', modelToCreate);
      const createdModel = await storageService.createModel(modelToCreate);
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
      const returnedModel = await storageService.updateModel(id, updatedModel);
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
      await storageService.deleteModel(modelId);
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
    console.log('Recalculating forecast...');
    set({ isCalculating: true });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
    set({ isCalculating: false });
    console.log('Forecast recalculated.');
  },

  setIsCalculating: (isCalculating) => set({ isCalculating }),

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),

  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),

  setActiveView: (view) => set({ activeView: view }),

  triggerFullExport: async (format) => {
    console.log(`Triggering full export for format: ${format}`);
    alert(`Export to ${format.toUpperCase()} is not yet implemented.`);
  },
}));

export default useStore;