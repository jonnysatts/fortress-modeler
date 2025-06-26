import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, FinancialModel, db } from '@/lib/db';
import { storageService } from '@/lib/hybrid-storage';

interface AppState {
  projects: Record<string | number, Project>;
  currentProject: Project | null;
  loadProjects: () => Promise<void>;
  createProject: (projectData: Partial<Project>) => Promise<Project | undefined>;
  deleteProject: (projectId: string | number) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createModelForCurrentProject: (modelData: Partial<FinancialModel>) => Promise<FinancialModel | undefined>;
}

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: {},
      currentProject: null,

      loadProjects: async () => {
        try {
          const projectsArray = await storageService.getAllProjects();
          const projectsMap = projectsArray.reduce((acc, project) => {
            if (project.id) {
              acc[project.id] = project;
            }
            return acc;
          }, {} as Record<string | number, Project>);
          set({ projects: projectsMap });
        } catch (error) {
          console.error("Failed to load projects", error);
        }
      },

      createProject: async (projectData: Partial<Project>) => {
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
    }
  )
);

export default useStore;
