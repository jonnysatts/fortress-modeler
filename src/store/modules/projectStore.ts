import { StateCreator } from 'zustand';
import { Project, db } from '@/lib/db';
import { BaseState, createInitialBaseState } from '../types';
import { AppError, ErrorCode, handleError, logErrorToMonitoring } from '@/lib/errorHandling';

// Define the Project Store slice
export interface ProjectState extends BaseState {
  // State
  projects: Project[];
  currentProject: Project | null;

  // Actions
  loadProjects: () => Promise<void>;
  loadProjectById: (id: number) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

// Create the project store slice
export const createProjectSlice: StateCreator<ProjectState> = (set, get) => ({
  // Initial state
  ...createInitialBaseState(),
  projects: [],
  currentProject: null,

  // Actions
  loadProjects: async () => {
    try {
      set(state => ({ loading: { isLoading: true } }));
      const projects = await db.projects.toArray();
      set(state => ({
        projects,
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      // Enhanced error handling
      const { message, code } = handleError(error, 'Failed to load projects');
      logErrorToMonitoring(error, { action: 'loadProjects' });

      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message }
      }));
    }
  },

  loadProjectById: async (id: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));
      const project = await db.projects.get(id);

      if (project) {
        set(state => ({
          loading: { isLoading: false },
          error: { isError: false, message: null }
        }));
        return project;
      } else {
        // Throw a specific error for not found
        throw new AppError(
          `Project with ID ${id} not found`,
          ErrorCode.DATA_NOT_FOUND,
          { projectId: id }
        );
      }
    } catch (error) {
      // Enhanced error handling
      const { message, code } = handleError(error, `Failed to load project ${id}`);
      logErrorToMonitoring(error, { action: 'loadProjectById', projectId: id });

      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message }
      }));
      return null;
    }
  },

  setCurrentProject: (project: Project | null) => {
    set(state => ({ currentProject: project }));
  },

  addProject: async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate project data
      if (!project.name) {
        throw new AppError(
          'Project name is required',
          ErrorCode.INVALID_DATA,
          { field: 'name' }
        );
      }

      set(state => ({ loading: { isLoading: true } }));

      const now = new Date();
      const newProject = {
        ...project,
        createdAt: now,
        updatedAt: now
      };

      const id = await db.projects.add(newProject as Project);

      // Refresh the projects list
      await get().loadProjects();

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));

      return id;
    } catch (error) {
      // Enhanced error handling
      const { message, code } = handleError(error, 'Failed to add project');
      logErrorToMonitoring(error, { action: 'addProject', projectData: project });

      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message }
      }));
      throw error;
    }
  },

  updateProject: async (id: number, updates: Partial<Project>) => {
    // Store the original state for rollback in case of error
    const originalState = get();
    const { projects, currentProject } = originalState;

    try {
      // Validate updates
      if (updates.name === '') {
        throw new AppError(
          'Project name cannot be empty',
          ErrorCode.INVALID_DATA,
          { field: 'name' }
        );
      }

      // Start loading state
      set(state => ({ loading: { isLoading: true } }));

      const updatedProject = {
        ...updates,
        updatedAt: new Date()
      };

      // Optimistically update the UI state
      if (currentProject && currentProject.id === id) {
        // Create an optimistic version of the current project
        const optimisticProject = {
          ...currentProject,
          ...updatedProject
        };

        // Update the current project in the state
        set(state => ({
          currentProject: optimisticProject,
          // Also update the project in the projects array
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updatedProject } : p
          )
        }));
      } else {
        // Just update the project in the projects array
        set(state => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updatedProject } : p
          )
        }));
      }

      // Actually perform the update in the database
      await db.projects.update(id, updatedProject);

      // Fetch the updated project to ensure we have the latest data
      const updated = await db.projects.get(id);

      // Update the state with the actual data from the database
      if (updated) {
        if (currentProject && currentProject.id === id) {
          set(state => ({ currentProject: updated }));
        }

        set(state => ({
          projects: state.projects.map(p => p.id === id ? updated : p),
          loading: { isLoading: false },
          error: { isError: false, message: null }
        }));
      }
    } catch (error) {
      // Enhanced error handling
      const { message, code } = handleError(error, `Failed to update project ${id}`);
      logErrorToMonitoring(error, { action: 'updateProject', projectId: id, updates });

      // Rollback to the original state
      set({
        ...originalState,
        loading: { isLoading: false },
        error: { isError: true, message }
      });

      throw error;
    }
  },

  deleteProject: async (id: number) => {
    // Store the original state for rollback in case of error
    const originalState = get();
    const { projects, currentProject } = originalState;

    try {
      // Start loading state
      set(state => ({ loading: { isLoading: true } }));

      // Optimistically update the UI state
      set(state => ({
        // Remove the project from the projects array
        projects: state.projects.filter(p => p.id !== id),
        // Clear current project if it's the one being deleted
        currentProject: currentProject && currentProject.id === id ? null : currentProject
      }));

      // Actually perform the deletion in the database
      // Delete all models associated with this project
      await db.financialModels.where('projectId').equals(id).delete();

      // Delete all actuals associated with this project
      await db.actuals.where('projectId').equals(id).delete();

      // Delete the project
      await db.projects.delete(id);

      // Update loading and error state
      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      // Enhanced error handling
      const { message, code } = handleError(error, `Failed to delete project ${id}`);
      logErrorToMonitoring(error, { action: 'deleteProject', projectId: id });

      // Rollback to the original state
      set({
        ...originalState,
        loading: { isLoading: false },
        error: { isError: true, message }
      });

      throw error;
    }
  }
});
