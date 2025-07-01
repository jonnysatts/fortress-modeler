import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SupabaseStorageService } from '../SupabaseStorageService';
import { IStorageService } from '../../interfaces/IStorageService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { serviceContainer, SERVICE_TOKENS } from '../../container/ServiceContainer';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

// Mock service container
const mockErrorService = {
  logError: vi.fn(),
  showError: vi.fn(),
};

const mockLogService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock query builder pattern
const createMockQueryBuilder = (data: any = null, error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  mockResolvedValue: vi.fn().mockResolvedValue({ data, error }),
});

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  handleSupabaseError: vi.fn((error) => new Error(error.message)),
}));

vi.mock('../../container/ServiceContainer', () => ({
  serviceContainer: {
    resolve: vi.fn((token) => {
      if (token === SERVICE_TOKENS.ERROR_SERVICE) return mockErrorService;
      if (token === SERVICE_TOKENS.LOG_SERVICE) return mockLogService;
      throw new Error(`Unknown service token: ${token}`);
    }),
  },
  SERVICE_TOKENS: {
    ERROR_SERVICE: 'IErrorService',
    LOG_SERVICE: 'ILogService',
  },
}));

describe('SupabaseStorageService', () => {
  let service: IStorageService;
  let mockUser: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default user mock
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    service = new SupabaseStorageService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Project Operations', () => {
    describe('getProject', () => {
      it('should fetch a project successfully', async () => {
        const mockProject = {
          id: 'project-123',
          name: 'Test Project',
          product_type: 'SaaS',
          user_id: 'user-123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          description: 'Test description',
          target_audience: null,
          data: {},
          timeline: {},
          avatar_image: null,
          is_public: false,
          owner_email: 'test@example.com',
          share_count: 0,
          deleted_at: null,
        };

        const mockQueryBuilder = createMockQueryBuilder(mockProject);
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getProject('project-123');

        expect(mockSupabase.from).toHaveBeenCalledWith('projects');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'project-123');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('deleted_at', null);
        expect(mockQueryBuilder.single).toHaveBeenCalled();
        
        expect(result).toEqual({
          id: 'project-123',
          name: 'Test Project',
          productType: 'SaaS',
          description: 'Test description',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-01T00:00:00Z'),
          targetAudience: undefined,
          timeline: undefined,
          avatarImage: undefined,
          is_public: false,
          shared_by: 'test@example.com',
          owner_email: 'test@example.com',
          share_count: 0,
          permission: 'owner',
        });
      });

      it('should return undefined for non-existent project', async () => {
        const mockQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getProject('non-existent');

        expect(result).toBeUndefined();
      });

      it('should throw ValidationError for empty project ID', async () => {
        await expect(service.getProject('')).rejects.toThrow(ValidationError);
        await expect(service.getProject('  ')).rejects.toThrow(ValidationError);
      });

      it('should throw DatabaseError for database errors', async () => {
        const mockQueryBuilder = createMockQueryBuilder(null, { message: 'Database error' });
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        await expect(service.getProject('project-123')).rejects.toThrow(DatabaseError);
        expect(mockErrorService.logError).toHaveBeenCalled();
      });
    });

    describe('getAllProjects', () => {
      it('should fetch all projects successfully', async () => {
        const mockProjects = [
          {
            id: 'project-1',
            name: 'Project 1',
            product_type: 'SaaS',
            user_id: 'user-123',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            description: null,
            target_audience: null,
            data: {},
            timeline: {},
            avatar_image: null,
            is_public: false,
            owner_email: 'test@example.com',
            share_count: 0,
            deleted_at: null,
          },
        ];

        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getAllProjects();

        expect(mockSupabase.from).toHaveBeenCalledWith('projects');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('deleted_at', null);
        expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('project-1');
        expect(result[0].name).toBe('Project 1');
      });

      it('should return empty array when no projects exist', async () => {
        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getAllProjects();

        expect(result).toEqual([]);
      });
    });

    describe('createProject', () => {
      it('should create a project successfully', async () => {
        const newProject = {
          name: 'New Project',
          productType: 'E-commerce',
          description: 'A new project',
        };

        const mockCreatedProject = {
          id: 'project-new',
          name: 'New Project',
          product_type: 'E-commerce',
          description: 'A new project',
          user_id: 'user-123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          target_audience: null,
          data: {},
          timeline: {},
          avatar_image: null,
          is_public: false,
          owner_email: 'test@example.com',
          share_count: 0,
          deleted_at: null,
        };

        const mockQueryBuilder = createMockQueryBuilder(mockCreatedProject);
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.createProject(newProject);

        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('projects');
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
          user_id: 'user-123',
          name: 'New Project',
          description: 'A new project',
          product_type: 'E-commerce',
          target_audience: null,
          data: {},
          timeline: {},
          avatar_image: null,
          is_public: false,
          owner_email: 'test@example.com',
          share_count: 0,
        });
        expect(mockQueryBuilder.select).toHaveBeenCalled();
        expect(mockQueryBuilder.single).toHaveBeenCalled();

        expect(result.id).toBe('project-new');
        expect(result.name).toBe('New Project');
        expect(result.productType).toBe('E-commerce');
      });

      it('should throw ValidationError for missing required fields', async () => {
        await expect(service.createProject({})).rejects.toThrow(ValidationError);
        await expect(service.createProject({ name: '' })).rejects.toThrow(ValidationError);
        await expect(service.createProject({ name: 'Test', productType: '' })).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        await expect(service.createProject({ name: 'Test', productType: 'SaaS' }))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('updateProject', () => {
      it('should update a project successfully', async () => {
        const existingProject = {
          id: 'project-123',
          name: 'Old Name',
          product_type: 'SaaS',
          user_id: 'user-123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          description: null,
          target_audience: null,
          data: {},
          timeline: {},
          avatar_image: null,
          is_public: false,
          owner_email: 'test@example.com',
          share_count: 0,
          deleted_at: null,
        };

        const updatedProject = {
          ...existingProject,
          name: 'New Name',
          description: 'Updated description',
        };

        // Mock getProject call
        const getQueryBuilder = createMockQueryBuilder(existingProject);
        // Mock update call
        const updateQueryBuilder = createMockQueryBuilder(updatedProject);
        
        mockSupabase.from
          .mockReturnValueOnce(getQueryBuilder)
          .mockReturnValueOnce(updateQueryBuilder);

        const result = await service.updateProject('project-123', {
          name: 'New Name',
          description: 'Updated description',
        });

        expect(result.name).toBe('New Name');
        expect(result.description).toBe('Updated description');
      });

      it('should throw NotFoundError for non-existent project', async () => {
        const mockQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        await expect(service.updateProject('non-existent', { name: 'New Name' }))
          .rejects.toThrow(NotFoundError);
      });
    });

    describe('deleteProject', () => {
      it('should soft delete a project successfully', async () => {
        const existingProject = {
          id: 'project-123',
          name: 'Test Project',
          product_type: 'SaaS',
          user_id: 'user-123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          description: null,
          target_audience: null,
          data: {},
          timeline: {},
          avatar_image: null,
          is_public: false,
          owner_email: 'test@example.com',
          share_count: 0,
          deleted_at: null,
        };

        // Mock getProject call
        const getQueryBuilder = createMockQueryBuilder(existingProject);
        // Mock update call for soft delete
        const updateQueryBuilder = {
          ...createMockQueryBuilder(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        
        mockSupabase.from
          .mockReturnValueOnce(getQueryBuilder)
          .mockReturnValueOnce(updateQueryBuilder);

        await service.deleteProject('project-123');

        expect(updateQueryBuilder.update).toHaveBeenCalledWith({
          deleted_at: expect.any(String),
        });
        expect(updateQueryBuilder.eq).toHaveBeenCalledWith('id', 'project-123');
      });

      it('should throw NotFoundError for non-existent project', async () => {
        const mockQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        await expect(service.deleteProject('non-existent'))
          .rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('Financial Model Operations', () => {
    describe('getModelsForProject', () => {
      it('should fetch models for a project successfully', async () => {
        const mockModels = [
          {
            id: 'model-1',
            project_id: 'project-123',
            user_id: 'user-123',
            name: 'Model 1',
            assumptions: { revenue: [] },
            results_cache: {},
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            deleted_at: null,
          },
        ];

        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: mockModels, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getModelsForProject('project-123');

        expect(mockSupabase.from).toHaveBeenCalledWith('financial_models');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('project_id', 'project-123');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('deleted_at', null);
        expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('model-1');
        expect(result[0].projectId).toBe('project-123');
        expect(result[0].name).toBe('Model 1');
      });

      it('should throw ValidationError for empty project ID', async () => {
        await expect(service.getModelsForProject('')).rejects.toThrow(ValidationError);
      });
    });

    describe('createModel', () => {
      it('should create a financial model successfully', async () => {
        const newModel = {
          projectId: 'project-123',
          name: 'New Model',
          assumptions: {
            revenue: [],
            costs: [],
            growthModel: { type: 'linear', rate: 10 },
          },
        };

        const mockCreatedModel = {
          id: 'model-new',
          project_id: 'project-123',
          user_id: 'user-123',
          name: 'New Model',
          assumptions: newModel.assumptions,
          results_cache: {},
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          deleted_at: null,
        };

        const mockQueryBuilder = createMockQueryBuilder(mockCreatedModel);
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.createModel(newModel);

        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('financial_models');
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
          project_id: 'project-123',
          user_id: 'user-123',
          name: 'New Model',
          assumptions: newModel.assumptions,
          results_cache: {},
        });

        expect(result.id).toBe('model-new');
        expect(result.projectId).toBe('project-123');
        expect(result.name).toBe('New Model');
      });

      it('should throw ValidationError for missing required fields', async () => {
        await expect(service.createModel({})).rejects.toThrow(ValidationError);
        await expect(service.createModel({ projectId: '' })).rejects.toThrow(ValidationError);
        await expect(service.createModel({ projectId: 'project-123', name: '' })).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('Actuals Operations', () => {
    describe('getActualsForProject', () => {
      it('should fetch actuals for a project successfully', async () => {
        const mockActuals = [
          {
            id: 'actual-1',
            project_id: 'project-123',
            user_id: 'user-123',
            period: '2023-01',
            data: { revenue: 1000 },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ];

        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: mockActuals, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.getActualsForProject('project-123');

        expect(mockSupabase.from).toHaveBeenCalledWith('actuals_period_entries');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('project_id', 'project-123');
        expect(mockQueryBuilder.order).toHaveBeenCalledWith('period', { ascending: false });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('actual-1');
        expect(result[0].projectId).toBe('project-123');
        expect(result[0].period).toBe('2023-01');
      });
    });

    describe('upsertActualsPeriod', () => {
      it('should upsert actuals period successfully', async () => {
        const actualData = {
          projectId: 'project-123',
          period: '2023-01',
          revenue: 1000,
          costs: 500,
        };

        const mockUpsertedActual = {
          id: 'actual-upserted',
          project_id: 'project-123',
          user_id: 'user-123',
          period: '2023-01',
          data: actualData,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        const mockQueryBuilder = createMockQueryBuilder(mockUpsertedActual);
        mockSupabase.from.mockReturnValue(mockQueryBuilder);

        const result = await service.upsertActualsPeriod(actualData);

        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('actuals_period_entries');
        expect(mockQueryBuilder.upsert).toHaveBeenCalledWith({
          project_id: 'project-123',
          user_id: 'user-123',
          period: '2023-01',
          data: actualData,
        }, { onConflict: 'project_id,period' });

        expect(result.id).toBe('actual-upserted');
        expect(result.projectId).toBe('project-123');
        expect(result.period).toBe('2023-01');
      });

      it('should throw ValidationError for missing required fields', async () => {
        await expect(service.upsertActualsPeriod({ projectId: '', period: '2023-01' }))
          .rejects.toThrow(ValidationError);
        await expect(service.upsertActualsPeriod({ projectId: 'project-123', period: '' }))
          .rejects.toThrow(ValidationError);
      });
    });
  });

  describe('Data Mapping', () => {
    it('should correctly map Supabase project to application project', async () => {
      const supabaseProject = {
        id: 'project-123',
        name: 'Test Project',
        product_type: 'SaaS',
        target_audience: 'Developers',
        user_id: 'user-123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        description: 'Test description',
        data: { custom: 'data' },
        timeline: { startDate: '2023-01-01T00:00:00Z' },
        avatar_image: 'https://example.com/avatar.jpg',
        is_public: true,
        owner_email: 'owner@example.com',
        share_count: 5,
        deleted_at: null,
      };

      const mockQueryBuilder = createMockQueryBuilder(supabaseProject);
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await service.getProject('project-123');

      expect(result).toEqual({
        id: 'project-123',
        name: 'Test Project',
        productType: 'SaaS',
        targetAudience: 'Developers',
        description: 'Test description',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-02T00:00:00Z'),
        timeline: {
          startDate: new Date('2023-01-01T00:00:00Z'),
        },
        avatarImage: 'https://example.com/avatar.jpg',
        is_public: true,
        shared_by: 'owner@example.com',
        owner_email: 'owner@example.com',
        share_count: 5,
        permission: 'owner',
      });
    });
  });
});