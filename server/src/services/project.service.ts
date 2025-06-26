import { query, withTransaction } from '../db/connection';
import { validate as uuidValidate } from 'uuid';
import { PoolClient } from 'pg';

export interface Project {
  id: string;
  user_id: string;
  local_id?: number;
  name: string;
  description?: string;
  product_type?: string;
  target_audience?: string;
  data: any;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateProjectData {
  local_id?: number;
  name: string;
  description?: string;
  product_type?: string;
  target_audience?: string;
  data?: any;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  product_type?: string;
  target_audience?: string;
  data?: any;
}

export interface SyncProjectData extends CreateProjectData {
  id?: string;
  version?: number;
  updated_at?: Date;
  deleted_at?: Date;
}

export class ProjectService {
  
  // Create new project
  static async createProject(userId: string, projectData: CreateProjectData): Promise<Project> {
    const sql = `
      INSERT INTO projects (user_id, local_id, name, description, product_type, target_audience, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      userId,
      projectData.local_id || null,
      projectData.name,
      projectData.description || null,
      projectData.product_type || null,
      projectData.target_audience || null,
      projectData.data || {}
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }
  
  // Get project by ID
  static async getProjectById(userId: string, projectId: string): Promise<Project | null> {
    console.log(`[getProjectById] Checking access for user ${userId} on project ${projectId}`);
    if (!uuidValidate(projectId)) {
      console.error(`[getProjectById] Invalid UUID format for projectId: ${projectId}`);
      return null;
    }

    // Get the current user's email, which is needed for the sharing check.
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.error(`Could not find user with ID: ${userId} to check project permissions.`);
      return null;
    }
    const userEmail = userResult.rows[0].email;
    console.log(`[getProjectById] User email for sharing check: ${userEmail}`);

    const sql = `
      SELECT p.*
      FROM projects p
      LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.shared_with_email = $2
      WHERE p.id = $1 AND p.deleted_at IS NULL
      AND (
        p.user_id = $3 OR -- User owns the project
        p.data->>'is_public' = 'true' OR -- Project is public
        ps.project_id IS NOT NULL -- Project is shared with the user
      )
      LIMIT 1;
    `;

    const result = await query(sql, [projectId, userEmail, userId]);
    if (result.rows.length > 0) {
      console.log(`[getProjectById] Access GRANTED for user ${userId} on project ${projectId}`);
    } else {
      console.warn(`[getProjectById] Access DENIED for user ${userId} on project ${projectId}`);
    }
    return result.rows[0] || null;
  }
  
  // Get project by local ID (for sync operations)
  static async getProjectByLocalId(userId: string, localId: number): Promise<Project | null> {
    const sql = `
      SELECT * FROM projects 
      WHERE local_id = $1 AND user_id = $2 AND deleted_at IS NULL
    `;
    const result = await query(sql, [localId, userId]);
    return result.rows[0] || null;
  }

  // Get all public projects
  static async getPublicProjects(): Promise<Project[]> {
    const sql = `
      SELECT p.*, u.name as author_name, u.picture as author_avatar_url
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.data->>'is_public' = 'true' AND p.deleted_at IS NULL
      ORDER BY p.updated_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  // Get projects shared with the user
  static async getSharedProjectsForUser(userId: string): Promise<Project[]> {
    // First, get the current user's email from their ID
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.error(`Could not find user with ID: ${userId}`);
      return []; // User not found, so no projects can be shared with them.
    }
    const userEmail = userResult.rows[0].email;

    const sql = `
      SELECT p.*,
             u.name as author_name,
             u.picture as author_avatar_url,
             ps.permission as permission_level
      FROM projects p
      JOIN project_shares ps ON p.id = ps.project_id
      JOIN users u ON p.user_id = u.id
      WHERE ps.shared_with_email = $1 AND p.deleted_at IS NULL
      ORDER BY p.updated_at DESC
    `;
    const result = await query(sql, [userEmail]);
    return result.rows;
  }
  
