import { query, withTransaction } from '../db/connection';
import { PoolClient } from 'pg';
import { ProjectService, SyncProjectData } from './project.service';
import { FinancialModelService, SyncModelData } from './financial-model.service';

export interface SyncEvent {
  id: string;
  user_id: string;
  entity_type: 'project' | 'model';
  entity_id: string;
  local_entity_id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data_before?: any;
  data_after?: any;
  timestamp_local?: Date;
  timestamp_server: Date;
  sync_batch_id?: string;
  resolved: boolean;
}

export interface SyncStatus {
  id: string;
  user_id: string;
  last_sync?: Date;
  sync_token?: string;
  pending_changes: any[];
  sync_in_progress: boolean;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SyncRequest {
  last_sync?: string; // ISO date string
  changes: SyncChange[];
}

export interface SyncChange {
  type: 'project' | 'model';
  action: 'create' | 'update' | 'delete';
  local_id?: number;
  id?: string;
  data: any;
  timestamp: string; // ISO date string
}

export interface SyncResponse {
  success: boolean;
  sync_token: string;
  last_sync: string;
  server_changes: ServerChange[];
  conflicts: ConflictItem[];
  error?: string;
}

export interface ServerChange {
  type: 'project' | 'model';
  action: 'create' | 'update' | 'delete';
  id: string;
  local_id?: number;
  data: any;
  version: number;
  updated_at: string;
}

export interface ConflictItem {
  type: 'project' | 'model';
  id: string;
  local_id?: number;
  local_data: any;
  server_data: any;
  local_timestamp: string;
  server_timestamp: string;
  resolution_needed: 'manual' | 'auto_server' | 'auto_client';
}

export class SyncService {
  
  // Initialize sync status for user
  static async initializeSyncStatus(userId: string): Promise<void> {
    const sql = `
      INSERT INTO sync_status (user_id, last_sync, sync_token, pending_changes)
      VALUES ($1, NULL, NULL, '[]'::jsonb)
      ON CONFLICT (user_id) DO NOTHING;
    `;
    
    await query(sql, [userId]);
  }
  
  // Get user sync status
  static async getSyncStatus(userId: string): Promise<SyncStatus | null> {
    const sql = 'SELECT * FROM sync_status WHERE user_id = $1';
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  }
  
  // Update sync status
  static async updateSyncStatus(
    userId: string, 
    updates: Partial<Pick<SyncStatus, 'last_sync' | 'sync_token' | 'pending_changes' | 'sync_in_progress' | 'last_error'>>
  ): Promise<SyncStatus> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (updates.last_sync !== undefined) {
      updateFields.push(`last_sync = $${paramCount++}`);
      values.push(updates.last_sync);
    }
    
    if (updates.sync_token !== undefined) {
      updateFields.push(`sync_token = $${paramCount++}`);
      values.push(updates.sync_token);
    }
    
    if (updates.pending_changes !== undefined) {
      updateFields.push(`pending_changes = $${paramCount++}`);
      values.push(JSON.stringify(updates.pending_changes));
    }
    
    if (updates.sync_in_progress !== undefined) {
      updateFields.push(`sync_in_progress = $${paramCount++}`);
      values.push(updates.sync_in_progress);
    }
    
