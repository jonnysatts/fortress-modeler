import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  IRealtimeService, 
  PresencePayload, 
  PresenceData 
} from '@/services/interfaces/IRealtimeService';
import { serviceContainer, SERVICE_TOKENS } from '@/services/container/ServiceContainer';
import { ILogService } from '@/services/interfaces/ILogService';
import { useSupabaseAuth } from './useSupabaseAuth';

interface ActiveUser extends PresenceData {
  id: string;
}

/**
 * Hook for real-time presence and collaboration features
 * Manages user presence, cursor positions, and active collaborators
 */
export function useRealtimePresence(projectId: string | undefined) {
  const { user, profile } = useSupabaseAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Update presence data
  const updatePresence = useCallback(async (presenceData: Partial<PresenceData>) => {
    if (!projectId || !user) return;

    try {
      const realtimeService = serviceContainer.resolve<IRealtimeService>(SERVICE_TOKENS.REALTIME_SERVICE);
      
      const fullPresenceData: PresenceData = {
        user_id: user.id,
        user_name: profile?.name || user.email || 'Anonymous',
        user_avatar: profile?.picture || user.user_metadata?.avatar_url,
        status: 'online',
        last_seen: new Date().toISOString(),
        ...presenceData
      };

      await realtimeService.updatePresence(projectId, fullPresenceData);
      logService.debug('Presence updated', { projectId, presenceData: fullPresenceData });
    } catch (error) {
      logService.error('Failed to update presence', { projectId, error });
    }
  }, [projectId, user, profile, logService]);

  // Update cursor position
  const updateCursorPosition = useCallback((x: number, y: number) => {
    updatePresence({
      cursor_position: { x, y }
    });
  }, [updatePresence]);

  // Update current page
  const updateCurrentPage = useCallback((page: string) => {
    updatePresence({
      current_page: page
    });
  }, [updatePresence]);

  // Set status (online, away, offline)
  const setStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    updatePresence({ status });
  }, [updatePresence]);

  useEffect(() => {
    if (!projectId || !user) return;

    const realtimeService = serviceContainer.resolve<IRealtimeService>(SERVICE_TOKENS.REALTIME_SERVICE);
    
    const subscribeToPresence = async () => {
      try {
        logService.debug(`Setting up presence subscription for project: ${projectId}`);

        const channel = await realtimeService.subscribeToPresence(
          projectId,
          (payload: PresencePayload) => {
            logService.debug('Presence update received', { projectId, payload });
            
            setActiveUsers(current => {
              const updated = [...current];
              
              // Handle joins
              Object.entries(payload.joins).forEach(([userId, presenceData]) => {
                const existingIndex = updated.findIndex(u => u.id === userId);
                const userWithId = { id: userId, ...presenceData };
                
                if (existingIndex >= 0) {
                  updated[existingIndex] = userWithId;
                } else {
                  updated.push(userWithId);
                }
              });
              
              // Handle leaves
              Object.keys(payload.leaves).forEach(userId => {
                const index = updated.findIndex(u => u.id === userId);
                if (index >= 0) {
                  updated.splice(index, 1);
                }
              });
              
              // Filter out current user and offline users
              return updated.filter(u => 
                u.id !== user.id && 
                u.status !== 'offline'
              );
            });
          }
        );

        channelRef.current = channel;
        setIsConnected(true);

        // Send initial presence
        await updatePresence({
          current_page: window.location.pathname,
          status: 'online'
        });

        logService.info(`Presence subscription active: ${projectId}`);
      } catch (error) {
        logService.error('Failed to set up presence subscription', { projectId, error });
        setIsConnected(false);
      }
    };

    subscribeToPresence();

    // Set up heartbeat to maintain presence
    heartbeatRef.current = setInterval(() => {
      updatePresence({ status: 'online' });
    }, 30000); // Update every 30 seconds

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(channelRef.current).catch(error => {
          logService.error('Failed to unsubscribe from presence', { projectId, error });
        });
        channelRef.current = null;
      }
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      setIsConnected(false);
      setActiveUsers([]);
      logService.debug(`Presence subscription removed: ${projectId}`);
    };
  }, [projectId, user, updatePresence, logService]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus('away');
      } else {
        setStatus('online');
        updateCurrentPage(window.location.pathname);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setStatus, updateCurrentPage]);

  // Handle mouse movement for cursor tracking
  useEffect(() => {
    let lastUpdate = 0;
    const throttleDelay = 100; // Throttle cursor updates to every 100ms

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate > throttleDelay) {
        updateCursorPosition(event.clientX, event.clientY);
        lastUpdate = now;
      }
    };

    // Only track cursor if connected and on project pages
    if (isConnected && projectId && window.location.pathname.includes(projectId)) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isConnected, projectId, updateCursorPosition]);

  return {
    activeUsers,
    isConnected,
    updatePresence,
    updateCursorPosition,
    updateCurrentPage,
    setStatus,
    currentUserCount: activeUsers.length
  };
}

/**
 * Hook specifically for model-level collaboration
 * Provides presence data scoped to a specific financial model
 */
export function useModelCollaboration(
  projectId: string | undefined,
  modelId: string | undefined
) {
  const presence = useRealtimePresence(projectId);
  
  // Filter active users to those working on the current model
  const modelCollaborators = presence.activeUsers.filter(user => 
    user.current_page?.includes(`/models/${modelId}`)
  );

  const updateModelPresence = useCallback((data: Partial<PresenceData>) => {
    presence.updatePresence({
      ...data,
      current_page: `/projects/${projectId}/models/${modelId}`
    });
  }, [presence.updatePresence, projectId, modelId]);

  return {
    ...presence,
    activeUsers: modelCollaborators,
    updatePresence: updateModelPresence,
    collaboratorCount: modelCollaborators.length
  };
}