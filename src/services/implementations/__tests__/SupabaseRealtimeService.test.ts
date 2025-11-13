import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SupabaseRealtimeService } from '../SupabaseRealtimeService';
import { IRealtimeService, PresenceData, RealtimePayload } from '../../interfaces/IRealtimeService';
import { serviceContainer, SERVICE_TOKENS } from '../../container/ServiceContainer';
import { RealtimeChannel } from '@supabase/supabase-js';

// Mock Supabase realtime channel
const mockChannel = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
  track: vi.fn(),
  untrack: vi.fn(),
  send: vi.fn(),
} as unknown as RealtimeChannel;

// Mock Supabase client
const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

// Mock service container dependencies
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

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../container/ServiceContainer', () => ({
  serviceContainer: {
    resolve: vi.fn((token) => {
      if (token === SERVICE_TOKENS.LOG_SERVICE) return mockLogService;
      if (token === SERVICE_TOKENS.ERROR_SERVICE) return mockErrorService;
      throw new Error(`Unknown service token: ${token}`);
    }),
  },
  SERVICE_TOKENS: {
    LOG_SERVICE: 'ILogService',
    ERROR_SERVICE: 'IErrorService',
  },
}));

describe('SupabaseRealtimeService', () => {
  let service: IRealtimeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupabaseRealtimeService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Project Subscriptions', () => {
    it('should subscribe to project updates successfully', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      const result = await service.subscribeToProject(projectId, mockCallback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`project-${projectId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(result).toBe(mockChannel);
      expect(mockLogService.info).toHaveBeenCalledWith(
        `Subscribed to project updates: ${projectId}`
      );
    });

    it('should handle project subscription failures', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      const subscriptionError = new Error('Subscription failed');
      
      mockChannel.subscribe.mockRejectedValue(subscriptionError);

      await expect(service.subscribeToProject(projectId, mockCallback))
        .rejects.toThrow('Subscription failed');

      expect(mockErrorService.logError).toHaveBeenCalledWith(
        'Failed to subscribe to project updates',
        subscriptionError,
        { projectId }
      );
    });

    it('should process project update events correctly', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      let eventHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        eventHandler = handler;
        return mockChannel;
      });
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      await service.subscribeToProject(projectId, mockCallback);

      // Simulate an UPDATE event
      const updatePayload = {
        eventType: 'UPDATE',
        new: { id: projectId, name: 'Updated Project' },
        old: { id: projectId, name: 'Old Project' },
        table: 'projects',
        schema: 'public',
      };

      eventHandler!(updatePayload);

      expect(mockCallback).toHaveBeenCalledWith({
        eventType: 'UPDATE',
        table: 'projects',
        new_record: updatePayload.new,
        old_record: updatePayload.old,
      });
    });
  });

  describe('Project Models Subscriptions', () => {
    it('should subscribe to project models updates successfully', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      const result = await service.subscribeToProjectModels(projectId, mockCallback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`project-models-${projectId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_models',
          filter: `project_id=eq.${projectId}`,
        },
        expect.any(Function)
      );
      expect(result).toBe(mockChannel);
    });

    it('should process model INSERT events correctly', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      let eventHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        eventHandler = handler;
        return mockChannel;
      });
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      await service.subscribeToProjectModels(projectId, mockCallback);

      const insertPayload = {
        eventType: 'INSERT',
        new: { id: 'model-456', project_id: projectId, name: 'New Model' },
        table: 'financial_models',
        schema: 'public',
      };

      eventHandler!(insertPayload);

      expect(mockCallback).toHaveBeenCalledWith({
        eventType: 'INSERT',
        table: 'financial_models',
        new_record: insertPayload.new,
        old_record: null,
      });
    });
  });

  describe('Presence Management', () => {
    it('should subscribe to presence updates successfully', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      const result = await service.subscribeToPresence(projectId, mockCallback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`presence-${projectId}`, {
        config: { presence: { key: expect.any(String) } },
      });
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
      expect(result).toBe(mockChannel);
    });

    it('should update presence data successfully', async () => {
      const projectId = 'project-123';
      const presenceData: PresenceData = {
        user_id: 'user-123',
        user_name: 'Test User',
        user_avatar: 'https://example.com/avatar.jpg',
        status: 'online',
        last_seen: new Date().toISOString(),
        current_page: '/projects/project-123',
      };

      mockChannel.track.mockResolvedValue('ok');

      await service.updatePresence(projectId, presenceData);

      expect(mockChannel.track).toHaveBeenCalledWith(presenceData);
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'Presence updated',
        { projectId, presenceData }
      );
    });

    it('should handle presence update failures', async () => {
      const projectId = 'project-123';
      const presenceData: PresenceData = {
        user_id: 'user-123',
        user_name: 'Test User',
        status: 'online',
        last_seen: new Date().toISOString(),
      };
      const trackError = new Error('Track failed');

      mockChannel.track.mockRejectedValue(trackError);

      await expect(service.updatePresence(projectId, presenceData))
        .rejects.toThrow('Track failed');

      expect(mockErrorService.logError).toHaveBeenCalledWith(
        'Failed to update presence',
        trackError,
        { projectId, presenceData }
      );
    });

    it('should process presence sync events correctly', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      let syncHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        if (config.event === 'sync') {
          syncHandler = handler;
        }
        return mockChannel;
      });
      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      await service.subscribeToPresence(projectId, mockCallback);

      // Simulate presence sync event
      const syncPayload = {
        joins: {
          'user-123': {
            user_id: 'user-123',
            user_name: 'Test User',
            status: 'online',
            last_seen: new Date().toISOString(),
          },
        },
        leaves: {
          'user-456': {
            user_id: 'user-456',
            user_name: 'Other User',
            status: 'offline',
            last_seen: new Date().toISOString(),
          },
        },
      };

      syncHandler!(syncPayload);

      expect(mockCallback).toHaveBeenCalledWith({
        joins: syncPayload.joins,
        leaves: syncPayload.leaves,
      });
    });
  });

  describe('Unsubscribe Operations', () => {
    it('should unsubscribe from channel successfully', async () => {
      mockChannel.unsubscribe.mockResolvedValue('ok');

      await service.unsubscribe(mockChannel);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      expect(mockLogService.debug).toHaveBeenCalledWith('Unsubscribed from channel');
    });

    it('should handle unsubscribe failures gracefully', async () => {
      const unsubscribeError = new Error('Unsubscribe failed');
      mockChannel.unsubscribe.mockRejectedValue(unsubscribeError);

      await expect(service.unsubscribe(mockChannel))
        .rejects.toThrow('Unsubscribe failed');

      expect(mockErrorService.logError).toHaveBeenCalledWith(
        'Failed to unsubscribe from channel',
        unsubscribeError
      );
    });
  });

  describe('Custom Events', () => {
    it('should send custom events successfully', async () => {
      const projectId = 'project-123';
      const eventType = 'custom_event';
      const payload = { data: 'test' };

      mockChannel.send.mockResolvedValue('ok');

      await service.sendCustomEvent(projectId, eventType, payload);

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: eventType,
        payload,
      });
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'Custom event sent',
        { projectId, eventType, payload }
      );
    });

    it('should handle custom event send failures', async () => {
      const projectId = 'project-123';
      const eventType = 'custom_event';
      const payload = { data: 'test' };
      const sendError = new Error('Send failed');

      mockChannel.send.mockRejectedValue(sendError);

      await expect(service.sendCustomEvent(projectId, eventType, payload))
        .rejects.toThrow('Send failed');

      expect(mockErrorService.logError).toHaveBeenCalledWith(
        'Failed to send custom event',
        sendError,
        { projectId, eventType, payload }
      );
    });
  });

  describe('Channel Management', () => {
    it('should manage multiple channels independently', async () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      const projectId1 = 'project-123';
      const projectId2 = 'project-456';

      mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');

      const channel1 = await service.subscribeToProject(projectId1, mockCallback1);
      const channel2 = await service.subscribeToProject(projectId2, mockCallback2);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`project-${projectId1}`);
      expect(mockSupabase.channel).toHaveBeenCalledWith(`project-${projectId2}`);
      expect(channel1).toBe(mockChannel);
      expect(channel2).toBe(mockChannel);
    });

    it('should track active channels correctly', () => {
      const service = new SupabaseRealtimeService();
      expect(service).toBeDefined();
      expect(typeof service.subscribeToProject).toBe('function');
      expect(typeof service.subscribeToProjectModels).toBe('function');
      expect(typeof service.subscribeToPresence).toBe('function');
      expect(typeof service.updatePresence).toBe('function');
      expect(typeof service.unsubscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed presence data gracefully', async () => {
      const projectId = 'project-123';
      const invalidPresenceData = {
        // Missing required fields
      } as any;

      mockChannel.track.mockRejectedValue(new Error('Invalid presence data'));

      await expect(service.updatePresence(projectId, invalidPresenceData))
        .rejects.toThrow('Invalid presence data');

      expect(mockErrorService.logError).toHaveBeenCalled();
    });

    it('should handle network connectivity issues', async () => {
      const mockCallback = vi.fn();
      const projectId = 'project-123';
      const networkError = new Error('Network error');

      mockChannel.subscribe.mockRejectedValue(networkError);

      await expect(service.subscribeToProject(projectId, mockCallback))
        .rejects.toThrow('Network error');

      expect(mockErrorService.logError).toHaveBeenCalledWith(
        'Failed to subscribe to project updates',
        networkError,
        { projectId }
      );
    });
  });
});