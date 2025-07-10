// Common types used across the server

// JSON type that matches Supabase's Json type
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Generic project data - can be extended in the future
export type ProjectData = Record<string, unknown>;

// User preferences type
export type UserPreferences = Record<string, unknown>;

// Sync-related types
export type SyncData = Record<string, unknown>;
export type PendingChange = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: SyncData;
  timestamp: Date;
};