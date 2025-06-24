import { query, withTransaction } from '../db/connection';
import { PoolClient } from 'pg';

export interface User {
  id: string;
  google_id: string;
  email: string;
  name?: string;
  picture?: string;
  company_domain?: string;
  preferences: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  google_id: string;
  email: string;
  name?: string;
  picture?: string;
  company_domain?: string;
  preferences?: any;
}

export interface UpdateUserData {
  name?: string;
  picture?: string;
  company_domain?: string;
  preferences?: any;
}

export class UserService {
  
  // Create or update user (upsert for Google OAuth)
  static async upsertUser(userData: CreateUserData): Promise<User> {
    const sql = `
      INSERT INTO users (google_id, email, name, picture, company_domain, preferences)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (google_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        picture = COALESCE(EXCLUDED.picture, users.picture),
        company_domain = COALESCE(EXCLUDED.company_domain, users.company_domain),
        updated_at = NOW()
      RETURNING *;
    `;
    
    const values = [
      userData.google_id,
      userData.email,
      userData.name || null,
      userData.picture || null,
      userData.company_domain || null,
      userData.preferences || {}
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }
  
  // Get user by ID
  static async getUserById(id: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }
  
  // Get user by Google ID
  static async getUserByGoogleId(googleId: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE google_id = $1';
    const result = await query(sql, [googleId]);
    return result.rows[0] || null;
  }
  
  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = $1';
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }
  
  // Update user
  static async updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }
    
    if (updateData.picture !== undefined) {
      updates.push(`picture = $${paramCount++}`);
      values.push(updateData.picture);
    }
    
    if (updateData.company_domain !== undefined) {
      updates.push(`company_domain = $${paramCount++}`);
      values.push(updateData.company_domain);
    }
    
    if (updateData.preferences !== undefined) {
      updates.push(`preferences = $${paramCount++}`);
      values.push(JSON.stringify(updateData.preferences));
    }
    
    if (updates.length === 0) {
      return this.getUserById(id);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }
  
  // Get user preferences
  static async getUserPreferences(id: string): Promise<any> {
    const sql = 'SELECT preferences FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0]?.preferences || {};
  }
  
  // Update user preferences
  static async updateUserPreferences(id: string, preferences: any): Promise<boolean> {
    const sql = `
      UPDATE users 
      SET preferences = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id;
    `;
    
    const result = await query(sql, [JSON.stringify(preferences), id]);
    return result.rows.length > 0;
  }
  
  // Get users by company domain
  static async getUsersByCompanyDomain(domain: string): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE company_domain = $1 ORDER BY created_at DESC';
    const result = await query(sql, [domain]);
    return result.rows;
  }
  
  // Delete user (hard delete - use carefully)
  static async deleteUser(id: string): Promise<boolean> {
    return await withTransaction(async (client: PoolClient) => {
      // Delete all user data in proper order
      await client.query('DELETE FROM sync_events WHERE user_id = $1', [id]);
      await client.query('DELETE FROM sync_status WHERE user_id = $1', [id]);
      await client.query('DELETE FROM financial_models WHERE user_id = $1', [id]);
      await client.query('DELETE FROM projects WHERE user_id = $1', [id]);
      await client.query('DELETE FROM project_shares WHERE owner_id = $1', [id]);
      
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    });
  }
  
  // Get user stats
  static async getUserStats(id: string): Promise<{
    projectCount: number;
    modelCount: number;
    lastLogin: Date | null;
    accountAge: number; // days
  }> {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted_at IS NULL) as project_count,
        (SELECT COUNT(*) FROM financial_models WHERE user_id = $1 AND deleted_at IS NULL) as model_count,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1;
    `;
    
    const result = await query(sql, [id]);
    const row = result.rows[0];
    
    if (!row) {
      throw new Error('User not found');
    }
    
    const accountAge = Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      projectCount: parseInt(row.project_count) || 0,
      modelCount: parseInt(row.model_count) || 0,
      lastLogin: row.updated_at ? new Date(row.updated_at) : null,
      accountAge
    };
  }
  
  // Initialize sync status for new user
  static async initializeSyncStatus(userId: string): Promise<void> {
    const sql = `
      INSERT INTO sync_status (user_id, last_sync, sync_token, pending_changes)
      VALUES ($1, NOW(), NULL, '[]'::jsonb)
      ON CONFLICT (user_id) DO NOTHING;
    `;
    
    await query(sql, [userId]);
  }
}