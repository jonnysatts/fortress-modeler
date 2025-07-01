/**
 * Simplified real-time presence hook (temporarily disabled)
 * TODO: Reimplement without service container dependencies
 */

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selection?: string;
}

export function useRealtimePresence(projectId: string | undefined) {
  // Temporarily disabled - return empty state
  console.log('Real-time presence temporarily disabled for project:', projectId);
  
  return {
    users: [] as PresenceUser[],
    isConnected: false,
    updatePresence: () => {},
    updateCursor: () => {},
    updateSelection: () => {},
  };
}

export function useModelCollaboration(projectId: string | undefined, modelId: string | undefined) {
  // Temporarily disabled - return empty state
  console.log('Model collaboration temporarily disabled for project/model:', projectId, modelId);
  
  return {
    collaborators: [] as PresenceUser[],
    activeUsers: [] as PresenceUser[],
    isConnected: false,
    broadcastChange: () => {},
    subscribeToChanges: () => {},
  };
}

export default useRealtimePresence;