  // Get all user projects
  static async getUserProjects(userId: string, includeDeleted: boolean = false): Promise<Project[]> {
    const sql = `
      SELECT * FROM projects 
      WHERE user_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
      ORDER BY updated_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }
  
  // Update project
  static async updateProject(
    userId: string, 
    projectId: string, 
    updateData: UpdateProjectData
  ): Promise<Project | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }
    
    if (updateData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    
    if (updateData.product_type !== undefined) {
      updates.push(`product_type = $${paramCount++}`);
      values.push(updateData.product_type);
    }
    
    if (updateData.target_audience !== undefined) {
      updates.push(`target_audience = $${paramCount++}`);
      values.push(updateData.target_audience);
    }
    
    if (updateData.data !== undefined) {
      updates.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(updateData.data));
    }
    
    if (updates.length === 0) {
      return this.getProjectById(userId, projectId);
    }
    
    updates.push(`version = version + 1`);
    updates.push(`updated_at = NOW()`);
    values.push(projectId, userId);
    
    const sql = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++} AND deleted_at IS NULL
      RETURNING *;
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }
  
  // Soft delete project
  static async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const sql = `
      UPDATE projects 
      SET deleted_at = NOW(), version = version + 1
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id;
    `;
    
    const result = await query(sql, [projectId, userId]);
    return result.rows.length > 0;
  }
  
  // Restore deleted project
  static async restoreProject(userId: string, projectId: string): Promise<Project | null> {
    const sql = `
      UPDATE projects 
      SET deleted_at = NULL, version = version + 1, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
      RETURNING *;
    `;
    
    const result = await query(sql, [projectId, userId]);
    return result.rows[0] || null;
  }
  
  // Hard delete project (permanent)
  static async permanentDeleteProject(userId: string, projectId: string): Promise<boolean> {
    return await withTransaction(async (client: PoolClient) => {
      // Delete related financial models first
      await client.query(
        'DELETE FROM financial_models WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      // Delete sync events for this project
      await client.query(
        'DELETE FROM sync_events WHERE entity_id = $1 AND user_id = $2 AND entity_type = $3',
        [projectId, userId, 'project']
      );
      
      // Delete the project
      const result = await client.query(
        'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
        [projectId, userId]
      );
      
      return result.rows.length > 0;
    });
  }
  
  // Upsert project for sync operations
  static async upsertProject(userId: string, syncData: SyncProjectData): Promise<Project> {
    return await withTransaction(async (client: PoolClient) => {
      // Check if project exists by ID or local_id
      let existingProject = null;
      
      if (syncData.id) {
        const result = await client.query(
          'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
          [syncData.id, userId]
        );
        existingProject = result.rows[0];
      } else if (syncData.local_id) {
        const result = await client.query(
          'SELECT * FROM projects WHERE local_id = $1 AND user_id = $2',
          [syncData.local_id, userId]
        );
        existingProject = result.rows[0];
      }
      
      if (existingProject) {
        // Update existing project
        const sql = `
          UPDATE projects 
          SET name = $1, description = $2, product_type = $3, target_audience = $4, 
              data = $5, version = GREATEST(version, $6), 
              updated_at = GREATEST(updated_at, $7),
              deleted_at = $8
          WHERE id = $9 AND user_id = $10
          RETURNING *;
        `;
        
        const values = [
          syncData.name,
          syncData.description || null,
          syncData.product_type || null,
          syncData.target_audience || null,
          JSON.stringify(syncData.data || {}),
          syncData.version || existingProject.version + 1,
          syncData.updated_at || new Date(),
          syncData.deleted_at || null,
          existingProject.id,
          userId
        ];
        
        const result = await client.query(sql, values);
        return result.rows[0];
      } else {
        // Create new project
        const sql = `
          INSERT INTO projects (${syncData.id ? 'id, ' : ''}user_id, local_id, name, description, product_type, target_audience, data, version, updated_at, deleted_at)
          VALUES (${syncData.id ? '$1, $2, ' : '$1, '}$${syncData.id ? '3' : '2'}, $${syncData.id ? '4' : '3'}, $${syncData.id ? '5' : '4'}, $${syncData.id ? '6' : '5'}, $${syncData.id ? '7' : '6'}, $${syncData.id ? '8' : '7'}, $${syncData.id ? '9' : '8'}, $${syncData.id ? '10' : '9'}, $${syncData.id ? '11' : '10'})
          RETURNING *;
        `;
        
        const values = [
          ...(syncData.id ? [syncData.id] : []),
          userId,
          syncData.local_id || null,
          syncData.name,
          syncData.description || null,
          syncData.product_type || null,
          syncData.target_audience || null,
          JSON.stringify(syncData.data || {}),
          syncData.version || 1,
          syncData.updated_at || new Date(),
          syncData.deleted_at || null
        ];
        
        const result = await client.query(sql, values);
        return result.rows[0];
      }
    });
  }
  
  // Get projects modified since last sync
  static async getProjectsSince(userId: string, since: Date): Promise<Project[]> {
    const sql = `
      SELECT * FROM projects 
      WHERE user_id = $1 AND updated_at > $2
      ORDER BY updated_at ASC
    `;
    const result = await query(sql, [userId, since]);
    return result.rows;
  }
  
  // Get project statistics
  static async getProjectStats(userId: string): Promise<{
    total: number;
    active: number;
    deleted: number;
    lastUpdated: Date | null;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted,
        MAX(updated_at) as last_updated
      FROM projects 
      WHERE user_id = $1;
    `;
    
    const result = await query(sql, [userId]);
    const row = result.rows[0];
    
    return {
      total: parseInt(row.total) || 0,
      active: parseInt(row.active) || 0,
      deleted: parseInt(row.deleted) || 0,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : null
    };
  }
  
  // Search projects
  static async searchProjects(
    userId: string, 
    searchTerm: string, 
    includeDeleted: boolean = false
  ): Promise<Project[]> {
    const sql = `
      SELECT * FROM projects 
      WHERE user_id = $1 
        AND (name ILIKE $2 OR description ILIKE $2 OR product_type ILIKE $2)
        ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
      ORDER BY updated_at DESC
    `;
    
    const result = await query(sql, [userId, `%${searchTerm}%`]);
    return result.rows;
  }
}