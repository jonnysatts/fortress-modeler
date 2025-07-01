/**
 * Simplified real-time project hook (temporarily disabled)
 * TODO: Reimplement without service container dependencies
 */
export function useRealtimeProject(projectId: string | undefined) {
  // Temporarily disabled - no-op implementation
  console.log('Real-time project updates temporarily disabled for project:', projectId);
  
  // Return empty cleanup function for compatibility
  return () => {};
}

export default useRealtimeProject;