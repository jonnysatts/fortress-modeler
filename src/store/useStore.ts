import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, FinancialModel, db } from '@/lib/db';
import { Project, FinancialModel } from '@/lib/db'; // Removed db import as it's not directly used here
import { storageService } from '@/lib/hybrid-storage';

interface AppState {
  projects: Record<string | number, Project>;
  currentProject: Project | null;
  isLoading: boolean; // Added for global loading state
  error: string | null; // Added for global error state
  loadProjects: () => Promise<void>;
  createProject: (projectData: Partial<Project>) => Promise<Project | undefined>;
  deleteProject: (projectId: string | number) => Promise<void>;
Unchanged lines  persist(
    (set, get) => ({
      projects: {},
      currentProject: null,
      isLoading: false, // Initialize loading state
      error: null, // Initialize error state

      loadProjects: async () => {
        set({ isLoading: true, error: null }); // Set loading true, clear previous errors
        try {
          const projectsArray = await storageService.getAllProjects();
          const projectsMap = projectsArray.reduce((acc, project) => {
            if (project.id) {
Unchanged lines            }
            return acc;
          }, {} as Record<string | number, Project>);
          set({ projects: projectsMap });
          set({ projects: projectsMap, isLoading: false }); // Set projects and loading false on success
        } catch (error) {
          console.error("Failed to load projects", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          console.error("Failed to load projects in store:", error);
          set({ isLoading: false, error: `Failed to load projects: ${errorMessage}` }); // Set error and loading false on failure
        }
      },

      createProject: async (projectData: Partial<Project>) => {
        set({ isLoading: true }); // Set loading true for creation
        try {
          const newProject = await storageService.createProject(projectData);
          set(state => ({
            projects: { ...state.projects, [newProject.id!]: newProject }
          }));
          return newProject;
        } catch (error) {
          console.error("Failed to create project", error);
          return undefined;
        }
      },

      deleteProject: async (projectId: string | number) => {
        // This is a complex operation involving deleting related models, etc.
        // For now, we'll just remove it from the store and assume DB handles cascades or it's handled elsewhere.
        console.log(`Deleting project ${projectId}`);
        set(state => {
          const newProjects = { ...state.projects };
          delete newProjects[projectId];
          return { projects: newProjects };
        });
        try {
          await storageService.deleteProject(projectId); // Delegate deletion to storageService
          set(state => {
            const newProjects = { ...state.projects };
            delete newProjects[projectId];
            return { projects: newProjects, currentProject: null }; // Clear current project if deleted
          });
        } catch (error) {
          console.error(`Failed to delete project ${projectId} in store:`, error);
          set({ error: "Failed to delete project." }); // Set error on failure
        }
      },

      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
      },

      createModelForCurrentProject: async (modelData: Partial<FinancialModel>) => {
        const { currentProject } = get();
        if (!currentProject || !currentProject.id) {
          console.error("No current project selected to add a model to.");
          return undefined;
        }
        try {
          // This should ideally use storageService as well
          const newModel = {
            ...modelData,
            projectId: currentProject.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as FinancialModel;

          const newModelId = await db.financialModels.add(newModel);
          const createdModel = await db.financialModels.get(newModelId);
          
          return createdModel;
          // Now correctly uses storageService to handle local vs cloud model creation
          const newModel = await storageService.createModel({
            ...modelData,
            projectId: currentProject.id, // Ensure projectId is passed
          });
          return newModel;
        } catch (error) {
          console.error("Failed to create model for current project", error);
          return undefined;
        }
      },
    }),
    {
      name: 'fortress-modeler-storage',
      storage: createJSONStorage(() => localStorage),
      // Do not persist the main projects map to avoid stale data.
      // It will be loaded fresh on app start.
      partialize: (state) => ({ currentProject: state.currentProject }),
