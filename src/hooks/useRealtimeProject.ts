import { useEffect, useRef } from 'react';
import { SupabaseRealtimeService } from '@/services/implementations/SupabaseRealtimeService';
import type { RealtimePayload } from '@/services/interfaces/IRealtimeService';

/**
 * Real-time project hook - subscribes to project changes
 */
export function useRealtimeProject(
  projectId: string | undefined,
  onProjectUpdate?: (payload: RealtimePayload) => void
) {
  const realtimeServiceRef = useRef<SupabaseRealtimeService>();
  const channelRef = useRef<any>();

  useEffect(() => {
    if (!projectId || !onProjectUpdate) return;

    const setupRealtime = async () => {
      try {
        // Initialize realtime service
        realtimeServiceRef.current = new SupabaseRealtimeService();
        
        // Subscribe to project changes
        channelRef.current = await realtimeServiceRef.current.subscribeToProject(
          projectId,
          onProjectUpdate
        );
        
        console.log('Subscribed to real-time updates for project:', projectId);
      } catch (error) {
        console.error('Failed to setup real-time project subscription:', error);
      }
    };

    setupRealtime();

    // Cleanup function
    return () => {
      if (channelRef.current && realtimeServiceRef.current) {
        realtimeServiceRef.current.unsubscribe(channelRef.current);
        console.log('Unsubscribed from real-time updates for project:', projectId);
      }
    };
  }, [projectId, onProjectUpdate]);

  // Return cleanup function for manual cleanup if needed
  return () => {
    if (channelRef.current && realtimeServiceRef.current) {
      realtimeServiceRef.current.unsubscribe(channelRef.current);
    }
  };
}

export default useRealtimeProject;