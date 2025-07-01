import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { DataMigrationService, MigrationOptions } from '../DataMigrationService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';

// Mock dependencies
const mockLogService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockErrorService = {
  logError: vi.fn(),
  showError: vi.fn(),
};

const mockDexieService = {
  getAllProjects: vi.fn(),
  getModelsForProject: vi.fn(),
  getActualsForProject: vi.fn(),
};

const mockSupabaseService = {
  getAllProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  getModelsForProject: vi.fn(),
  createModel: vi.fn(),
  getActualsForProject: vi.fn(),
  upsertActualsPeriod: vi.fn(),
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

// Mock modules
vi.mock('../../container/ServiceContainer', () => ({
  serviceContainer: {
    resolve: vi.fn((token) => {
      if (token === 'ILogService') return mockLogService;
      if (token === 'IErrorService') return mockErrorService;
      throw new Error(`Unknown service token: ${token}`);
    }),
  },
  SERVICE_TOKENS: {
    LOG_SERVICE: 'ILogService',
    ERROR_SERVICE: 'IErrorService',
  },
}));

vi.mock('../../implementations/DexieStorageService', () => ({
  DexieStorageService: vi.fn(() => mockDexieService),
}));

vi.mock('../../implementations/SupabaseStorageService', () => ({
  SupabaseStorageService: vi.fn(() => mockSupabaseService),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let mockProjects: Project[];
  let mockModels: FinancialModel[];
  let mockActuals: ActualsPeriodEntry[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    service = new DataMigrationService();

    // Mock data
    mockProjects = [
      {
        id: 'project-1',
        name: 'Test Project 1',
        productType: 'SaaS',
        description: 'Test description',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        targetAudience: 'Developers',
        timeline: { startDate: new Date('2023-01-01') },
        avatarImage: 'avatar.jpg',
        is_public: false,
        shared_by: 'test@example.com',
        owner_email: 'test@example.com',
        share_count: 0,
        permission: 'owner' as const,
      },
      {
        id: 'project-2',
        name: 'Test Project 2',
        productType: 'E-commerce',
        description: 'Another test',
        createdAt: new Date('2023-02-01'),
        updatedAt: new Date('2023-02-02'),
        targetAudience: 'Consumers',
        timeline: { startDate: new Date('2023-02-01') },
        avatarImage: 'avatar2.jpg',
        is_public: true,
        shared_by: 'test@example.com',
        owner_email: 'test@example.com',
        share_count: 5,
        permission: 'owner' as const,
      },
    ];

    mockModels = [
      {
        id: 'model-1',
        projectId: 'project-1',
        name: 'Model 1',
        assumptions: {
          revenue: [{ name: 'Revenue Stream 1', value: 1000 }],
          costs: [],
          growthModel: { type: 'linear', rate: 10 },
        },
        resultsCache: {},
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];

    mockActuals = [
      {
        id: 'actual-1',
        projectId: 'project-1',
        period: '2023-01',
        data: { revenue: 1000, costs: 500 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    mockDexieService.getAllProjects.mockResolvedValue(mockProjects);
    mockDexieService.getModelsForProject.mockResolvedValue(mockModels);
    mockDexieService.getActualsForProject.mockResolvedValue(mockActuals);

    mockSupabaseService.getAllProjects.mockResolvedValue([]);
    mockSupabaseService.getProject.mockResolvedValue(undefined);
    mockSupabaseService.createProject.mockResolvedValue(mockProjects[0]);
    mockSupabaseService.createModel.mockResolvedValue(mockModels[0]);
    mockSupabaseService.upsertActualsPeriod.mockResolvedValue(mockActuals[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Validation', () => {
    it('should validate local data successfully', async () => {
      const result = await service.validateLocalData();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockDexieService.getAllProjects).toHaveBeenCalled();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Local data validation completed',
        expect.objectContaining({
          projects: 2,
          errors: 0,
        })
      );
    });

    it('should detect validation errors for invalid data', async () => {
      const invalidProjects = [
        {
          ...mockProjects[0],
          name: '', // Invalid empty name
        },
        {
          ...mockProjects[1],
          productType: '', // Invalid empty product type
        },
      ];

      mockDexieService.getAllProjects.mockResolvedValue(invalidProjects);

      const result = await service.validateLocalData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project project-1 has empty name');
      expect(result.errors).toContain('Project project-2 has empty product type');
    });

    it('should handle validation warnings for models and actuals', async () => {
      const invalidModels = [
        {
          ...mockModels[0],
          name: '', // Warning: empty name
          assumptions: undefined, // Warning: no assumptions
        },
      ];

      const invalidActuals = [
        {
          ...mockActuals[0],
          period: '', // Error: empty period
          data: {}, // Warning: no data
        },
      ];

      mockDexieService.getModelsForProject.mockResolvedValue(invalidModels);
      mockDexieService.getActualsForProject.mockResolvedValue(invalidActuals);

      const result = await service.validateLocalData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Actual actual-1 in project Test Project 1 has empty period');
      expect(result.warnings).toContain('Model model-1 in project Test Project 1 has empty name');
      expect(result.warnings).toContain('Model model-1 in project Test Project 1 has no assumptions');
    });

    it('should warn when no local data exists', async () => {
      mockDexieService.getAllProjects.mockResolvedValue([]);

      const result = await service.validateLocalData();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No projects found in local database');
    });
  });

  describe('Migration Status', () => {
    it('should return comprehensive migration status', async () => {
      mockSupabaseService.getAllProjects.mockResolvedValue([mockProjects[0]]);
      mockSupabaseService.getModelsForProject.mockResolvedValue([mockModels[0]]);
      mockSupabaseService.getActualsForProject.mockResolvedValue([mockActuals[0]]);

      localStorage.setItem('fortress-last-migration', '2023-01-01T00:00:00.000Z');

      const status = await service.getMigrationStatus();

      expect(status).toEqual({
        localDataExists: true,
        remoteDataExists: true,
        localCount: {
          projects: 2,
          models: 1,
          actuals: 1,
        },
        remoteCount: {
          projects: 1,
          models: 1,
          actuals: 1,
        },
        lastMigration: '2023-01-01T00:00:00.000Z',
      });
    });

    it('should handle empty databases', async () => {
      mockDexieService.getAllProjects.mockResolvedValue([]);
      mockSupabaseService.getAllProjects.mockResolvedValue([]);

      const status = await service.getMigrationStatus();

      expect(status.localDataExists).toBe(false);
      expect(status.remoteDataExists).toBe(false);
      expect(status.localCount.projects).toBe(0);
      expect(status.remoteCount.projects).toBe(0);
    });
  });

  describe('Full Migration', () => {
    it('should perform complete migration successfully', async () => {
      const options: MigrationOptions = {
        dryRun: false,
        batchSize: 10,
        skipExisting: false,
        validateData: true,
        backupBeforeMigration: false,
      };

      const result = await service.migrateAllData(options);

      expect(result.success).toBe(true);
      expect(result.projectsMigrated).toBe(2);
      expect(result.modelsMigrated).toBe(1);
      expect(result.actualsMigrated).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(mockSupabaseService.createProject).toHaveBeenCalledTimes(2);
      expect(mockSupabaseService.createModel).toHaveBeenCalledTimes(1);
      expect(mockSupabaseService.upsertActualsPeriod).toHaveBeenCalledTimes(1);
    });

    it('should perform dry run without making changes', async () => {
      const options: MigrationOptions = {
        dryRun: true,
        validateData: false,
      };

      const result = await service.migrateAllData(options);

      expect(result.success).toBe(true);
      expect(result.projectsMigrated).toBe(0);
      expect(result.modelsMigrated).toBe(0);
      expect(result.actualsMigrated).toBe(0);

      expect(mockSupabaseService.createProject).not.toHaveBeenCalled();
      expect(mockSupabaseService.createModel).not.toHaveBeenCalled();
      expect(mockSupabaseService.upsertActualsPeriod).not.toHaveBeenCalled();
    });

    it('should skip existing projects when configured', async () => {
      mockSupabaseService.getProject.mockResolvedValue(mockProjects[0]);

      const options: MigrationOptions = {
        skipExisting: true,
        validateData: false,
      };

      const result = await service.migrateAllData(options);

      expect(result.conflicts).toHaveLength(2); // Both projects exist
      expect(result.conflicts[0].resolution).toBe('skip');
      expect(result.projectsMigrated).toBe(0);
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await service.migrateAllData({ validateData: false });

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        type: 'project',
        id: 'auth',
        error: 'User not authenticated for migration',
      });
    });

    it('should handle project creation errors gracefully', async () => {
      mockSupabaseService.createProject.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.migrateAllData({ validateData: false });

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        type: 'project',
        id: 'project-1',
        error: 'Database error',
      });
      expect(result.projectsMigrated).toBe(1); // Second project succeeds
    });

    it('should resolve conflicts by comparing dates', async () => {
      const existingProject = {
        ...mockProjects[0],
        updatedAt: new Date('2023-01-01'), // Older than local
      };
      mockSupabaseService.getProject.mockResolvedValue(existingProject);

      const result = await service.migrateAllData({ 
        validateData: false,
        skipExisting: false 
      });

      expect(mockSupabaseService.updateProject).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          name: 'Test Project 1',
        })
      );
      expect(result.conflicts[0].resolution).toBe('overwrite');
    });

    it('should create backup when requested', async () => {
      const options: MigrationOptions = {
        backupBeforeMigration: true,
        validateData: false,
      };

      await service.migrateAllData(options);

      // Check that backup was created in localStorage
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('fortress-backup-'));
      expect(backupKeys).toHaveLength(1);

      const backup = JSON.parse(localStorage.getItem(backupKeys[0]) || '{}');
      expect(backup.projects).toHaveLength(2);
      expect(backup.models).toHaveLength(1);
      expect(backup.actuals).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation failures', async () => {
      mockDexieService.getAllProjects.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.validateLocalData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation failed: Database connection failed');
    });

    it('should handle migration failures gracefully', async () => {
      mockDexieService.getAllProjects.mockRejectedValue(new Error('Critical error'));

      const result = await service.migrateAllData({ validateData: false });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Migration failed: Critical error');
      expect(mockErrorService.logError).toHaveBeenCalled();
    });

    it('should handle model migration errors', async () => {
      mockSupabaseService.createModel.mockRejectedValue(new Error('duplicate key'));

      const result = await service.migrateAllData({ validateData: false });

      expect(result.conflicts).toContainEqual({
        type: 'model',
        localId: 'model-1',
        remoteId: 'model-1',
        resolution: 'skip',
      });
    });
  });

  describe('Backup Creation', () => {
    it('should create comprehensive backup', async () => {
      await service.createBackup();

      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('fortress-backup-'));
      expect(backupKeys).toHaveLength(1);

      const backup = JSON.parse(localStorage.getItem(backupKeys[0]) || '{}');
      expect(backup).toHaveProperty('timestamp');
      expect(backup.projects).toEqual(mockProjects);
      expect(backup.models).toEqual(mockModels);
      expect(backup.actuals).toEqual(mockActuals);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Backup created successfully',
        expect.objectContaining({
          projects: 2,
          models: 1,
          actuals: 1,
        })
      );
    });

    it('should handle backup creation errors', async () => {
      mockDexieService.getAllProjects.mockRejectedValue(new Error('Backup failed'));

      await expect(service.createBackup()).rejects.toThrow('Backup failed');
      expect(mockErrorService.logError).toHaveBeenCalled();
    });
  });

  describe('Cleanup Operations', () => {
    it('should require confirmation for cleanup', async () => {
      await expect(service.cleanupLocalData('invalid')).rejects.toThrow('Invalid confirmation key');
    });

    it('should handle cleanup with valid confirmation', async () => {
      await service.cleanupLocalData('CONFIRM_DELETE_LOCAL_DATA');

      expect(localStorage.getItem('fortress-local-cleanup')).toBeTruthy();
      expect(mockLogService.warn).toHaveBeenCalledWith(
        'Local data cleanup not implemented - manual cleanup required'
      );
    });
  });
});