import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimePresence, useModelCollaboration } from '../useRealtimePresence';
import { IRealtimeService, PresencePayload } from '@/services/interfaces/IRealtimeService';
import { RealtimeChannel } from '@supabase/supabase-js';

// Mock dependencies
const mockRealtimeService = {
  subscribeToPresence: vi.fn(),
  updatePresence: vi.fn(),
  unsubscribe: vi.fn(),
} as unknown as IRealtimeService;

const mockLogService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockChannel = {
  unsubscribe: vi.fn(),
} as unknown as RealtimeChannel;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'user-123',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
};

// Mock modules
vi.mock('@/services/container/ServiceContainer', () => ({
  serviceContainer: {
    resolve: vi.fn((token) => {
      if (token === 'IRealtimeService') return mockRealtimeService;
      if (token === 'ILogService') return mockLogService;
      throw new Error(`Unknown service token: ${token}`);
    }),
  },
  SERVICE_TOKENS: {
    REALTIME_SERVICE: 'IRealtimeService',
    LOG_SERVICE: 'ILogService',
  },
}));

vi.mock('../useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}));

// Mock window location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/projects/project-123',
  },
  writable: true,
});

// Mock document.hidden
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
});

describe('useRealtimePresence', () => {
  let presenceCallback: (payload: PresencePayload) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mocks
    mockRealtimeService.subscribeToPresence = vi.fn().mockImplementation(
      (projectId, callback) => {
        presenceCallback = callback;
        return Promise.resolve(mockChannel);
      }
    );
    mockRealtimeService.updatePresence = vi.fn().mockResolvedValue(undefined);
    mockRealtimeService.unsubscribe = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize presence subscription for authenticated user', async () => {
      const projectId = 'project-123';

      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(mockRealtimeService.subscribeToPresence).toHaveBeenCalledWith(
          projectId,
          expect.any(Function)
        );
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          user_id: 'user-123',
          user_name: 'Test User',
          status: 'online',
          current_page: '/projects/project-123',
        })
      );

      expect(result.current.isConnected).toBe(true);
      expect(result.current.activeUsers).toEqual([]);
    });

    it('should not initialize when projectId is undefined', () => {
      const { result } = renderHook(() => useRealtimePresence(undefined));

      expect(mockRealtimeService.subscribeToPresence).not.toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.activeUsers).toEqual([]);
    });

    it('should not initialize when user is not authenticated', () => {
      vi.mocked(require('../useSupabaseAuth').useSupabaseAuth).mockReturnValue({
        user: null,
        profile: null,
      });

      const { result } = renderHook(() => useRealtimePresence('project-123'));

      expect(mockRealtimeService.subscribeToPresence).not.toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Presence Updates', () => {
    it('should handle presence joins correctly', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate user joining
      act(() => {
        presenceCallback({
          joins: {
            'user-456': {
              user_id: 'user-456',
              user_name: 'Other User',
              user_avatar: 'https://example.com/other-avatar.jpg',
              status: 'online',
              last_seen: new Date().toISOString(),
              current_page: '/projects/project-123',
            },
          },
          leaves: {},
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsers[0]).toEqual({
        id: 'user-456',
        user_id: 'user-456',
        user_name: 'Other User',
        user_avatar: 'https://example.com/other-avatar.jpg',
        status: 'online',
        last_seen: expect.any(String),
        current_page: '/projects/project-123',
      });
      expect(result.current.currentUserCount).toBe(1);
    });

    it('should handle presence leaves correctly', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add a user first
      act(() => {
        presenceCallback({
          joins: {
            'user-456': {
              user_id: 'user-456',
              user_name: 'Other User',
              status: 'online',
              last_seen: new Date().toISOString(),
            },
          },
          leaves: {},
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);

      // Remove the user
      act(() => {
        presenceCallback({
          joins: {},
          leaves: {
            'user-456': {
              user_id: 'user-456',
              user_name: 'Other User',
              status: 'offline',
              last_seen: new Date().toISOString(),
            },
          },
        });
      });

      expect(result.current.activeUsers).toHaveLength(0);
      expect(result.current.currentUserCount).toBe(0);
    });

    it('should filter out current user from active users', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate current user and other user joining
      act(() => {
        presenceCallback({
          joins: {
            'user-123': {
              user_id: 'user-123',
              user_name: 'Test User',
              status: 'online',
              last_seen: new Date().toISOString(),
            },
            'user-456': {
              user_id: 'user-456',
              user_name: 'Other User',
              status: 'online',
              last_seen: new Date().toISOString(),
            },
          },
          leaves: {},
        });
      });

      // Should only show other user, not current user
      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsers[0].id).toBe('user-456');
    });

    it('should filter out offline users', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        presenceCallback({
          joins: {
            'user-456': {
              user_id: 'user-456',
              user_name: 'Other User',
              status: 'offline',
              last_seen: new Date().toISOString(),
            },
            'user-789': {
              user_id: 'user-789',
              user_name: 'Active User',
              status: 'online',
              last_seen: new Date().toISOString(),
            },
          },
          leaves: {},
        });
      });

      // Should only show online user
      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsers[0].id).toBe('user-789');
    });
  });

  describe('Presence Actions', () => {
    it('should update cursor position', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.updateCursorPosition(100, 200);
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          cursor_position: { x: 100, y: 200 },
        })
      );
    });

    it('should update current page', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.updateCurrentPage('/projects/project-123/models');
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          current_page: '/projects/project-123/models',
        })
      );
    });

    it('should set status', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.setStatus('away');
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          status: 'away',
        })
      );
    });
  });

  describe('Heartbeat and Lifecycle', () => {
    it('should send heartbeat presence updates', async () => {
      const projectId = 'project-123';
      renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(mockRealtimeService.subscribeToPresence).toHaveBeenCalled();
      });

      // Fast-forward 30 seconds to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          status: 'online',
        })
      );
    });

    it('should cleanup subscription on unmount', async () => {
      const projectId = 'project-123';
      const { unmount } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(mockRealtimeService.subscribeToPresence).toHaveBeenCalled();
      });

      unmount();

      expect(mockRealtimeService.unsubscribe).toHaveBeenCalledWith(mockChannel);
    });

    it('should handle visibility changes', async () => {
      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          status: 'away',
        })
      );

      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          status: 'online',
          current_page: '/projects/project-123',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription errors gracefully', async () => {
      const subscriptionError = new Error('Subscription failed');
      mockRealtimeService.subscribeToPresence = vi.fn().mockRejectedValue(subscriptionError);

      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to set up presence subscription',
        { projectId, error: subscriptionError }
      );
    });

    it('should handle presence update errors gracefully', async () => {
      const updateError = new Error('Update failed');
      mockRealtimeService.updatePresence = vi.fn().mockRejectedValue(updateError);

      const projectId = 'project-123';
      const { result } = renderHook(() => useRealtimePresence(projectId));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.setStatus('away');
      });

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to update presence',
        { projectId, error: updateError }
      );
    });
  });
});

