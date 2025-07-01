import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Real-time service interface for WebSocket subscriptions and live collaboration
 * This abstraction enables clean separation between request-response (storage) 
 * and event-driven (realtime) operations
 */
export interface IRealtimeService {
  // Project-level subscriptions
  subscribeToProject(
    projectId: string, 
    callback: (payload: RealtimePayload) => void
  ): Promise<RealtimeChannel>;

  subscribeToProjectModels(
    projectId: string,
    callback: (payload: RealtimePayload) => void
  ): Promise<RealtimeChannel>;

  // Model-level subscriptions
  subscribeToModel(
    modelId: string,
    callback: (payload: RealtimePayload) => void
  ): Promise<RealtimeChannel>;

  // Presence and collaboration
  subscribeToPresence(
    projectId: string,
    callback: (payload: PresencePayload) => void
  ): Promise<RealtimeChannel>;

  updatePresence(
    projectId: string,
    presenceData: PresenceData
  ): Promise<void>;

  // Channel management
  unsubscribe(channel: RealtimeChannel): Promise<void>;
  unsubscribeAll(): Promise<void>;

  // Connection management
  getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';
  reconnect(): Promise<void>;
}

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old_record?: any;
  new_record?: any;
  timestamp: string;
}

export interface PresencePayload {
  joins: Record<string, PresenceData>;
  leaves: Record<string, PresenceData>;
}

export interface PresenceData {
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  current_page?: string;
  cursor_position?: {
    x: number;
    y: number;
  };
  last_seen: string;
  status: 'online' | 'away' | 'offline';
}