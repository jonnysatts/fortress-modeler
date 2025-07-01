import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { SupabaseStorageService } from '../../implementations/SupabaseStorageService';
import { SupabaseRealtimeService } from '../../implementations/SupabaseRealtimeService';
import { DataMigrationService } from '../../migration/DataMigrationService';
import { serviceContainer, SERVICE_TOKENS } from '../../container/ServiceContainer';
import { bootstrapServices } from '../../bootstrap';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Mock environment for Supabase backend
const originalEnv = import.meta.env;

describe('Supabase Integration Tests', () => {
  let storageService: SupabaseStorageService;
  let realtimeService: SupabaseRealtimeService;
  let migrationService: DataMigrationService;
  let testUserId: string;
  let testProjectId: string;
  let testModelId: string;
  let realtimeChannel: RealtimeChannel | null = null;

  beforeAll(async () => {
    // Override environment to use Supabase backend
    vi.stubGlobal('import', {
      meta: {
        env: {
          ...originalEnv,
          VITE_USE_SUPABASE_BACKEND: 'true',
        },
      },
    });

    // Bootstrap services with Supabase configuration
    bootstrapServices();

    // Initialize services
    storageService = new SupabaseStorageService();
    realtimeService = new SupabaseRealtimeService();
    migrationService = new DataMigrationService();

    // Mock authenticated user
    testUserId = 'test-user-integration';
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: testUserId,
          email: 'integration-test@example.com',
          user_metadata: { full_name: 'Integration Test User' },
        } as any,
      },
      error: null,
    });
  });

  afterAll(async () => {
    // Cleanup any created test data
    if (testProjectId) {
      try {
        await storageService.deleteProject(testProjectId);
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }

    // Unsubscribe from any active channels
    if (realtimeChannel) {
      try {
        await realtimeService.unsubscribe(realtimeChannel);
      } catch (error) {
        console.warn('Channel cleanup warning:', error);
      }
    }

    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any test data created during the test
    if (realtimeChannel) {
      await realtimeService.unsubscribe(realtimeChannel);
      realtimeChannel = null;
    }
  });

  describe('Service Container Integration', () => {
    it('should bootstrap services with Supabase backend', () => {
      expect(serviceContainer.has(SERVICE_TOKENS.STORAGE_SERVICE)).toBe(true);
      expect(serviceContainer.has(SERVICE_TOKENS.REALTIME_SERVICE)).toBe(true);
      expect(serviceContainer.has(SERVICE_TOKENS.LOG_SERVICE)).toBe(true);
      expect(serviceContainer.has(SERVICE_TOKENS.ERROR_SERVICE)).toBe(true);

      const resolvedStorageService = serviceContainer.resolve(SERVICE_TOKENS.STORAGE_SERVICE);
      expect(resolvedStorageService).toBeInstanceOf(SupabaseStorageService);

      const resolvedRealtimeService = serviceContainer.resolve(SERVICE_TOKENS.REALTIME_SERVICE);
      expect(resolvedRealtimeService).toBeInstanceOf(SupabaseRealtimeService);
    });

    it('should maintain singleton pattern for services', () => {
      const storage1 = serviceContainer.resolve(SERVICE_TOKENS.STORAGE_SERVICE);
      const storage2 = serviceContainer.resolve(SERVICE_TOKENS.STORAGE_SERVICE);
      expect(storage1).toBe(storage2);

      const realtime1 = serviceContainer.resolve(SERVICE_TOKENS.REALTIME_SERVICE);
      const realtime2 = serviceContainer.resolve(SERVICE_TOKENS.REALTIME_SERVICE);
      expect(realtime1).toBe(realtime2);
    });
  });

  describe('End-to-End Project Workflow', () => {
    it('should create, update, and delete projects with real-time updates', async () => {
      // Mock Supabase operations
      const mockProject = {
        id: 'test-project-123',
        name: 'Integration Test Project',
        product_type: 'SaaS',
        description: 'Created during integration test',
        user_id: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        target_audience: 'Developers',
        data: {},
        timeline: {},
        avatar_image: null,
        is_public: false,
        owner_email: 'integration-test@example.com',
        share_count: 0,
        deleted_at: null,
      };

      // Mock the Supabase client responses
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      } as any);

      // 1. Create project
      const newProject = await storageService.createProject({
        name: 'Integration Test Project',
        productType: 'SaaS',
        description: 'Created during integration test',
        targetAudience: 'Developers',
      });

      expect(newProject).toBeDefined();
      expect(newProject.name).toBe('Integration Test Project');
      testProjectId = newProject.id;

      // 2. Setup real-time subscription (mocked)
      const realtimeCallback = vi.fn();
      const mockChannel = {
        subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockResolvedValue('ok'),
      } as any;

      vi.mocked(supabase.channel).mockReturnValue(mockChannel);
      
      realtimeChannel = await realtimeService.subscribeToProject(testProjectId, realtimeCallback);
      expect(realtimeChannel).toBeDefined();

      // 3. Update project
      const updatedProject = await storageService.updateProject(testProjectId, {
        name: 'Updated Integration Test Project',
        description: 'Updated during integration test',
      });

      expect(updatedProject.name).toBe('Updated Integration Test Project');

      // 4. Verify real-time subscription was established
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${testProjectId}`,
        }),
        expect.any(Function)
      );
    });

    it('should handle project models workflow', async () => {
      // Mock project exists
      const mockProject = {
        id: testProjectId || 'test-project-123',
        name: 'Test Project',
        product_type: 'SaaS',
        user_id: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: 'Test project',
        target_audience: null,
        data: {},
        timeline: {},
        avatar_image: null,
        is_public: false,
        owner_email: 'test@example.com',
        share_count: 0,
        deleted_at: null,
      };

      const mockModel = {
        id: 'test-model-123',
        project_id: testProjectId || 'test-project-123',
        user_id: testUserId,
        name: 'Integration Test Model',
        assumptions: {
          revenue: [{ name: 'Revenue Stream 1', value: 1000 }],
          costs: [],
          growthModel: { type: 'linear', rate: 10 },
        },
        results_cache: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      // Mock Supabase responses for models
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        insert: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockModel, error: null }),
      } as any);

      // Create financial model
      const newModel = await storageService.createModel({
        projectId: testProjectId || 'test-project-123',
        name: 'Integration Test Model',
        assumptions: {
          revenue: [{ name: 'Revenue Stream 1', value: 1000 }],
          costs: [],
          growthModel: { type: 'linear', rate: 10 },
        },
      });

      expect(newModel).toBeDefined();
      expect(newModel.name).toBe('Integration Test Model');
      testModelId = newModel.id;

      // Setup real-time subscription for project models
      const modelsCallback = vi.fn();
      const mockModelsChannel = {
        subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockResolvedValue('ok'),
      } as any;

      vi.mocked(supabase.channel).mockReturnValue(mockModelsChannel);

      const modelsChannel = await realtimeService.subscribeToProjectModels(
        testProjectId || 'test-project-123',
        modelsCallback
      );

      expect(modelsChannel).toBeDefined();
      expect(mockModelsChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'financial_models',
          filter: `project_id=eq.${testProjectId || 'test-project-123'}`,
        }),
        expect.any(Function)
      );

      // Cleanup
      await realtimeService.unsubscribe(modelsChannel);
    });

    it('should handle actuals data workflow', async () => {
      const mockActual = {
        id: 'test-actual-123',
        project_id: testProjectId || 'test-project-123',
        user_id: testUserId,
        period: '2024-01',
        data: {
          revenue: 10000,
          costs: 5000,
          profit: 5000,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock Supabase responses for actuals
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockActual, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: [mockActual], error: null }),
      } as any);

      // Upsert actuals data
      const actualEntry = await storageService.upsertActualsPeriod({
        projectId: testProjectId || 'test-project-123',
        period: '2024-01',
        revenue: 10000,
        costs: 5000,
        profit: 5000,
      });

      expect(actualEntry).toBeDefined();
      expect(actualEntry.period).toBe('2024-01');
      expect(actualEntry.data).toEqual({
        projectId: testProjectId || 'test-project-123',
        period: '2024-01',
        revenue: 10000,
        costs: 5000,
        profit: 5000,
      });
    });
  });

  describe('Migration Integration', () => {
    it('should validate migration status correctly', async () => {
      // Mock both local and remote data
      const mockLocalProjects = [
        {
          id: 'local-project-1',
          name: 'Local Project 1',
          productType: 'SaaS',
          description: 'Local test project',
          createdAt: new Date(),
          updatedAt: new Date(),
          targetAudience: 'Developers',
          timeline: { startDate: new Date() },
          avatarImage: null,
          is_public: false,
          shared_by: 'test@example.com',
          owner_email: 'test@example.com',
          share_count: 0,
          permission: 'owner' as const,
        },
      ];

      const mockRemoteProjects = [
        {
          id: 'remote-project-1',
          name: 'Remote Project 1',
          productType: 'E-commerce',
          description: 'Remote test project',
          createdAt: new Date(),
          updatedAt: new Date(),
          targetAudience: 'Consumers',
          timeline: { startDate: new Date() },
          avatarImage: null,
          is_public: true,
          shared_by: 'test@example.com',
          owner_email: 'test@example.com',
          share_count: 5,
          permission: 'owner' as const,
        },
      ];

      // Mock DexieStorageService responses
      const mockDexieService = {
        getAllProjects: vi.fn().mockResolvedValue(mockLocalProjects),
        getModelsForProject: vi.fn().mockResolvedValue([]),
        getActualsForProject: vi.fn().mockResolvedValue([]),
      };

      // Mock SupabaseStorageService responses
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockRemoteProjects, error: null }),
      } as any);

      // Replace service implementations temporarily
      const originalDexieService = (migrationService as any).dexieService;
      const originalSupabaseService = (migrationService as any).supabaseService;

      (migrationService as any).dexieService = mockDexieService;
      (migrationService as any).supabaseService = {
        getAllProjects: vi.fn().mockResolvedValue(mockRemoteProjects),
        getModelsForProject: vi.fn().mockResolvedValue([]),
        getActualsForProject: vi.fn().mockResolvedValue([]),
      };

      const status = await migrationService.getMigrationStatus();

      expect(status).toEqual({
        localDataExists: true,
        remoteDataExists: true,
        localCount: {
          projects: 1,
          models: 0,
          actuals: 0,
        },
        remoteCount: {
          projects: 1,
          models: 0,
          actuals: 0,
        },
        lastMigration: undefined,
      });

      // Restore original services
      (migrationService as any).dexieService = originalDexieService;
      (migrationService as any).supabaseService = originalSupabaseService;
    });

    it('should handle dry run migration correctly', async () => {
      const mockLocalProjects = [
        {
          id: 'dry-run-project-1',
          name: 'Dry Run Project',
          productType: 'SaaS',
          description: 'Test dry run',
          createdAt: new Date(),
          updatedAt: new Date(),
          targetAudience: 'Testers',
          timeline: { startDate: new Date() },
          avatarImage: null,
          is_public: false,
          shared_by: 'test@example.com',
          owner_email: 'test@example.com',
          share_count: 0,
          permission: 'owner' as const,
        },
      ];

      // Mock DexieStorageService for dry run
      const mockDexieService = {
        getAllProjects: vi.fn().mockResolvedValue(mockLocalProjects),
        getModelsForProject: vi.fn().mockResolvedValue([]),
        getActualsForProject: vi.fn().mockResolvedValue([]),
      };

      // Replace service implementations temporarily
      const originalDexieService = (migrationService as any).dexieService;
      (migrationService as any).dexieService = mockDexieService;

      const result = await migrationService.migrateAllData({
        dryRun: true,
        validateData: false,
      });

      expect(result.success).toBe(true);
      expect(result.projectsMigrated).toBe(0); // No actual migration in dry run
      expect(result.modelsMigrated).toBe(0);
      expect(result.actualsMigrated).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify no actual data changes were made
      expect(storageService.createProject).not.toHaveBeenCalled();

      // Restore original service
      (migrationService as any).dexieService = originalDexieService;
    });
  });

  describe('Real-time Integration', () => {
    it('should handle presence updates correctly', async () => {
      const projectId = testProjectId || 'test-project-presence';
      const presenceCallback = vi.fn();

      // Mock presence channel
      const mockPresenceChannel = {
        subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
        on: vi.fn().mockReturnThis(),
        track: vi.fn().mockResolvedValue('ok'),
        unsubscribe: vi.fn().mockResolvedValue('ok'),
      } as any;

      vi.mocked(supabase.channel).mockReturnValue(mockPresenceChannel);

      // Subscribe to presence
      const presenceChannel = await realtimeService.subscribeToPresence(projectId, presenceCallback);
      expect(presenceChannel).toBeDefined();

      // Update presence
      await realtimeService.updatePresence(projectId, {
        user_id: testUserId,
        user_name: 'Integration Test User',
        status: 'online',
        last_seen: new Date().toISOString(),
        current_page: `/projects/${projectId}`,
      });

      expect(mockPresenceChannel.track).toHaveBeenCalledWith({
        user_id: testUserId,
        user_name: 'Integration Test User',
        status: 'online',
        last_seen: expect.any(String),
        current_page: `/projects/${projectId}`,
      });

      // Verify presence event handlers were set up
      expect(mockPresenceChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
      expect(mockPresenceChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
      expect(mockPresenceChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));

      // Cleanup
      await realtimeService.unsubscribe(presenceChannel);
    });

    it('should handle custom events correctly', async () => {
      const projectId = testProjectId || 'test-project-events';
      
      // Mock custom event channel
      const mockEventChannel = {
        send: vi.fn().mockResolvedValue('ok'),
        subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockResolvedValue('ok'),
      } as any;

      vi.mocked(supabase.channel).mockReturnValue(mockEventChannel);

      // Send custom event
      await realtimeService.sendCustomEvent(projectId, 'test_event', {
        action: 'integration_test',
        timestamp: new Date().toISOString(),
      });

      expect(mockEventChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'test_event',
        payload: {
          action: 'integration_test',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Supabase authentication errors gracefully', async () => {
      // Mock authentication failure
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT', code: 'invalid_jwt' },
      });

      // Attempt to create project without authentication
      await expect(
        storageService.createProject({
          name: 'Unauthenticated Project',
          productType: 'SaaS',
        })
      ).rejects.toThrow();
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      const networkError = new Error('Network error');
      vi.mocked(supabase.from).mockImplementation(() => {
        throw networkError;
      });

      await expect(
        storageService.getAllProjects()
      ).rejects.toThrow('Network error');
    });

    it('should handle real-time subscription failures', async () => {
      const projectId = 'test-subscription-failure';
      const callback = vi.fn();

      // Mock subscription failure
      const mockFailChannel = {
        subscribe: vi.fn().mockRejectedValue(new Error('Subscription failed')),
        on: vi.fn().mockReturnThis(),
      } as any;

      vi.mocked(supabase.channel).mockReturnValue(mockFailChannel);

      await expect(
        realtimeService.subscribeToProject(projectId, callback)
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle batch operations efficiently', async () => {
      const batchSize = 5;
      const mockProjects = Array.from({ length: batchSize }, (_, i) => ({
        id: `batch-project-${i}`,
        name: `Batch Project ${i}`,
        product_type: 'SaaS',
        description: `Batch test project ${i}`,
        user_id: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        target_audience: 'Developers',
        data: {},
        timeline: {},
        avatar_image: null,
        is_public: false,
        owner_email: 'test@example.com',
        share_count: 0,
        deleted_at: null,
      }));

      // Mock batch responses
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          const project = mockProjects[0];
          return Promise.resolve({ data: project, error: null });
        }),
        insert: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
      } as any);

      // Test batch project retrieval
      const startTime = Date.now();
      const projects = await storageService.getAllProjects();
      const endTime = Date.now();

      expect(projects).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle concurrent real-time subscriptions', async () => {
      const projectIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
      const callbacks = projectIds.map(() => vi.fn());
      const channels: any[] = [];

      // Mock multiple channels
      projectIds.forEach((projectId, index) => {
        const mockChannel = {
          subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
          on: vi.fn().mockReturnThis(),
          unsubscribe: vi.fn().mockResolvedValue('ok'),
        };
        channels.push(mockChannel);
      });

      vi.mocked(supabase.channel).mockImplementation((channelName) => {
        const index = projectIds.findIndex(id => channelName.includes(id));
        return channels[index] || channels[0];
      });

      // Subscribe to multiple projects concurrently
      const subscriptionPromises = projectIds.map((projectId, index) =>
        realtimeService.subscribeToProject(projectId, callbacks[index])
      );

      const results = await Promise.all(subscriptionPromises);

      expect(results).toHaveLength(3);
      results.forEach(channel => {
        expect(channel).toBeDefined();
      });

      // Cleanup all subscriptions
      await Promise.all(results.map(channel => realtimeService.unsubscribe(channel)));
    });
  });
});