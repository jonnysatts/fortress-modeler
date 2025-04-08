import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProjectSlice } from '../projectStore';
import { Project, db } from '@/lib/db';
import { AppError, ErrorCode } from '@/lib/errorHandling';

// Mock the database
vi.mock('@/lib/db', () => {
  return {
    db: {
      projects: {
        toArray: vi.fn(),
        get: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      models: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            delete: vi.fn()
          }))
        }))
      },
      actuals: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            delete: vi.fn()
          }))
        }))
      }
    }
  };
});

// Mock error handling
vi.mock('@/lib/errorHandling', () => {
  return {
    AppError: class AppError extends Error {
      code: string;
      details?: Record<string, any>;
      constructor(message: string, code: string, details?: Record<string, any>) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
      }
    },
    ErrorCode: {
      DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
      DB_QUERY_ERROR: 'DB_QUERY_ERROR',
      DB_TRANSACTION_ERROR: 'DB_TRANSACTION_ERROR',
      INVALID_DATA: 'INVALID_DATA',
      MISSING_DATA: 'MISSING_DATA',
      DATA_NOT_FOUND: 'DATA_NOT_FOUND',
      EXPORT_ERROR: 'EXPORT_ERROR',
      PDF_GENERATION_ERROR: 'PDF_GENERATION_ERROR',
      CALCULATION_ERROR: 'CALCULATION_ERROR',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR'
    },
    handleError: vi.fn((error) => ({ message: error.message || 'Error', code: error.code || 'UNKNOWN_ERROR' })),
    logErrorToMonitoring: vi.fn()
  };
});

