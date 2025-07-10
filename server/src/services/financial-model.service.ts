import { query, withTransaction } from '../db/connection';
import { PoolClient } from 'pg';

export interface FinancialModel {
  id: string;
  project_id: string;
  user_id: string;
  local_id?: number;
  name: string;
  assumptions: any;
  results_cache: any;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateModelData {
  project_id: string;
  local_id?: number;
  name: string;
  assumptions?: ModelAssumptions;
  results_cache?: ResultsCache;
}

export interface UpdateModelData {
  name?: string;
  assumptions?: ModelAssumptions;
  results_cache?: ResultsCache;
}

export interface SyncModelData extends CreateModelData {
  id?: string;
  version?: number;
  updated_at?: Date;
  deleted_at?: Date;
}

export class FinancialModelService {
  
  // Create new financial model
  static async createModel(userId: string, modelData: CreateModelData): Promise<FinancialModel> {
    // Verify project ownership
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [modelData.project_id, userId]
    );
    
    if (projectCheck.rows.length === 0) {
      throw new Error('Project not found or access denied');
    }
    
    const sql = `
      INSERT INTO financial_models (project_id, user_id, local_id, name, model_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const values = [
      modelData.project_id,
      userId,
      modelData.local_id || null,
      modelData.name,
      JSON.stringify({
        assumptions: modelData.assumptions || {},
        results_cache: modelData.results_cache || {}
      })
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }
  
  // Get model by ID
  static async getModelById(userId: string, modelId: string): Promise<FinancialModel | null> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.id = $1 AND fm.user_id = $2 AND fm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `;
    const result = await query(sql, [modelId, userId]);
    return result.rows[0] || null;
  }
  