    if (updates.last_error !== undefined) {
      updateFields.push(`last_error = $${paramCount++}`);
      values.push(updates.last_error);
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(userId);
    
    const sql = `
      UPDATE sync_status 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *;
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  }
  
  // Record sync event
  static async recordSyncEvent(
    userId: string,
    entityType: 'project' | 'model',
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    dataBefore?: any,
    dataAfter?: any,
    localEntityId?: number,
    timestampLocal?: Date,
    syncBatchId?: string
  ): Promise<SyncEvent> {
    const sql = `
      INSERT INTO sync_events (
        user_id, entity_type, entity_id, local_entity_id, action,
        data_before, data_after, timestamp_local, sync_batch_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    
    const values = [
      userId,
      entityType,
      entityId,
      localEntityId || null,
      action,
      dataBefore ? JSON.stringify(dataBefore) : null,
      dataAfter ? JSON.stringify(dataAfter) : null,
      timestampLocal || null,
      syncBatchId || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }
  
  // Process sync request
  static async processSync(userId: string, syncRequest: SyncRequest): Promise<SyncResponse> {
    return await withTransaction(async (client: PoolClient) => {
      try {
        // Mark sync as in progress
        await this.updateSyncStatus(userId, { sync_in_progress: true, last_error: null });
        
        const syncBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conflicts: ConflictItem[] = [];
        const processedChanges: ServerChange[] = [];
        
        // Process incoming changes from client
        for (const change of syncRequest.changes) {
          try {
            const changeResult = await this.processClientChange(
              client, 
              userId, 
              change, 
              syncBatchId
            );
            
            if (changeResult.conflict) {
              conflicts.push(changeResult.conflict);
            } else if (changeResult.serverChange) {
              processedChanges.push(changeResult.serverChange);
            }
          } catch (error) {
            console.error('Error processing change:', error);
            // Continue with other changes
          }
        }
        
        // Get server changes since last sync
        const lastSync = syncRequest.last_sync ? new Date(syncRequest.last_sync) : new Date(0);
        const serverChanges = await this.getServerChangesSince(client, userId, lastSync);
        
        // Generate new sync token
        const syncToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        
        // Update sync status
        await this.updateSyncStatus(userId, {
          last_sync: now,
          sync_token: syncToken,
          sync_in_progress: false,
          pending_changes: []
        });
        
        return {
          success: true,
          sync_token: syncToken,
          last_sync: now.toISOString(),
          server_changes: serverChanges,
          conflicts,
        };
        
      } catch (error) {
        // Mark sync as failed
        await this.updateSyncStatus(userId, {
          sync_in_progress: false,
          last_error: error instanceof Error ? error.message : 'Unknown sync error'
        });
        
        return {
          success: false,
          sync_token: '',
          last_sync: new Date().toISOString(),
          server_changes: [],
          conflicts: [],
          error: error instanceof Error ? error.message : 'Sync failed'
        };
      }
    });
  }
  
  // Process individual client change
  private static async processClientChange(
    client: PoolClient,
    userId: string,
    change: SyncChange,
    syncBatchId: string
  ): Promise<{
    serverChange?: ServerChange;
    conflict?: ConflictItem;
  }> {
    const changeTimestamp = new Date(change.timestamp);
    
    if (change.type === 'project') {
      return await this.processProjectChange(client, userId, change, changeTimestamp, syncBatchId);
    } else if (change.type === 'model') {
      return await this.processModelChange(client, userId, change, changeTimestamp, syncBatchId);
    }
    
    throw new Error(`Unknown change type: ${change.type}`);
  }
  
  // Process project change
  private static async processProjectChange(
    client: PoolClient,
    userId: string,
    change: SyncChange,
    timestamp: Date,
    syncBatchId: string
  ): Promise<{ serverChange?: ServerChange; conflict?: ConflictItem }> {
    
    if (change.action === 'delete') {
      if (change.id) {
        const deleted = await ProjectService.deleteProject(userId, change.id);
        if (deleted) {
          await this.recordSyncEvent(
            userId, 'project', change.id, 'DELETE', null, null,
            change.local_id, timestamp, syncBatchId
          );
        }
      }
      return {};
    }
    
    const syncData: SyncProjectData = {
      ...change.data,
      id: change.id,
      local_id: change.local_id,
      updated_at: timestamp,
      version: change.data.version || 1
    };
    
    // Check for conflicts
    if (change.id) {
      const existing = await ProjectService.getProjectById(userId, change.id);
      if (existing && existing.updated_at > timestamp) {
        // Server version is newer - conflict
        return {
          conflict: {
            type: 'project',
            id: change.id,
            local_id: change.local_id,
            local_data: change.data,
            server_data: existing,
            local_timestamp: timestamp.toISOString(),
            server_timestamp: existing.updated_at.toISOString(),
            resolution_needed: 'manual'
          }
        };
      }
    }
    
    // Upsert the project
    const result = await ProjectService.upsertProject(userId, syncData);
    
    await this.recordSyncEvent(
      userId, 'project', result.id, change.action.toUpperCase() as 'CREATE' | 'UPDATE',
      null, result, change.local_id, timestamp, syncBatchId
    );
    
    return {
      serverChange: {
        type: 'project',
        action: change.action,
        id: result.id,
        local_id: result.local_id || undefined,
        data: result,
        version: result.version,
        updated_at: result.updated_at.toISOString()
      }
    };
  }
  
  // Process model change
  private static async processModelChange(
    client: PoolClient,
    userId: string,
    change: SyncChange,
    timestamp: Date,
    syncBatchId: string
  ): Promise<{ serverChange?: ServerChange; conflict?: ConflictItem }> {
    
    if (change.action === 'delete') {
      if (change.id) {
        const deleted = await FinancialModelService.deleteModel(userId, change.id);
        if (deleted) {
          await this.recordSyncEvent(
            userId, 'model', change.id, 'DELETE', null, null,
            change.local_id, timestamp, syncBatchId
          );
        }
      }
      return {};
    }
    
    const syncData: SyncModelData = {
      ...change.data,
      id: change.id,
      local_id: change.local_id,
      updated_at: timestamp,
      version: change.data.version || 1
    };
    
    // Check for conflicts
    if (change.id) {
      const existing = await FinancialModelService.getModelById(userId, change.id);
      if (existing && existing.updated_at > timestamp) {
        // Server version is newer - conflict
        return {
          conflict: {
            type: 'model',
            id: change.id,
            local_id: change.local_id,
            local_data: change.data,
            server_data: existing,
            local_timestamp: timestamp.toISOString(),
            server_timestamp: existing.updated_at.toISOString(),
            resolution_needed: 'manual'
          }
        };
      }
    }
    
    // Upsert the model
    const result = await FinancialModelService.upsertModel(userId, syncData);
    
    await this.recordSyncEvent(
      userId, 'model', result.id, change.action.toUpperCase() as 'CREATE' | 'UPDATE',
      null, result, change.local_id, timestamp, syncBatchId
    );
    
    return {
      serverChange: {
        type: 'model',
        action: change.action,
        id: result.id,
        local_id: result.local_id || undefined,
        data: result,
        version: result.version,
        updated_at: result.updated_at.toISOString()
      }
    };
  }
  
  // Get server changes since last sync
  private static async getServerChangesSince(
    client: PoolClient,
    userId: string,
    since: Date
  ): Promise<ServerChange[]> {
    const serverChanges: ServerChange[] = [];
    
    // Get project changes
    const projects = await ProjectService.getProjectsSince(userId, since);
    for (const project of projects) {
      serverChanges.push({
        type: 'project',
        action: project.deleted_at ? 'delete' : 'update',
        id: project.id,
        local_id: project.local_id || undefined,
        data: project,
        version: project.version,
        updated_at: project.updated_at.toISOString()
      });
    }
    
    // Get model changes
    const models = await FinancialModelService.getModelsSince(userId, since);
    for (const model of models) {
      serverChanges.push({
        type: 'model',
        action: model.deleted_at ? 'delete' : 'update',
        id: model.id,
        local_id: model.local_id || undefined,
        data: model,
        version: model.version,
        updated_at: model.updated_at.toISOString()
      });
    }
    
    return serverChanges.sort((a, b) => 
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );
  }
  
  // Get sync events for debugging
  static async getSyncEvents(
    userId: string, 
    limit: number = 50,
    entityType?: 'project' | 'model',
    entityId?: string
  ): Promise<SyncEvent[]> {
    let sql = `
      SELECT * FROM sync_events 
      WHERE user_id = $1
    `;
    const values = [userId];
    let paramCount = 2;
    
    if (entityType) {
      sql += ` AND entity_type = $${paramCount++}`;
      values.push(entityType);
    }
    
    if (entityId) {
      sql += ` AND entity_id = $${paramCount++}`;
      values.push(entityId);
    }
    
    sql += ` ORDER BY timestamp_server DESC LIMIT $${paramCount}`;
    values.push(limit.toString());
    
    const result = await query(sql, values);
    return result.rows;
  }
  
  // Force full sync (download all data)
  static async getFullSyncData(userId: string): Promise<{
    projects: any[];
    models: any[];
    sync_token: string;
    last_sync: string;
  }> {
    const projects = await ProjectService.getUserProjects(userId, false);
    const models = await FinancialModelService.getUserModels(userId, false);
    
    const syncToken = `full_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    await this.updateSyncStatus(userId, {
      last_sync: now,
      sync_token: syncToken,
      sync_in_progress: false
    });
    
    return {
      projects,
      models,
      sync_token: syncToken,
      last_sync: now.toISOString()
    };
  }
  
  // Clear sync history (maintenance)
  static async clearSyncHistory(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const sql = `
      DELETE FROM sync_events 
      WHERE user_id = $1 AND timestamp_server < $2
      RETURNING id;
    `;
    
    const result = await query(sql, [userId, cutoffDate]);
    return result.rows.length;
  }
}