describe('projectStore', () => {
  // Create mock set and get functions for the store
  const set = vi.fn();
  const get = vi.fn();
  let store: ReturnType<typeof createProjectSlice>;

  // Sample project data
  const sampleProject: Project = {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a fresh store for each test
    store = createProjectSlice(set, get);

    // Setup default get return value
    get.mockReturnValue({
      projects: [sampleProject],
      currentProject: null,
      loadProjects: store.loadProjects
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadProjects', () => {
    it('should load projects successfully', async () => {
      // Mock the database response
      (db.projects.toArray as any).mockResolvedValue([sampleProject]);

      // Call the function
      await store.loadProjects();

      // Check that the database was called
      expect(db.projects.toArray).toHaveBeenCalled();

      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set
      const setFn = set.mock.calls[1][0];
      const newState = setFn({});

      // Check the new state
      expect(newState).toEqual({
        projects: [sampleProject],
        loading: { isLoading: false },
        error: { isError: false, message: null }
      });
    });

    it('should handle errors when loading projects', async () => {
      // Mock the database to throw an error
      const error = new Error('Database error');
      (db.projects.toArray as any).mockRejectedValue(error);

      // Call the function
      await store.loadProjects();

      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set for error state
      const setFn = set.mock.calls[1][0];
      const newState = setFn({});

      // Check the new state
      expect(newState).toEqual({
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      });
    });
  });

  describe('loadProjectById', () => {
    it('should load a project by ID successfully', async () => {
      // Mock the database response
      (db.projects.get as any).mockResolvedValue(sampleProject);

      // Call the function
      const result = await store.loadProjectById(1);

      // Check that the database was called with the correct ID
      expect(db.projects.get).toHaveBeenCalledWith(1);

      // Check that the result is the sample project
      expect(result).toEqual(sampleProject);

      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set
      const setFn = set.mock.calls[1][0];
      const newState = setFn({});

      // Check the new state
      expect(newState).toEqual({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      });
    });

    it('should handle project not found', async () => {
      // Mock the database to return null (project not found)
      (db.projects.get as any).mockResolvedValue(null);

      // Call the function
      const result = await store.loadProjectById(999);

      // Check that the result is null
      expect(result).toBeNull();

      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set for error state
      const setFn = set.mock.calls[1][0];
      const newState = setFn({});

      // Check the new state
      expect(newState).toEqual({
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      });
    });
  });

  describe('addProject', () => {
    it('should add a project successfully', async () => {
      // Mock the database response
      (db.projects.add as any).mockResolvedValue(1);

      // New project data
      const newProject = {
        name: 'New Project',
        description: 'A new project'
      };

      // Call the function
      const result = await store.addProject(newProject);

      // Check that the database was called
      expect(db.projects.add).toHaveBeenCalled();

      // Check that the result is the new project ID
      expect(result).toBe(1);

      // Check that loadProjects was called to refresh the list
      expect(get).toHaveBeenCalled();

      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set
      const setFn = set.mock.calls[1][0];
      const newState = setFn({});

      // Check the new state
      expect(newState).toEqual({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      });
    });

    it('should validate project data', async () => {
      // Try to add a project with an empty name
      const invalidProject = {
        name: '',
        description: 'Invalid project'
      };

      // Call the function and expect it to throw
      await expect(store.addProject(invalidProject)).rejects.toThrow();

      // Check that the database was not called
      expect(db.projects.add).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully with optimistic updates', async () => {
      // Mock the database responses
      (db.projects.update as any).mockResolvedValue(1);
      (db.projects.get as any).mockResolvedValue({
        ...sampleProject,
        name: 'Updated Project'
      });

      // Update data
      const updates = {
        name: 'Updated Project'
      };

      // Mock current project
      get.mockReturnValue({
        projects: [sampleProject],
        currentProject: sampleProject,
        loadProjects: store.loadProjects
      });

      // Call the function
      await store.updateProject(1, updates);

      // Check that the database was called with the correct ID and updates
      expect(db.projects.update).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Updated Project',
        updatedAt: expect.any(Date)
      }));

      // Check that set was called for optimistic update
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set for optimistic update
      const optimisticSetFn = set.mock.calls[1][0];
      const optimisticState = optimisticSetFn({
        projects: [sampleProject],
        currentProject: sampleProject
      });

      // Check the optimistic state
      expect(optimisticState.currentProject.name).toBe('Updated Project');
      expect(optimisticState.projects[0].name).toBe('Updated Project');
    });

    it('should handle errors and rollback state', async () => {
      // Mock the database to throw an error
      const error = new Error('Database error');
      (db.projects.update as any).mockRejectedValue(error);

      // Original state
      const originalState = {
        projects: [sampleProject],
        currentProject: sampleProject,
        loading: { isLoading: false },
        error: { isError: false, message: null }
      };

      // Mock get to return the original state
      get.mockReturnValue(originalState);

      // Update data
      const updates = {
        name: 'This will fail'
      };

      // Call the function and expect it to throw
      await expect(store.updateProject(1, updates)).rejects.toThrow();

      // Check that set was called to rollback to the original state
      expect(set).toHaveBeenCalledWith(expect.objectContaining({
        ...originalState,
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      }));
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully with optimistic updates', async () => {
      // Mock the database responses
      (db.projects.delete as any).mockResolvedValue(undefined);
      (db.financialModels.where().equals().delete as any).mockResolvedValue(undefined);
      (db.actuals.where().equals().delete as any).mockResolvedValue(undefined);

      // Mock current project
      get.mockReturnValue({
        projects: [sampleProject],
        currentProject: sampleProject,
        loadProjects: store.loadProjects
      });

      // Call the function
      await store.deleteProject(1);

      // Check that the database was called with the correct ID
      expect(db.projects.delete).toHaveBeenCalledWith(1);

      // Check that set was called for optimistic update
      expect(set).toHaveBeenCalledWith(expect.any(Function));

      // Get the function passed to set for optimistic update
      const optimisticSetFn = set.mock.calls[1][0];
      const optimisticState = optimisticSetFn({
        projects: [sampleProject],
        currentProject: sampleProject
      });

      // Check the optimistic state
      expect(optimisticState.projects).toEqual([]);
      expect(optimisticState.currentProject).toBeNull();
    });

    it('should handle errors and rollback state', async () => {
      // Mock the database to throw an error
      const error = new Error('Database error');
      (db.projects.delete as any).mockRejectedValue(error);

      // Original state
      const originalState = {
        projects: [sampleProject],
        currentProject: sampleProject,
        loading: { isLoading: false },
        error: { isError: false, message: null }
      };

      // Mock get to return the original state
      get.mockReturnValue(originalState);

      // Call the function and expect it to throw
      await expect(store.deleteProject(1)).rejects.toThrow();

      // Check that set was called to rollback to the original state
      expect(set).toHaveBeenCalledWith(expect.objectContaining({
        ...originalState,
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      }));
    });
  });
});
