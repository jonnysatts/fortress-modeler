import { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseRealtimeService } from '@/services/implementations/SupabaseRealtimeService';
import type { PresencePayload, PresenceData } from '@/services/interfaces/IRealtimeService';
import { useSupabaseAuth } from './useSupabaseAuth';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selection?: string;
}

export function useRealtimePresence(projectId: string | undefined) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const realtimeServiceRef = useRef<SupabaseRealtimeService>();
  const channelRef = useRef<any>();
  const { user } = useSupabaseAuth();

  const handlePresenceUpdate = useCallback((payload: PresencePayload) => {
    const allUsers: PresenceUser[] = [];
    
    // Process joins and existing presence
    Object.entries(payload.joins).forEach(([userId, presenceData]) => {
      allUsers.push({
        id: userId,
        name: presenceData.user_name || 'Anonymous',
        avatar: presenceData.user_avatar,
        cursor: presenceData.cursor_position,
        selection: presenceData.current_page,
      });
    });

    setUsers(allUsers);
  }, []);

  const updatePresence = useCallback(async (data: Partial<PresenceData>) => {
    if (!projectId || !realtimeServiceRef.current || !user) return;
    
    try {
      await realtimeServiceRef.current.updatePresence(projectId, {
        user_id: user.id,
        user_name: user.email || 'Anonymous',
        user_avatar: undefined,
        current_page: data.current_page || window.location.pathname,
        cursor_position: data.cursor_position,
        last_seen: new Date().toISOString(),
        status: 'online'
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [projectId, user]);

  const updateCursor = useCallback((x: number, y: number) => {
    updatePresence({ cursor_position: { x, y } });
  }, [updatePresence]);

  const updateSelection = useCallback((selection: string) => {
    updatePresence({ current_page: selection });
  }, [updatePresence]);

  useEffect(() => {
    if (!projectId || !user) return;

    const setupPresence = async () => {
      try {
        realtimeServiceRef.current = new SupabaseRealtimeService();
        
        channelRef.current = await realtimeServiceRef.current.subscribeToPresence(
          projectId,
          handlePresenceUpdate
        );
        
        setIsConnected(true);
        
        // Initial presence update
        await updatePresence({
          current_page: window.location.pathname
        });
        
        console.log('Subscribed to real-time presence for project:', projectId);
      } catch (error) {
        console.error('Failed to setup real-time presence:', error);
        setIsConnected(false);
      }
    };

    setupPresence();

    return () => {
      if (channelRef.current && realtimeServiceRef.current) {
        realtimeServiceRef.current.unsubscribe(channelRef.current);
        setIsConnected(false);
        console.log('Unsubscribed from real-time presence for project:', projectId);
      }
    };
  }, [projectId, user, handlePresenceUpdate, updatePresence]);
  
  return {
    users,
    isConnected,
    updatePresence,
    updateCursor,
    updateSelection,
  };
}

export function useModelCollaboration(projectId: string | undefined, modelId: string | undefined) {
  const [collaborators, setCollaborators] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const realtimeServiceRef = useRef<SupabaseRealtimeService>();
  const channelRef = useRef<any>();
  const { user } = useSupabaseAuth();

  const handleModelUpdate = useCallback((payload: any) => {
    console.log('Model update received:', payload);
    // Handle model changes, broadcast to collaborators
  }, []);

  const broadcastChange = useCallback(async (change: any) => {
    if (!modelId || !realtimeServiceRef.current) return;
    
    console.log('Broadcasting model change:', change);
    // Could implement custom broadcasting via Supabase channels
  }, [modelId]);

  const subscribeToChanges = useCallback((callback: (change: any) => void) => {
    // Subscribe to model-specific changes
    console.log('Subscribing to model changes for:', modelId);
    return () => console.log('Unsubscribing from model changes');
  }, [modelId]);

  useEffect(() => {
    if (!projectId || !modelId || !user) return;

    const setupCollaboration = async () => {
      try {
        realtimeServiceRef.current = new SupabaseRealtimeService();
        
        channelRef.current = await realtimeServiceRef.current.subscribeToModel(
          modelId,
          handleModelUpdate
        );
        
        setIsConnected(true);
        console.log('Model collaboration setup for:', modelId);
      } catch (error) {
        console.error('Failed to setup model collaboration:', error);
        setIsConnected(false);
      }
    };

    setupCollaboration();

    return () => {
      if (channelRef.current && realtimeServiceRef.current) {
        realtimeServiceRef.current.unsubscribe(channelRef.current);
        setIsConnected(false);
      }
    };
  }, [projectId, modelId, user, handleModelUpdate]);
  
  return {
    collaborators,
    activeUsers: collaborators.filter(user => user.selection === modelId),
    isConnected,
    broadcastChange,
    subscribeToChanges,
  };
}

export default useRealtimePresence;