describe('useModelCollaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealtimeService.subscribeToPresence = vi.fn().mockResolvedValue(mockChannel);
    mockRealtimeService.updatePresence = vi.fn().mockResolvedValue(undefined);
  });

  it('should filter collaborators by model page', async () => {
    const projectId = 'project-123';
    const modelId = 'model-456';

    const { result } = renderHook(() => useModelCollaboration(projectId, modelId));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Add users on different pages
    act(() => {
      const callback = mockRealtimeService.subscribeToPresence.mock.calls[0][1];
      callback({
        joins: {
          'user-456': {
            user_id: 'user-456',
            user_name: 'Model User',
            status: 'online',
            current_page: '/projects/project-123/models/model-456',
            last_seen: new Date().toISOString(),
          },
          'user-789': {
            user_id: 'user-789',
            user_name: 'Other User',
            status: 'online',
            current_page: '/projects/project-123/dashboard',
            last_seen: new Date().toISOString(),
          },
        },
        leaves: {},
      });
    });

    // Should only show user on the model page
    expect(result.current.activeUsers).toHaveLength(1);
    expect(result.current.activeUsers[0].user_name).toBe('Model User');
    expect(result.current.collaboratorCount).toBe(1);
  });

  it('should update presence with model-specific page', async () => {
    const projectId = 'project-123';
    const modelId = 'model-456';

    const { result } = renderHook(() => useModelCollaboration(projectId, modelId));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.updatePresence({ status: 'online' });
    });

    expect(mockRealtimeService.updatePresence).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        status: 'online',
        current_page: `/projects/${projectId}/models/${modelId}`,
      })
    );
  });
});