  // Get model by local ID
  static async getModelByLocalId(userId: string, localId: number): Promise<FinancialModel | null> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.local_id = $1 AND fm.user_id = $2 AND fm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `;
    const result = await query(sql, [localId, userId]);
    return result.rows[0] || null;
  }
  
  // Get all models for a project
  static async getProjectModels(userId: string, projectId: string, includeDeleted: boolean = false): Promise<FinancialModel[]> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.project_id = $1 AND fm.user_id = $2 
        ${includeDeleted ? '' : 'AND fm.deleted_at IS NULL'}
        AND p.deleted_at IS NULL
      ORDER BY fm.updated_at DESC
    `;
    const result = await query(sql, [projectId, userId]);
    return result.rows;
  }
  
  // Get all user models
  static async getUserModels(userId: string, includeDeleted: boolean = false): Promise<FinancialModel[]> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.user_id = $1 
        ${includeDeleted ? '' : 'AND fm.deleted_at IS NULL'}
        AND p.deleted_at IS NULL
      ORDER BY fm.updated_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }
  
  // Update model
  static async updateModel(
    userId: string, 
    modelId: string, 
    updateData: UpdateModelData
  ): Promise<FinancialModel | null> {
    const updates: string[] = [];
    const values: (string | number | ModelAssumptions | ResultsCache)[] = [];
    let paramCount = 1;
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }
    
    if (updateData.assumptions !== undefined) {
      updates.push(`assumptions = $${paramCount++}`);
      values.push(JSON.stringify(updateData.assumptions));
    }
    
    if (updateData.results_cache !== undefined) {
      updates.push(`results_cache = $${paramCount++}`);
      values.push(JSON.stringify(updateData.results_cache));
    }
    
    if (updates.length === 0) {
      return this.getModelById(userId, modelId);
    }
    
    updates.push(`version = version + 1`);
    updates.push(`updated_at = NOW()`);
    values.push(modelId, userId);
    
    const sql = `
      UPDATE financial_models 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++} AND deleted_at IS NULL
      RETURNING *;
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }
  
  // Soft delete model
  static async deleteModel(userId: string, modelId: string): Promise<boolean> {
    const sql = `
      UPDATE financial_models 
      SET deleted_at = NOW(), version = version + 1
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id;
    `;
    
    const result = await query(sql, [modelId, userId]);
    return result.rows.length > 0;
  }
  
  // Restore deleted model
  static async restoreModel(userId: string, modelId: string): Promise<FinancialModel | null> {
    const sql = `
      UPDATE financial_models 
      SET deleted_at = NULL, version = version + 1, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
      RETURNING *;
    `;
    
    const result = await query(sql, [modelId, userId]);
    return result.rows[0] || null;
  }
  
  // Hard delete model (permanent)
  static async permanentDeleteModel(userId: string, modelId: string): Promise<boolean> {
    return await withTransaction(async (client: PoolClient) => {
      // Delete sync events for this model
      await client.query(
        'DELETE FROM sync_events WHERE entity_id = $1 AND user_id = $2 AND entity_type = $3',
        [modelId, userId, 'model']
      );
      
      // Delete the model
      const result = await client.query(
        'DELETE FROM financial_models WHERE id = $1 AND user_id = $2 RETURNING id',
        [modelId, userId]
      );
      
      return result.rows.length > 0;
    });
  }
  
  // Upsert model for sync operations
  static async upsertModel(userId: string, syncData: SyncModelData): Promise<FinancialModel> {
    return await withTransaction(async (client: PoolClient) => {
      // Verify project exists and user has access
      const projectCheck = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [syncData.project_id, userId]
      );
      
      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }
      
      // Check if model exists by ID or local_id
      let existingModel = null;
      
      if (syncData.id) {
        const result = await client.query(
          'SELECT * FROM financial_models WHERE id = $1 AND user_id = $2',
          [syncData.id, userId]
        );
        existingModel = result.rows[0];
      } else if (syncData.local_id) {
        const result = await client.query(
          'SELECT * FROM financial_models WHERE local_id = $1 AND user_id = $2',
          [syncData.local_id, userId]
        );
        existingModel = result.rows[0];
      }
      
      if (existingModel) {
        // Update existing model
        const sql = `
          UPDATE financial_models 
          SET name = $1, assumptions = $2, results_cache = $3,
              version = GREATEST(version, $4), 
              updated_at = GREATEST(updated_at, $5),
              deleted_at = $6
          WHERE id = $7 AND user_id = $8
          RETURNING *;
        `;
        
        const values = [
          syncData.name,
          JSON.stringify(syncData.assumptions || {}),
          JSON.stringify(syncData.results_cache || {}),
          syncData.version || existingModel.version + 1,
          syncData.updated_at || new Date(),
          syncData.deleted_at || null,
          existingModel.id,
          userId
        ];
        
        const result = await client.query(sql, values);
        return result.rows[0];
      } else {
        // Create new model
        const sql = `
          INSERT INTO financial_models (${syncData.id ? 'id, ' : ''}project_id, user_id, local_id, name, assumptions, results_cache, version, updated_at, deleted_at)
          VALUES (${syncData.id ? '$1, $2, ' : '$1, '}$${syncData.id ? '3' : '2'}, $${syncData.id ? '4' : '3'}, $${syncData.id ? '5' : '4'}, $${syncData.id ? '6' : '5'}, $${syncData.id ? '7' : '6'}, $${syncData.id ? '8' : '7'}, $${syncData.id ? '9' : '8'}, $${syncData.id ? '10' : '9'})
          RETURNING *;
        `;
        
        const values = [
          ...(syncData.id ? [syncData.id] : []),
          syncData.project_id,
          userId,
          syncData.local_id || null,
          syncData.name,
          JSON.stringify(syncData.assumptions || {}),
          JSON.stringify(syncData.results_cache || {}),
          syncData.version || 1,
          syncData.updated_at || new Date(),
          syncData.deleted_at || null
        ];
        
        const result = await client.query(sql, values);
        return result.rows[0];
      }
    });
  }
  
  // Get models modified since last sync
  static async getModelsSince(userId: string, since: Date): Promise<FinancialModel[]> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.user_id = $1 AND fm.updated_at > $2
        AND p.deleted_at IS NULL
      ORDER BY fm.updated_at ASC
    `;
    const result = await query(sql, [userId, since]);
    return result.rows;
  }
  
  // Get model statistics
  static async getModelStats(userId: string): Promise<{
    total: number;
    active: number;
    deleted: number;
    byProject: { [projectId: string]: number };
    lastUpdated: Date | null;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN fm.deleted_at IS NULL THEN 1 END) as active,
        COUNT(CASE WHEN fm.deleted_at IS NOT NULL THEN 1 END) as deleted,
        MAX(fm.updated_at) as last_updated
      FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.user_id = $1 AND p.deleted_at IS NULL;
    `;
    
    const result = await query(sql, [userId]);
    const row = result.rows[0];
    
    // Get models by project
    const projectSql = `
      SELECT project_id, COUNT(*) as count
      FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.user_id = $1 AND fm.deleted_at IS NULL AND p.deleted_at IS NULL
      GROUP BY project_id;
    `;
    
    const projectResult = await query(projectSql, [userId]);
    const byProject: { [projectId: string]: number } = {};
    
    projectResult.rows.forEach((row: { project_id: string; count: string }) => {
      byProject[row.project_id] = parseInt(row.count);
    });
    
    return {
      total: parseInt(row.total) || 0,
      active: parseInt(row.active) || 0,
      deleted: parseInt(row.deleted) || 0,
      byProject,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : null
    };
  }
  
  // Search models
  static async searchModels(
    userId: string, 
    searchTerm: string, 
    projectId?: string,
    includeDeleted: boolean = false
  ): Promise<FinancialModel[]> {
    const sql = `
      SELECT fm.* FROM financial_models fm
      JOIN projects p ON fm.project_id = p.id
      WHERE fm.user_id = $1 
        AND fm.name ILIKE $2
        ${projectId ? 'AND fm.project_id = $3' : ''}
        ${includeDeleted ? '' : 'AND fm.deleted_at IS NULL'}
        AND p.deleted_at IS NULL
      ORDER BY fm.updated_at DESC
    `;
    
    const values = [userId, `%${searchTerm}%`];
    if (projectId) {
      values.push(projectId);
    }
    
    const result = await query(sql, values);
    return result.rows;
  }
}